import React, { useEffect, useState } from "react";
import { User } from "firebase/auth";
import { initAuth, googleSignIn, googleSignInRedirect, logout } from "../lib/firebase";
import { findOrCreateBackupSheet, syncPostsToSheet, importPostsFromSheet } from "../lib/googleSheets";
import { Post } from "../types";
import { importDb, fetchFullPosts } from "../lib/api";
import { LogIn, LogOut, RefreshCw, FileSpreadsheet, Download, ExternalLink, Sparkles, AlertTriangle } from "lucide-react";
import { useLanguage } from "../lib/i18n";

interface GoogleSheetsPanelProps {
  posts: Post[];
  onRefresh: () => void;
}

export default function GoogleSheetsPanel({ posts, onRefresh }: GoogleSheetsPanelProps) {
  const { t } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [sheetInfo, setSheetInfo] = useState<{ id: string; url: string } | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; success: boolean } | null>(null);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [isPopupBlocked, setIsPopupBlocked] = useState(false);

  useEffect(() => {
    // Listen for Firebase Auth changes
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        if (accessToken) {
          setToken(accessToken);
          // If we have token, proactively load the spreadsheet info if cached in session or just fetch
          fetchSheetInfo(accessToken);
        } else {
          // User is logged in but the cached in-memory token is gone (e.g. on page refresh).
          // We can set status to ask user to sign in again to refresh the token, or wait until they click.
          setToken(null);
        }
        setLoading(false);
      },
      () => {
        setUser(null);
        setToken(null);
        setSheetInfo(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const fetchSheetInfo = async (accessToken: string) => {
    try {
      const info = await findOrCreateBackupSheet(accessToken);
      setSheetInfo({ id: info.id, url: info.url });
    } catch (err) {
      console.error("Erro ao carregar informações da planilha:", err);
    }
  };

  const handleSignIn = async () => {
    setLoading(true);
    setStatusMessage(null);
    setUnauthorizedDomain(null);
    setIsPopupBlocked(false);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        await fetchSheetInfo(result.accessToken);
        setStatusMessage({
          text: "Conectado com sucesso ao Google! Sua planilha de backup está pronta.",
          success: true,
        });
      }
    } catch (err: any) {
      console.error("Erro no login:", err);
      const isUnauthorizedDomain =
        err?.code === "auth/unauthorized-domain" ||
        err?.message?.includes("unauthorized-domain") ||
        JSON.stringify(err).includes("unauthorized-domain");

      const isBlocked =
        err?.code === "auth/popup-blocked" ||
        err?.message?.includes("popup-blocked") ||
        JSON.stringify(err).includes("popup-blocked");

      if (isUnauthorizedDomain) {
        const domain = typeof window !== "undefined" ? window.location.hostname : "wrxxnch.github.io";
        setUnauthorizedDomain(domain);
        setStatusMessage({
          text: `Erro de Autenticação: O domínio '${domain}' não está autorizado no Firebase Console.`,
          success: false,
        });
      } else if (isBlocked) {
        setIsPopupBlocked(true);
        setStatusMessage({
          text: "Erro de Login: A janela pop-up foi bloqueada pelo seu navegador.",
          success: false,
        });
      } else {
        setStatusMessage({
          text: `Erro ao fazer login: ${err?.message || "Tente novamente"}`,
          success: false,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignInRedirect = async () => {
    setLoading(true);
    setStatusMessage({
      text: "Redirecionando para a página de login do Google...",
      success: true,
    });
    try {
      await googleSignInRedirect();
    } catch (err: any) {
      console.error("Erro no login por redirecionamento:", err);
      setStatusMessage({
        text: `Erro ao redirecionar: ${err?.message || "Tente novamente"}`,
        success: false,
      });
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setStatusMessage(null);
    try {
      await logout();
      setStatusMessage({
        text: "Desconectado da conta Google.",
        success: true,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSyncToSheets = async () => {
    if (!token) {
      // Prompt user to sign-in again to refresh the OAuth credentials
      handleSignIn();
      return;
    }

    setIsSyncing(true);
    setStatusMessage(null);

    try {
      // 1. Ensure sheet exists
      const sheet = await findOrCreateBackupSheet(token);
      setSheetInfo({ id: sheet.id, url: sheet.url });

      // 2. Fetch full posts including contents for backing up
      const fullPosts = await fetchFullPosts();

      // 3. Sync posts
      const result = await syncPostsToSheet(token, sheet.id, fullPosts);
      
      setStatusMessage({
        text: `Sincronização concluída! Adicionados: ${result.added}, Atualizados: ${result.updated} na sua planilha Google Sheets.`,
        success: true,
      });
    } catch (err: any) {
      console.error("Erro na sincronização:", err);
      setStatusMessage({
        text: `Falha ao sincronizar: ${err.message || "Verifique as permissões de acesso ao Drive/Sheets."}`,
        success: false,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleImportFromSheets = async () => {
    if (!token) {
      handleSignIn();
      return;
    }

    const confirmed = window.confirm(
      "Deseja importar as construções da sua planilha Google Sheets? Construções locais com o mesmo ID serão atualizadas."
    );
    if (!confirmed) return;

    setIsImporting(true);
    setStatusMessage(null);

    try {
      // 1. Ensure sheet exists
      const sheet = await findOrCreateBackupSheet(token);
      setSheetInfo({ id: sheet.id, url: sheet.url });

      // 2. Fetch posts from sheet
      const sheetPosts = await importPostsFromSheet(token, sheet.id);

      if (sheetPosts.length === 0) {
        setStatusMessage({
          text: "Nenhuma construção encontrada na planilha para importar.",
          success: false,
        });
        return;
      }

      // 3. Import into local database
      const result = await importDb(sheetPosts);

      setStatusMessage({
        text: `Sucesso! Importadas ${result.count} construções da planilha para o banco de dados do BlockFrame.`,
        success: true,
      });

      onRefresh();
    } catch (err: any) {
      console.error("Erro ao importar da planilha:", err);
      setStatusMessage({
        text: `Falha na importação: ${err.message || "Erro desconhecido"}`,
        success: false,
      });
    } finally {
      setIsImporting(false);
    }
  };

  if (loading && !user) {
    return (
      <div className="max-w-6xl mx-auto px-4 mt-6">
        <div className="mc-panel p-4 flex justify-center items-center gap-3">
          <RefreshCw className="w-5 h-5 text-mc-gold animate-spin" />
          <span className="font-mono text-xs text-neutral-400">Verificando conexão com o Google...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 mt-6">
      <div className="mc-panel p-5 bg-neutral-900 border-4 border-black rounded-sm shadow-md">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          
          {/* Info Section */}
          <div className="space-y-1">
            <h3 className="font-pixel text-xs text-mc-gold flex items-center gap-1.5 uppercase">
              <FileSpreadsheet className="w-4 h-4 text-mc-emerald" />
              <span>{t.sheetsTitle}</span>
            </h3>
            <p className="font-mono text-xs text-neutral-300 leading-relaxed max-w-2xl">
              {t.sheetsDescription}
            </p>
          </div>

          {/* Connection Actions */}
          <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto">
            {!user ? (
              /* Beautiful styled Google Sign In Button */
              <button
                onClick={handleSignIn}
                className="gsi-material-button w-full sm:w-auto cursor-pointer"
                style={{
                  background: "#ffffff",
                  border: "2px solid #555",
                  borderRadius: "2px",
                  boxSizing: "border-box",
                  color: "#1f1f1f",
                  fontFamily: "monospace",
                  fontSize: "12px",
                  fontWeight: "bold",
                  height: "36px",
                  letterSpacing: "0.25px",
                  outline: "none",
                  overflow: "hidden",
                  padding: "0 12px",
                  position: "relative",
                  textAlign: "center",
                  verticalAlign: "middle",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: "block", width: "18px", height: "18px" }}>
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                </div>
                <span>{t.btnGoogleLogin}</span>
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                {/* User badge */}
                <div className="flex items-center gap-2 bg-neutral-950 bg-opacity-50 border border-neutral-800 px-3 py-1.5 rounded-sm">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || "User"}
                      className="w-5 h-5 rounded-full border border-neutral-700"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-[10px] text-mc-gold font-pixel">
                      U
                    </div>
                  )}
                  <div className="text-left leading-none">
                    <span className="block text-[10px] text-neutral-300 font-mono font-bold truncate max-w-[120px]">
                      {user.displayName || "Jogador"}
                    </span>
                    <span className="block text-[8px] text-neutral-500 font-mono">
                      {user.email}
                    </span>
                  </div>
                </div>

                {/* Spreadsheet link */}
                {sheetInfo && (
                  <a
                    href={sheetInfo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mc-button flex items-center justify-center gap-1.5 text-xs py-1.5 px-3 bg-neutral-950 border-neutral-700 hover:border-mc-gold"
                    title="Abrir planilha no Google Drive"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-mc-gold" />
                    <span>{t.btnOpenSheet}</span>
                  </a>
                )}

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="p-2 border-2 border-transparent hover:border-red-800 text-neutral-500 hover:text-red-400 rounded-sm transition duration-150"
                  title="Desconectar conta Google"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Feedback Messages */}
        {statusMessage && (
          <div
            className={`mt-4 border-2 border-dashed p-3 font-mono text-xs rounded-sm ${
              statusMessage.success
                ? "bg-neutral-950 border-mc-emerald text-mc-emerald"
                : "bg-neutral-950 border-red-700 text-red-400"
            }`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>{statusMessage.text}</span>
            </div>

            {/* Step-by-step guidance for Firebase auth/unauthorized-domain */}
            {unauthorizedDomain && (
              <div className="mt-3 p-3 bg-neutral-900 border border-red-800 rounded text-neutral-200 text-xs font-sans leading-relaxed space-y-2">
                <p className="font-bold text-red-300 font-mono text-[11px] uppercase flex items-center gap-1">
                  <span>⚠️ Como Autorizar o Domínio no Firebase:</span>
                </p>
                <p className="text-neutral-300">
                  O Firebase por padrão bloqueia autenticação em domínios externos não cadastrados (como <code className="bg-black px-1.5 py-0.5 rounded text-amber-300 font-mono">{unauthorizedDomain}</code>).
                </p>
                <ol className="list-decimal list-inside space-y-1 text-neutral-300 pl-1">
                  <li>
                    Acesse o{" "}
                    <a
                      href="https://console.firebase.google.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-mc-gold underline font-semibold"
                    >
                      Firebase Console
                    </a>
                  </li>
                  <li>Selecione o projeto Firebase associado à sua aplicação.</li>
                  <li>
                    Acesse o menu <strong className="text-white">Authentication</strong> &gt; aba <strong className="text-white">Settings</strong> (Configurações).
                  </li>
                  <li>
                    Na seção <strong className="text-white">Authorized domains</strong> (Domínios autorizados), clique em <strong className="text-white">Add domain</strong> (Adicionar domínio).
                  </li>
                  <li>
                    Cole ou digite exatamente: <code className="bg-black px-1.5 py-0.5 rounded text-mc-gold font-mono">{unauthorizedDomain}</code> e clique em Salvar.
                  </li>
                </ol>
                <p className="text-neutral-400 text-[11px] pt-1">
                  Após adicionar, retorne a esta página e clique em <strong>ENTRAR COM GOOGLE</strong> novamente.
                </p>
              </div>
            )}

            {/* Guidance for Firebase auth/popup-blocked */}
            {isPopupBlocked && (
              <div className="mt-3 p-3 bg-neutral-900 border border-amber-800 rounded text-neutral-200 text-xs font-sans leading-relaxed space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-bold font-mono text-[11px] uppercase">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>A Janela de Login Foi Bloqueada pelo Navegador</span>
                </div>

                <p className="text-neutral-300">
                  O seu navegador ou um bloqueador de anúncios impediu a abertura da janela pop-up do Google. Escolha uma das alternativas abaixo:
                </p>

                <div className="bg-neutral-950 p-2.5 rounded border border-neutral-800 space-y-1.5">
                  <p className="font-semibold text-amber-300 text-xs">Opção A: Entrar via Redirecionamento (Recomendado)</p>
                  <p className="text-neutral-400 text-[11px]">
                    Abre a tela de login do Google diretamente na página inteira sem precisar de pop-up:
                  </p>
                  <button
                    onClick={handleSignInRedirect}
                    className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-mono font-bold text-xs uppercase tracking-wider rounded transition flex items-center justify-center gap-2 shadow"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Entrar com Redirecionamento</span>
                  </button>
                </div>

                <div className="bg-neutral-950 p-2.5 rounded border border-neutral-800 space-y-1">
                  <p className="font-semibold text-white text-xs">Opção B: Desbloquear Pop-ups neste site</p>
                  <ol className="list-decimal list-inside space-y-1 text-neutral-300 text-[11px] pl-1">
                    <li>Na barra de endereços (topo do navegador), clique no ícone de <strong>Pop-up bloqueado</strong>.</li>
                    <li>Selecione <strong>"Sempre permitir pop-ups de wrxxnch.github.io"</strong>.</li>
                    <li>Clique em <strong>ENTRAR COM GOOGLE</strong> novamente.</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

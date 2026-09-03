import React, { useState, useEffect } from "react";
import { Search, Heart, Download, Trash2, Copy, Check, Info, SlidersHorizontal, Mail, LogIn, LogOut, User as UserIcon } from "lucide-react";
import { Post, CATEGORIES, Category } from "../types";
import { likePost, unlikePost, deletePost, fetchPostDetails, getOrCreateClientId } from "../lib/api";
import BfConfiguratorModal from "./BfConfiguratorModal";
import { useLanguage } from "../lib/i18n";
import { auth, googleSignIn, logout } from "../lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";

interface GallerySectionProps {
  posts: Post[];
  loading: boolean;
  onRefresh: () => void;
}

type SortOption = "new" | "old" | "likes" | "az";

export default function GallerySection({ posts, loading, onRefresh }: GallerySectionProps) {
  const { t } = useLanguage();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const [activeTab, setActiveTab] = useState<"gallery" | "profile">("gallery");
  const [profileSubTab, setProfileSubTab] = useState<"creations" | "likes">("creations");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category>("Todas");
  const [sortBy, setSortBy] = useState<SortOption>("new");

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [configuringPost, setConfiguringPost] = useState<Post | null>(null);

  // Delete modal states
  const [deletingPost, setDeletingPost] = useState<Post | null>(null);
  const [deletePasscode, setDeletePasscode] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Helper to format date nicely
  const formatDate = (timestamp: number) => {
    try {
      return new Date(timestamp).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "";
    }
  };

  // Get user's local creations and likes arrays
  const generalCreationsIds: string[] = JSON.parse(
    localStorage.getItem("blockframe_my_created_ids") || "[]"
  );

  const myCreations = posts.filter((post) => {
    if (generalCreationsIds.includes(post.id)) return true;
    if (currentUser) {
      if (post.authorUid && post.authorUid === currentUser.uid) return true;
      if (post.authorEmail && currentUser.email && post.authorEmail.toLowerCase() === currentUser.email.toLowerCase()) return true;
      if (currentUser.displayName && post.author && post.author.toLowerCase() === currentUser.displayName.toLowerCase()) return true;
    }
    return false;
  });

  const myLikes = posts.filter(
    (post) => localStorage.getItem(`liked_${post.id}`) === "true"
  );

  // Choose correct source of posts based on current tab selection
  const sourcePosts = activeTab === "gallery"
    ? posts
    : (profileSubTab === "creations" ? myCreations : myLikes);

  // Filter and sort items
  const filteredPosts = sourcePosts
    .filter((post) => {
      const matchCategory = selectedCategory === "Todas" || post.category === selectedCategory;
      const haystack = `${post.title || ""} ${post.author || ""} ${(post.tags || []).join(" ")} ${post.description || ""}`.toLowerCase();
      const matchSearch = haystack.includes(searchQuery.trim().toLowerCase());
      return matchCategory && matchSearch;
    })
    .sort((a, b) => {
      if (sortBy === "new") return b.createdAt - a.createdAt;
      if (sortBy === "old") return a.createdAt - b.createdAt;
      if (sortBy === "likes") return (b.likes || 0) - (a.likes || 0);
      if (sortBy === "az") return a.title.localeCompare(b.title);
      return 0;
    });

  // Handle click on Copy Command
  const handleCopyCommand = (text: string, postId: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(postId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // Handle Like Action (1 curtida por usuário)
  const handleLike = async (post: Post) => {
    const userIdentifier = currentUser?.uid || getOrCreateClientId();
    const likedKey = `liked_${post.id}`;
    let isAlreadyLiked = false;

    if (Array.isArray(post.likedBy) && post.likedBy.includes(userIdentifier)) {
      isAlreadyLiked = true;
    } else {
      try {
        isAlreadyLiked = !!localStorage.getItem(likedKey);
      } catch {
        // Ignored
      }
    }

    try {
      if (isAlreadyLiked) {
        // User already liked, so unlike it
        await unlikePost(post.id, userIdentifier);
        try { localStorage.removeItem(likedKey); } catch {}
      } else {
        // User hasn't liked, so like it
        await likePost(post.id, userIdentifier);
        try { localStorage.setItem(likedKey, "true"); } catch {}
      }
      onRefresh();
    } catch (err: any) {
      alert("Erro ao computar curtida: " + err.message);
    }
  };

  // Handle Delete Action
  const handleDelete = (post: Post) => {
    setDeletingPost(post);
    setDeletePasscode("");
    setDeleteError(null);
    setEmailStatus(null);
  };

  // Handle Forgot Passcode -> Call /api/send-forgot-passcode
  const handleForgotPasscode = async () => {
    if (!deletingPost) return;

    setSendingEmail(true);
    setEmailStatus({
      success: true,
      message: "Enviando e-mail de recuperação de código...",
    });

    try {
      const response = await fetch("/api/send-forgot-passcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: deletingPost.id,
          email: deletingPost.authorEmail,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setEmailStatus({
          success: true,
          message: data.message || `Código enviado para o e-mail cadastrado!`,
        });
      } else {
        setEmailStatus({
          success: false,
          message: data.error || "Não foi possível enviar o código.",
        });
      }
    } catch (err: any) {
      setEmailStatus({
        success: false,
        message: "Erro ao enviar e-mail: " + (err.message || "Tente novamente"),
      });
    } finally {
      setSendingEmail(false);
    }
  };

  // Confirm deletion
  const confirmDeletePost = async () => {
    if (!deletingPost) return;
    setDeleteError(null);

    if (!deletePasscode.trim()) {
      setDeleteError("Por favor, digite o código de segurança. Se não lembrar, clique em 'Esqueci meu código'.");
      return;
    }

    setIsDeleting(true);
    try {
      await deletePost(deletingPost.id, deletePasscode);
      setDeletingPost(null);
      setDeletePasscode("");
      onRefresh();
    } catch (err: any) {
      setDeleteError(err.message || "Erro ao excluir arquivo.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Download Action (asynchronously pulls raw content and streams it)
  const handleDownload = async (id: string, filename: string) => {
    setDownloadingId(id);
    try {
      const details = await fetchPostDetails(id);
      
      const blob = new Blob([details.content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("Erro ao baixar o arquivo: " + (err.message || "Tente novamente."));
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <section id="galeria" className="max-w-6xl mx-auto py-10 px-4">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 mb-8 border-b-4 border-black pb-4">
        <div>
          <span className="text-[10px] font-pixel text-mc-diamond">{t.galleryStep}</span>
          <h2 className="text-xl md:text-2xl text-white font-pixel mt-1 drop-shadow-[2px_2px_0px_rgba(0,0,0,0.8)]">
            {t.galleryTitle}
          </h2>
          <p className="text-sm text-neutral-400 mt-1 font-mono">
            {t.gallerySubtitle}
          </p>
        </div>
      </div>

      {/* Minecraft-styled Tab Bar */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("gallery")}
          className={`font-pixel text-[10px] md:text-xs py-2 px-4 transition uppercase ${
            activeTab === "gallery" ? "mc-button mc-button-green" : "mc-button"
          }`}
        >
          <span>{t.tabExplore}</span>
        </button>
        <button
          onClick={() => setActiveTab("profile")}
          className={`font-pixel text-[10px] md:text-xs py-2 px-4 transition uppercase ${
            activeTab === "profile" ? "mc-button mc-button-diamond" : "mc-button"
          }`}
        >
          <span>{t.tabProfile}</span>
        </button>
      </div>

      {activeTab === "profile" && (
        <div className="mc-panel p-4 mb-6 bg-neutral-900 border-2 border-neutral-700 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {currentUser ? (
              <>
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || "User"}
                    className="w-10 h-10 rounded-full border-2 border-mc-gold shadow-md"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-neutral-800 border-2 border-mc-gold flex items-center justify-center text-mc-gold font-pixel">
                    <UserIcon className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <div className="text-[10px] font-pixel text-mc-gold uppercase">Conta Conectada</div>
                  <h4 className="text-white font-pixel text-xs">{currentUser.displayName || "Construtor"}</h4>
                  <p className="text-[10px] text-neutral-400 font-mono">{currentUser.email}</p>
                </div>
              </>
            ) : (
              <div>
                <div className="text-[10px] font-pixel text-mc-gold uppercase">Meu Painel Local</div>
                <h4 className="text-white font-pixel text-xs">Minha Biblioteca</h4>
                <p className="text-[10px] text-neutral-400 font-mono">Conecte-se com o Google para vincular suas construções</p>
              </div>
            )}
          </div>

          {/* Profile Sub-tabs */}
          <div className="flex items-center gap-2">
            {!currentUser && (
              <button
                onClick={() => googleSignIn()}
                className="mc-button text-[10px] font-pixel py-1.5 px-3 bg-emerald-900 border-emerald-700 text-emerald-200 hover:bg-emerald-800 flex items-center gap-1.5 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Entrar com Google</span>
              </button>
            )}

            <button
              onClick={() => setProfileSubTab("creations")}
              className={`font-pixel text-[9px] py-1.5 px-3 transition uppercase ${
                profileSubTab === "creations" ? "mc-button mc-button-green" : "mc-button"
              }`}
            >
              <span>{t.tabCreations} ({myCreations.length})</span>
            </button>
            <button
              onClick={() => setProfileSubTab("likes")}
              className={`font-pixel text-[9px] py-1.5 px-3 transition uppercase ${
                profileSubTab === "likes" ? "mc-button mc-button-green" : "mc-button"
              }`}
            >
              <span>{t.tabLikes} ({myLikes.length})</span>
            </button>
          </div>
        </div>
      )}

          {/* Toolbar / Search, Filter, Sort controls */}
          <div className="mc-panel p-4 rounded-sm shadow-lg mb-8 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="mc-input w-full pl-10"
            />
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-3.5" />
          </div>

          {/* Sort selector */}
          <div className="w-full md:w-56">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="mc-input w-full bg-neutral-900 border-neutral-700 cursor-pointer text-xs uppercase font-bold"
            >
              <option value="new" className="bg-neutral-900">{t.sortNewest}</option>
              <option value="old" className="bg-neutral-900">{t.sortOldest}</option>
              <option value="likes" className="bg-neutral-900">{t.sortLikes}</option>
              <option value="az" className="bg-neutral-900">{t.sortAlphabetical}</option>
            </select>
          </div>
        </div>

        {/* Categories scrollable panel */}
        <div className="border-t border-neutral-300 pt-3">
          <span className="text-[9px] font-pixel text-neutral-700 block mb-2">{t.filterCategory}</span>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`text-[9px] font-pixel px-2.5 py-1.5 transition ${
                  selectedCategory === cat
                    ? "mc-button mc-button-green"
                    : "mc-button"
                }`}
                style={{ outlineSize: "2px", borderSize: "2px" }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Gallery Cards Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="flex items-center gap-2 text-mc-gold font-pixel text-xs animate-pulse">
            <span className="w-2.5 h-2.5 bg-mc-gold rounded-full inline-block"></span>
            <span className="w-2.5 h-2.5 bg-mc-gold rounded-full inline-block animation-delay-150"></span>
            <span className="w-2.5 h-2.5 bg-mc-gold rounded-full inline-block animation-delay-300"></span>
            <span>{t.searchingFiles}</span>
          </div>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="mc-panel p-12 text-center rounded-sm">
          <Info className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
          <b className="font-pixel text-xs text-neutral-800 block mb-2">{t.noPostsFound}</b>
          <p className="text-sm font-mono text-neutral-600 max-w-md mx-auto">
            {t.noPostsDesc}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post) => {
            const cleanCmdName = post.filename.replace(/\.bf$/i, "");
            const cmdText = `/blockframe_load ${cleanCmdName}`;
            const userIdentifier = currentUser?.uid || getOrCreateClientId();
            let hasLiked = false;
            if (Array.isArray(post.likedBy) && post.likedBy.includes(userIdentifier)) {
              hasLiked = true;
            } else {
              try {
                hasLiked = !!localStorage.getItem(`liked_${post.id}`);
              } catch {
                // Ignored
              }
            }

            return (
              <div
                key={post.id}
                className="relative mc-panel p-0 rounded-sm shadow-md hover:shadow-2xl transition duration-200 flex flex-col group justify-between overflow-hidden"
              >
                {/* Category ribbon badge */}
                <div className="absolute top-3 right-3 bg-neutral-800 border-2 border-neutral-600 text-[8px] font-pixel text-mc-diamond px-2 py-1 rounded-sm uppercase z-10">
                  {post.category}
                </div>

                {/* Card Cover Image */}
                <div className="relative w-full h-40 bg-neutral-900 border-b-2 border-neutral-400 overflow-hidden flex items-center justify-center">
                  {post.imageUrl ? (
                    <img
                      src={post.imageUrl}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-neutral-500">
                      <div className="w-10 h-10 bg-neutral-800 border-2 border-neutral-700 flex items-center justify-center">
                        <span className="text-xl font-pixel text-neutral-600">?</span>
                      </div>
                      <span className="text-[9px] font-pixel text-neutral-600 uppercase">{t.noImage}</span>
                    </div>
                  )}
                </div>

                {/* Top Section */}
                <div className="p-4 border-b border-dashed border-neutral-400">
                  <h3 className="font-pixel text-xs text-neutral-900 leading-normal pr-14 drop-shadow-[1px_1px_0px_rgba(255,255,255,0.7)]">
                    {post.title}
                  </h3>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] text-neutral-600 mt-2">
                    <span>{t.authorLabel} <b className="text-neutral-800">{post.author}</b></span>
                    <span>{formatDate(post.createdAt)}</span>
                    <span>{post.sizeKb} KB</span>
                  </div>
                </div>

                {/* Body details */}
                <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                  <p className="text-xs font-mono text-neutral-700 leading-relaxed min-h-[3.5rem] break-words">
                    {post.description || "No detailed description provided."}
                  </p>

                  {/* Tags */}
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {post.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-[9px] font-mono bg-neutral-300 text-neutral-800 px-2 py-0.5 rounded-full border border-neutral-400 uppercase font-semibold"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Minecraft command clipboard utility */}
                  <div className="mc-slot-dark p-2 text-[11px] font-mono flex items-center justify-between gap-2 border rounded-sm">
                    <code className="text-mc-diamond break-all select-all font-semibold">{cmdText}</code>
                    <button
                      onClick={() => handleCopyCommand(cmdText, post.id)}
                      className="text-[9px] font-pixel text-mc-gold hover:text-white flex-none flex items-center gap-1 bg-neutral-800 hover:bg-neutral-900 p-1 border border-neutral-700"
                    >
                      {copiedId === post.id ? (
                        <>
                          <Check className="w-3 h-3 text-mc-emerald" />
                          <span className="text-mc-emerald text-[8px]">OK</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span className="text-[8px]">{t.copyCmd}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Footer panel items */}
                <div className="bg-neutral-300 border-t border-neutral-400 p-3 flex items-center justify-between gap-2">
                  {/* Likes (Hearts) action */}
                  <button
                    onClick={() => handleLike(post)}
                    className={`flex items-center gap-1.5 px-2 py-1 bg-white border-2 transition font-pixel text-[9px] ${
                      hasLiked
                        ? "border-red-400 text-red-600 bg-red-50 hover:bg-red-100/50 hover:border-red-500"
                        : "border-neutral-400 hover:border-red-400 text-neutral-700 hover:text-red-600 hover:bg-red-50"
                    }`}
                    title={hasLiked ? "Clique novamente para remover curtida" : "Curtir esta construção"}
                  >
                    <Heart className={`w-3.5 h-3.5 transition ${hasLiked ? "text-red-500 fill-red-500 scale-105" : "text-neutral-400"}`} />
                    <span>{post.likes || 0}</span>
                  </button>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Configurator (.bf Items Tab/Modal) */}
                    <button
                      onClick={() => setConfiguringPost(post)}
                      className="mc-button text-[8px] px-2 py-1.5 bg-neutral-800 border-neutral-600 hover:border-mc-gold flex items-center gap-1 text-mc-gold"
                      style={{ padding: "6px 8px" }}
                      title="Escolher quais itens/blocos estarão ativos no arquivo .bf antes de baixar"
                    >
                      <SlidersHorizontal className="w-3 h-3 text-mc-gold" />
                      <span>{t.btnConfigBf}</span>
                    </button>

                    {/* Download */}
                    <button
                      onClick={() => handleDownload(post.id, post.filename)}
                      disabled={downloadingId === post.id}
                      className="mc-button mc-button-diamond text-[8px] px-2 py-1.5"
                      style={{ padding: "6px 8px" }}
                    >
                      {downloadingId === post.id ? (
                        t.downloading
                      ) : (
                        <span className="flex items-center gap-1">
                          <Download className="w-3 h-3" />
                          <span>{t.btnDownload}</span>
                        </span>
                      )}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(post)}
                      className="mc-button mc-button-red text-[8px] transition"
                      style={{ padding: "6px 8px" }}
                      title="Excluir construção"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Interactive .bf Items Configurator Modal */}
      {configuringPost && (
        <BfConfiguratorModal
          post={configuringPost}
          onClose={() => setConfiguringPost(null)}
        />
      )}

      {/* Delete Post Modal with Forgot Passcode Gmail option */}
      {deletingPost && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="mc-panel max-w-md w-full p-5 space-y-4 rounded-sm border-2 border-neutral-600 shadow-2xl relative bg-neutral-900 text-neutral-100 font-sans">
            <div className="flex items-center justify-between border-b border-neutral-700 pb-3">
              <h3 className="font-pixel text-xs text-red-400 uppercase flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-red-400" />
                <span>Excluir Construção</span>
              </h3>
              <button
                onClick={() => {
                  setDeletingPost(null);
                  setDeletePasscode("");
                  setDeleteError(null);
                  setEmailStatus(null);
                }}
                className="text-neutral-400 hover:text-white font-mono text-sm px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono text-neutral-300">
              <p>
                Construção: <strong className="text-mc-gold">{deletingPost.title}</strong>
              </p>
              <p className="text-[11px] text-neutral-400">
                Apenas a pessoa que criou esta construção e informou o código de segurança correto pode excluí-la.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-pixel text-neutral-300">
                Código de Segurança:
              </label>
              <input
                type="password"
                value={deletePasscode}
                onChange={(e) => setDeletePasscode(e.target.value)}
                placeholder="Digite o código..."
                className="w-full bg-black border border-neutral-700 text-mc-gold px-3 py-2 text-xs font-mono rounded focus:border-mc-gold outline-none"
              />

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleForgotPasscode}
                  disabled={sendingEmail}
                  className="text-[11px] font-mono text-mc-gold hover:underline flex items-center gap-1 hover:text-amber-300 disabled:opacity-50 cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{sendingEmail ? "Enviando e-mail..." : "Esqueci meu código (enviar para meu e-mail)"}</span>
                </button>
              </div>
            </div>

            {emailStatus && (
              <div
                className={`p-3 rounded text-xs font-mono leading-relaxed ${
                  emailStatus.success
                    ? "bg-emerald-950/80 border border-emerald-600 text-emerald-200"
                    : "bg-red-950/80 border border-red-600 text-red-200"
                }`}
              >
                {emailStatus.message}
              </div>
            )}

            {deleteError && (
              <div className="p-3 bg-red-950/80 border border-red-600 rounded text-xs font-mono text-red-200">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-800">
              <button
                onClick={() => {
                  setDeletingPost(null);
                  setDeletePasscode("");
                  setDeleteError(null);
                  setEmailStatus(null);
                }}
                className="mc-button text-xs px-3 py-1.5 bg-neutral-800 border-neutral-600 hover:bg-neutral-700"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeletePost}
                disabled={isDeleting}
                className="mc-button mc-button-red text-xs px-4 py-1.5 flex items-center gap-1.5"
              >
                {isDeleting ? "Excluindo..." : "Confirmar Exclusão"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

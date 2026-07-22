import React, { useState, useEffect } from "react";
import { Search, Heart, Download, Trash2, Copy, Check, Info } from "lucide-react";
import { Post, CATEGORIES, Category } from "../types";
import { likePost, unlikePost, deletePost, fetchPostDetails } from "../lib/api";
import { auth } from "../lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";

interface GallerySectionProps {
  posts: Post[];
  loading: boolean;
  onRefresh: () => void;
}

type SortOption = "new" | "old" | "likes" | "az";

export default function GallerySection({ posts, loading, onRefresh }: GallerySectionProps) {
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
  const userCreationsIds: string[] = currentUser
    ? JSON.parse(localStorage.getItem(`my_creations_${currentUser.uid}`) || "[]")
    : [];
  const generalCreationsIds: string[] = JSON.parse(
    localStorage.getItem("blockframe_my_created_ids") || "[]"
  );

  const myCreations = posts.filter(
    (post) =>
      userCreationsIds.includes(post.id) ||
      generalCreationsIds.includes(post.id) ||
      (currentUser &&
        post.author.toLowerCase() === currentUser.displayName?.toLowerCase())
  );

  const myLikes = posts.filter(
    (post) =>
      currentUser &&
      localStorage.getItem(`liked_${currentUser.uid}_${post.id}`) === "true"
  );

  // Choose correct source of posts based on current tab selection
  const sourcePosts = activeTab === "gallery"
    ? posts
    : (profileSubTab === "creations" ? myCreations : myLikes);

  // Filter and sort items
  const filteredPosts = sourcePosts
    .filter((post) => {
      const matchCategory = selectedCategory === "Todas" || post.category === selectedCategory;
      const haystack = `${post.title} ${post.author} ${(post.tags || []).join(" ")} ${post.description}`.toLowerCase();
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

  // Handle Like Action
  const handleLike = async (id: string) => {
    if (!currentUser) {
      alert("Você precisa estar logado com sua conta Google para curtir construções! Por favor, conecte-se na seção de sincronização acima.");
      return;
    }

    const likedKey = `liked_${currentUser.uid}_${id}`;
    const isAlreadyLiked = !!localStorage.getItem(likedKey);

    try {
      if (isAlreadyLiked) {
        // User already liked, so unlike it
        await unlikePost(id);
        localStorage.removeItem(likedKey);
      } else {
        // User hasn't liked, so like it
        await likePost(id);
        localStorage.setItem(likedKey, "true");
      }
      onRefresh();
    } catch (err: any) {
      alert("Erro ao computar curtida: " + err.message);
    }
  };

  const ADMIN_EMAILS = ["jeanpierreowner@gmail.com"];

  const isUserAdmin = (user: User | null): boolean => {
    if (!user || !user.email) return false;
    return ADMIN_EMAILS.includes(user.email.toLowerCase());
  };

  const isPostAuthor = (post: Post, user: User | null): boolean => {
    if (!user) return false;
    if (post.authorUid && post.authorUid === user.uid) return true;
    if (post.authorEmail && user.email && post.authorEmail.toLowerCase() === user.email.toLowerCase()) return true;

    try {
      const userCreations = JSON.parse(localStorage.getItem(`my_creations_${user.uid}`) || "[]");
      if (Array.isArray(userCreations) && userCreations.includes(post.id)) return true;

      const globalCreated = JSON.parse(localStorage.getItem("blockframe_my_created_ids") || "[]");
      if (Array.isArray(globalCreated) && globalCreated.includes(post.id)) return true;
    } catch {
      // ignore
    }

    return false;
  };

  // Handle Delete Action with permissions check (Creator or Admin)
  const handleDelete = async (post: Post) => {
    if (!currentUser) {
      alert("🔒 Você precisa estar logado com sua conta Google para excluir uma construção!");
      return;
    }

    const isAdmin = isUserAdmin(currentUser);
    const isAuthor = isPostAuthor(post, currentUser);

    if (!isAdmin && !isAuthor) {
      alert("⛔ Apenas o criador desta construção que esteja logado, ou um Administrador do Firebase, pode excluí-la.");
      return;
    }

    const roleBadge = isAdmin ? "🛡️ Administrador" : "👤 Criador da Construção";
    let code = "";

    if (post.passcode) {
      const inputCode = prompt(`Você está identificado como ${roleBadge}.\nDigite o código de gerenciamento de "${post.title}" para confirmar a exclusão permanente:`);
      if (inputCode === null) return; // cancelled
      code = inputCode;
    } else {
      const confirmDelete = window.confirm(`Você está identificado como ${roleBadge}.\nTem certeza que deseja excluir permanentemente "${post.title}"?`);
      if (!confirmDelete) return;
    }

    try {
      await deletePost(post.id, code, {
        userUid: currentUser.uid,
        userEmail: currentUser.email || undefined,
      });
      alert("Construção excluída com sucesso do acervo!");
      onRefresh();
    } catch (err: any) {
      alert(err.message || "Erro ao excluir arquivo.");
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
          <span className="text-[10px] font-pixel text-mc-diamond">ETAPA 02 &middot; EXPLORAR ACERVO</span>
          <h2 className="text-xl md:text-2xl text-white font-pixel mt-1 drop-shadow-[2px_2px_0px_rgba(0,0,0,0.8)]">
            GALERIA DE CONSTRUÇÕES
          </h2>
          <p className="text-sm text-neutral-400 mt-1 font-mono">
            Navegue pelas criações dos jogadores, curta e faça o download do arquivo <code>.bf</code> para importar no seu servidor.
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
          <span>🔍 Explorar Acervo</span>
        </button>
        <button
          onClick={() => setActiveTab("profile")}
          className={`font-pixel text-[10px] md:text-xs py-2 px-4 transition uppercase ${
            activeTab === "profile" ? "mc-button mc-button-diamond" : "mc-button"
          }`}
        >
          <span>👤 Meu Perfil</span>
        </button>
      </div>

      {activeTab === "profile" && currentUser && (
        <div className="mc-panel p-4 mb-6 bg-neutral-900 border-2 border-neutral-700 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {currentUser.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt={currentUser.displayName || ""}
                className="w-10 h-10 rounded-full border-2 border-mc-gold shadow-md"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-neutral-800 border-2 border-mc-gold flex items-center justify-center font-pixel text-mc-gold">
                {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : "U"}
              </div>
            )}
            <div>
              <div className="text-[10px] font-pixel text-mc-gold uppercase">CONTA CONECTADA</div>
              <h4 className="text-white font-pixel text-xs">{currentUser.displayName || "Jogador"}</h4>
              <p className="text-[10px] text-neutral-400 font-mono">{currentUser.email}</p>
            </div>
          </div>

          {/* Profile Sub-tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setProfileSubTab("creations")}
              className={`font-pixel text-[9px] py-1 px-3 transition uppercase ${
                profileSubTab === "creations" ? "mc-button mc-button-green" : "mc-button"
              }`}
            >
              <span>Minhas Criações ({myCreations.length})</span>
            </button>
            <button
              onClick={() => setProfileSubTab("likes")}
              className={`font-pixel text-[9px] py-1 px-3 transition uppercase ${
                profileSubTab === "likes" ? "mc-button mc-button-green" : "mc-button"
              }`}
            >
              <span>Minhas Curtidas ({myLikes.length})</span>
            </button>
          </div>
        </div>
      )}

      {activeTab === "profile" && !currentUser && (
        <div className="mc-panel p-8 text-center bg-neutral-900 border-4 border-black rounded-sm shadow-md mb-8">
          <Info className="w-12 h-12 text-mc-gold mx-auto mb-4" />
          <h3 className="font-pixel text-xs text-mc-gold uppercase mb-2">CONECTAR CONTA GOOGLE</h3>
          <p className="text-xs font-mono text-neutral-300 max-w-md mx-auto mb-4">
            Você precisa estar conectado à sua conta Google para ver seu perfil de construtor, conferir suas criações enviadas e gerenciar suas curtidas!
          </p>
          <p className="text-xs font-mono text-neutral-400">
            Utilize o botão <b className="text-white">"ENTRAR COM GOOGLE"</b> na seção de sincronização no topo da página.
          </p>
        </div>
      )}

      {!(activeTab === "profile" && !currentUser) && (
        <>
          {/* Toolbar / Search, Filter, Sort controls */}
          <div className="mc-panel p-4 rounded-sm shadow-lg mb-8 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por título, autor ou tag..."
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
              <option value="new" className="bg-neutral-900">Mais Recentes</option>
              <option value="old" className="bg-neutral-900">Mais Antigos</option>
              <option value="likes" className="bg-neutral-900">Mais Curtidos</option>
              <option value="az" className="bg-neutral-900">Alfabética (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Categories scrollable panel */}
        <div className="border-t border-neutral-300 pt-3">
          <span className="text-[9px] font-pixel text-neutral-700 block mb-2">Filtrar por Categoria:</span>
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
            <span>PROCURANDO EXPEDIENTES DE BLOCOS...</span>
          </div>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="mc-panel p-12 text-center rounded-sm">
          <Info className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
          <b className="font-pixel text-xs text-neutral-800 block mb-2">NENHUM ARQUIVO REGISTRADO</b>
          <p className="text-sm font-mono text-neutral-600 max-w-md mx-auto">
            Não encontramos nenhum resultado correspondente ao filtro. Que tal ser o primeiro a publicar um arquivo nesta categoria?
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post) => {
            const cleanCmdName = post.filename.replace(/\.bf$/i, "");
            const cmdText = `/blockframe_load ${cleanCmdName}`;
            const hasLiked = currentUser ? !!localStorage.getItem(`liked_${currentUser.uid}_${post.id}`) : false;

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
                      <span className="text-[9px] font-pixel text-neutral-600 uppercase">Sem foto</span>
                    </div>
                  )}
                </div>

                {/* Top Section */}
                <div className="p-4 border-b border-dashed border-neutral-400">
                  <h3 className="font-pixel text-xs text-neutral-900 leading-normal pr-14 drop-shadow-[1px_1px_0px_rgba(255,255,255,0.7)]">
                    {post.title}
                  </h3>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] text-neutral-600 mt-2">
                    <span>Autor: <b className="text-neutral-800">{post.author}</b></span>
                    <span>{formatDate(post.createdAt)}</span>
                    <span>{post.sizeKb} KB</span>
                  </div>
                </div>

                {/* Body details */}
                <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                  <p className="text-xs font-mono text-neutral-700 leading-relaxed min-h-[3.5rem] break-words">
                    {post.description || "Nenhuma descrição detalhada providenciada para esta construção."}
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
                          <span className="text-[8px]">Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Footer panel items */}
                <div className="bg-neutral-300 border-t border-neutral-400 p-3 flex items-center justify-between gap-2">
                  {/* Likes (Hearts) action */}
                  <button
                    onClick={() => handleLike(post.id)}
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

                  <div className="flex items-center gap-2">
                    {/* Download */}
                    <button
                      onClick={() => handleDownload(post.id, post.filename)}
                      disabled={downloadingId === post.id}
                      className="mc-button mc-button-diamond text-[8px] px-2 py-1.5"
                      style={{ padding: "6px 8px" }}
                    >
                      {downloadingId === post.id ? (
                        "BAIXANDO..."
                      ) : (
                        <span className="flex items-center gap-1">
                          <Download className="w-3 h-3" />
                          <span>BAIXAR</span>
                        </span>
                      )}
                    </button>

                    {/* Delete */}
                    {(() => {
                      const userIsAdmin = isUserAdmin(currentUser);
                      const userIsAuthor = isPostAuthor(post, currentUser);
                      const canDelete = currentUser && (userIsAdmin || userIsAuthor);

                      let deleteToolTip = "Faça login com Google para excluir";
                      if (currentUser) {
                        if (userIsAdmin) deleteToolTip = "Excluir construção (Administrador)";
                        else if (userIsAuthor) deleteToolTip = "Excluir sua construção";
                        else deleteToolTip = "Apenas o criador desta construção ou Administrador pode excluí-la";
                      }

                      return (
                        <button
                          onClick={() => handleDelete(post)}
                          className={`mc-button text-[8px] transition ${
                            canDelete
                              ? "mc-button-red"
                              : "opacity-40 hover:opacity-70 bg-neutral-800 text-neutral-400"
                          }`}
                          style={{ padding: "6px 8px" }}
                          title={deleteToolTip}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      );
                    })()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
        </>
      )}
    </section>
  );
}

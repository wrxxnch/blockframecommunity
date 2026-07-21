import React, { useState } from "react";
import { Search, Heart, Download, Trash2, Copy, Check, Info } from "lucide-react";
import { Post, CATEGORIES, Category } from "../types";
import { likePost, deletePost, fetchPostDetails } from "../lib/api";

interface GallerySectionProps {
  posts: Post[];
  loading: boolean;
  onRefresh: () => void;
}

type SortOption = "new" | "old" | "likes" | "az";

export default function GallerySection({ posts, loading, onRefresh }: GallerySectionProps) {
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

  // Filter and sort items
  const filteredPosts = posts
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
    try {
      await likePost(id);
      onRefresh();
    } catch (err: any) {
      alert("Erro ao computar curtida: " + err.message);
    }
  };

  // Handle Delete Action with passcode prompt
  const handleDelete = async (id: string, title: string) => {
    const code = prompt(`Digite o código de gerenciamento de "${title}" para confirmar a exclusão permanente:`);
    if (code === null) return; // cancelled

    try {
      await deletePost(id, code);
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
                    className="flex items-center gap-1.5 px-2 py-1 bg-white hover:bg-red-50 border-2 border-neutral-400 hover:border-red-400 text-neutral-700 hover:text-red-600 transition font-pixel text-[9px]"
                  >
                    <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 group-hover:scale-110 transition" />
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
                    <button
                      onClick={() => handleDelete(post.id, post.title)}
                      className="mc-button mc-button-red text-[8px]"
                      style={{ padding: "6px 8px" }}
                      title="Excluir do acervo usando código de gerenciamento"
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
    </section>
  );
}

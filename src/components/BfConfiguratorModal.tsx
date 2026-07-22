import React, { useState, useEffect, useMemo } from "react";
import { X, Download, CheckSquare, Square, Search, Layers, SlidersHorizontal, RefreshCw, Check, Sparkles } from "lucide-react";
import { Post } from "../types";
import { fetchPostDetails } from "../lib/api";
import { parseBfContent, rebuildBfContent, BfEntityItem } from "../lib/bfParser";
import { useLanguage } from "../lib/i18n";

interface BfConfiguratorModalProps {
  post: Post | null;
  onClose: () => void;
}

export default function BfConfiguratorModal({ post, onClose }: BfConfiguratorModalProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rawContent, setRawContent] = useState<string>("");
  const [items, setItems] = useState<BfEntityItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!post) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchPostDetails(post.id)
      .then((details) => {
        if (!isMounted) return;
        const content = details.content || "";
        setRawContent(content);
        
        const parsed = parseBfContent(content);
        setItems(parsed);
        // Default: all active as requested by user ("padrão todos ativos")
        setSelectedIds(new Set(parsed.map((item) => item.id)));
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("Erro ao carregar detalhes do post:", err);
        setError(err.message || "Não foi possível carregar o conteúdo do arquivo .bf.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [post]);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.nodeName.toLowerCase().includes(q) ||
        `#${item.index}`.includes(q)
    );
  }, [items, searchQuery]);

  const allSelected = items.length > 0 && selectedIds.size === items.length;
  const noneSelected = selectedIds.size === 0;

  const handleToggleSelectAll = () => {
    if (allSelected) {
      // Uncheck all ("remover todos")
      setSelectedIds(new Set());
    } else {
      // Check all ("ativar todos")
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(items.map((i) => i.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleItemToggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDownloadCustom = () => {
    if (!post) return;
    setDownloading(true);

    try {
      const customBfContent = rebuildBfContent(rawContent, selectedIds, items);
      const filename = post.filename.endsWith(".bf") ? post.filename : `${post.filename}.bf`;

      const blob = new Blob([customBfContent], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();

      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("Erro ao gerar o arquivo .bf personalizado: " + (err.message || "Tente novamente."));
    } finally {
      setDownloading(false);
    }
  };

  if (!post) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="mc-panel w-full max-w-3xl bg-neutral-900 border-4 border-black p-0 rounded-sm shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header Bar */}
        <div className="bg-neutral-950 p-4 border-b-2 border-neutral-700 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-neutral-800 border-2 border-mc-gold flex items-center justify-center text-mc-gold">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-pixel text-xs text-mc-gold uppercase tracking-wider">
                {t.bfModalTitle}
              </h3>
              <p className="font-mono text-[11px] text-neutral-300">
                {post.title} &middot; <code className="text-mc-diamond">{post.filename}</code>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="mc-button p-2 text-neutral-400 hover:text-white"
            title={t.bfCloseModal}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Subtitle / Instructions */}
        <div className="p-4 bg-neutral-800 border-b border-neutral-700">
          <p className="font-mono text-xs text-neutral-200 leading-relaxed">
            {t.bfModalSubtitle}
          </p>
        </div>

        {/* Content Area */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-mc-gold animate-spin mx-auto" />
              <p className="font-pixel text-xs text-mc-gold">LENDO BLOCOS E ITENS DO ARQUIVO .BF...</p>
            </div>
          ) : error ? (
            <div className="mc-panel p-4 bg-red-950 border-2 border-red-700 text-red-200 font-mono text-xs">
              {error}
            </div>
          ) : (
            <>
              {/* Toolbar Controls: Select All, Deselect All, Stats */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-neutral-950 p-3 rounded-sm border border-neutral-800">
                
                {/* Select / Deselect Action Buttons */}
                <div className="flex flex-wrap gap-2 items-center">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    disabled={allSelected}
                    className={`mc-button text-[10px] font-pixel py-1 px-3 flex items-center gap-1.5 ${
                      allSelected ? "opacity-50 cursor-not-allowed" : "mc-button-green"
                    }`}
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-mc-emerald" />
                    <span>{t.bfSelectAll}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    disabled={noneSelected}
                    className={`mc-button text-[10px] font-pixel py-1 px-3 flex items-center gap-1.5 ${
                      noneSelected ? "opacity-50 cursor-not-allowed" : "mc-button-red"
                    }`}
                  >
                    <Square className="w-3.5 h-3.5 text-red-400" />
                    <span>{t.bfDeselectAll}</span>
                  </button>
                </div>

                {/* Active Items Counter Badge */}
                <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-700 px-3 py-1.5 rounded-sm">
                  <Layers className="w-4 h-4 text-mc-diamond shrink-0" />
                  <span className="font-pixel text-[10px] text-neutral-300">
                    <b className="text-mc-gold text-xs">{selectedIds.size}</b> / {items.length} {t.bfItemsActive}
                  </span>
                </div>
              </div>

              {/* Item Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.bfSearchItems}
                  className="mc-input w-full pl-9 text-xs"
                />
                <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-3.5" />
              </div>

              {/* Scrollable Entity Items Grid / List */}
              {filteredItems.length === 0 ? (
                <div className="py-12 text-center text-neutral-400 font-mono text-xs">
                  {t.bfNoItemsFound}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
                  {filteredItems.map((item) => {
                    const isChecked = selectedIds.has(item.id);
                    return (
                      <label
                        key={item.id}
                        onClick={() => handleItemToggle(item.id)}
                        className={`mc-slot-dark p-2.5 rounded-sm flex items-center gap-3 cursor-pointer border transition select-none ${
                          isChecked
                            ? "border-mc-emerald bg-neutral-900 shadow-[inset_0_0_8px_rgba(77,237,241,0.1)]"
                            : "border-neutral-800 opacity-60 bg-neutral-950 hover:opacity-80"
                        }`}
                      >
                        {/* Checkbox */}
                        <div
                          className={`w-5 h-5 shrink-0 rounded-sm border-2 flex items-center justify-center transition ${
                            isChecked
                              ? "bg-mc-emerald border-mc-emerald text-neutral-950"
                              : "bg-neutral-900 border-neutral-600 text-transparent"
                          }`}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>

                        {/* Item Index Tag */}
                        <span className="font-mono text-[10px] bg-neutral-800 text-mc-gold px-1.5 py-0.5 rounded border border-neutral-700 shrink-0">
                          #{item.index}
                        </span>

                        {/* Node / Block Name */}
                        <span className="font-mono text-xs text-white truncate flex-1 font-medium" title={item.nodeName}>
                          {item.nodeName}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="bg-neutral-950 p-4 border-t-2 border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] font-mono text-neutral-400">
            {selectedIds.size === 0 ? (
              <span className="text-amber-400 font-semibold">⚠️ Nenhum item selecionado (arquivo ficará vazio)</span>
            ) : (
              <span>Seu arquivo .bf conterá <b>{selectedIds.size}</b> itens.</span>
            )}
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="mc-button text-xs py-2 px-4 w-full sm:w-auto"
            >
              <span>{t.bfCloseModal}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadCustom}
              disabled={downloading || loading || selectedIds.size === 0}
              className="mc-button mc-button-diamond text-xs py-2 px-4 flex items-center justify-center gap-2 w-full sm:w-auto font-bold"
            >
              <Download className="w-4 h-4 text-white" />
              <span>{downloading ? t.downloading : t.bfDownloadCustom}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

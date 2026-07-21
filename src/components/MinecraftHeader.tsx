import React, { useRef, useState } from "react";
import { Hammer, Download, Upload, BarChart3, Users, Heart } from "lucide-react";
import { Post } from "../types";
import { importDb } from "../lib/api";

interface MinecraftHeaderProps {
  posts: Post[];
  onRefresh: () => void;
}

export default function MinecraftHeader({ posts, onRefresh }: MinecraftHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<{ message: string; success: boolean } | null>(null);

  const totalLikes = posts.reduce((sum, p) => sum + (p.likes || 0), 0);
  const uniqueAuthors = new Set(posts.map((p) => p.author.toLowerCase())).size;

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!Array.isArray(parsed)) {
        throw new Error("O arquivo de backup precisa ser um array JSON de construções.");
      }

      setImportStatus({ message: "Importando dados...", success: true });
      const result = await importDb(parsed);
      
      setImportStatus({
        message: `Sucesso! ${result.count} construções importadas ou atualizadas.`,
        success: true,
      });
      onRefresh();

      setTimeout(() => setImportStatus(null), 5000);
    } catch (err: any) {
      setImportStatus({
        message: err.message || "Erro ao ler o arquivo JSON de backup.",
        success: false,
      });
      setTimeout(() => setImportStatus(null), 6000);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <header className="border-b-4 border-black bg-neutral-900 bg-opacity-95 py-6 px-4 sticky top-0 z-40 shadow-xl">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Logo and Subtitle */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 flex-none relative bg-neutral-800 border-2 border-neutral-600 outline outline-2 outline-black flex items-center justify-center p-1 rounded-sm shadow-md">
            {/* Minecraft Style Block SVG inside */}
            <svg viewBox="0 0 40 40" className="w-full h-full" fill="none">
              <polygon points="20,2 38,12 38,30 20,40 2,30 2,12" stroke="#4dedf1" strokeWidth="2" fill="#2c2c2c" />
              <polygon points="20,2 38,12 20,22 2,12" fill="#5c8e32" opacity="0.8" />
              <line x1="20" y1="22" x2="20" y2="40" stroke="#4dedf1" strokeWidth="1.5" />
              <line x1="2" y1="12" x2="20" y2="22" stroke="#4dedf1" strokeWidth="1" />
              <line x1="38" y1="12" x2="20" y2="22" stroke="#4dedf1" strokeWidth="1" />
              <rect x="16" y="10" width="8" height="4" fill="#dfb427" opacity="0.9" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl md:text-2xl text-white font-pixel font-bold tracking-wider drop-shadow-[2px_2px_0px_rgba(0,0,0,0.85)]">
              BLOCKFRAME<span className="text-mc-gold">.ARCHIVE</span>
            </h1>
            <p className="text-xs text-neutral-400 font-mono mt-1 uppercase tracking-widest flex items-center gap-1">
              <Hammer className="w-3.5 h-3.5 text-mc-emerald" /> Acervo Comunitário &middot; Mineclonia / Minetest
            </p>
          </div>
        </div>

        {/* Database JSON Backup Actions & Navigation */}
        <div className="flex flex-wrap items-center gap-4 justify-center md:justify-end">
          <a
            href="#galeria"
            className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-300 hover:text-mc-diamond transition duration-150 py-1"
          >
            Galeria
          </a>
          <a
            href="#enviar"
            className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-300 hover:text-mc-emerald transition duration-150 py-1"
          >
            Publicar
          </a>
          <a
            href="#sobre"
            className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-300 hover:text-mc-gold transition duration-150 py-1"
          >
            Ajuda
          </a>

          {/* Export JSON Database Button */}
          <a
            href="/api/export"
            download="blockframe_archive_export.json"
            className="mc-button mc-button-diamond flex items-center gap-2"
            title="Exportar base de dados completa em JSON"
            id="btn-export-json"
          >
            <Download className="w-4 h-4 text-white" />
            <span>EXPORTAR JSON</span>
          </a>

          {/* Import JSON Database Button */}
          <button
            onClick={handleImportClick}
            className="mc-button flex items-center gap-2"
            title="Importar base de dados a partir de um backup JSON"
            id="btn-import-json"
          >
            <Upload className="w-4 h-4 text-mc-gold" />
            <span>IMPORTAR JSON</span>
          </button>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />
        </div>
      </div>

      {/* Import feedback overlay inside header */}
      {importStatus && (
        <div className="max-w-6xl mx-auto mt-4">
          <div
            className={`border-4 border-black p-3 font-mono text-xs ${
              importStatus.success
                ? "bg-mc-green text-white border-mc-emerald shadow-[inset_-2px_-2px_0px_#244c0c]"
                : "bg-red-950 text-red-200 border-red-700 shadow-[inset_-2px_-2px_0px_#540c0c]"
            }`}
          >
            {importStatus.message}
          </div>
        </div>
      )}

      {/* Community Stats Slot Panel */}
      <div className="max-w-6xl mx-auto mt-6 pt-4 border-t border-neutral-800 grid grid-cols-3 gap-3 md:gap-6">
        <div className="mc-slot-dark p-3 flex flex-col md:flex-row items-center gap-3 rounded-sm">
          <div className="w-8 h-8 rounded-sm bg-neutral-800 flex items-center justify-center text-mc-gold border border-neutral-700">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div className="text-center md:text-left">
            <span className="block text-[10px] md:text-xs text-neutral-400 font-mono uppercase tracking-wider">Acervo Total</span>
            <b className="font-pixel text-xs md:text-sm text-mc-gold drop-shadow-[1px_1px_0px_rgba(0,0,0,0.8)]">
              {posts.length} <span className="text-[9px] font-mono font-normal">arqs</span>
            </b>
          </div>
        </div>

        <div className="mc-slot-dark p-3 flex flex-col md:flex-row items-center gap-3 rounded-sm">
          <div className="w-8 h-8 rounded-sm bg-neutral-800 flex items-center justify-center text-mc-diamond border border-neutral-700">
            <Users className="w-4 h-4" />
          </div>
          <div className="text-center md:text-left">
            <span className="block text-[10px] md:text-xs text-neutral-400 font-mono uppercase tracking-wider">Construtores</span>
            <b className="font-pixel text-xs md:text-sm text-mc-diamond drop-shadow-[1px_1px_0px_rgba(0,0,0,0.8)]">
              {uniqueAuthors} <span className="text-[9px] font-mono font-normal">users</span>
            </b>
          </div>
        </div>

        <div className="mc-slot-dark p-3 flex flex-col md:flex-row items-center gap-3 rounded-sm">
          <div className="w-8 h-8 rounded-sm bg-neutral-800 flex items-center justify-center text-red-500 border border-neutral-700">
            <Heart className="w-4 h-4 fill-red-500" />
          </div>
          <div className="text-center md:text-left">
            <span className="block text-[10px] md:text-xs text-neutral-400 font-mono uppercase tracking-wider">Curtidas</span>
            <b className="font-pixel text-xs md:text-sm text-red-400 drop-shadow-[1px_1px_0px_rgba(0,0,0,0.8)]">
              {totalLikes} <span className="text-[9px] font-mono font-normal">curts</span>
            </b>
          </div>
        </div>
      </div>
    </header>
  );
}

import React, { useEffect, useState } from "react";
import { Hammer, Download, ArrowDown, ExternalLink } from "lucide-react";
import MinecraftHeader from "./components/MinecraftHeader";
import GoogleSheetsPanel from "./components/GoogleSheetsPanel";
import UploadForm from "./components/UploadForm";
import GallerySection from "./components/GallerySection";
import HowItWorks from "./components/HowItWorks";
import { Post } from "./types";
import { fetchPosts } from "./lib/api";

export default function App() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshPosts = async () => {
    setLoading(true);
    try {
      const data = await fetchPosts();
      setPosts(data);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError("Não foi possível sincronizar o acervo. Tente atualizar a página.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshPosts();
  }, []);

  return (
    <div className="min-h-screen flex flex-col justify-between">
      <div>
        {/* Top Header Navigation and Stats Dashboard */}
        <MinecraftHeader posts={posts} onRefresh={refreshPosts} />

        {/* Google Sheets Sync & Backup Control Panel */}
        <GoogleSheetsPanel posts={posts} onRefresh={refreshPosts} />

        {/* Hero Showcase Section */}
        <section className="max-w-6xl mx-auto py-12 md:py-16 px-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 border-2 border-dashed border-mc-gold bg-neutral-950 bg-opacity-40 px-3 py-1.5 rounded-sm">
                <span className="w-2 h-2 rounded-full bg-mc-gold animate-ping"></span>
                <span className="text-[9px] font-pixel text-mc-gold uppercase tracking-wider">
                  Projeto Comunitário Oficial-Fansite
                </span>
              </div>

              <h2 className="text-3xl md:text-5xl text-white font-pixel leading-tight tracking-wide drop-shadow-[4px_4px_0px_rgba(0,0,0,0.9)]">
                Suas construções em <span className="text-mc-gold">.bf</span>,<br />
                prontas pra qualquer mundo!
              </h2>

              <p className="text-sm md:text-base font-mono text-neutral-300 leading-relaxed max-w-xl">
                O <b className="text-mc-diamond">BlockFrame</b> permite exportar e carregar porções do mapa instantaneamente no Mineclonia ou Minetest. 
                Use esta galeria para compartilhar esquemas, descobrir novas construções criadas pela comunidade e fazer backups confiáveis.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4 pt-2">
                <button
                  onClick={() => document.getElementById("enviar")?.scrollIntoView({ behavior: "smooth" })}
                  className="mc-button mc-button-green flex items-center gap-2"
                >
                  <Hammer className="w-4 h-4" />
                  <span>PUBLICAR ESTRUTURA</span>
                </button>

                <button
                  onClick={() => document.getElementById("galeria")?.scrollIntoView({ behavior: "smooth" })}
                  className="mc-button flex items-center gap-2"
                >
                  <span>EXPLORAR GALERIA</span>
                  <ArrowDown className="w-4 h-4 text-mc-gold" />
                </button>
              </div>
            </div>

            {/* Right Showcase: Isometric voxel art block container */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="mc-panel w-full max-w-sm p-6 rounded-sm shadow-2xl bg-neutral-900 bg-opacity-70 relative group hover:scale-[1.02] transition duration-200">
                {/* Glossy corner highlight */}
                <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-white opacity-40"></div>
                <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-neutral-700 opacity-40"></div>

                <div className="aspect-square flex items-center justify-center p-2 relative">
                  {/* Decorative pixel box */}
                  <svg viewBox="0 0 100 100" className="w-64 h-64 filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.65)]">
                    {/* Grid outline */}
                    <polygon points="50,10 85,30 85,70 50,90 15,70 15,30" stroke="#555555" strokeWidth="1.5" fill="none" opacity="0.4" />
                    
                    {/* Golden Oak Log (Isometric Block) */}
                    <g transform="translate(0, -10)">
                      {/* Top Face */}
                      <polygon points="50,20 75,32 50,44 25,32" fill="#84634e" stroke="#000000" strokeWidth="1.5" />
                      {/* Rings details on top */}
                      <polygon points="50,25 65,32 50,39 35,32" fill="#5c4335" />
                      <polygon points="50,29 58,32 50,35 42,32" fill="#3a2c23" />
                      
                      {/* Left Face */}
                      <polygon points="25,32 50,44 50,72 25,60" fill="#5c4335" stroke="#000000" strokeWidth="1.5" />
                      {/* bark texture lines left */}
                      <line x1="33" y1="41" x2="33" y2="64" stroke="#3a2c23" strokeWidth="1" />
                      <line x1="41" y1="45" x2="41" y2="68" stroke="#3a2c23" strokeWidth="1" />
                      
                      {/* Right Face */}
                      <polygon points="75,32 50,44 50,72 75,60" fill="#3a2c23" stroke="#000000" strokeWidth="1.5" />
                      {/* bark texture lines right */}
                      <line x1="58" y1="48" x2="58" y2="68" stroke="#1c1410" strokeWidth="1" />
                      <line x1="66" y1="44" x2="66" y2="64" stroke="#1c1410" strokeWidth="1" />
                    </g>

                    {/* Blue Diamond Block stack */}
                    <g transform="translate(0, 15)">
                      {/* Top Face */}
                      <polygon points="50,20 75,32 50,44 25,32" fill="#4dedf1" stroke="#000000" strokeWidth="1.5" />
                      <polygon points="40,28 60,28 50,38" fill="#ffffff" opacity="0.6" />
                      
                      {/* Left Face */}
                      <polygon points="25,32 50,44 50,72 25,60" fill="#2c8c9c" stroke="#000000" strokeWidth="1.5" />
                      
                      {/* Right Face */}
                      <polygon points="75,32 50,44 50,72 75,60" fill="#14545c" stroke="#000000" strokeWidth="1.5" />
                    </g>
                  </svg>
                </div>

                <div className="mt-4 pt-3 border-t border-neutral-700 text-center">
                  <div className="font-mono text-[10px] text-mc-gold tracking-wide uppercase font-bold">
                    Carregamento in-game:
                  </div>
                  <code className="block bg-black bg-opacity-50 text-mc-diamond font-mono text-xs p-1.5 rounded-sm border border-neutral-800 mt-1">
                    /blockframe_load nome
                  </code>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Global error alert */}
        {error && (
          <div className="max-w-6xl mx-auto px-4 mt-2">
            <div className="border-4 border-black bg-red-950 text-red-200 border-red-700 p-4 font-mono text-xs rounded-sm shadow-md">
              {error}
            </div>
          </div>
        )}

        {/* Publisher/Upload Board */}
        <UploadForm onSuccess={refreshPosts} />

        {/* Gallery Explorer Board */}
        <GallerySection posts={posts} loading={loading} onRefresh={refreshPosts} />

        {/* Comprehensive Guides Panel */}
        <HowItWorks />
      </div>

      {/* Retro Wood Oak Footer */}
      <footer className="border-t-4 border-black bg-neutral-900 py-8 px-4 text-center text-xs font-mono text-neutral-400 mt-16">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="leading-relaxed">
            Acervo não-oficial de construções para o mod{" "}
            <a
              href="https://github.com/wrxxnch/blockframe"
              target="_blank"
              rel="noopener noreferrer"
              className="text-mc-gold hover:underline flex-inline items-center gap-0.5"
            >
              BlockFrame <ExternalLink className="w-3 h-3 inline pb-0.5" />
            </a>{" "}
            disponível no Mineclonia / Minetest.
          </p>
          <div className="flex gap-4">
            <span className="text-neutral-500 uppercase text-[10px]">
              Desenvolvido com carinho para Minecrafters & Minetesters &middot; {new Date().getFullYear()}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

import React from "react";
import { LogOut, RefreshCw, LogIn, BookOpen } from "lucide-react";

export default function HowItWorks() {
  return (
    <section id="sobre" className="max-w-6xl mx-auto py-10 px-4">
      {/* Head section */}
      <div className="flex items-center gap-3 mb-6 border-b-4 border-black pb-3">
        <div className="bg-mc-gold p-2 rounded-sm outline outline-2 outline-black flex-none">
          <BookOpen className="w-5 h-5 text-neutral-900" />
        </div>
        <div>
          <span className="text-[10px] font-pixel text-mc-gold">ETAPA 03 &middot; SUPORTE E GUIA</span>
          <h2 className="text-xl md:text-2xl text-white font-pixel mt-0.5 drop-shadow-[2px_2px_0px_rgba(0,0,0,0.8)]">
            COMO USAR O MOD BLOCKFRAME
          </h2>
        </div>
      </div>

      {/* Steps layout styled with 3D inset slots resembling item frames */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Step 1 */}
        <div className="mc-panel p-6 rounded-sm flex flex-col gap-4 shadow-md bg-stone-100 hover:scale-[1.01] transition duration-150">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-neutral-900 text-mc-gold border-2 border-neutral-700 flex items-center justify-center font-pixel text-sm rounded-sm flex-none shadow-sm">
              01
            </div>
            <h3 className="font-pixel text-[11px] text-neutral-900">EXPORTAR DO JOGO</h3>
          </div>
          <p className="text-xs font-mono text-neutral-700 leading-relaxed">
            Monte sua estrutura no Mineclonia ou Minetest com o mod <b className="text-neutral-950">BlockFrame</b> ativado.
            No chat, use o comando:
            <code className="block bg-neutral-900 text-mc-diamond text-[10px] p-2 mt-2 border border-neutral-700 font-bold overflow-x-auto">
              /blockframe_save nome radius=15
            </code>
            Isso gerará o arquivo <b className="text-mc-gold">nome.bf</b> dentro da subpasta de mundos:
            <code className="block text-[9px] text-neutral-500 mt-1 italic font-semibold">
              minetest/worlds/SEU_MUNDO/blockframes/
            </code>
          </p>
        </div>

        {/* Step 2 */}
        <div className="mc-panel p-6 rounded-sm flex flex-col gap-4 shadow-md bg-stone-100 hover:scale-[1.01] transition duration-150">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-neutral-900 text-mc-emerald border-2 border-neutral-700 flex items-center justify-center font-pixel text-sm rounded-sm flex-none shadow-sm">
              02
            </div>
            <h3 className="font-pixel text-[11px] text-neutral-900">SUBIR ARQUIVO</h3>
          </div>
          <p className="text-xs font-mono text-neutral-700 leading-relaxed">
            Acesse esta plataforma e navegue até a ficha de envio acima.
            Preencha as informações da sua estrutura (tamanho, criador, descrição) e anexe o arquivo <b className="text-mc-gold">.bf</b>.
            Defina uma senha simples e publique. Sua criação ficará gravada para sempre no acervo!
          </p>
        </div>

        {/* Step 3 */}
        <div className="mc-panel p-6 rounded-sm flex flex-col gap-4 shadow-md bg-stone-100 hover:scale-[1.01] transition duration-150">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-neutral-900 text-mc-diamond border-2 border-neutral-700 flex items-center justify-center font-pixel text-sm rounded-sm flex-none shadow-sm">
              03
            </div>
            <h3 className="font-pixel text-[11px] text-neutral-900">IMPORTAR NO JOGO</h3>
          </div>
          <p className="text-xs font-mono text-neutral-700 leading-relaxed">
            Faça download de qualquer arquivo <b className="text-mc-gold">.bf</b> daqui e jogue-o na pasta do seu mundo:
            <code className="block text-[9px] text-neutral-500 mb-2 italic font-semibold">
              minetest/worlds/SEU_MUNDO/blockframes/
            </code>
            Abra o jogo e use o comando para pré-visualizar a rotação/posição:
            <code className="block bg-neutral-900 text-mc-diamond text-[10px] p-2 border border-neutral-700 font-bold overflow-x-auto">
              /blockframe_load nome
            </code>
            Quando estiver satisfeito, use o comando para assentar:
            <code className="block bg-mc-green text-white text-[10px] p-2 mt-2 border border-black shadow-[inset_-1px_-1px_0px_#244c0c] font-bold">
              /blockframe_set
            </code>
          </p>
        </div>
      </div>

      {/* FAQ / Como Conectar Section */}
      <div className="mt-8 mc-panel p-6 bg-neutral-950 border-4 border-black rounded-sm text-white">
        <h3 className="font-pixel text-xs text-mc-gold mb-3 flex items-center gap-1.5 uppercase">
          <span>Dúvidas comuns: Como vou conectar?</span>
        </h3>
        <div className="space-y-4 font-mono text-xs text-neutral-300">
          <div>
            <p className="text-white font-bold mb-1">P: Preciso configurar alguma porta, IP ou conexão direta no jogo?</p>
            <p className="leading-relaxed text-neutral-400">
              Não! O acervo do <b className="text-mc-diamond">BlockFrame</b> funciona de forma desacoplada para máxima segurança e desempenho. Você não precisa conectar seu servidor ou cliente de Minetest diretamente a um banco de dados externo ou URL. Basta baixar os arquivos <b className="text-mc-gold">.bf</b> desejados por aqui e inseri-los manualmente na pasta de dados do seu mundo no jogo.
            </p>
          </div>
          <div className="border-t border-neutral-800 pt-3">
            <p className="text-white font-bold mb-1">P: Como transferir os arquivos se meu servidor está hospedado remotamente (VPS)?</p>
            <p className="leading-relaxed text-neutral-400">
              Você pode transferir os arquivos <b className="text-mc-gold">.bf</b> usando seu cliente FTP preferido (como FileZilla) ou via SFTP/SCP. Envie-os para o diretório correspondente (<code className="text-mc-diamond">/worlds/seu_mundo/blockframes/</code>) e use os comandos normais no chat do jogo.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

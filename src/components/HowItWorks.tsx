import React from "react";
import { BookOpen } from "lucide-react";
import { useLanguage } from "../lib/i18n";

export default function HowItWorks() {
  const { t } = useLanguage();

  return (
    <section id="sobre" className="max-w-6xl mx-auto py-10 px-4">
      {/* Head section */}
      <div className="flex items-center gap-3 mb-6 border-b-4 border-black pb-3">
        <div className="bg-mc-gold p-2 rounded-sm outline outline-2 outline-black flex-none">
          <BookOpen className="w-5 h-5 text-neutral-900" />
        </div>
        <div>
          <span className="text-[10px] font-pixel text-mc-gold">{t.helpStep}</span>
          <h2 className="text-xl md:text-2xl text-white font-pixel mt-0.5 drop-shadow-[2px_2px_0px_rgba(0,0,0,0.8)]">
            {t.helpTitle}
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
            <h3 className="font-pixel text-[11px] text-neutral-900">{t.step1Title}</h3>
          </div>
          <p className="text-xs font-mono text-neutral-700 leading-relaxed">
            {t.step1Desc}
          </p>
        </div>

        {/* Step 2 */}
        <div className="mc-panel p-6 rounded-sm flex flex-col gap-4 shadow-md bg-stone-100 hover:scale-[1.01] transition duration-150">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-neutral-900 text-mc-emerald border-2 border-neutral-700 flex items-center justify-center font-pixel text-sm rounded-sm flex-none shadow-sm">
              02
            </div>
            <h3 className="font-pixel text-[11px] text-neutral-900">{t.step2Title}</h3>
          </div>
          <p className="text-xs font-mono text-neutral-700 leading-relaxed">
            {t.step2Desc}
          </p>
        </div>

        {/* Step 3 */}
        <div className="mc-panel p-6 rounded-sm flex flex-col gap-4 shadow-md bg-stone-100 hover:scale-[1.01] transition duration-150">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-neutral-900 text-mc-diamond border-2 border-neutral-700 flex items-center justify-center font-pixel text-sm rounded-sm flex-none shadow-sm">
              03
            </div>
            <h3 className="font-pixel text-[11px] text-neutral-900">{t.step3Title}</h3>
          </div>
          <p className="text-xs font-mono text-neutral-700 leading-relaxed">
            {t.step3Desc}
          </p>
        </div>
      </div>
    </section>
  );
}

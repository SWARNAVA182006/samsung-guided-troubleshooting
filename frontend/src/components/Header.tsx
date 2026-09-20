import React from "react";
import { Wrench, Cpu, Sparkles } from "lucide-react";

export const Header: React.FC = () => {
  return (
    <header className="border-b border-slate-800 bg-[#0B1536]/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Wrench className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-white tracking-wide">
                SAMSUNG <span className="text-cyan-400 font-light">Guided Troubleshooting Engine</span>
              </h1>
              <span className="px-2 py-0.5 text-[10px] uppercase font-semibold tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full">
                PRISM 3.0
              </span>
            </div>
            <p className="text-xs text-slate-400">Theme 2: Intelligent Device Diagnostics & Deeplink Resolution</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/50 text-slate-300">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>Fastify Node + FastAPI Python</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/50 text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            <span>Grounded Gemini + 578 Deeplinks</span>
          </div>
        </div>
      </div>
    </header>
  );
};

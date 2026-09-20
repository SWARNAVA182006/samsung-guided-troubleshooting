import React from "react";
import { Loader2, Sparkles, Database, CheckCircle2 } from "lucide-react";

export const LoadingView: React.FC = () => {
  return (
    <div className="bg-[#1C2541] rounded-2xl p-8 border border-slate-700/60 shadow-xl text-center space-y-6">
      <div className="relative inline-flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-blue-600/20 border border-cyan-400/30 flex items-center justify-center animate-pulse">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white">Analyzing Complaint & Grounding SIIS Knowledge</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          Executing Gemini API structured generation and semantic deeplink retrieval against official Samsung catalog.
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-2.5 text-left text-xs text-slate-300">
        <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/50">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Validated incoming query & SIIS article contract</span>
        </div>
        <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/50">
          <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
          <span>Grounded Gemini diagnostic extraction...</span>
        </div>
        <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/50">
          <Database className="w-4 h-4 text-cyan-400" />
          <span>Matching official 578-entry Samsung deeplinks...</span>
        </div>
      </div>
    </div>
  );
};

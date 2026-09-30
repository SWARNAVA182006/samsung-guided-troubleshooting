import React from "react";
import { BookOpen, Layers } from "lucide-react";
import { SIISPayload } from "../types";

export interface BenchmarkCase {
  id: string;
  query: string;
  siis_response: SIISPayload;
}

interface BenchmarkSelectorProps {
  cases: BenchmarkCase[];
  onSelect: (caseItem: BenchmarkCase) => void;
  selectedId?: string;
}

export const BenchmarkSelector: React.FC<BenchmarkSelectorProps> = ({
  cases,
  onSelect,
  selectedId,
}) => {
  if (!cases || cases.length === 0) return null;

  return (
    <div className="surface-card rounded-2xl p-4 border border-slate-200/80 dark:border-white/10 shadow-xl mb-6">
      <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
        <BookOpen className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
        <span>Official Samsung SIIS Benchmark Presets ({cases.length} Cases)</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
        {cases.map((c) => {
          const isSelected = selectedId === c.id;
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c)}
              className={`text-left p-3 rounded-xl border text-xs transition-all duration-200 flex flex-col justify-between gap-1.5 ${
                isSelected
                  ? "bg-blue-600/10 dark:bg-blue-600/30 border-cyan-500 dark:border-cyan-400 text-slate-900 dark:text-white shadow-md shadow-blue-500/10"
                  : "bg-slate-100/80 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              <div className="font-semibold text-blue-700 dark:text-cyan-300 truncate">
                [{c.id}] {c.siis_response.title}
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                "{c.query}"
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

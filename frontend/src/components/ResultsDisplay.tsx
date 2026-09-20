import React from "react";
import { CheckCircle, ExternalLink, ShieldCheck, Tag, Layers, ChevronRight, Info } from "lucide-react";
import { ContextDeeplinkResponse, Deeplink, ValidationDeepLink } from "../types";

interface ResultsDisplayProps {
  response: ContextDeeplinkResponse;
}

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ response }) => {
  if (!response || !response.contexts || response.contexts.length === 0) {
    return (
      <div className="bg-[#1C2541] rounded-2xl p-6 border border-slate-700/60 shadow-xl text-slate-400 text-sm">
        No diagnostic goals produced.
      </div>
    );
  }

  const goal = response.contexts[0];

  const renderCategoryBadge = (cat?: string) => {
    switch (cat) {
      case "auto":
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            AUTO
          </span>
        );
      case "critical":
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-500/20 text-red-300 border border-red-500/30">
            CRITICAL
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-700 text-slate-300 border border-slate-600">
            MANUAL
          </span>
        );
    }
  };

  const handleDeeplinkClick = (dl: Deeplink) => {
    alert(
      `Samsung Device Deeplink URI:\n${dl.deeplink}\n\nDescription:\n${dl.description}\n\n(Note: Custom URI schemes like bixby:// are intended for native Android device Settings execution).`
    );
  };

  return (
    <div className="space-y-6">
      {/* Goal Header */}
      <div className="bg-[#1C2541] rounded-2xl p-6 border border-slate-700/60 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/60 pb-3">
          <div>
            <div className="text-xs uppercase font-semibold tracking-wider text-cyan-400">
              Grounded Diagnostic Goal
            </div>
            <h2 className="text-xl font-bold text-white mt-1">{goal.title}</h2>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-950/60 border border-blue-500/30 text-blue-300 text-xs font-mono">
            <span>Relevance Score: {goal.score}</span>
          </div>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed italic">{goal.goal}</p>
      </div>

      {/* Actions List */}
      <div className="space-y-4">
        <div className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span>Recommended Diagnostic Actions ({goal.actions.length})</span>
        </div>

        {goal.actions.map((act, idx) => (
          <div
            key={idx}
            className="bg-[#1C2541] rounded-2xl p-6 border border-slate-700/60 shadow-xl space-y-4 hover:border-slate-600 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-cyan-400 font-semibold">Action #{idx + 1}</span>
                  {renderCategoryBadge(act.category)}
                </div>
                <h3 className="text-lg font-bold text-white mt-1">{act.actionName}</h3>
                <p className="text-xs text-slate-300 mt-1">{act.description}</p>
              </div>
            </div>

            {/* Step Groups */}
            <div className="space-y-3 pt-3 border-t border-slate-800">
              {act.stepGroups.map((sg, sgIdx) => (
                <div
                  key={sgIdx}
                  className="bg-[#0B132B]/80 rounded-xl p-4 border border-slate-800 space-y-3"
                >
                  <ul className="space-y-2 text-xs text-slate-200">
                    {sg.steps.map((st, stIdx) => (
                      <li key={stIdx} className="flex items-start gap-2 leading-relaxed">
                        <ChevronRight className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span>{st}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Actionable Deeplink */}
                  {sg.actionableDeeplink && (
                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 bg-blue-950/40 p-3 rounded-lg border border-blue-500/20">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-300">
                          <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Actionable Samsung Settings Deeplink</span>
                        </div>
                        <div className="text-[11px] text-slate-400">{sg.actionableDeeplink.description}</div>
                        <div className="text-[10px] font-mono text-cyan-400/90">{sg.actionableDeeplink.deeplink}</div>
                      </div>

                      <button
                        onClick={() => handleDeeplinkClick(sg.actionableDeeplink!)}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors shadow-sm flex items-center gap-1.5"
                      >
                        <span>Open Setting</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* Validation Deeplink */}
                  {sg.validationDeeplink && (
                    <div className="pt-2 flex items-center gap-2 text-[11px] text-emerald-400 bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-500/20">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <div>
                        <span className="font-semibold">Validation Check:</span> {sg.validationDeeplink.key} (
                        {sg.validationDeeplink.condition} {sg.validationDeeplink.value})
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Layers,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Copy,
  Sliders,
  Check,
  ArrowUpRight,
  Sparkles,
  Info,
  HelpCircle,
} from "lucide-react";
import { ContextDeeplinkResponse, Deeplink, ValidationDeepLink } from "../types";

interface ResultsDisplayProps {
  response: ContextDeeplinkResponse;
  onCopyDeeplink: (uri: string) => void;
  onSaveHistory?: () => void;
}

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({
  response,
  onCopyDeeplink,
}) => {
  const [viewMode, setViewMode] = useState<"guided" | "overview">("guided");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedStepIds, setCompletedStepIds] = useState<Set<string>>(new Set());
  const [copiedUri, setCopiedUri] = useState<string | null>(null);
  const [isFinished, setIsFinished] = useState(false);

  if (!response || !response.contexts || response.contexts.length === 0) {
    return (
      <div className="bg-white dark:bg-[#1C2541] rounded-2xl p-8 border border-slate-200 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 text-center">
        No diagnostic steps produced. Please try rephrasing your problem.
      </div>
    );
  }

  const goal = response.contexts[0];
  const actions = goal.actions || [];

  // Flatten steps for guided step-by-step mode
  const allFlatSteps: Array<{
    actionName: string;
    actionIndex: number;
    stepGroupIndex: number;
    stepIndex: number;
    stepText: string;
    stepId: string;
    actionableDeeplink?: Deeplink | null;
    validationDeeplink?: ValidationDeepLink | null;
  }> = [];

  actions.forEach((act, aIdx) => {
    act.stepGroups.forEach((sg, sgIdx) => {
      sg.steps.forEach((st, sIdx) => {
        allFlatSteps.push({
          actionName: act.actionName,
          actionIndex: aIdx,
          stepGroupIndex: sgIdx,
          stepIndex: sIdx,
          stepText: st,
          stepId: `${aIdx}-${sgIdx}-${sIdx}`,
          actionableDeeplink: sg.actionableDeeplink,
          validationDeeplink: sg.validationDeeplink,
        });
      });
    });
  });

  const totalSteps = allFlatSteps.length;
  const currentStep = allFlatSteps[currentStepIndex] || allFlatSteps[0];

  // Keyboard navigation for step mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewMode !== "guided" || isFinished) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        if (currentStepIndex < totalSteps - 1) {
          setCurrentStepIndex((prev) => prev + 1);
        } else {
          setIsFinished(true);
        }
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        setCurrentStepIndex((prev) => Math.max(0, prev - 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewMode, currentStepIndex, totalSteps, isFinished]);

  const handleCopy = (uri: string) => {
    onCopyDeeplink(uri);
    setCopiedUri(uri);
    setTimeout(() => setCopiedUri(null), 2000);
  };

  const handleToggleStepCompletion = (stepId: string) => {
    setCompletedStepIds((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  const renderCategoryBadge = (cat?: string) => {
    switch (cat) {
      case "auto":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            AUTO
          </span>
        );
      case "critical":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
            CRITICAL
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            MANUAL
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in select-none">
      {/* PROBLEM UNDERSTOOD & GOAL HEADER */}
      <div className="bg-white dark:bg-[#151F42] rounded-2xl sm:rounded-3xl p-6 border border-slate-200 dark:border-slate-700/60 shadow-xl space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-700/60 pb-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-blue-500/10 text-cyan-600 dark:text-cyan-400 border border-blue-500/20">
                Problem Understood
              </span>
              <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Grounded Samsung Fix</span>
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug">
              {goal.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed italic">
              "{goal.goal}"
            </p>
          </div>

          <div className="flex flex-col items-end gap-1">
            <div className="px-3 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-500/30 text-xs font-mono text-blue-700 dark:text-cyan-300 font-semibold shadow-sm">
              Match Quality: {(goal.score * 100).toFixed(0)}%
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 text-right">
              Official catalog similarity
            </span>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2 font-medium">
            <Layers className="w-4 h-4 text-cyan-500" />
            <span>
              {actions.length} Action Step{actions.length !== 1 ? "s" : ""} •{" "}
              {totalSteps} Guided Step{totalSteps !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => {
                setViewMode("guided");
                setIsFinished(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === "guided"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Step-by-Step Guide</span>
            </button>
            <button
              onClick={() => setViewMode("overview")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "overview"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              All Actions Overview
            </button>
          </div>
        </div>
      </div>

      {/* COMPLETION CARD (MATCHING REFERENCE 1 COMPLETION CARD) */}
      {viewMode === "guided" && isFinished && (
        <div className="bg-white dark:bg-[#151F42] rounded-2xl sm:rounded-3xl p-8 border border-slate-200 dark:border-slate-700/60 shadow-2xl text-center space-y-6 animate-fade-in max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <Check className="w-10 h-10 stroke-[3]" />
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">You're all set!</h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
              Hope this helps. If the issue persists, try reviewing the steps again or rephrase your complaint.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setIsFinished(false)}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all"
            >
              Review Steps
            </button>
            <button
              onClick={() => {
                setCurrentStepIndex(0);
                setIsFinished(false);
                setCompletedStepIds(new Set());
              }}
              className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-700 transition-all"
            >
              Restart Guide
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODE 1: STEP-BY-STEP GUIDED INTERACTION (REFERENCE MATCH)*/}
      {/* ======================================================== */}
      {viewMode === "guided" && !isFinished && totalSteps > 0 && currentStep && (
        <div className="bg-white dark:bg-[#151F42] rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700/60 shadow-2xl space-y-6">
          {/* Step Header */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 pb-4">
            <div className="space-y-0.5">
              <div className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                Action {currentStep.actionIndex + 1} of {actions.length}: {currentStep.actionName}
              </div>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-300">
                Step {currentStepIndex + 1} of {totalSteps}
              </div>
            </div>

            <button
              onClick={() => {
                setCurrentStepIndex(0);
                setCompletedStepIds(new Set());
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
              title="Restart step-by-step guide"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restart</span>
            </button>
          </div>

          {/* Step Progress Bar */}
          <div className="space-y-2">
            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-300"
                style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              <span>Step 1</span>
              <span>{Math.round(((currentStepIndex + 1) / totalSteps) * 100)}% Completed</span>
              <span>Step {totalSteps}</span>
            </div>
          </div>

          {/* Current Step Content Box */}
          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-start gap-3.5">
              <button
                onClick={() => handleToggleStepCompletion(currentStep.stepId)}
                className={`mt-0.5 w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
                  completedStepIds.has(currentStep.stepId)
                    ? "bg-emerald-500 border-emerald-400 text-slate-950"
                    : "border-slate-400 dark:border-slate-600 hover:border-cyan-500 text-transparent"
                }`}
                aria-label={completedStepIds.has(currentStep.stepId) ? "Mark step incomplete" : "Mark step completed"}
              >
                <Check className="w-3.5 h-3.5" />
              </button>

              <div className="flex-1 space-y-2">
                <p className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 leading-relaxed">
                  {currentStep.stepText}
                </p>

                {completedStepIds.has(currentStep.stepId) && (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Completed</span>
                  </span>
                )}
              </div>
            </div>

            {/* Actionable Settings Deeplink Presentation */}
            {currentStep.actionableDeeplink && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 bg-blue-50 dark:bg-blue-950/40 p-4 rounded-xl border border-blue-200 dark:border-blue-500/20">
                <div className="space-y-1 max-w-md">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-300">
                    <ExternalLink className="w-3.5 h-3.5 text-cyan-500" />
                    <span>Samsung Settings Shortcut</span>
                  </div>
                  <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                    {currentStep.actionableDeeplink.description}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(currentStep.actionableDeeplink!.deeplink)}
                    className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-all flex items-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedUri === currentStep.actionableDeeplink!.deeplink ? "Copied ✓" : "Copy URI"}</span>
                  </button>

                  <button
                    onClick={() => handleCopy(currentStep.actionableDeeplink!.deeplink)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center gap-1.5"
                  >
                    <span>Open Settings</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Why This Helps Context Card (Reference Match) */}
            <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                <HelpCircle className="w-3.5 h-3.5 text-cyan-500" />
                <span>Why this helps</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                This action helps verify your device settings and resolve common hardware or software conflicts safely.
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between gap-4 pt-2">
            <button
              onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentStepIndex === 0}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all ${
                currentStepIndex === 0
                  ? "bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800 cursor-not-allowed"
                  : "bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700"
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleToggleStepCompletion(currentStep.stepId)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                  completedStepIds.has(currentStep.stepId)
                    ? "bg-emerald-600 text-white border-emerald-500"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                {completedStepIds.has(currentStep.stepId) ? "✓ Done" : "Mark Done"}
              </button>

              {currentStepIndex < totalSteps - 1 ? (
                <button
                  onClick={() => setCurrentStepIndex((prev) => Math.min(totalSteps - 1, prev + 1))}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center gap-1.5"
                >
                  <span>Next Step</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => setIsFinished(true)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-500/20 active:scale-[0.98] transition-all flex items-center gap-1.5"
                >
                  <span>Finish Guide</span>
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODE 2: OVERVIEW MODE (FULL ACTION LIST)                */}
      {/* ======================================================== */}
      {viewMode === "overview" && (
        <div className="space-y-4">
          {actions.map((act, actIdx) => (
            <div
              key={actIdx}
              className="bg-white dark:bg-[#151F42] rounded-2xl sm:rounded-3xl p-6 border border-slate-200 dark:border-slate-700/60 shadow-xl space-y-4 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">
                      ACTION {String(actIdx + 1).padStart(2, "0")}
                    </span>
                    {renderCategoryBadge(act.category)}
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    {act.actionName}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {act.description}
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                {act.stepGroups.map((sg, sgIdx) => (
                  <div
                    key={sgIdx}
                    className="bg-slate-50 dark:bg-slate-950/70 rounded-xl p-4 border border-slate-200 dark:border-slate-800/80 space-y-3"
                  >
                    <ul className="space-y-2 text-xs text-slate-800 dark:text-slate-200">
                      {sg.steps.map((st, stIdx) => (
                        <li key={stIdx} className="flex items-start gap-2.5 leading-relaxed">
                          <span className="flex-shrink-0 w-4 h-4 rounded-full bg-blue-500/10 text-blue-600 dark:text-cyan-400 text-[10px] font-bold flex items-center justify-center mt-0.5">
                            {stIdx + 1}
                          </span>
                          <span>{st}</span>
                        </li>
                      ))}
                    </ul>

                    {sg.actionableDeeplink && (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 bg-blue-50 dark:bg-blue-950/40 p-3.5 rounded-xl border border-blue-200 dark:border-blue-500/20">
                        <div className="space-y-0.5 max-w-md">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-300">
                            <ExternalLink className="w-3.5 h-3.5 text-cyan-500" />
                            <span>Samsung Settings Shortcut</span>
                          </div>
                          <div className="text-[11px] text-slate-700 dark:text-slate-300">
                            {sg.actionableDeeplink.description}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopy(sg.actionableDeeplink!.deeplink)}
                            className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-all flex items-center gap-1.5"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{copiedUri === sg.actionableDeeplink!.deeplink ? "Copied ✓" : "Copy URI"}</span>
                          </button>

                          <button
                            onClick={() => handleCopy(sg.actionableDeeplink!.deeplink)}
                            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs transition-all shadow-sm flex items-center gap-1.5 active:scale-[0.98]"
                          >
                            <span>Open Settings</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

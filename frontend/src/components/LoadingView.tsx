import React, { useState, useEffect } from "react";
import { Loader2, CheckCircle2, Sparkles, Database } from "lucide-react";

export const LoadingView: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setActiveStep(1), 800);
    const t2 = setTimeout(() => setActiveStep(2), 1800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const progressSteps = [
    { label: "Understanding device complaint & context", icon: CheckCircle2 },
    { label: "Grounding steps in official Samsung SIIS articles", icon: Sparkles },
    { label: "Matching direct Samsung Settings shortcuts", icon: Database },
  ];

  return (
    <div
      className="bg-white dark:bg-[#1C2541] rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700/60 shadow-xl text-center space-y-6 animate-fade-in"
      role="status"
      aria-live="polite"
    >
      <div className="relative inline-flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-cyan-400/30 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Building Your Guided Solution
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
          Analyzing problem symptoms and retrieving official Samsung action steps...
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-2.5 text-left text-xs text-slate-700 dark:text-slate-300">
        {progressSteps.map((step, idx) => {
          const isDone = idx <= activeStep;
          const Icon = step.icon;
          return (
            <div
              key={idx}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${
                isDone
                  ? "bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                  : "bg-slate-50/50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800/40 text-slate-400 dark:text-slate-500"
              }`}
            >
              <Icon
                className={`w-4 h-4 flex-shrink-0 ${
                  isDone ? "text-cyan-500" : "text-slate-400 dark:text-slate-600"
                }`}
              />
              <span className="font-medium">{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

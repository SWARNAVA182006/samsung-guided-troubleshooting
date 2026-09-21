import React, { useState } from "react";
import {
  ArrowRight,
  Smartphone,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Wrench,
  ExternalLink,
  BatteryCharging,
  Wifi,
  Camera,
  Sparkles,
  Heart,
  Layers,
} from "lucide-react";
import { PresetCase } from "../types";
import logoImg from "../assets/samsung_logo.png";

interface HomeScreenProps {
  onStartWithPreset: (presetId: string) => void;
  onStartWithCustomQuery: (query: string) => void;
  presets: PresetCase[];
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onStartWithPreset,
  onStartWithCustomQuery,
}) => {
  const [complaintText, setComplaintText] = useState("");

  const quickExamples = [
    {
      label: "Wi-Fi keeps disconnecting",
      presetId: "row_5",
      icon: Wifi,
    },
    {
      label: "Battery drains quickly",
      presetId: "row_6",
      icon: BatteryCharging,
    },
    {
      label: "Camera not working",
      presetId: "row_4",
      icon: Camera,
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (complaintText.trim()) {
      onStartWithCustomQuery(complaintText.trim());
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-4 sm:py-6 animate-fade-in select-none">
      {/* HERO BANNER MATCHING REFERENCE 1 & 2 */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900/40 via-slate-900/90 to-blue-950/60 border border-slate-200/20 dark:border-slate-800 p-6 sm:p-10 shadow-2xl">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-20 pointer-events-none hidden md:block">
          <div className="w-full h-full bg-gradient-to-l from-cyan-500/30 via-blue-600/20 to-transparent blur-2xl" />
        </div>

        <div className="relative z-10 max-w-2xl space-y-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-cyan-400" />
            </div>
            <span className="text-xs font-semibold text-cyan-400 font-mono tracking-wide">
              Good to see you!
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
              Fix your Samsung <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-cyan-400 bg-clip-text text-transparent">problem.</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-lg">
              Describe what's happening and we'll guide you through the next steps with clear instructions and native Settings links.
            </p>
          </div>

          {/* PRIMARY INPUT AREA (HICK'S & FITTS' LAW) */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative flex items-center">
              <input
                type="text"
                value={complaintText}
                onChange={(e) => setComplaintText(e.target.value)}
                placeholder="Tell us what's wrong..."
                className="w-full pl-5 pr-14 py-4 rounded-2xl bg-white/95 dark:bg-[#0B132B]/95 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm sm:text-base focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all shadow-inner"
              />
              <button
                type="submit"
                disabled={!complaintText.trim()}
                className={`absolute right-2 p-3 rounded-xl transition-all duration-200 flex items-center justify-center shadow-lg ${
                  complaintText.trim()
                    ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-blue-500/25 active:scale-95"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                }`}
                aria-label="Find solution"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* EXAMPLE PILLS */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mr-1">
                Try an example:
              </span>
              {quickExamples.map((issue) => {
                const Icon = issue.icon;
                return (
                  <button
                    key={issue.presetId}
                    type="button"
                    onClick={() => onStartWithPreset(issue.presetId)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white transition-all shadow-sm"
                  >
                    <Icon className="w-3.5 h-3.5 text-cyan-500" />
                    <span>{issue.label}</span>
                  </button>
                );
              })}
            </div>
          </form>
        </div>
      </div>

      {/* VALUE BADGES STRIP MATCHING REFERENCE BOARD */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Simple", desc: "Plain human steps", icon: Sparkles },
          { label: "Reliable", desc: "Grounded SIIS articles", icon: ShieldCheck },
          { label: "Human-Centered", desc: "No complex tech jargon", icon: Heart },
          { label: "Samsung Inspired", desc: "578 native Settings shortcuts", icon: Layers },
        ].map(({ label, desc, icon: Icon }) => (
          <div
            key={label}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-start gap-3 shadow-sm"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-cyan-500 flex-shrink-0">
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">{label}</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* THREE CORE PRODUCT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-cyan-500">
            <Wrench className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Clear Step-by-Step Fixes</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Break down complex device issues into simple, numbered instructions you can follow easily.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
            <ExternalLink className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Direct Settings Links</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Open the exact Samsung device Settings screen directly without searching manually.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Official Samsung Guidance</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            All steps are strictly grounded in official Samsung Internal Information Store articles.
          </p>
        </div>
      </div>
    </div>
  );
};

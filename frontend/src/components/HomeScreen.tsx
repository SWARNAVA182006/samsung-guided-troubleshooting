import React, { useState } from "react";
import {
  ArrowRight,
  ShieldCheck,
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
    { label: "Wi-Fi keeps disconnecting", presetId: "row_5", icon: Wifi },
    { label: "Battery drains quickly",    presetId: "row_6", icon: BatteryCharging },
    { label: "Camera not working",        presetId: "row_4", icon: Camera },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (complaintText.trim()) onStartWithCustomQuery(complaintText.trim());
  };

  const valueBadges = [
    { label: "Simple",           desc: "Plain human steps",          icon: Sparkles, iconBg: "bg-cyan-500/15 dark:bg-cyan-500/20",   iconColor: "text-cyan-600 dark:text-cyan-300",   border: "border-cyan-400/20" },
    { label: "Reliable",         desc: "Grounded SIIS articles",     icon: ShieldCheck, iconBg: "bg-emerald-500/15 dark:bg-emerald-500/20", iconColor: "text-emerald-600 dark:text-emerald-300", border: "border-emerald-400/20" },
    { label: "Human-Centered",   desc: "No complex tech jargon",     icon: Heart,    iconBg: "bg-pink-500/15 dark:bg-pink-500/20",    iconColor: "text-pink-600 dark:text-pink-300",   border: "border-pink-400/20" },
    { label: "Samsung Inspired", desc: "578 native Settings shortcuts", icon: Layers, iconBg: "bg-blue-500/15 dark:bg-blue-500/20",   iconColor: "text-blue-600 dark:text-blue-300",   border: "border-blue-400/20" },
  ];

  const productCards = [
    {
      icon: Wrench,
      iconBg: "bg-blue-500/15 dark:bg-blue-500/20",
      iconColor: "text-blue-600 dark:text-blue-300",
      border: "border-blue-400/20",
      title: "Clear Step-by-Step Fixes",
      desc: "Break down complex device issues into simple, numbered instructions you can follow easily.",
    },
    {
      icon: ExternalLink,
      iconBg: "bg-emerald-500/15 dark:bg-emerald-500/20",
      iconColor: "text-emerald-600 dark:text-emerald-300",
      border: "border-emerald-400/20",
      title: "Direct Settings Links",
      desc: "Open the exact Samsung device Settings screen directly without searching manually.",
    },
    {
      icon: ShieldCheck,
      iconBg: "bg-purple-500/15 dark:bg-purple-500/20",
      iconColor: "text-purple-600 dark:text-purple-300",
      border: "border-purple-400/20",
      title: "Official Samsung Guidance",
      desc: "All steps are strictly grounded in official Samsung Internal Information Store articles.",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-4 sm:py-6 animate-fade-in select-none">

      {/* ── HERO BANNER ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 border border-white/10 p-6 sm:p-10 shadow-2xl">
        {/* Ambient orbs */}
        <div className="absolute right-0 top-0 w-72 h-72 rounded-full bg-cyan-500/12 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-56 h-56 rounded-full bg-blue-600/18 blur-2xl pointer-events-none" />
        {/* Top edge shimmer */}
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.30), transparent)" }} />

        <div className="relative z-10 max-w-2xl space-y-5">
          {/* Eyebrow */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
            </div>
            <span className="text-xs font-semibold text-cyan-300 font-mono tracking-wide">
              Good to see you!
            </span>
          </div>

          {/* Headline — always white on this dark hero */}
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Fix your Samsung{" "}
              <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-sky-400 bg-clip-text text-transparent">
                problem.
              </span>
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed max-w-lg">
              Describe what's happening and we'll guide you through the next steps with
              clear instructions and native Settings links.
            </p>
          </div>

          {/* ── SEARCH FORM ─────────────────────────────────────── */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Pure relative wrapper — button is strictly inside input bounds */}
            <div className="relative">
              <input
                type="text"
                value={complaintText}
                onChange={(e) => setComplaintText(e.target.value)}
                placeholder="Tell us what's wrong with your device..."
                className="w-full pl-5 pr-[60px] py-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/18 text-white placeholder-slate-400 text-sm sm:text-base focus:outline-none focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20 transition-colors"
              />
              {/* Arrow button — no translateY hover (removes jump) */}
              <button
                type="submit"
                disabled={!complaintText.trim()}
                aria-label="Find solution"
                className={`absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-150 active:scale-95 ${
                  complaintText.trim()
                    ? "bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-md shadow-blue-500/30 hover:from-blue-400 hover:to-cyan-400"
                    : "bg-white/10 text-slate-500 cursor-not-allowed"
                }`}
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Quick example pills */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <span className="text-[11px] font-medium text-slate-400">Try:</span>
              {quickExamples.map((issue) => {
                const Icon = issue.icon;
                return (
                  <button
                    key={issue.presetId}
                    type="button"
                    onClick={() => onStartWithPreset(issue.presetId)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-400/40 text-xs font-semibold text-slate-300 hover:text-white transition-all btn-interactive"
                  >
                    <Icon className="w-3 h-3 text-cyan-400" />
                    <span>{issue.label}</span>
                  </button>
                );
              })}
            </div>
          </form>
        </div>
      </div>

      {/* ── VALUE BADGES ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {valueBadges.map(({ label, desc, icon: Icon, iconBg, iconColor, border }) => (
          <div
            key={label}
            className="surface-card p-4 rounded-2xl flex items-start gap-3"
          >
            <div className={`w-8 h-8 rounded-xl ${iconBg} border ${border} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-4 h-4 ${iconColor}`} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{label}</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── PRODUCT CARDS ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {productCards.map(({ icon: Icon, iconBg, iconColor, border, title, desc }) => (
          <div key={title} className="surface-card p-5 rounded-2xl space-y-3">
            <div className={`w-10 h-10 rounded-xl ${iconBg} border ${border} flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">{title}</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

import React from "react";
import {
  Sun,
  Moon,
  Menu,
  PlusCircle,
} from "lucide-react";
import { NavigationTab, ThemeMode } from "../types";
import { Logo } from "./Logo";

interface TopHeaderProps {
  activeTab: NavigationTab;
  themeMode: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
  onNewSession: () => void;
  onToggleMobileMenu?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeTab,
  themeMode,
  onThemeChange,
  onNewSession,
  onToggleMobileMenu,
}) => {
  const getTabTitle = () => {
    switch (activeTab) {
      case "home":        return "Device Support Assistant";
      case "troubleshoot": return "Guided Troubleshooting Engine";
      case "history":     return "Saved Troubleshooting Sessions";
      case "how-it-works": return "How Guided Assistant Works";
      case "settings":    return "Settings & System Health";
      default:            return "Samsung Guided Assistant";
    }
  };

  const getTabSubtitle = () => {
    switch (activeTab) {
      case "home":        return "Simple, grounded solutions for Samsung Galaxy phones and tablets";
      case "troubleshoot": return "Step-by-step action guides connected to native Samsung Settings screens";
      case "history":     return "View and restore your past troubleshooting sessions";
      case "how-it-works": return "Human-first explanation of complaint extraction and catalog matching";
      case "settings":    return "Manage appearance preferences and verify system connection status";
      default:            return "";
    }
  };

  return (
    <header
      className="sticky top-0 z-30 px-4 sm:px-6 py-3 glass-panel border-b border-slate-200/70 dark:border-white/10 flex items-center justify-between gap-4 select-none"
      style={{ backdropFilter: "blur(32px) saturate(200%)" }}
    >
      {/* Top glass shimmer */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)",
        }}
      />

      {/* Mobile Menu Button + Header Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 btn-interactive"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Small mobile logo mark */}
        <div className="lg:hidden">
          <Logo size="sm" showText={false} />
        </div>

        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2 truncate">
            <span className="truncate">{getTabTitle()}</span>
            <span className="hidden sm:inline-flex flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-blue-500/12 text-cyan-600 dark:text-cyan-300 border border-blue-500/20 shimmer-badge">
              PRISM 3.0
            </span>
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block truncate">
            {getTabSubtitle()}
          </p>
        </div>
      </div>

      {/* Action Controls: Theme Switcher & New Session */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {/* Theme Mode Toggle Pill — glass style */}
        <div
          className="flex items-center p-1 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 backdrop-blur-sm"
          role="radiogroup"
          aria-label="Select theme mode"
        >
          {[
            { mode: "light" as ThemeMode, icon: Sun, label: "Light Mode" },
            { mode: "dark" as ThemeMode, icon: Moon, label: "Dark Mode" },
          ].map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => onThemeChange(mode)}
              className={`p-1.5 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 ${
                themeMode === mode
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50"
              }`}
              title={label}
              aria-label={label}
              aria-checked={themeMode === mode}
              role="radio"
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>

        {/* New Session Button */}
        <button
          onClick={onNewSession}
          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-[0.97] transition-all flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 btn-interactive"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Fix Session</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>
    </header>
  );
};

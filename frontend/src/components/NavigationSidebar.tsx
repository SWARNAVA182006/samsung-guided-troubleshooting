import React, { useState } from "react";
import {
  Home,
  Wrench,
  History,
  BookOpen,
  Settings,
  ChevronRight,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { NavigationTab } from "../types";
import { Logo } from "./Logo";

interface NavigationSidebarProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  backendHealthy: boolean | null;
  historyCount: number;
}

export const NavigationSidebar: React.FC<NavigationSidebarProps> = ({
  activeTab,
  onTabChange,
  backendHealthy,
  historyCount,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const navItems = [
    { id: "home" as NavigationTab, label: "Home", icon: Home },
    { id: "troubleshoot" as NavigationTab, label: "Troubleshoot", icon: Wrench, badge: "One UI" },
    { id: "history" as NavigationTab, label: "Saved Sessions", icon: History, count: historyCount },
    { id: "how-it-works" as NavigationTab, label: "How It Works", icon: BookOpen },
    { id: "settings" as NavigationTab, label: "Settings", icon: Settings },
  ];

  return (
    <aside
      className={`relative flex-shrink-0 flex flex-col glass-panel border-r border-slate-200/70 dark:border-white/8 h-full select-none sidebar-slide ${
        isCollapsed ? "w-[68px]" : "w-[240px]"
      }`}
      aria-label="Main Navigation"
    >
      {/* ── LOGO HEADER ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 px-3 pt-4 pb-3 border-b border-slate-200/60 dark:border-white/8">
        {/* Logo row */}
        <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3"}`}>
          <Logo size="sm" showText={false} />
          {!isCollapsed && (
            <div className="flex flex-col min-w-0 animate-fade-in">
              <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 leading-none">
                Samsung Assistant
              </span>
              <span className="text-[12px] font-extrabold text-slate-900 dark:text-white leading-tight mt-0.5 truncate">
                Guided Troubleshooting
              </span>
              <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">
                PRISM 3.0 · AI Engine
              </span>
            </div>
          )}
        </div>

        {/* Collapse toggle — always on its own row, centred */}
        <button
          onClick={() => setIsCollapsed((prev) => !prev)}
          className={`flex items-center gap-1.5 self-stretch justify-center py-1.5 px-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/8 border border-slate-200/60 dark:border-white/8 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 btn-interactive text-[10px] font-semibold`}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-3.5 h-3.5 text-cyan-500" />
          ) : (
            <>
              <PanelLeftClose className="w-3.5 h-3.5" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>

      {/* ── NAV ITEMS ───────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1" aria-label="Sidebar Menu">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center rounded-xl text-left transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-cyan-500/40 btn-interactive ${
                isCollapsed ? "justify-center p-3" : "justify-between px-3 py-2.5"
              } ${
                isActive
                  ? "bg-blue-600/12 dark:bg-blue-500/20 border border-blue-300/70 dark:border-blue-400/30 shadow-sm"
                  : "border border-transparent hover:bg-slate-100/80 dark:hover:bg-white/6"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Icon pill */}
                <div
                  className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                    isActive
                      ? "bg-blue-600 shadow-sm shadow-blue-500/30"
                      : "bg-slate-100/80 dark:bg-white/8 group-hover:bg-slate-200/80 dark:group-hover:bg-white/12"
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 ${
                      isActive
                        ? "text-white"
                        : "text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200"
                    }`}
                  />
                </div>

                {!isCollapsed && (
                  <span
                    className={`text-[12px] font-bold leading-none truncate ${
                      isActive
                        ? "text-slate-900 dark:text-white"
                        : "text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white"
                    }`}
                  >
                    {item.label}
                  </span>
                )}
              </div>

              {!isCollapsed && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {"badge" in item && item.badge && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold tracking-wide uppercase bg-cyan-500/12 dark:bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/25 shimmer-badge">
                      {item.badge}
                    </span>
                  )}
                  {"count" in item && typeof item.count === "number" && item.count > 0 && (
                    <span className="min-w-[20px] px-1.5 py-0.5 rounded-full text-center text-[10px] font-mono font-extrabold bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-slate-200">
                      {item.count}
                    </span>
                  )}
                  {isActive && (
                    <ChevronRight className="w-3 h-3 text-blue-600 dark:text-cyan-400" />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── FOOTER STATUS ───────────────────────────────────────────── */}
      <div className="px-2 pb-3 pt-2 border-t border-slate-200/60 dark:border-white/8 space-y-2">
        {/* Health dot row */}
        <div className={`flex items-center gap-2 px-1 ${isCollapsed ? "justify-center" : ""}`}>
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              backendHealthy === true
                ? "bg-emerald-500 glow-dot-green"
                : backendHealthy === false
                ? "bg-red-500"
                : "bg-yellow-400 animate-pulse"
            }`}
          />
          {!isCollapsed && (
            <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 truncate flex-1">
              {backendHealthy === true
                ? "Engine Connected"
                : backendHealthy === false
                ? "Engine Offline"
                : "Checking..."}
            </span>
          )}
          {!isCollapsed && (
            <span className="text-[9px] font-mono text-slate-400 dark:text-slate-600 flex-shrink-0">
              :3000
            </span>
          )}
        </div>

        {/* Shield badge */}
        {!isCollapsed && (
          <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-slate-100/80 dark:bg-white/6 border border-slate-200/60 dark:border-white/8 text-[10px] text-slate-600 dark:text-slate-400 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
            <span className="truncate">578 Settings Links Active</span>
          </div>
        )}
      </div>
    </aside>
  );
};

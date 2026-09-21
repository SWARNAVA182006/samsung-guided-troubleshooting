import React from "react";
import {
  Home,
  Wrench,
  History,
  BookOpen,
  Settings,
  ChevronRight,
  ShieldCheck,
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
  const navItems = [
    {
      id: "home" as NavigationTab,
      label: "Home",
      icon: Home,
      desc: "Device assistant home",
    },
    {
      id: "troubleshoot" as NavigationTab,
      label: "Troubleshoot",
      icon: Wrench,
      desc: "Guided problem solver",
      badge: "One UI",
    },
    {
      id: "history" as NavigationTab,
      label: "Saved Sessions",
      icon: History,
      desc: "Your past solutions",
      count: historyCount,
    },
    {
      id: "how-it-works" as NavigationTab,
      label: "How It Works",
      icon: BookOpen,
      desc: "Simple explanation & catalog",
    },
    {
      id: "settings" as NavigationTab,
      label: "Settings",
      icon: Settings,
      desc: "Appearance & system status",
    },
  ];

  return (
    <aside
      className="w-64 flex-shrink-0 flex flex-col justify-between p-4 bg-white/90 dark:bg-[#0E1738]/90 border-r border-slate-200 dark:border-white/5 backdrop-blur-xl h-full select-none"
      aria-label="Main Navigation"
    >
      <div className="space-y-6">
        {/* Brand Logo & Product Identity */}
        <div className="px-2 pt-1">
          <Logo size="md" showText={true} />
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2.5 leading-relaxed font-medium">
            Samsung PRISM Theme 2 · Grounded Device Support
          </p>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1.5" aria-label="Sidebar Menu">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-left transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-cyan-500/40 ${
                  isActive
                    ? "bg-blue-50 dark:bg-blue-600/20 text-blue-700 dark:text-white border border-blue-200 dark:border-blue-500/30 shadow-sm font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50 border border-transparent font-medium"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive
                        ? "text-cyan-600 dark:text-cyan-400"
                        : "text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200"
                    }`}
                  />
                  <div>
                    <div className="text-xs leading-none">{item.label}</div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.badge && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide uppercase bg-blue-500/10 text-cyan-700 dark:text-cyan-300 border border-blue-500/20">
                      {item.badge}
                    </span>
                  )}
                  {typeof item.count === "number" && item.count > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {item.count}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-cyan-500" />}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Backend Health Status Badge */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800/60 space-y-2 px-2">
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                backendHealthy === true
                  ? "bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                  : backendHealthy === false
                  ? "bg-red-500 shadow-[0_0_8px_rgba(248,113,113,0.8)]"
                  : "bg-yellow-500 animate-pulse"
              }`}
            />
            <span className="font-semibold">
              {backendHealthy === true
                ? "Engine Connected"
                : backendHealthy === false
                ? "Engine Offline"
                : "Checking System..."}
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">Fastify :3000</span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" />
          <span>578 Official Samsung Deeplinks Active</span>
        </div>
      </div>
    </aside>
  );
};

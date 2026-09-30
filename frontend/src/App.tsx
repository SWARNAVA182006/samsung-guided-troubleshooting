import React, { useState, useEffect, useCallback } from "react";
import { NavigationSidebar } from "./components/NavigationSidebar";
import { TopHeader } from "./components/TopHeader";
import { HomeScreen } from "./components/HomeScreen";
import { TroubleshootForm } from "./components/TroubleshootForm";
import { ResultsDisplay } from "./components/ResultsDisplay";
import { LoadingView } from "./components/LoadingView";
import { Toast } from "./components/Toast";
import { IntroSplash } from "./components/IntroSplash";
import { OFFICIAL_PRESETS as BENCHMARK_PRESETS } from "./data/presets";
import {
  ContextDeeplinkResponse,
  TroubleshootRequest,
  NavigationTab,
  ThemeMode,
  HistoryItem,
  ToastMessage,
  PresetCase,
} from "./types";
import {
  AlertCircle,
  RefreshCw,
  History,
  Trash2,
  Clock,
  ShieldCheck,
  Layers,
  ExternalLink,
  BookOpen,
  Cpu,
  ArrowRight,
  CheckCircle2,
  BarChart2,
  Database,
  X,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// OFFICIAL 20-CASE BENCHMARK PRESET CATALOGUE
const LOCAL_STORAGE_HISTORY_KEY = "samsung_ts_history_v3";

function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(items: HistoryItem[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(items.slice(0, 50)));
  } catch {}
}

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const App: React.FC = () => {
  // Always trigger intro splash on refresh as requested
  const [showIntro, setShowIntro] = useState<boolean>(true);

  const [activeTab, setActiveTab] = useState<NavigationTab>("home");
  // Default theme on refresh: LIGHT theme as explicitly requested
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [selectedPreset, setSelectedPreset] = useState<PresetCase | undefined>(undefined);
  const [requestPayload, setRequestPayload] = useState<TroubleshootRequest>({
    query: "",
  });


  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<ContextDeeplinkResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [history, setHistory] = useState<HistoryItem[]>(() => loadHistory());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [backendHealthy, setBackendHealthy] = useState<boolean | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Theme & reduced motion effects
  useEffect(() => {
    const root = document.documentElement;
    if (themeMode === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    if (reducedMotion) {
      root.classList.add("reduce-motion");
    } else {
      root.classList.remove("reduce-motion");
    }
  }, [themeMode, reducedMotion]);

  // Backend health check
  useEffect(() => {
    const backendUrl = import.meta.env.VITE_NODE_BACKEND_URL || "http://localhost:3000";
    fetch(`${backendUrl}/api/health`)
      .then((r) => (r.ok ? setBackendHealthy(true) : setBackendHealthy(false)))
      .catch(() => setBackendHealthy(false));
  }, []);

  // Persist history
  useEffect(() => {
    saveHistory(history);
  }, [history]);

  const pushToast = useCallback((type: ToastMessage["type"], message: string) => {
    const id = genId();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleIntroComplete = () => {
    setShowIntro(false);
  };

  const handleSelectPreset = useCallback((preset: PresetCase) => {
    setSelectedPreset(preset);
    setRequestPayload({ query: preset.query, siis_response: preset.siis_response });
    setResponse(null);
    setError(null);
    setActiveTab("troubleshoot");
  }, []);

  const handleStartWithPresetId = useCallback(
    (presetId: string) => {
      const found = BENCHMARK_PRESETS.find((p) => p.id === presetId);
      if (found) handleSelectPreset(found);
    },
    [handleSelectPreset]
  );

  const handleStartWithCustomQuery = useCallback((query: string) => {
    setSelectedPreset(undefined);
    const payload: TroubleshootRequest = { query };
    setRequestPayload(payload);
    setResponse(null);
    setError(null);
    setActiveTab("troubleshoot");
    handleExecuteTroubleshoot(payload);
  }, []);

  const handleCopyDeeplink = useCallback(
    (uri: string) => {
      navigator.clipboard
        .writeText(uri)
        .then(() => pushToast("success", `Settings shortcut copied: ${uri}`))
        .catch(() => pushToast("error", "Failed to copy link to clipboard."));
    },
    [pushToast]
  );

  // REAL TROUBLESHOOTING REQUEST
  const handleExecuteTroubleshoot = async (payload: TroubleshootRequest) => {
    setIsLoading(true);
    setError(null);
    setResponse(null);
    const backendUrl = import.meta.env.VITE_NODE_BACKEND_URL || "http://localhost:3000";

    try {
      const res = await fetch(`${backendUrl}/api/troubleshoot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Server returned HTTP ${res.status}`);
      }

      const data: ContextDeeplinkResponse = await res.json();
      setResponse(data);

      const goal = data.contexts?.[0];
      if (goal) {
        const totalSteps = goal.actions.reduce(
          (acc, a) => acc + a.stepGroups.reduce((acc2, sg) => acc2 + sg.steps.length, 0),
          0
        );
        const totalDeeplinks = goal.actions.reduce(
          (acc, a) => acc + a.stepGroups.filter((sg) => sg.actionableDeeplink).length,
          0
        );
        const item: HistoryItem = {
          id: genId(),
          timestamp: Date.now(),
          query: payload.query,
          title: goal.title,
          actionsCount: goal.actions.length,
          stepsCount: totalSteps,
          deeplinksCount: totalDeeplinks,
          score: goal.score,
          response: data,
        };
        setHistory((prev) => [item, ...prev].slice(0, 50));
        pushToast("success", `Diagnostic ready — ${goal.actions.length} action steps prepared.`);
      }
    } catch (err: any) {
      const msg = err.message || "An unexpected issue occurred while processing your request.";
      setError(msg);
      pushToast("error", `Error: ${msg.slice(0, 80)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewSession = () => {
    setResponse(null);
    setError(null);
    setSelectedPreset(undefined);
    setActiveTab("troubleshoot");
  };

  const handleDeleteHistory = (id: string) => {
    setHistory((prev) => prev.filter((h) => h.id !== id));
    setConfirmDeleteId(null);
    pushToast("info", "Session deleted from history.");
  };

  const handleRestoreHistory = (item: HistoryItem) => {
    setResponse(item.response);
    setRequestPayload({ query: item.query, siis_response: { title: item.title, content: "" } });
    setActiveTab("troubleshoot");
    pushToast("info", "Restored previous session.");
  };

  const [showBenchmark, setShowBenchmark] = useState<boolean>(false);

  const renderTroubleshootTab = () => (
    <div className="space-y-6">
      {/* Benchmark Case Selector — collapsible for judges / evaluation mode */}
      <div className="glass-panel rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowBenchmark((v) => !v)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-cyan-500/40 btn-interactive"
          aria-expanded={showBenchmark}
          aria-controls="benchmark-selector"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
            <BookOpen className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" aria-hidden="true" />
            <span>Samsung Benchmark Cases ({BENCHMARK_PRESETS.length})</span>
            <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 normal-case tracking-normal">
              — For judges &amp; evaluation
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <span>{showBenchmark ? "Hide" : "Show all 20 cases"}</span>
            <span>{showBenchmark ? "▲" : "▼"}</span>
          </div>
        </button>

        {showBenchmark && (
          <div id="benchmark-selector" className="px-4 pb-4 animate-slide-up">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 max-h-52 overflow-y-auto pr-1">
              {BENCHMARK_PRESETS.map((p) => {
                const isSelected = selectedPreset?.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPreset(p)}
                    className={`text-left p-2.5 rounded-xl border text-[11px] transition-all flex flex-col gap-1 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 btn-interactive ${
                      isSelected
                        ? "bg-blue-100 dark:bg-blue-600/30 border-blue-600 dark:border-cyan-400 text-blue-950 dark:text-white font-bold shadow-sm"
                        : "bg-white/60 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/60 text-slate-800 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800"
                    }`}
                    aria-pressed={isSelected}
                    aria-label={`Select benchmark case: ${p.label}`}
                  >
                    <div className="font-mono font-bold text-cyan-700 dark:text-cyan-400">[{p.id}]</div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100 leading-tight line-clamp-2">
                      {p.label}
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium w-fit">
                      {p.category}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Inputs */}
        <div className="lg:col-span-5 relative">
          <TroubleshootForm
            initialValues={requestPayload}
            onSubmit={handleExecuteTroubleshoot}
            isLoading={isLoading}
          />
        </div>

        {/* Results Area */}
        <div className="lg:col-span-7">
          {isLoading && <LoadingView />}

          {error && !isLoading && (
            <div
              role="alert"
              className="glass-panel rounded-2xl p-6 border border-red-300/70 dark:border-red-500/50 shadow-xl space-y-3 animate-fade-in"
            >
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold">
                <AlertCircle className="w-5 h-5" aria-hidden="true" />
                <span>Unable to complete request</span>
              </div>
              <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">{error}</p>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200/70 dark:border-slate-700/50">
                Please verify your local backend connection and try submitting again.
              </div>
            </div>
          )}

          {response && !isLoading && (
            <ResultsDisplay response={response} onCopyDeeplink={handleCopyDeeplink} />
          )}

          {!response && !isLoading && !error && (
            <div className="surface-card rounded-2xl p-12 text-center space-y-4 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 dark:bg-slate-800 border border-blue-500/20 dark:border-slate-700 flex items-center justify-center mx-auto text-cyan-600 dark:text-cyan-400">
                <RefreshCw className="w-7 h-7" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Ready to Fix Your Device
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
                  Describe your device problem and get grounded troubleshooting steps with official Samsung Settings shortcuts.
                </p>
              </div>
              <div className="flex items-center justify-center gap-4 text-[11px] text-slate-500 dark:text-slate-400 pt-2 font-medium">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" /> Grounded Fixes
                </span>
                <span className="flex items-center gap-1">
                  <Database className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" aria-hidden="true" /> 578 Settings Links
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderHistoryTab = () => (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <History className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <span>Saved Troubleshooting Sessions ({history.length})</span>
        </div>
        {history.length > 0 && (
          <button
            onClick={() => {
              setHistory([]);
              pushToast("info", "All history cleared.");
            }}
            className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-bold flex items-center gap-1 transition-colors btn-interactive"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All</span>
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="surface-card rounded-2xl p-12 text-center space-y-3">
          <History className="w-10 h-10 text-slate-400 dark:text-slate-500 mx-auto" />
          <p className="text-slate-900 dark:text-white text-sm font-bold">No saved sessions yet</p>
          <p className="text-slate-600 dark:text-slate-400 text-xs max-w-xs mx-auto">
            Troubleshoot a problem and your solution steps will be saved here automatically.
          </p>
          <button
            onClick={() => setActiveTab("troubleshoot")}
            className="inline-flex items-center gap-1.5 mt-3 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-bold hover:from-blue-500 hover:to-cyan-400 transition-all shadow-md btn-interactive"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            Start Troubleshooting
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item) => (
            <div
              key={item.id}
              className="surface-card glass-card rounded-2xl p-5 group cursor-default"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(item.timestamp).toLocaleString()}</span>
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed italic">
                    &quot;{item.query}&quot;
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px]">
                    <span className="font-bold text-cyan-700 dark:text-cyan-400 flex items-center gap-1">
                      <Layers className="w-3 h-3" />
                      {item.actionsCount} Actions
                    </span>
                    <span className="text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      {item.stepsCount} Steps
                    </span>
                    <span className="text-blue-700 dark:text-blue-300 font-semibold flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />
                      {item.deeplinksCount} Settings Links
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleRestoreHistory(item)}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-600/20 hover:bg-blue-100 dark:hover:bg-blue-600/35 border border-blue-200/80 dark:border-blue-500/40 text-blue-700 dark:text-cyan-300 text-[11px] font-extrabold transition-all btn-interactive"
                  >
                    View Results
                  </button>
                  {confirmDeleteId === item.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDeleteHistory(item.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold transition-colors btn-interactive"
                      >
                        Confirm Delete
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-[10px] transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(item.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/30 border border-slate-200/80 dark:border-slate-700 hover:border-red-300 dark:hover:border-red-500/40 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 text-[11px] font-bold transition-all btn-interactive"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderHowItWorksTab = () => (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Human Explanation Section */}
      <div className="surface-card rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="space-y-1">
          <div className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
            Simple Process
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
            How Guided Troubleshooting Helps You
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
            Instead of searching through endless manual pages or confusing settings menus, our assistant guides you step-by-step.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {[
            {
              step: "1",
              title: "Describe Your Symptom",
              desc: "Tell us what is wrong with your phone or tablet in plain language.",
            },
            {
              step: "2",
              title: "Grounded Step Extraction",
              desc: "We look up official Samsung support knowledge and organize the fix into actionable steps.",
            },
            {
              step: "3",
              title: "Settings Shortcuts",
              desc: "We match steps to official Samsung Settings entries so you can navigate directly to the right screen.",
            },
          ].map(({ step, title, desc }) => (
            <div
              key={step}
              className="p-4 rounded-2xl surface-card space-y-2.5"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white font-mono font-extrabold text-sm flex items-center justify-center shadow-sm">
                {step}
              </div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">{title}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Technical Architecture Section */}
      <div className="surface-card rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/12 border border-cyan-500/20">
            <Cpu className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          </div>
          Technical Architecture (Samsung PRISM Theme 2)
        </h2>
        <div className="space-y-2.5">
          {[
            {
              num: "01",
              title: "Query & SIIS Ingestion",
              desc: "Validates incoming query and SIIS article payload against strict Pydantic v2 schemas.",
            },
            {
              num: "02",
              title: "LRU Response Cache",
              desc: "Checks exact query hash and token Jaccard paraphrase similarity (threshold 0.50) across 256-entry LRU cache.",
            },
            {
              num: "03",
              title: "Grounded Gemini Structured Generation",
              desc: "Uses Gemini to extract diagnostic actions strictly from SIIS text. Falls back to deterministic parser when API key is absent.",
            },
            {
              num: "04",
              title: "TF-IDF Deeplink Matching",
              desc: "Matches steps against the official 578-entry Samsung catalog using TF-IDF cosine similarity with domain synonym expansion.",
            },
            {
              num: "05",
              title: "Validator & Safety Layer",
              desc: "Every deeplink is verified against the official catalog. Weak matches are suppressed. bixby:// URIs require a Samsung Galaxy device.",
            },
          ].map(({ num, title, desc }) => (
            <div
              key={num}
              className="flex items-start gap-3.5 p-3.5 rounded-xl surface-card card-hover"
            >
              <span className="font-mono text-cyan-600 dark:text-cyan-400 font-extrabold text-sm mt-0.5 flex-shrink-0">
                {num}
              </span>
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">{title}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium mt-0.5">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="surface-card rounded-2xl p-6 space-y-4">
        <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Appearance &amp; Theme</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 rounded-xl surface-card card-hover">
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">Theme Mode</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Choose your preferred visual theme</div>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100/80 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
              {(["light", "dark"] as ThemeMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setThemeMode(mode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold capitalize transition-all btn-interactive ${
                    themeMode === mode
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl surface-card card-hover">
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">Reduced Motion</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Minimize animations and transitions</div>
            </div>
            <button
              onClick={() => setReducedMotion((v) => !v)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all border btn-interactive ${
                reducedMotion
                  ? "bg-emerald-600 text-white border-emerald-500 shadow-sm shadow-emerald-500/25"
                  : "bg-slate-100/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700"
              }`}
            >
              {reducedMotion ? "Enabled" : "Disabled"}
            </button>
          </div>
        </div>
      </div>

      <div className="surface-card rounded-2xl p-6 space-y-3">
        <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Engine Connection Status</h2>
        <div className="flex items-center justify-between p-4 rounded-xl surface-card card-hover">
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">Fastify Application Backend</div>
            <div className="text-xs text-slate-400 dark:text-slate-500 font-mono">http://localhost:3000/api/health</div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
              backendHealthy === true
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                : backendHealthy === false
                ? "bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30"
                : "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border border-yellow-500/30"
            }`}
          >
            {backendHealthy === true ? "Online" : backendHealthy === false ? "Offline" : "Checking..."}
          </span>
        </div>
      </div>
    </div>
  );

  const renderActiveTab = () => {
    switch (activeTab) {
      case "home":
        return (
          <HomeScreen
            onStartWithPreset={handleStartWithPresetId}
            onStartWithCustomQuery={handleStartWithCustomQuery}
            presets={BENCHMARK_PRESETS}
          />
        );
      case "troubleshoot":
        return renderTroubleshootTab();
      case "history":
        return renderHistoryTab();
      case "how-it-works":
        return renderHowItWorksTab();
      case "settings":
        return renderSettingsTab();
      default:
        return null;
    }
  };

  return (
    <>
      {/* Product Intro Splash (Plays on page load/refresh with 6-stage presentation) */}
      {showIntro && <IntroSplash onComplete={handleIntroComplete} />}

      <div
        className={`h-screen flex flex-col overflow-hidden font-sans transition-colors duration-300 ${
          themeMode === "dark"
            ? "bg-app-dark text-white"
            : "bg-app-light text-slate-900"
        }`}
      >
        <TopHeader
          activeTab={activeTab}
          themeMode={themeMode}
          onThemeChange={setThemeMode}
          onNewSession={handleNewSession}
          onToggleMobileMenu={() => setMobileMenuOpen((v) => !v)}
        />

        <div className="flex flex-1 overflow-hidden">
          {/* Desktop Sidebar */}
          <div className="hidden lg:flex flex-shrink-0">
            <NavigationSidebar
              activeTab={activeTab}
              onTabChange={setActiveTab}
              backendHealthy={backendHealthy}
              historyCount={history.length}
            />
          </div>

          {/* Mobile Sidebar Overlay */}
          <div
            className={`fixed inset-0 z-40 lg:hidden transition-all duration-300 ${
              mobileMenuOpen ? "pointer-events-auto" : "pointer-events-none"
            }`}
          >
            {/* Backdrop */}
            <div
              className={`absolute inset-0 bg-black/65 backdrop-blur-sm transition-opacity duration-300 ${
                mobileMenuOpen ? "opacity-100" : "opacity-0"
              }`}
              onClick={() => setMobileMenuOpen(false)}
            />
            {/* Slide-in panel */}
            <div
              className={`absolute left-0 top-0 bottom-0 w-72 z-50 flex sidebar-slide-mobile transition-transform duration-300 ${
                mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
              }`}
            >
              <NavigationSidebar
                activeTab={activeTab}
                onTabChange={(tab) => {
                  setActiveTab(tab);
                  setMobileMenuOpen(false);
                }}
                backendHealthy={backendHealthy}
                historyCount={history.length}
              />
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all btn-interactive"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
              {renderActiveTab()}
            </div>
          </main>
        </div>

        {/* Toast Notifications */}
        <Toast toasts={toasts} onDismiss={dismissToast} />
      </div>
    </>
  );
};

export default App;

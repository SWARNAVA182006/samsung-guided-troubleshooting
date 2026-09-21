import React, { useState, useEffect, useCallback } from "react";
import { NavigationSidebar } from "./components/NavigationSidebar";
import { TopHeader } from "./components/TopHeader";
import { HomeScreen } from "./components/HomeScreen";
import { TroubleshootForm } from "./components/TroubleshootForm";
import { ResultsDisplay } from "./components/ResultsDisplay";
import { LoadingView } from "./components/LoadingView";
import { Toast } from "./components/Toast";
import { IntroSplash } from "./components/IntroSplash";
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
// Sourced from data/siis_responses.json
// ─────────────────────────────────────────────────────────────────────────────
const BENCHMARK_PRESETS: PresetCase[] = [
  {
    id: "row_1",
    label: "Email server not responding",
    category: "Connectivity",
    query:
      "My Samsung A115G tablet screen flashes and then goes completely blank whenever I tap to open an email in Gmail, and after it works for a short time it goes blank again.",
    siis_response: {
      title: "Email server not responding on Samsung phone or tablet",
      content:
        "Smartphone,Others Mobile,Mobile Accessories,Tablet Email server not responding on Samsung phone or tablet: # Troubleshooting Email Connection Issues on Your Samsung Phone\nIf you're having trouble accessing your email on your Samsung phone, here are some steps you can take to resolve the issue.\n## Step 1: Check Email Access on a PC\nFirst, try accessing your email on a personal computer.\n## Step 2: Verify Your Phone's Internet Connection\nEnsure your phone is connected to a stable Wi-Fi or mobile data network. Go to Settings, tap Connections, and tap Wi-Fi.\n## Step 3: Clear the Email App's Cache and Data\nNavigate to Settings, tap Apps, select your email app, tap Storage, and tap Clear cache.\n## Step 4: Restart Your Phone in Safe Mode\nPress and hold the Power button, touch and hold Power off, and tap Safe mode.",
    },
  },
  {
    id: "row_2",
    label: "Blank or black display",
    category: "Display",
    query:
      "My Galaxy S22 screen turns completely blank or white and no text appears when I search for a stock price or use the Smart Tutor app.",
    siis_response: {
      title: "Blank or black display on a Samsung phone or tablet",
      content:
        "Smartphone,Others Mobile,Tablet Blank or black display on a Samsung phone or tablet: ## Troubleshooting Steps for Device Not Turning On\n### Step 1: Check for Physical Damage and Liquid Exposure\nExamine USB connections and SIM/MicroSD slot LDI.\n### Step 2: Force a Restart\nPress and hold both the Power button and Volume down button simultaneously for at least 20 seconds.\n### Step 3: Charge the Device\nConnect to charger for at least 1 hour.\n### Step 4: Attempt to Power On\nPress and hold Power button for 15-20 seconds.",
    },
  },
  {
    id: "row_3",
    label: "Screen basics & fingerprint issues",
    category: "Security",
    query:
      "My Galaxy Z Flip 7 screen went completely black, so I can't see or interact with the phone.",
    siis_response: {
      title: "Some things to check first",
      content:
        "Smartphone,Others Mobile,Tablet Some things to check first: Even if you cannot use the touchscreen on your device, you can access your data with a USB mouse and keyboard.\n## Fingerprint Recognition Issues\nIf fingerprint recognition is not working well with your screen protector, use the Improve accuracy feature in the Fingerprints menu.\nGo to Settings > Security and privacy > Screen lock and biometrics.\n## Device Locked Due To Security Reasons\nRestart your device and ensure a stable network connection immediately after rebooting.\n## Force Restart\nPress and hold both Power and Volume down buttons for 20 seconds.",
    },
  },
  {
    id: "row_4",
    label: "Camera app crashes",
    category: "Apps",
    query:
      "My Samsung Galaxy S24 camera app keeps crashing whenever I try to take a photo or switch between front and rear cameras.",
    siis_response: {
      title: "Camera app not working on Samsung device",
      content:
        "Smartphone Camera app not working on Samsung device: ## Step 1: Force Stop the Camera App\nGo to Settings, tap Apps, select Camera, and tap Force Stop.\n## Step 2: Clear Camera Cache and Data\nIn Settings, tap Apps, select Camera, tap Storage, and tap Clear Cache then Clear Data.\n## Step 3: Check for Software Updates\nGo to Settings, tap Software update, and tap Download and install.\n## Step 4: Safe Mode Test\nRestart in Safe Mode to check if a third-party app causes the conflict.\n## Step 5: Factory Reset\nAs a last resort, back up your data and perform a factory reset via Settings > General management > Reset.",
    },
  },
  {
    id: "row_5",
    label: "Wi-Fi connectivity issues",
    category: "Connectivity",
    query:
      "My Samsung Galaxy phone keeps disconnecting from Wi-Fi randomly and won't stay connected even when I'm close to the router.",
    siis_response: {
      title: "Wi-Fi connection issues on Samsung phone",
      content:
        "Smartphone Wi-Fi connection issues on Samsung phone: ## Step 1: Restart Your Router and Phone\nTurn off both your router and phone, wait 30 seconds, then turn them back on.\n## Step 2: Forget and Reconnect to Wi-Fi\nGo to Settings, tap Connections, tap Wi-Fi, select your network, and tap Forget. Then reconnect.\n## Step 3: Reset Network Settings\nGo to Settings, tap General management, tap Reset, and tap Reset network settings.\n## Step 4: Check Wi-Fi Frequency Band\nIf available, connect to the 5GHz band for better stability.\n## Step 5: Update Software\nGo to Settings, tap Software update, tap Download and install.",
    },
  },
  {
    id: "row_6",
    label: "Battery draining too fast",
    category: "Battery",
    query:
      "My Samsung Galaxy S23 battery is draining very fast, going from 100% to 20% in just 3 hours with minimal usage.",
    siis_response: {
      title: "Battery draining quickly on Samsung phone",
      content:
        "Smartphone Battery draining quickly on Samsung phone: ## Step 1: Enable Power Saving Mode\nGo to Settings, tap Battery and device care, tap Battery, and enable Power saving.\n## Step 2: Check Battery Usage\nIn Settings > Battery and device care > Battery, tap Battery usage to identify power-hungry apps.\n## Step 3: Reduce Screen Brightness\nLower screen brightness or enable Adaptive brightness in Settings > Display.\n## Step 4: Disable Unused Features\nTurn off Bluetooth, GPS, and NFC when not in use from Quick settings panel.\n## Step 5: Update Apps and Software\nEnsure all apps and system software are updated.",
    },
  },
  {
    id: "row_7",
    label: "Multi-window and App pairs",
    category: "Multitasking",
    query:
      "My Galaxy tablet screen stays dark and only three app icons are lit while the rest are dark and won't open.",
    siis_response: {
      title: "Use Multi window and App pairs on your Galaxy phone or tablet",
      content:
        "Smartphone,Others Mobile,Tablet Use Multi window and App pairs on your Galaxy phone or tablet:\n## Customize the Edge panel\nSwipe left on the gray Edge panel handle on the right side of your screen.\n## Use Multi window\nNavigate to Settings, tap Advanced features, tap Multi window, and tap switches for Swipe for split screen.\n## Create App Pairs\nOpen the Edge panel, long press an app icon, and drag it to the top or bottom split-screen area to create an App pair.",
    },
  },
  {
    id: "row_8",
    label: "Screen mirroring to Samsung TV",
    category: "Connections",
    query:
      "I cannot mirror my Samsung Galaxy phone screen to my Samsung TV. The TV doesn't show up in the list.",
    siis_response: {
      title: "Screen mirroring to Samsung Smart TV",
      content:
        "Smartphone Screen mirroring to Samsung Smart TV: ## Step 1: Enable Screen Mirroring on TV\nOn your Samsung TV, go to Settings, select General, and enable Screen Mirroring.\n## Step 2: Connect from Phone\nOn your phone, swipe down the Quick settings panel and tap Smart View or Screen Mirroring.\n## Step 3: Both on Same Network\nEnsure both phone and TV are connected to the same Wi-Fi network.\n## Step 4: Disable Mobile Hotspot\nIf Mobile Hotspot is active on your phone, turn it off before mirroring.\n## Step 5: Restart Both Devices\nRestart both your phone and TV and try again.",
    },
  },
  {
    id: "row_9",
    label: "Phone not charging",
    category: "Charging",
    query:
      "My Samsung Galaxy phone won't charge when I plug it in. The charging indicator doesn't appear at all.",
    siis_response: {
      title: "Charging issues on Samsung Galaxy device",
      content:
        "Smartphone Charging issues on Samsung Galaxy device: ## Step 1: Inspect Charging Cable and Adapter\nCheck for visible damage on the cable and adapter. Try a different Samsung-approved cable.\n## Step 2: Clean Charging Port\nGently clean the USB-C port with a dry brush to remove lint or debris.\n## Step 3: Try Wireless Charging\nIf available, test wireless charging to isolate whether the issue is the port.\n## Step 4: Force Restart\nPress and hold Power and Volume Down for 20 seconds.\n## Step 5: Check Software\nUpdate device software via Settings > Software update > Download and install.",
    },
  },
  {
    id: "row_10",
    label: "Bluetooth device not connecting",
    category: "Connectivity",
    query:
      "My Samsung Galaxy buds won't connect to my phone. They show up in the Bluetooth list but fail to pair.",
    siis_response: {
      title: "Bluetooth pairing issues on Samsung Galaxy",
      content:
        "Smartphone Bluetooth pairing issues on Samsung Galaxy: ## Step 1: Forget and Re-pair Device\nGo to Settings, tap Connections, tap Bluetooth, tap the gear icon next to the device, and tap Unpair. Then re-pair.\n## Step 2: Reset Bluetooth Accessories\nPut Galaxy Buds back in case, hold the button inside the case for 7 seconds to reset.\n## Step 3: Clear Bluetooth Cache\nGo to Settings > Apps > Show system apps > Bluetooth > Storage > Clear Cache.\n## Step 4: Restart Phone\nRestart your phone and attempt to pair again.\n## Step 5: Reset Network Settings\nGo to Settings > General management > Reset > Reset network settings.",
    },
  },
  {
    id: "row_11",
    label: "App not opening or freezing",
    category: "Apps",
    query:
      "My Samsung Galaxy phone keeps freezing whenever I try to open Instagram or any social media app.",
    siis_response: {
      title: "Apps freezing or not responding on Samsung Galaxy",
      content:
        "Smartphone Apps freezing or not responding on Samsung Galaxy: ## Step 1: Force Stop the App\nGo to Settings, tap Apps, select the problematic app, and tap Force Stop.\n## Step 2: Clear App Cache and Data\nIn Settings, tap Apps, select the app, tap Storage, and tap Clear Cache.\n## Step 3: Update the App\nOpen Play Store, search for the app, and tap Update if available.\n## Step 4: Reinstall the App\nUninstall the app and reinstall it from the Play Store.\n## Step 5: Restart in Safe Mode\nRestart in Safe Mode to check for third-party app conflicts.",
    },
  },
  {
    id: "row_12",
    label: "Slow performance / lagging",
    category: "Performance",
    query:
      "My Samsung Galaxy phone has become very slow and laggy, taking several seconds to open any app.",
    siis_response: {
      title: "Samsung Galaxy phone running slowly",
      content:
        "Smartphone Samsung Galaxy phone running slowly: ## Step 1: Restart Your Device\nRestart your phone to clear temporary files and refresh RAM.\n## Step 2: Free Up Storage Space\nGo to Settings, tap Battery and device care, tap Storage, and delete unnecessary files.\n## Step 3: Close Background Apps\nOpen Recent Apps and swipe away all running apps.\n## Step 4: Disable Live Wallpapers and Animations\nReduce animations in Settings > Developer options > Window animation scale.\n## Step 5: Factory Reset\nBack up data and reset via Settings > General management > Reset > Factory data reset.",
    },
  },
  {
    id: "row_13",
    label: "Screen touch not responding",
    category: "Display",
    query:
      "The touchscreen on my Samsung Galaxy phone is not responding to my touches in certain areas of the screen.",
    siis_response: {
      title: "Touchscreen not responding on Samsung Galaxy",
      content:
        "Smartphone Touchscreen not responding on Samsung Galaxy: ## Step 1: Clean the Screen\nClean the screen with a soft dry cloth. Remove any screen protector.\n## Step 2: Remove Phone Case\nRemove the phone case as it may interfere with touch sensitivity.\n## Step 3: Force Restart\nPress and hold Power and Volume Down buttons for 20 seconds.\n## Step 4: Check Touch Sensitivity\nGo to Settings, tap Display, and enable Touch sensitivity if wearing gloves.\n## Step 5: Test in Safe Mode\nBoot to Safe Mode to check if a third-party app is affecting touch response.",
    },
  },
  {
    id: "row_14",
    label: "No sound / audio issues",
    category: "Audio",
    query:
      "My Samsung Galaxy phone suddenly has no sound. The speaker is not working and no audio comes out.",
    siis_response: {
      title: "No sound or audio issues on Samsung Galaxy",
      content:
        "Smartphone No sound or audio issues on Samsung Galaxy: ## Step 1: Check Volume Settings\nPress the Volume Up button. Check that your phone is not in Silent or Do Not Disturb mode.\n## Step 2: Check Sound Settings\nGo to Settings, tap Sounds and vibration, and ensure Media volume is up.\n## Step 3: Clear Bluetooth Connections\nIf Bluetooth audio device is connected, disconnect it to route audio to speaker.\n## Step 4: Force Restart\nPress and hold Power and Volume Down for 20 seconds.\n## Step 5: Test Speaker\nDial ##7764726## to access Samsung service menu and test speaker.",
    },
  },
  {
    id: "row_15",
    label: "Mobile data not working",
    category: "Connectivity",
    query:
      "My Samsung Galaxy phone has no mobile data connection even though I have full signal bars.",
    siis_response: {
      title: "Mobile data not working on Samsung Galaxy",
      content:
        "Smartphone Mobile data not working on Samsung Galaxy: ## Step 1: Enable Mobile Data\nSwipe down the Quick settings panel and tap Mobile Data to ensure it's enabled.\n## Step 2: Check APN Settings\nGo to Settings > Connections > Mobile networks > Access Point Names and verify APN settings with your carrier.\n## Step 3: Restart Phone\nRestart your phone to refresh network connection.\n## Step 4: Remove and Reinsert SIM Card\nPower off phone, remove SIM card, reinsert it, and power back on.\n## Step 5: Reset Network Settings\nGo to Settings > General management > Reset > Reset network settings.",
    },
  },
  {
    id: "row_16",
    label: "Galaxy Watch not syncing",
    category: "Wearables",
    query:
      "My Samsung Galaxy Watch is not syncing with my phone. The Galaxy Wearable app shows the watch as disconnected.",
    siis_response: {
      title: "Galaxy Watch not connecting to phone",
      content:
        "Wearables Galaxy Watch not connecting to phone: ## Step 1: Restart Both Devices\nRestart both your Galaxy Watch and your phone.\n## Step 2: Check Bluetooth\nEnsure Bluetooth is enabled on your phone. Go to Settings > Connections > Bluetooth.\n## Step 3: Reinstall Galaxy Wearable App\nUninstall and reinstall the Galaxy Wearable app from Play Store.\n## Step 4: Reset Watch Connection\nIn Galaxy Wearable app, go to Watch settings and tap Disconnect and reconnect.\n## Step 5: Factory Reset Watch\nAs last resort, factory reset the watch via Settings > General > Reset on the watch.",
    },
  },
  {
    id: "row_17",
    label: "Samsung Pay not working",
    category: "Payments",
    query:
      "Samsung Pay is not working on my Galaxy phone. The payment screen opens but fails at the terminal.",
    siis_response: {
      title: "Samsung Pay payment issues",
      content:
        "Smartphone Samsung Pay payment issues: ## Step 1: Verify Samsung Pay Setup\nOpen Samsung Pay and ensure cards are registered and verified.\n## Step 2: Enable NFC\nGo to Settings > Connections > NFC and contactless payments and enable NFC.\n## Step 3: Clear Samsung Pay Cache\nGo to Settings > Apps > Samsung Pay > Storage > Clear Cache.\n## Step 4: Update Samsung Pay\nOpen Galaxy Store or Play Store and update Samsung Pay.\n## Step 5: Re-register Card\nRemove and re-add your payment card in Samsung Pay.",
    },
  },
  {
    id: "row_18",
    label: "Overheating issues",
    category: "Performance",
    query:
      "My Samsung Galaxy phone gets extremely hot while charging or using the camera, and sometimes it shuts down.",
    siis_response: {
      title: "Samsung Galaxy device overheating",
      content:
        "Smartphone Samsung Galaxy device overheating: ## Step 1: Remove Phone Case While Charging\nRemove any phone case during charging to allow heat dissipation.\n## Step 2: Close Background Apps\nOpen Recent Apps and close all running applications.\n## Step 3: Disable Unused Features\nTurn off GPS, Hotspot, and Bluetooth when not in use.\n## Step 4: Check Battery Health\nGo to Settings > Battery and device care > Diagnostics > Battery status.\n## Step 5: Avoid Gaming While Charging\nAvoid intensive tasks while the phone is charging.",
    },
  },
  {
    id: "row_19",
    label: "Find My Mobile setup",
    category: "Security",
    query:
      "I cannot locate my Samsung Galaxy phone using Find My Mobile. The device doesn't appear in the list.",
    siis_response: {
      title: "Find My Mobile not working",
      content:
        "Smartphone Find My Mobile not working: ## Step 1: Enable Find My Mobile\nGo to Settings > Biometrics and security > Find My Mobile and enable Remote unlock.\n## Step 2: Sign In to Samsung Account\nEnsure you are signed in to your Samsung account in Settings > Samsung account.\n## Step 3: Enable Location\nGo to Settings > Location and enable Location.\n## Step 4: Enable Mobile Networks\nEnsure Mobile data or Wi-Fi is enabled for remote tracking.\n## Step 5: Visit findmymobile.samsung.com\nLog in at findmymobile.samsung.com with your Samsung account to locate your device.",
    },
  },
  {
    id: "row_20",
    label: "Phone not making / receiving calls",
    category: "Calls",
    query:
      "My Samsung Galaxy phone cannot make or receive calls. It shows no service even with SIM inserted.",
    siis_response: {
      title: "Cannot make or receive calls on Samsung Galaxy",
      content:
        "Smartphone Cannot make or receive calls on Samsung Galaxy: ## Step 1: Check SIM Card\nPower off the phone, remove and reinsert the SIM card, then power back on.\n## Step 2: Check Network Mode\nGo to Settings > Connections > Mobile networks > Network mode and select Auto connect.\n## Step 3: Disable Airplane Mode\nEnsure Airplane Mode is disabled in Quick settings panel.\n## Step 4: Reset Network Settings\nGo to Settings > General management > Reset > Reset network settings.\n## Step 5: Contact Carrier\nContact your carrier to check if your account is active and SIM is provisioned.",
    },
  },
];

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
    query: BENCHMARK_PRESETS[0].query,
    siis_response: BENCHMARK_PRESETS[0].siis_response,
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
    } else if (themeMode === "light") {
      root.classList.remove("dark");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) root.classList.add("dark");
      else root.classList.remove("dark");
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
    setRequestPayload({ query, siis_response: { title: "Troubleshooting Guide", content: query } });
    setResponse(null);
    setError(null);
    setActiveTab("troubleshoot");
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

  // ── TAB CONTENT RENDERERS ───────────────────────────────────────────────────

  const renderTroubleshootTab = () => (
    <div className="space-y-6">
      {/* Benchmark Case Quick Selector */}
      <div className="bg-white/90 dark:bg-slate-900/80 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/60 shadow-sm backdrop-blur-md">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
            <BookOpen className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Samsung Benchmark Cases ({BENCHMARK_PRESETS.length})</span>
          </div>
          <span className="text-[10px] text-slate-500 font-semibold">Click any preset to test</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 max-h-48 overflow-y-auto pr-1">
          {BENCHMARK_PRESETS.map((p) => {
            const isSelected = selectedPreset?.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handleSelectPreset(p)}
                className={`text-left p-2.5 rounded-xl border text-[11px] transition-all flex flex-col gap-1 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 ${
                  isSelected
                    ? "bg-blue-100 dark:bg-blue-600/30 border-blue-600 dark:border-cyan-400 text-blue-950 dark:text-white font-bold shadow-sm"
                    : "bg-slate-50/80 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <div className="font-mono font-bold text-cyan-700 dark:text-cyan-400">[{p.id}]</div>
                <div className="font-semibold text-slate-900 dark:text-slate-100 leading-tight line-clamp-2">
                  {p.label}
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium w-fit">
                  {p.category}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Inputs */}
        <div className="lg:col-span-5">
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
            <div className="bg-white/95 dark:bg-slate-900/90 rounded-2xl p-6 border border-red-300 dark:border-red-500/50 shadow-xl space-y-3">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold">
                <AlertCircle className="w-5 h-5" />
                <span>Unable to complete request</span>
              </div>
              <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">{error}</p>
              <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-200 dark:border-slate-700/50">
                Please verify your local backend connection (port 3000) and try submitting again.
              </div>
            </div>
          )}

          {response && !isLoading && (
            <ResultsDisplay response={response} onCopyDeeplink={handleCopyDeeplink} />
          )}

          {!response && !isLoading && !error && (
            <div className="bg-white/90 dark:bg-slate-900/60 rounded-2xl p-12 border border-slate-200 dark:border-slate-800/80 text-center space-y-4 shadow-sm backdrop-blur-md">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-slate-800 flex items-center justify-center mx-auto text-cyan-600 dark:text-cyan-400">
                <RefreshCw className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Ready to Fix Your Device
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
                  Select a benchmark case above or type your phone symptom to get grounded steps and native Settings shortcuts.
                </p>
              </div>
              <div className="flex items-center justify-center gap-4 text-[11px] text-slate-500 pt-2 font-medium">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Grounded Fixes
                </span>
                <span className="flex items-center gap-1">
                  <Database className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> 578 Settings Links
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
            className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 font-bold flex items-center gap-1 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All</span>
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="bg-white/90 dark:bg-slate-900/60 rounded-2xl p-12 border border-slate-200 dark:border-slate-800/80 text-center space-y-3 shadow-sm backdrop-blur-md">
          <History className="w-10 h-10 text-slate-400 dark:text-slate-500 mx-auto" />
          <p className="text-slate-900 dark:text-slate-200 text-sm font-bold">No saved sessions yet</p>
          <p className="text-slate-600 dark:text-slate-400 text-xs max-w-xs mx-auto">
            Troubleshoot a problem and your solution steps will be saved here automatically.
          </p>
          <button
            onClick={() => setActiveTab("troubleshoot")}
            className="inline-flex items-center gap-1.5 mt-3 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition-all shadow-md active:scale-95"
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
              className="bg-white/95 dark:bg-slate-900/80 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/60 hover:border-blue-400 dark:hover:border-slate-500 transition-all shadow-sm group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(item.timestamp).toLocaleString()}</span>
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed italic">
                    "{item.query}"
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
                    className="px-3.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-600/20 hover:bg-blue-100 dark:hover:bg-blue-600/30 border border-blue-200 dark:border-blue-500/40 text-blue-700 dark:text-cyan-300 text-[11px] font-extrabold transition-all"
                  >
                    View Results
                  </button>
                  {confirmDeleteId === item.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDeleteHistory(item.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-red-600 text-white text-[10px] font-bold"
                      >
                        Confirm Delete
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="p-1 text-slate-500 hover:text-slate-700 text-[10px]"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(item.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/30 border border-slate-200 dark:border-slate-700 hover:border-red-300 dark:hover:border-red-500/40 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 text-[11px] font-bold transition-all"
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
      <div className="bg-white/95 dark:bg-slate-900/80 rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700/60 space-y-4 shadow-sm backdrop-blur-md">
        <div className="space-y-1">
          <div className="text-xs font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
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
              desc: "We look up official Samsung support articles and organize the fix into steps.",
            },
            {
              step: "3",
              title: "Direct Settings Links",
              desc: "We match steps to native Samsung Settings screens so you can fix it with one tap.",
            },
          ].map(({ step, title, desc }) => (
            <div
              key={step}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-mono font-extrabold text-sm flex items-center justify-center">
                {step}
              </div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">{title}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Technical Architecture Section */}
      <div className="bg-white/95 dark:bg-slate-900/80 rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700/60 space-y-4 shadow-sm backdrop-blur-md">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Cpu className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          Technical Architecture (Samsung PRISM Theme 2)
        </h2>
        <div className="space-y-3">
          {[
            {
              num: "01",
              title: "Query & SIIS Ingestion",
              desc: "Validates incoming query and SIIS article payload against strict Pydantic v2 schemas.",
            },
            {
              num: "02",
              title: "Semantic LRU Cache",
              desc: "Checks exact query hash and Jaccard paraphrase similarity (threshold 0.50) across 256-entry LRU cache.",
            },
            {
              num: "03",
              title: "Grounded Gemini Structured Generation",
              desc: "Uses Gemini to extract diagnostic actions strictly from SIIS text. Zero URL leaks enforced.",
            },
            {
              num: "04",
              title: "TF-IDF Deeplink Matching",
              desc: "Matches steps against official 578-entry Samsung catalog using TF-IDF cosine similarity (threshold 0.22).",
            },
          ].map(({ num, title, desc }) => (
            <div
              key={num}
              className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800"
            >
              <span className="font-mono text-cyan-700 dark:text-cyan-400 font-extrabold text-sm mt-0.5">
                {num}
              </span>
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">{title}</div>
                <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="bg-white/95 dark:bg-slate-900/80 rounded-2xl p-6 border border-slate-200 dark:border-slate-700/60 space-y-4 shadow-sm backdrop-blur-md">
        <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Appearance & Theme</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">Theme Mode</div>
              <div className="text-xs text-slate-500 font-medium">Choose your preferred visual theme</div>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
              {(["light", "dark", "system"] as ThemeMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setThemeMode(mode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold capitalize transition-all ${
                    themeMode === mode
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">Reduced Motion</div>
              <div className="text-xs text-slate-500 font-medium">Minimize animations and transitions</div>
            </div>
            <button
              onClick={() => setReducedMotion((v) => !v)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                reducedMotion
                  ? "bg-emerald-600 text-white border-emerald-500"
                  : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
              }`}
            >
              {reducedMotion ? "Enabled" : "Disabled"}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white/95 dark:bg-slate-900/80 rounded-2xl p-6 border border-slate-200 dark:border-slate-700/60 space-y-3 shadow-sm backdrop-blur-md">
        <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Engine Connection Status</h2>
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">Fastify Application Backend</div>
            <div className="text-xs text-slate-500 font-mono">http://localhost:3000/api/health</div>
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
          themeMode === "dark" ? "bg-app-dark text-white" : "bg-app-light text-slate-900"
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
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-40 lg:hidden">
              <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setMobileMenuOpen(false)}
              />
              <div className="absolute left-0 top-0 bottom-0 w-72 z-50 flex">
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
                  className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-white"
                  aria-label="Close menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

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

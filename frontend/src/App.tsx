import React, { useState } from "react";
import { Header } from "./components/Header";
import { BenchmarkSelector, BenchmarkCase } from "./components/BenchmarkSelector";
import { TroubleshootForm } from "./components/TroubleshootForm";
import { ResultsDisplay } from "./components/ResultsDisplay";
import { LoadingView } from "./components/LoadingView";
import { ContextDeeplinkResponse, TroubleshootRequest } from "./types";
import { AlertCircle, RefreshCw } from "lucide-react";

// Official SIIS benchmark presets derived from official siis_responses.json dataset
const BENCHMARK_PRESETS: BenchmarkCase[] = [
  {
    id: "case-1",
    query: "My Samsung A115G tablet screen flashes and then goes completely blank whenever I tap to open an email in Gmail.",
    siis_response: {
      title: "Email server not responding on Samsung phone or tablet",
      content: "Smartphone,Others Mobile,Mobile Accessories,Tablet Email server not responding on Samsung phone or tablet: # Troubleshooting Email Connection Issues on Your Samsung Phone\n## Step 1: Check Email Access on a PC\nFirst, try accessing your email on a personal computer.\n## Step 2: Verify Your Phone's Internet Connection\nEnsure your phone is connected to a stable Wi-Fi or mobile data network. Go to Settings, tap Connections, and tap Wi-Fi.\n## Step 3: Clear the Email App's Cache and Data\nNavigate to Settings, tap Apps, select your email app, tap Storage, and tap Clear cache.\n## Step 4: Restart Your Phone in Safe Mode\nPress and hold the Power button, touch and hold Power off, and tap Safe mode.",
    },
  },
  {
    id: "case-2",
    query: "My Galaxy S22 screen turns completely blank or white and no text appears when I search for a stock price.",
    siis_response: {
      title: "Blank or black display on a Samsung phone or tablet",
      content: "Smartphone,Others Mobile,Tablet Blank or black display on a Samsung phone or tablet: ## Troubleshooting Steps for Device Not Turning On\n### Step 1: Check for Physical Damage and Liquid Exposure\nExamine USB connections and SIM/MicroSD slot LDI.\n### Step 2: Force a Restart\nPress and hold both the Power button and Volume down button simultaneously for at least 20 seconds.\n### Step 3: Charge the Device\nConnect to charger for at least 1 hour.\n### Step 4: Attempt to Power On\nPress and hold Power button for 15-20 seconds.",
    },
  },
  {
    id: "case-3",
    query: "My Galaxy tablet screen stays dark and only three app icons are lit while the rest are dark and won't open.",
    siis_response: {
      title: "Use Multi window and App pairs on your Galaxy phone or tablet",
      content: "Smartphone,Others Mobile,Tablet Use Multi window and App pairs on your Galaxy phone or tablet:\n## Customize the Edge panel\nSwipe left on the gray Edge panel handle on the right side of your screen.\n## Use Multi window\nNavigate to Settings, tap Advanced features, tap Multi window, and tap switches for Swipe for split screen.",
    },
  },
];

export const App: React.FC = () => {
  const [selectedCase, setSelectedCase] = useState<BenchmarkCase | undefined>(BENCHMARK_PRESETS[0]);
  const [requestPayload, setRequestPayload] = useState<TroubleshootRequest>({
    query: BENCHMARK_PRESETS[0].query,
    siis_response: BENCHMARK_PRESETS[0].siis_response,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<ContextDeeplinkResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSelectPreset = (preset: BenchmarkCase) => {
    setSelectedCase(preset);
    setRequestPayload({
      query: preset.query,
      siis_response: preset.siis_response,
    });
    setResponse(null);
    setError(null);
  };

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
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while communicating with the backend.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B132B] flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Presets Selector */}
        <BenchmarkSelector
          cases={BENCHMARK_PRESETS}
          onSelect={handleSelectPreset}
          selectedId={selectedCase?.id}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Request Form Column */}
          <div className="lg:col-span-5">
            <TroubleshootForm
              initialValues={requestPayload}
              onSubmit={handleExecuteTroubleshoot}
              isLoading={isLoading}
            />
          </div>

          {/* Results / Loading / Empty Column */}
          <div className="lg:col-span-7">
            {isLoading && <LoadingView />}

            {error && !isLoading && (
              <div className="bg-[#1C2541] rounded-2xl p-6 border border-red-500/40 shadow-xl space-y-3">
                <div className="flex items-center gap-2 text-red-400 font-semibold text-base">
                  <AlertCircle className="w-5 h-5" />
                  <span>Execution Error</span>
                </div>
                <p className="text-xs text-red-200 leading-relaxed font-mono">{error}</p>
                <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-700/50">
                  Make sure the Fastify Node Backend (port 3000) and Python AI Gateway (port 8000/8001) are running.
                </div>
              </div>
            )}

            {response && !isLoading && <ResultsDisplay response={response} />}

            {!response && !isLoading && !error && (
              <div className="bg-[#1C2541]/50 rounded-2xl p-12 border border-slate-800 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-cyan-400">
                  <RefreshCw className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Ready for Guided Troubleshooting</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Select a preset or enter a custom complaint to execute grounded Gemini generation and match official 578 Samsung device deeplinks.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        Samsung PRISM Gen AI Hackathon 3.0 — Theme 2: Guided Troubleshooting Prototype
      </footer>
    </div>
  );
};

export default App;

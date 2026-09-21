import React, { useState, useEffect } from "react";
import { Logo } from "./Logo";
import {
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Wifi,
  BatteryCharging,
  Zap,
  Settings as SettingsIcon,
  MessageSquare,
  Smartphone,
} from "lucide-react";
import logoImg from "../assets/samsung_logo.png";

interface IntroSplashProps {
  onComplete: () => void;
}

export const IntroSplash: React.FC<IntroSplashProps> = ({ onComplete }) => {
  const [step, setStep] = useState<number>(1); // 1 to 6
  const [isSkipped, setIsSkipped] = useState(false);

  useEffect(() => {
    // Stage intervals over ~5.5s (850ms per stage)
    const t1 = setTimeout(() => setStep(2), 900);
    const t2 = setTimeout(() => setStep(3), 1800);
    const t3 = setTimeout(() => setStep(4), 2700);
    const t4 = setTimeout(() => setStep(5), 3600);
    const t5 = setTimeout(() => setStep(6), 4500);
    const t6 = setTimeout(() => {
      setStep(7);
      onComplete();
    }, 5500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(t6);
    };
  }, [onComplete]);

  const handleSkip = () => {
    setIsSkipped(true);
    onComplete();
  };

  if (step > 6 || isSkipped) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#070D1E] text-white p-6 overflow-hidden select-none"
      role="region"
      aria-label="Product introduction onboarding sequence"
    >
      {/* Subtle linear glow background matching Reference 1 */}
      <div
        className="absolute inset-0 transition-all duration-1000"
        style={{
          background:
            "radial-gradient(circle at 50% 35%, rgba(20, 70, 180, 0.35), transparent 70%), radial-gradient(circle at 80% 80%, rgba(0, 198, 255, 0.12), transparent 50%), #070D1E",
        }}
      />

      {/* Top Bar: Brand & Skip */}
      <div className="absolute top-6 left-6 right-6 z-20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={logoImg} alt="Samsung Logo" className="w-6 h-6 object-contain" />
          <span className="text-xs font-bold tracking-tight text-white hidden sm:inline">
            Samsung Guided Troubleshooting
          </span>
        </div>

        <button
          onClick={handleSkip}
          className="px-4 py-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold backdrop-blur-md transition-all flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-cyan-400"
        >
          <span>Skip</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Content Card Container */}
      <div className="relative z-10 max-w-md w-full text-center space-y-8 animate-fade-in">
        {/* STEP 1: Elegant Intro */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div className="w-24 h-24 mx-auto flex items-center justify-center">
              <img src={logoImg} alt="Samsung" className="w-20 h-20 object-contain drop-shadow-[0_0_25px_rgba(0,198,255,0.4)]" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Samsung Guided Troubleshooting
              </h1>
              <p className="text-xs text-cyan-400 font-mono tracking-wider">
                Smart guidance. Smoother days.
              </p>
            </div>
            <p className="text-xs text-slate-400 animate-pulse pt-2">
              Preparing a better Samsung experience...
            </p>
          </div>
        )}

        {/* STEP 2: Engaging Animation */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="w-28 h-28 mx-auto flex items-center justify-center relative">
              <div className="absolute inset-0 rounded-full bg-blue-600/20 blur-xl animate-pulse" />
              <img src={logoImg} alt="Samsung" className="w-24 h-24 object-contain relative z-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-extrabold tracking-tight text-white">
                Real solutions <br />
                <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                  for real life.
                </span>
              </h2>
            </div>
          </div>
        )}

        {/* STEP 3: Clear Value */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
              {[
                { icon: Wifi, label: "Wi-Fi" },
                { icon: SettingsIcon, label: "Settings" },
                { icon: BatteryCharging, label: "Battery" },
                { icon: Zap, label: "Connections" },
              ].map(({ icon: Icon, label }, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-700/80 flex items-center gap-2.5 text-xs text-slate-200 shadow-lg">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-cyan-400 flex items-center justify-center">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="font-bold">{label}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-extrabold text-white">
                From problems to solutions.
              </h2>
            </div>
          </div>
        )}

        {/* STEP 4: What It Does */}
        {step === 4 && (
          <div className="space-y-6 animate-fade-in">
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-700/80 shadow-2xl max-w-sm mx-auto space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Tell us what's wrong</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                We'll analyze official Samsung diagnostic guidance and walk you through the fix step-by-step.
              </p>
            </div>
          </div>
        )}

        {/* STEP 5: Build Trust */}
        {step === 5 && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-700/80 shadow-2xl max-w-sm mx-auto space-y-2 text-left">
              {[
                "Understand your problem",
                "Find the right fix",
                "Show clear steps",
                "Connect to Settings",
                "Get you back on track",
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="font-medium">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-cyan-400 font-semibold">
              Smart support right on your device.
            </p>
          </div>
        )}

        {/* STEP 6: Ready to Go! */}
        {step === 6 && (
          <div className="space-y-5 animate-fade-in">
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-white">
                Fix your Samsung problem.
              </h2>
              <p className="text-xs text-slate-300 max-w-xs mx-auto">
                Describe what's happening and we'll guide you through the next steps.
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-700 text-xs text-slate-400 text-left max-w-sm mx-auto">
              Tell us what's wrong...
            </div>
          </div>
        )}

        {/* Step Indicator (1/6, 2/6, etc.) */}
        <div className="space-y-2 pt-2">
          <div className="flex justify-center items-center gap-1.5">
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step
                    ? "w-6 bg-cyan-400"
                    : s < step
                    ? "w-2 bg-blue-600"
                    : "w-2 bg-slate-800"
                }`}
              />
            ))}
          </div>
          <div className="text-[10px] font-mono text-slate-500">
            {step} / 6
          </div>
        </div>
      </div>
    </div>
  );
};

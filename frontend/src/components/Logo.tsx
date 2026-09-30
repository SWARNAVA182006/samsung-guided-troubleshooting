import React from "react";
import logoImg from "../assets/samsung_logo.png";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = "md",
  showText = true,
  className = "",
}) => {
  const sizeMap = {
    sm: { box: "w-9 h-9", rounded: "rounded-xl", title: "text-xs", sub: "text-[9px]" },
    md: { box: "w-10 h-10", rounded: "rounded-xl", title: "text-sm", sub: "text-[10px]" },
    lg: { box: "w-12 h-12", rounded: "rounded-2xl", title: "text-base", sub: "text-xs" },
    xl: { box: "w-20 h-20", rounded: "rounded-3xl", title: "text-xl", sub: "text-sm" },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Official Samsung Guided Troubleshooting App Icon Frame */}
      <div className="relative flex-shrink-0 transition-transform hover:scale-105">
        <div className={`${currentSize.box} ${currentSize.rounded} overflow-hidden shadow-sm border border-slate-200/90 dark:border-white/20 bg-[#092a72] flex items-center justify-center p-0.5`}>
          <img
            src={logoImg}
            alt="Samsung Guided Troubleshooting Logo"
            className={`w-full h-full object-cover ${currentSize.rounded}`}
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
            }}
          />
        </div>
      </div>

      {showText && (
        <div className="flex flex-col justify-center select-none">
          <div className="text-[10px] uppercase font-mono font-bold tracking-widest text-cyan-500 dark:text-cyan-400 leading-none mb-1">
            Samsung Assistant
          </div>
          <span className={`${currentSize.title} font-extrabold tracking-tight text-slate-900 dark:text-white leading-none`}>
            Guided Troubleshooting
          </span>
          <span className="text-[9px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Smart guidance. Smoother days.
          </span>
        </div>
      )}
    </div>
  );
};

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
    sm: { img: "w-7 h-7", title: "text-xs", sub: "text-[9px]" },
    md: { img: "w-9 h-9", title: "text-sm", sub: "text-[10px]" },
    lg: { img: "w-12 h-12", title: "text-base", sub: "text-xs" },
    xl: { img: "w-20 h-20", title: "text-xl", sub: "text-sm" },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Official Samsung Guided Troubleshooting PNG Logo Mark */}
      <div className="relative flex-shrink-0 transition-transform hover:scale-105">
        <img
          src={logoImg}
          alt="Samsung Guided Troubleshooting Logo"
          className={`${currentSize.img} object-contain rounded-xl drop-shadow-md`}
          onError={(e) => {
            // Fallback if image fails to load
            (e.target as HTMLElement).style.display = "none";
          }}
        />
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

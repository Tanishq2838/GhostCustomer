import { useEffect, useState } from "react";

interface KPICardProps {
  label: string;
  value: number | null;
  colorClass: "emerald" | "amber" | "rose" | "cyan" | "indigo";
  icon: React.ReactNode;
  rawValue?: string;
  subtitle?: string;
  fillPct?: number;
}

const PALETTE = {
  emerald: {
    text:     "text-emerald-400",
    border:   "border-emerald-500/40",
    borderL:  "border-l-emerald-500",
    iconBg:   "bg-emerald-500/10",
    iconText: "text-emerald-400",
    bar:      "bg-emerald-500",
    glowSm:   "rgba(16,185,129,0.25)",
    glowLg:   "rgba(16,185,129,0.5)",
    gradient: "from-emerald-500/8 to-transparent",
    stroke:   "#10b981",
  },
  amber: {
    text:     "text-amber-400",
    border:   "border-amber-500/40",
    borderL:  "border-l-amber-500",
    iconBg:   "bg-amber-500/10",
    iconText: "text-amber-400",
    bar:      "bg-amber-500",
    glowSm:   "rgba(245,158,11,0.25)",
    glowLg:   "rgba(245,158,11,0.5)",
    gradient: "from-amber-500/8 to-transparent",
    stroke:   "#f59e0b",
  },
  rose: {
    text:     "text-rose-400",
    border:   "border-rose-500/40",
    borderL:  "border-l-rose-500",
    iconBg:   "bg-rose-500/10",
    iconText: "text-rose-400",
    bar:      "bg-rose-500",
    glowSm:   "rgba(244,63,94,0.25)",
    glowLg:   "rgba(244,63,94,0.5)",
    gradient: "from-rose-500/8 to-transparent",
    stroke:   "#f43f5e",
  },
  cyan: {
    text:     "text-cyan-400",
    border:   "border-cyan-500/40",
    borderL:  "border-l-cyan-500",
    iconBg:   "bg-cyan-500/10",
    iconText: "text-cyan-400",
    bar:      "bg-cyan-500",
    glowSm:   "rgba(6,182,212,0.25)",
    glowLg:   "rgba(6,182,212,0.5)",
    gradient: "from-cyan-500/8 to-transparent",
    stroke:   "#06b6d4",
  },
  indigo: {
    text:     "text-indigo-400",
    border:   "border-indigo-500/40",
    borderL:  "border-l-indigo-500",
    iconBg:   "bg-indigo-500/10",
    iconText: "text-indigo-400",
    bar:      "bg-indigo-500",
    glowSm:   "rgba(99,102,241,0.25)",
    glowLg:   "rgba(99,102,241,0.5)",
    gradient: "from-indigo-500/8 to-transparent",
    stroke:   "#6366f1",
  },
};

const CIRCUMFERENCE = 87.96;

export function KPICard({
  label,
  value,
  colorClass,
  icon,
  rawValue,
  subtitle,
  fillPct,
}: KPICardProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [animatedFill, setAnimatedFill] = useState(0);
  const [isHovered,    setIsHovered]    = useState(false);
  const p = PALETTE[colorClass];

  // Animate % value for rate cards
  useEffect(() => {
    if (value === null) { setDisplayValue(0); return; }
    let cur = 0;
    const inc = value / (700 / 16);
    const t = setInterval(() => {
      cur += inc;
      if (cur >= value) { setDisplayValue(value); clearInterval(t); }
      else               { setDisplayValue(cur); }
    }, 16);
    return () => clearInterval(t);
  }, [value]);

  // Animate fillPct for projected cards
  useEffect(() => {
    if (fillPct === undefined) { setAnimatedFill(0); return; }
    setAnimatedFill(0);
    const target = Math.min(100, fillPct);
    let cur = 0;
    const inc = target / (700 / 16);
    const t = setInterval(() => {
      cur += inc;
      if (cur >= target) { setAnimatedFill(target); clearInterval(t); }
      else                { setAnimatedFill(cur); }
    }, 16);
    return () => clearInterval(t);
  }, [fillPct]);

  const barFill = fillPct !== undefined
    ? animatedFill
    : (value !== null ? Math.min(100, displayValue) : 0);

  const hasData = value !== null || rawValue !== undefined;

  return (
    <div
      className={`relative bg-card border ${p.border} border-l-2 ${p.borderL} flex flex-col
        transition-[transform,box-shadow] duration-200 ease-out`}
      style={{
        transform:  isHovered ? "scale(1.06)" : "scale(1)",
        zIndex:     isHovered ? 20 : 0,
        boxShadow:  hasData
          ? isHovered
            ? `0 0 36px -4px ${p.glowLg}, 0 8px 24px rgba(0,0,0,0.5)`
            : `0 0 24px -8px ${p.glowSm}`
          : undefined,
        // Only clip when idle — let content breathe on hover
        overflow: isHovered ? "visible" : "hidden",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Gradient overlay — clipped to card bounds via its own overflow */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${p.gradient} pointer-events-none`}
        style={{ borderRadius: "inherit", overflow: "hidden" }}
      />

      {/* ── Content ── */}
      <div className="relative flex-1 p-4 flex items-center gap-4">
        {/* Icon */}
        <div className={`${p.iconBg} ${p.iconText} p-2.5 rounded-sm flex-shrink-0`}>
          {icon}
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground leading-tight">
            {label}
          </p>

          <p className={`font-mono font-bold ${p.text} leading-none mt-0.5 ${
            rawValue !== undefined ? "text-xl" : "text-2xl"
          } ${isHovered ? "whitespace-normal break-all" : "truncate"}`}>
            {rawValue !== undefined
              ? rawValue
              : value !== null
              ? `${displayValue.toFixed(1)}%`
              : "—"}
          </p>

          {subtitle && (
            <p className={`text-[10px] font-mono text-slate-500 mt-0.5 leading-tight ${
              isHovered ? "whitespace-normal" : "truncate"
            }`}>
              {subtitle}
            </p>
          )}

          {/* Extra detail row revealed on hover */}
          {isHovered && hasData && (
            <div className={`mt-2 pt-2 border-t border-slate-800 flex items-center gap-1`}>
              <div
                className="h-1 rounded-full flex-1 bg-slate-800 overflow-hidden"
              >
                <div
                  className={`h-full ${p.bar} rounded-full`}
                  style={{ width: `${barFill}%` }}
                />
              </div>
              <span className={`text-[9px] font-mono ${p.text} ml-1 flex-shrink-0`}>
                {barFill.toFixed(0)}%
              </span>
            </div>
          )}
        </div>

        {/* Ring — always same width to keep columns aligned */}
        <div className="flex-shrink-0">
          <svg
            width={isHovered ? "42" : "36"}
            height={isHovered ? "42" : "36"}
            viewBox="0 0 36 36"
            style={{ transition: "width 0.2s, height 0.2s" }}
          >
            <circle cx="18" cy="18" r="14" fill="none"
              stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
            <circle cx="18" cy="18" r="14" fill="none"
              stroke={hasData ? p.stroke : "transparent"}
              strokeWidth={isHovered ? "4" : "3"}
              strokeDasharray={`${(barFill / 100) * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              strokeLinecap="round"
              transform="rotate(-90 18 18)"
              style={{ transition: "stroke-dasharray 0.05s linear, stroke-width 0.2s" }}
            />
          </svg>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="h-0.5 w-full bg-slate-900 shrink-0 overflow-hidden">
        <div
          className={`h-full ${p.bar}`}
          style={{ width: `${barFill}%`, opacity: hasData ? 0.7 : 0, transition: "width 0.05s linear" }}
        />
      </div>
    </div>
  );
}

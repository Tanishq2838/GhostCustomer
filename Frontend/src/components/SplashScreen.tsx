import { useEffect, useState } from "react";
import { Brain, TrendingUp, Search, Microscope, BarChart2 } from "lucide-react";

// ── Static particle field ──────────────────────────────────────────────────
const PARTICLES: { x: number; y: number; size: number; dur: number; delay: number }[] = [
  { x:  4, y: 12, size: 1.5, dur: 9,  delay: 0.0 },
  { x: 14, y: 75, size: 1.0, dur: 12, delay: 1.8 },
  { x: 26, y: 38, size: 2.0, dur: 10, delay: 0.6 },
  { x: 36, y: 85, size: 1.0, dur: 14, delay: 3.0 },
  { x: 50, y: 20, size: 1.5, dur: 9,  delay: 1.2 },
  { x: 60, y: 62, size: 1.0, dur: 16, delay: 2.4 },
  { x: 70, y: 28, size: 2.0, dur: 11, delay: 0.4 },
  { x: 80, y: 80, size: 1.5, dur: 12, delay: 3.5 },
  { x: 88, y: 48, size: 1.0, dur: 15, delay: 1.5 },
  { x: 93, y: 18, size: 2.0, dur: 9,  delay: 2.7 },
  { x: 10, y: 55, size: 1.0, dur: 13, delay: 0.9 },
  { x: 44, y: 68, size: 1.5, dur: 10, delay: 4.0 },
  { x: 65, y: 92, size: 1.0, dur: 12, delay: 0.3 },
  { x: 76, y:  9, size: 2.0, dur: 14, delay: 2.1 },
  { x: 32, y: 50, size: 1.0, dur: 9,  delay: 4.5 },
  { x: 55, y: 84, size: 1.5, dur: 13, delay: 1.3 },
  { x: 86, y: 65, size: 1.0, dur: 10, delay: 3.3 },
  { x: 20, y: 93, size: 2.0, dur: 16, delay: 1.7 },
];

const FEATURES = [
  {
    icon: Brain,
    label: "ML Decision Engine",
    desc: "Logistic regression trained on 5,000 synthetic agents across 9 behavioral dimensions",
    color: "text-purple-400",
    border: "border-purple-500/25",
    bg: "bg-purple-500/5",
    delay: 2.2,
  },
  {
    icon: TrendingUp,
    label: "Monte Carlo Simulation",
    desc: "50-iteration stochastic market modeling with 95% confidence intervals",
    color: "text-emerald-400",
    border: "border-emerald-500/25",
    bg: "bg-emerald-500/5",
    delay: 3.0,
  },
  {
    icon: Search,
    label: "Live Competitive Intelligence",
    desc: "Serper web search → Gemini LLM → real-time structured competitor pricing",
    color: "text-cyan-400",
    border: "border-cyan-500/25",
    bg: "bg-cyan-500/5",
    delay: 3.8,
  },
  {
    icon: BarChart2,
    label: "Price Elasticity Optimizer",
    desc: "Revenue & profit sweep across 30 dynamic price points per simulation run",
    color: "text-amber-400",
    border: "border-amber-500/25",
    bg: "bg-amber-500/5",
    delay: 4.6,
  },
  {
    icon: Microscope,
    label: "Decision Explainability",
    desc: "Per-feature attribution — exactly what drives each buy or reject outcome",
    color: "text-rose-400",
    border: "border-rose-500/25",
    bg: "bg-rose-500/5",
    delay: 5.4,
  },
];

// Total visible time before exit: 8.5 s
// Exit transition starts at 8.5 s, lasts 0.8 s → done at 9.3 s
const EXIT_AT  = 8500;
const DONE_AT  = 9400;

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setExiting(true), EXIT_AT);
    const t2 = setTimeout(() => onComplete(),     DONE_AT);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onComplete]);

  return (
    <>
      <style>{`
        @keyframes floatDot {
          0%,100% { transform: translateY(0)    translateX(0);    opacity: .2; }
          40%      { transform: translateY(-22px) translateX(8px);  opacity: .55; }
          70%      { transform: translateY(-10px) translateX(-5px); opacity: .35; }
        }
        @keyframes progressFill {
          from { width: 0%; }
          to   { width: 100%; }
        }
        @keyframes scanLine {
          0%   { top: -2px;    opacity: 0; }
          5%   { opacity: .5; }
          95%  { opacity: .5; }
          100% { top: 100%;   opacity: 0; }
        }
        @keyframes splashFadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes titleReveal {
          from { opacity: 0; transform: translateY(28px) scale(.97); letter-spacing: .25em; }
          to   { opacity: 1; transform: translateY(0)    scale(1);   letter-spacing: .02em; }
        }
        .splash-particle  { animation: floatDot var(--dur) var(--dly) ease-in-out infinite; }
        .splash-progress  { animation: progressFill ${EXIT_AT / 1000}s linear forwards; }
        .splash-scanline  { animation: scanLine ${DONE_AT / 1000}s linear 1 forwards; position: absolute; left: 0; right: 0; height: 1px; }
        .splash-title     { animation: titleReveal 1.1s cubic-bezier(.22,1,.36,1) .2s both; }
        .splash-subtitle  { animation: splashFadeUp .9s ease 1.1s both; }
        .splash-divider   { animation: splashFadeUp .7s ease 1.5s both; }
        .splash-feature   { animation: splashFadeUp .8s ease var(--dly) both; }
        .splash-progress-wrap { animation: splashFadeUp .7s ease 1.8s both; }
      `}</style>

      {/* ── Full-screen container ────────────────────────────────── */}
      <div
        className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center"
        style={{
          background: "radial-gradient(ellipse 90% 70% at 50% 45%, #0e1d40 0%, #060b14 65%)",
          transition: `opacity ${(DONE_AT - EXIT_AT) / 1000}s ease, transform ${(DONE_AT - EXIT_AT) / 1000}s ease`,
          opacity:   exiting ? 0 : 1,
          transform: exiting ? "scale(1.03)" : "scale(1)",
        }}
      >
        {/* Grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(99,102,241,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.035) 1px,transparent 1px)",
            backgroundSize: "52px 52px",
          }}
        />

        {/* Scanline */}
        <div
          className="splash-scanline pointer-events-none"
          style={{ background: "linear-gradient(90deg,transparent 0%,rgba(99,102,241,.45) 50%,transparent 100%)" }}
        />

        {/* Particles */}
        {PARTICLES.map((p, i) => (
          <div
            key={i}
            className="splash-particle absolute rounded-full bg-indigo-400/35"
            style={{
              left: `${p.x}%`, top: `${p.y}%`,
              width:  `${p.size * 3}px`,
              height: `${p.size * 3}px`,
              "--dur": `${p.dur}s`,
              "--dly": `${p.delay}s`,
            } as React.CSSProperties}
          />
        ))}

        {/* Centre glow */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: "50%", top: "45%",
            transform: "translate(-50%,-50%)",
            width: "700px", height: "500px",
            background: "radial-gradient(ellipse,rgba(99,102,241,.1) 0%,transparent 68%)",
          }}
        />

        {/* ── Content block — naturally centred by parent flex ── */}
        <div className="relative z-10 w-full max-w-2xl px-8 flex flex-col items-center">

          {/* Title */}
          <div className="splash-title text-center mb-2">
            <h1 className="text-6xl font-mono font-bold tracking-tight text-white leading-none">
              Ghost Customer
            </h1>
            <p className="text-2xl font-mono font-semibold text-indigo-300 tracking-[.18em] uppercase mt-2">
              Decision Lab
            </p>
          </div>

          {/* Tagline */}
          <p className="splash-subtitle text-slate-400 font-mono text-sm tracking-wider text-center mt-4">
            Agent-Based Pricing Intelligence &nbsp;·&nbsp; Predict &nbsp;·&nbsp; Optimize &nbsp;·&nbsp; Dominate
          </p>

          {/* Divider */}
          <div className="splash-divider flex items-center gap-3 my-6 w-full">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-indigo-500/30" />
            <span className="text-[10px] font-mono text-slate-600 uppercase tracking-widest whitespace-nowrap">
              v2.1 &nbsp;·&nbsp; ML + Monte Carlo + LLM
            </span>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-indigo-500/30" />
          </div>

          {/* Features */}
          <div className="w-full space-y-2.5">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.label}
                  className={`splash-feature flex items-center gap-3.5 px-4 py-3 rounded-lg border ${f.border} ${f.bg}`}
                  style={{ "--dly": `${f.delay}s` } as React.CSSProperties}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${f.color}`} />
                  <div className="min-w-0 flex-1">
                    <span className={`text-xs font-mono font-bold ${f.color}`}>{f.label}</span>
                    <span className="text-[10px] font-mono text-slate-500 ml-2 leading-relaxed">{f.desc}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Progress bar */}
          <div className="splash-progress-wrap w-full mt-7">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">
                Initialising simulation engine
              </span>
              <span className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">
                Ready
              </span>
            </div>
            <div className="h-px w-full bg-slate-800 rounded-full overflow-hidden">
              <div className="splash-progress h-full rounded-full bg-gradient-to-r from-indigo-600 via-purple-400 to-indigo-300" />
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

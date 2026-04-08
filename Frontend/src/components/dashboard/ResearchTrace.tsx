import { useState, useEffect, useRef } from "react";
import {
  Terminal, Shield, Cpu, Network, Database, CheckCircle2,
  X, Brain, Zap, AlertCircle, AlertTriangle, TrendingUp,
} from "lucide-react";
import type { AgentTraceEvent } from "@/types/simulation";

interface Competitor {
  name: string;
  price: number;
  strength: number;
  market_position?: string;
}

interface ResearchTraceProps {
  isFetching: boolean;
  productName: string;
  agentTrace: AgentTraceEvent[];
  competitors?: Competitor[];
}

interface DisplayLog {
  id: number;
  type: AgentTraceEvent["type"];
  message: string;
  timestamp: string;
}

const FAKE_STEPS: { type: AgentTraceEvent["type"]; message: string }[] = [
  { type: "INIT",       message: "Initialising Market Intelligence Agent..." },
  { type: "PLAN",       message: "Agent planning multi-step research strategy" },
  { type: "SEARCH",     message: "Executing search query 1..." },
  { type: "RESULTS",    message: "Processing search results..." },
  { type: "THINK",      message: "Agent reflecting on competitive landscape" },
  { type: "SEARCH",     message: "Refining with targeted follow-up search..." },
  { type: "SYNTHESIZE", message: "Synthesising competitor intelligence..." },
];

function getTimestamp() {
  return new Date().toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function getIconAndColor(type: AgentTraceEvent["type"]): { icon: React.ReactNode; color: string } {
  switch (type) {
    case "INIT":       return { icon: <Shield        className="w-3 h-3 text-cyan-400"   />, color: "text-cyan-300" };
    case "PLAN":       return { icon: <Cpu           className="w-3 h-3 text-purple-400" />, color: "text-purple-300" };
    case "THINK":      return { icon: <Brain         className="w-3 h-3 text-indigo-400" />, color: "text-slate-400 italic" };
    case "SEARCH":     return { icon: <Network       className="w-3 h-3 text-cyan-400"   />, color: "text-cyan-200" };
    case "RESULTS":    return { icon: <Database      className="w-3 h-3 text-blue-400"   />, color: "text-blue-300" };
    case "SYNTHESIZE": return { icon: <Zap           className="w-3 h-3 text-amber-400"  />, color: "text-amber-300" };
    case "COMPLETE":   return { icon: <CheckCircle2  className="w-3 h-3 text-emerald-400"/>, color: "text-emerald-300 font-bold" };
    case "ERROR":      return { icon: <AlertCircle   className="w-3 h-3 text-rose-400"   />, color: "text-rose-300" };
    default:           return { icon: <AlertTriangle className="w-3 h-3 text-amber-400"  />, color: "text-amber-300" };
  }
}

function renderMessage(type: AgentTraceEvent["type"], message: string): React.ReactNode {
  if (type === "SEARCH" && message.startsWith('Searching: "')) {
    const inner = message.slice('Searching: "'.length, -1);
    return <><span className="text-cyan-400">Searching: </span><span className="text-emerald-300">"{inner}"</span></>;
  }
  return message;
}

export function ResearchTrace({ isFetching, productName, agentTrace, competitors = [] }: ResearchTraceProps) {
  const [displayedLogs, setDisplayedLogs]     = useState<DisplayLog[]>([]);
  const [visible, setVisible]                 = useState(false);
  const [isDismissed, setIsDismissed]         = useState(false);
  const [isAnimating, setIsAnimating]         = useState(false);
  const [closing, setClosing]                 = useState(false);
  const [isDone, setIsDone]                   = useState(false);
  const [showCompetitors, setShowCompetitors] = useState(false);

  const intervalRef    = useRef<ReturnType<typeof setInterval>  | null>(null);
  const autoCloseRef   = useRef<ReturnType<typeof setTimeout>   | null>(null);
  const logIdRef       = useRef(0);
  const fakeCountRef   = useRef(0);
  const bottomRef      = useRef<HTMLDivElement>(null);
  const competitorsRef = useRef<Competitor[]>(competitors);

  // Keep ref in sync with prop so timeouts always see latest value
  useEffect(() => { competitorsRef.current = competitors; }, [competitors]);

  const stopInterval = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  };
  const stopAutoClose = () => {
    if (autoCloseRef.current) { clearTimeout(autoCloseRef.current); autoCloseRef.current = null; }
  };

  const dismiss = () => {
    stopInterval();
    stopAutoClose();
    setClosing(true);
    setTimeout(() => {
      setIsDismissed(true);
      setClosing(false);
      setIsDone(false);
      setShowCompetitors(false);
    }, 350);
  };

  // Mark done: stop spinner, show top-3, schedule auto-close
  const markDone = () => {
    stopInterval();
    setIsAnimating(false);
    setIsDone(true);
    setTimeout(() => {
      const comps = competitorsRef.current;
      if (comps.length > 0) setShowCompetitors(true);
      autoCloseRef.current = setTimeout(() => dismiss(), 2000);
    }, 200);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayedLogs, showCompetitors]);

  // ── Main lifecycle effect ────────────────────────────────────────────────
  useEffect(() => {
    if (isFetching) {
      // ── Phase 1: fetch started — show fake loading steps ──
      stopInterval();
      stopAutoClose();
      setVisible(true);
      setIsDismissed(false);
      setClosing(false);
      setIsAnimating(true);
      setIsDone(false);
      setShowCompetitors(false);
      setDisplayedLogs([]);
      logIdRef.current   = 0;
      fakeCountRef.current = 0;

      let stepIdx = 0;
      const push = (step: typeof FAKE_STEPS[0]) => {
        setDisplayedLogs(prev => [...prev, {
          id: logIdRef.current++, type: step.type, message: step.message, timestamp: getTimestamp(),
        }]);
        fakeCountRef.current++;
      };

      push(FAKE_STEPS[stepIdx++]);

      intervalRef.current = setInterval(() => {
        if (fakeCountRef.current >= 18) { stopInterval(); return; }
        const step = stepIdx < FAKE_STEPS.length ? FAKE_STEPS[stepIdx] : FAKE_STEPS[(stepIdx % 3) + 3];
        stepIdx++;
        push(step);
      }, 900);

    } else if (visible) {
      // ── Phase 2: fetch finished ──
      stopInterval();

      if (agentTrace.length > 0) {
        // Replay real trace events then mark done
        setDisplayedLogs([]);
        logIdRef.current = 0;
        setIsAnimating(true);
        setIsDone(false);

        let idx = 0;
        const showNext = () => {
          if (idx < agentTrace.length) {
            const ev = agentTrace[idx++];
            setDisplayedLogs(prev => [...prev, {
              id: logIdRef.current++, type: ev.type, message: ev.message, timestamp: getTimestamp(),
            }]);
          } else {
            stopInterval();
            markDone();
          }
        };
        showNext();
        intervalRef.current = setInterval(showNext, 500);
      } else {
        // No trace data — stop spinner immediately
        markDone();
      }
    }

    return () => { stopInterval(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFetching, agentTrace]);

  if (!visible || isDismissed) return null;

  const top3 = competitors.slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={dismiss} />

      <div
        className="relative w-[38rem] max-w-[92vw] z-10"
        style={{ animation: closing ? "traceModalOut 0.35s ease-in forwards" : "traceModalIn 0.35s ease-out forwards" }}
      >
        <div className="bg-slate-950/95 backdrop-blur-md border border-cyan-500/30 rounded-xl shadow-[0_0_60px_rgba(6,182,212,0.2)] overflow-hidden">

          {/* Header */}
          <div className="bg-slate-900 px-4 py-2.5 border-b border-cyan-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-widest">
                Agent Intelligence Trace
              </span>
              {isAnimating && (
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider animate-pulse">
                  · running
                </span>
              )}
              {isDone && (
                <span className="text-[9px] font-mono text-emerald-500 uppercase tracking-wider">
                  · complete · closing in 2s
                </span>
              )}
            </div>
            <button onClick={dismiss} className="p-1 hover:bg-slate-800 rounded transition-colors group">
              <X className="w-3.5 h-3.5 text-slate-500 group-hover:text-rose-400" />
            </button>
          </div>

          {/* Console logs */}
          <div className="p-5 space-y-2.5 max-h-64 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
            {displayedLogs.map((log, i) => {
              const { icon, color } = getIconAndColor(log.type);
              const isLast = i === displayedLogs.length - 1;
              return (
                <div key={log.id} className="flex items-start gap-2.5 animate-in fade-in slide-in-from-bottom-1 duration-300">
                  <div className="mt-0.5 shrink-0">{icon}</div>
                  <p className={`text-[11px] font-mono leading-relaxed ${color}`}>
                    <span className="text-slate-600 text-[9px] mr-2 not-italic font-normal">{log.timestamp}</span>
                    {renderMessage(log.type, log.message)}
                    {isLast && isAnimating && (
                      <span className="inline-block w-1.5 h-3 ml-1 bg-cyan-400 animate-pulse align-middle" />
                    )}
                  </p>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Top 3 competitors */}
          {showCompetitors && top3.length > 0 && (
            <div className="px-5 pb-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="border-t border-slate-800 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-widest">Top Competitors Found</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {top3.map((comp, i) => (
                    <div key={i} className="bg-slate-900 border border-slate-700/60 rounded-lg p-3 flex flex-col gap-1.5">
                      <span className="text-[10px] font-semibold text-slate-200 truncate">{comp.name}</span>
                      <span className="text-sm font-bold font-mono text-indigo-300">₹{comp.price.toLocaleString()}</span>
                      <div className="flex items-center gap-1">
                        <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500/60 rounded-full" style={{ width: `${comp.strength * 100}%` }} />
                        </div>
                        <span className="text-[8px] font-mono text-slate-500">{(comp.strength * 100).toFixed(0)}%</span>
                      </div>
                      {comp.market_position && (
                        <span className="text-[9px] text-slate-500 leading-tight">{comp.market_position}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Footer scan bar */}
          <div className="h-0.5 w-full bg-slate-900 relative overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-cyan-500/60 w-1/3"
              style={{ animation: isAnimating ? "scanLoader 2s infinite linear" : undefined, opacity: isAnimating ? 1 : 0.2 }}
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes traceModalIn  { from{opacity:0;transform:scale(0.94) translateY(12px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes traceModalOut { from{opacity:1;transform:scale(1) translateY(0)} to{opacity:0;transform:scale(0.94) translateY(12px)} }
        @keyframes scanLoader    { from{transform:translateX(-100%)} to{transform:translateX(400%)} }
      `}</style>
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { Terminal, Shield, Cpu, Network, Database, CheckCircle2, X, Brain, Zap, AlertCircle, AlertTriangle } from "lucide-react";
import type { AgentTraceEvent } from "@/types/simulation";

interface ResearchTraceProps {
  isFetching: boolean;
  productName: string;
  agentTrace: AgentTraceEvent[];
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

function getTimestamp(): string {
  return new Date().toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function getIconAndColor(type: AgentTraceEvent["type"]): { icon: React.ReactNode; color: string } {
  switch (type) {
    case "INIT":
      return { icon: <Shield className="w-3 h-3 text-cyan-400" />, color: "text-cyan-300" };
    case "PLAN":
      return { icon: <Cpu className="w-3 h-3 text-purple-400" />, color: "text-purple-300" };
    case "THINK":
      return { icon: <Brain className="w-3 h-3 text-indigo-400" />, color: "text-slate-400 italic" };
    case "SEARCH":
      return { icon: <Network className="w-3 h-3 text-cyan-400" />, color: "text-cyan-200" };
    case "RESULTS":
      return { icon: <Database className="w-3 h-3 text-blue-400" />, color: "text-blue-300" };
    case "SYNTHESIZE":
      return { icon: <Zap className="w-3 h-3 text-amber-400" />, color: "text-amber-300" };
    case "COMPLETE":
      return { icon: <CheckCircle2 className="w-3 h-3 text-emerald-400" />, color: "text-emerald-300 font-bold" };
    case "ERROR":
      return { icon: <AlertCircle className="w-3 h-3 text-rose-400" />, color: "text-rose-300" };
    case "WARN":
    case "LIMIT":
    case "FALLBACK":
      return { icon: <AlertTriangle className="w-3 h-3 text-amber-400" />, color: "text-amber-300" };
    default:
      return { icon: <Terminal className="w-3 h-3 text-slate-400" />, color: "text-slate-300" };
  }
}

function renderMessage(type: AgentTraceEvent["type"], message: string): React.ReactNode {
  if (type === "SEARCH" && message.startsWith('Searching: "')) {
    const inner = message.slice('Searching: "'.length, -1);
    return (
      <>
        <span className="text-cyan-400">Searching: </span>
        <span className="text-emerald-300">"{inner}"</span>
      </>
    );
  }
  return message;
}

export function ResearchTrace({ isFetching, productName, agentTrace }: ResearchTraceProps) {
  const [displayedLogs, setDisplayedLogs] = useState<DisplayLog[]>([]);
  const [visible, setVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const fakeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const traceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logIdRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  const clearIntervals = () => {
    if (fakeIntervalRef.current) { clearInterval(fakeIntervalRef.current); fakeIntervalRef.current = null; }
    if (traceIntervalRef.current) { clearInterval(traceIntervalRef.current); traceIntervalRef.current = null; }
  };

  // Scroll to bottom whenever logs update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayedLogs]);

  // When fetching starts: show fake loading animation
  useEffect(() => {
    if (isFetching) {
      clearIntervals();
      setVisible(true);
      setIsDismissed(false);
      setIsAnimating(true);
      setDisplayedLogs([]);
      logIdRef.current = 0;

      let stepIdx = 0;
      // Show first fake step immediately
      const firstStep = FAKE_STEPS[stepIdx];
      setDisplayedLogs([{ id: logIdRef.current++, type: firstStep.type, message: firstStep.message, timestamp: getTimestamp() }]);
      stepIdx++;

      fakeIntervalRef.current = setInterval(() => {
        if (stepIdx < FAKE_STEPS.length) {
          const step = FAKE_STEPS[stepIdx];
          setDisplayedLogs(prev => [...prev, { id: logIdRef.current++, type: step.type, message: step.message, timestamp: getTimestamp() }]);
          stepIdx++;
        } else {
          // Keep cycling the last few fake steps to show activity
          const loopStep = FAKE_STEPS[Math.floor(Math.random() * 3) + 3];
          setDisplayedLogs(prev => {
            // Cap at 10 entries while cycling
            const next = [...prev, { id: logIdRef.current++, type: loopStep.type, message: loopStep.message, timestamp: getTimestamp() }];
            return next.length > 10 ? next.slice(next.length - 10) : next;
          });
        }
      }, 900);
    }

    return () => clearIntervals();
  }, [isFetching]);

  // When fetching ends and real trace arrives: animate through real events
  useEffect(() => {
    if (!isFetching && agentTrace.length > 0 && visible) {
      clearIntervals();
      setDisplayedLogs([]);
      logIdRef.current = 0;
      setIsAnimating(true);

      let traceIdx = 0;

      const showNext = () => {
        if (traceIdx < agentTrace.length) {
          const event = agentTrace[traceIdx];
          setDisplayedLogs(prev => [
            ...prev,
            { id: logIdRef.current++, type: event.type, message: event.message, timestamp: getTimestamp() },
          ]);
          traceIdx++;
        } else {
          clearIntervals();
          setIsAnimating(false);
        }
      };

      // Show first immediately
      showNext();
      traceIntervalRef.current = setInterval(showNext, 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFetching, agentTrace]);

  if (!visible || isDismissed) return null;

  return (
    <div className="fixed bottom-8 left-8 w-[26rem] z-50 transition-all duration-500 opacity-100 translate-y-0">
      <div className="bg-slate-950/90 backdrop-blur-md border border-cyan-500/30 rounded-lg shadow-[0_0_30px_rgba(6,182,212,0.15)] overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 px-3 py-1.5 border-b border-cyan-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">
              Agent Intelligence Trace
            </span>
            {isAnimating && (
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">
                · running
              </span>
            )}
          </div>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 hover:bg-slate-800 rounded transition-colors group"
          >
            <X className="w-3 h-3 text-slate-500 group-hover:text-rose-400" />
          </button>
        </div>

        {/* Console Content */}
        <div className="p-4 space-y-2 max-h-72 overflow-y-auto scrollbar-none">
          {displayedLogs.map((log, i) => {
            const { icon, color } = getIconAndColor(log.type);
            const isLast = i === displayedLogs.length - 1;
            return (
              <div
                key={log.id}
                className="flex items-start gap-2 animate-in fade-in slide-in-from-left-2 duration-300"
              >
                <div className="mt-0.5 shrink-0">{icon}</div>
                <p className={`text-[11px] font-mono leading-relaxed ${color}`}>
                  <span className="text-slate-600 text-[9px] mr-2 not-italic font-normal">
                    {log.timestamp}
                  </span>
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

        {/* Footer Scan Bar */}
        <div className="h-0.5 w-full bg-slate-900 relative overflow-hidden">
          <div className={`absolute inset-0 bg-cyan-500/50 w-1/3 ${isAnimating ? "animate-[scan-loader_2s_infinite_linear]" : "opacity-30"}`} />
        </div>
      </div>
    </div>
  );
}

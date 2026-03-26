import { useState, useEffect, useRef } from "react";
import { Terminal, Shield, Cpu, Network, Database, CheckCircle2, X } from "lucide-react";

interface ResearchTraceProps {
  isFetching: boolean;
  productName: string;
}

const LOG_STEPS = [
  { icon: <Shield className="w-3 h-3 text-emerald-500" />, text: "[SYSTEM] Initializing Market Research Agent..." },
  { icon: <Network className="w-3 h-3 text-cyan-500" />, text: "[NETWORK] Querying Google SERP for {name}..." },
  { icon: <Database className="w-3 h-3 text-blue-500" />, text: "[ANALYSIS] Found 5 major competitors. Extracting snippets..." },
  { icon: <Cpu className="w-3 h-3 text-purple-500" />, text: "[LLM] Feeding raw context to behavioral model..." },
  { icon: <Cpu className="w-3 h-3 text-purple-500" />, text: "[LLM] Identifying pricing structures and strength..." },
  { icon: <Network className="w-3 h-3 text-cyan-500" />, text: "[SYNC] Mapping competitor coordinates to Topology..." },
  { icon: <CheckCircle2 className="w-3 h-3 text-emerald-400" />, text: "[SUCCESS] Intelligence synced. Calibrating sliders..." },
];

export function ResearchTrace({ isFetching, productName }: ResearchTraceProps) {
  const [logs, setLogs] = useState<number[]>([]);
  const [visible, setVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const stepInterval = useRef<any>(null);

  useEffect(() => {
    if (isFetching) {
      setVisible(true);
      setIsDismissed(false);
      setIsFinishing(false);
      setLogs([0]);
      
      let step = 0;
      stepInterval.current = setInterval(() => {
        step++;
        if (step < LOG_STEPS.length - 1) {
          setLogs(prev => [...prev, step]);
        } else {
          clearInterval(stepInterval.current);
        }
      }, 700);
    } else {
      if (visible) {
        // Force success step
        setLogs(prev => {
          if (prev.includes(LOG_STEPS.length - 1)) return prev;
          return [...prev, LOG_STEPS.length - 1];
        });
        
        // No longer auto-fading after success.
        // The user manually closes via X.
        setIsFinishing(true);
      }
      if (stepInterval.current) clearInterval(stepInterval.current);
    }

    return () => clearInterval(stepInterval.current);
  }, [isFetching]);

  if (!visible || isDismissed) return null;

  return (
    <div className={`fixed bottom-8 left-8 w-96 z-50 transition-all duration-500 transform ${
      isFetching ? "opacity-100 translate-y-0" : "opacity-90 translate-y-0"
    }`}>
      <div className="bg-slate-950/90 backdrop-blur-md border border-cyan-500/30 rounded-lg shadow-[0_0_30px_rgba(6,182,212,0.15)] overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 px-3 py-1.5 border-b border-cyan-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">
              Intelligence Trace
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsDismissed(true)}
              className="p-1 hover:bg-slate-800 rounded transition-colors group"
            >
              <X className="w-3 h-3 text-slate-500 group-hover:text-rose-400" />
            </button>
          </div>
        </div>

        {/* Console Content */}
        <div className="p-4 space-y-2 max-h-64 overflow-y-auto scrollbar-none">
          {logs.map((stepIdx, i) => (
            <div 
              key={i} 
              className="flex items-start gap-2 animate-in fade-in slide-in-from-left-2 duration-300"
            >
              <div className="mt-1 shrink-0">{LOG_STEPS[stepIdx].icon}</div>
              <p className="text-[11px] font-mono leading-relaxed text-slate-300">
                <span className="text-slate-500 text-[9px] mr-2">
                  {new Date().toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' })}
                </span>
                {LOG_STEPS[stepIdx].text.replace("{name}", productName || "Target")}
                {i === logs.length - 1 && !isFinishing && (
                  <span className="inline-block w-1.5 h-3 ml-1 bg-cyan-400 animate-pulse align-middle" />
                )}
              </p>
            </div>
          ))}
        </div>

        {/* Footer Scan Bar */}
        <div className="h-0.5 w-full bg-slate-900 relative overflow-hidden">
          <div className="absolute inset-0 bg-cyan-500/50 w-1/3 animate-[scan-loader_2s_infinite_linear]" />
        </div>
      </div>
    </div>
  );
}

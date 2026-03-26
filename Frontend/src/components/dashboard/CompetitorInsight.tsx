import { X, TrendingDown, ShieldCheck, Zap } from "lucide-react";

interface Competitor {
  name: string;
  price: number;
  strength: number;
}

interface CompetitorInsightProps {
  competitors: Competitor[];
  onClose: () => void;
}

export function CompetitorInsight({ competitors, onClose }: CompetitorInsightProps) {
  if (!competitors || competitors.length === 0) return null;

  const avgPrice = Math.round(
    competitors.reduce((acc, curr) => acc + curr.price, 0) / competitors.length
  );

  return (
    <div className="fixed bottom-8 right-8 w-80 z-50 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="bg-slate-900/95 backdrop-blur-xl border border-indigo-500/30 rounded-xl shadow-[0_0_40px_rgba(99,102,241,0.2)] overflow-hidden">
        {/* Header */}
        <div className="bg-indigo-600/10 px-4 py-3 border-b border-indigo-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-mono font-bold text-indigo-100 uppercase tracking-widest">
              Market Benchmarks
            </span>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-indigo-500/20 rounded-md transition-colors group"
          >
            <X className="w-3.5 h-3.5 text-indigo-300/50 group-hover:text-indigo-200" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div className="space-y-3">
            {competitors.map((comp, i) => (
              <div key={i} className="flex items-center justify-between group">
                <div className="flex flex-col">
                  <span className="text-[11px] font-medium text-slate-300 group-hover:text-white transition-colors">
                    {comp.name}
                  </span>
                  <div className="flex items-center gap-1">
                    <div className="h-1 w-12 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500/50" 
                        style={{ width: `${comp.strength * 100}%` }}
                      />
                    </div>
                    <span className="text-[8px] text-slate-500 font-mono uppercase">
                      STR: {(comp.strength * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <span className="text-xs font-mono text-indigo-300 font-bold">
                  ₹{comp.price.toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          {/* Average Badge */}
          <div className="pt-3 border-t border-slate-800">
            <div className="bg-indigo-500/10 border border-indigo-500/20 p-2.5 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[10px] font-mono text-slate-400 uppercase">
                  Simulated Baseline
                </span>
              </div>
              <span className="text-sm font-bold text-white font-mono">
                ₹{avgPrice.toLocaleString()}
              </span>
            </div>
            <p className="text-[9px] text-slate-500 mt-2 italic flex items-center gap-1">
              <Zap className="w-2.5 h-2.5 text-amber-500" />
              Sliders automatically calibrated to median.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

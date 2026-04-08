import { Microscope, TrendingUp, TrendingDown, ShoppingCart, XCircle } from "lucide-react";
import type { DecisionDrivers } from "@/types/simulation";

const FEATURE_LABELS: Record<string, string> = {
  value:              "Perceived Value",
  urgency:            "Customer Urgency",
  trust:              "Brand Trust",
  price_to_budget:    "Price Stress",
  risk_aversion:      "Risk Aversion",
  comp_quality_adv:   "Competitor Quality Gap",
  comp_price_adv:     "Competitor Price Advantage",
  pv_interaction:     "Price × Value Mismatch",
  risk_trust_penalty: "Risk × Low Trust",
  perceived_value:      "Perceived Value",
  price_stress:         "Price Stress",
  urgency_lift:         "Customer Urgency",
  risk_trust_drag:      "Risk-Trust Drag",
  competitor_pull:      "Competitor Pull",
  price_value_mismatch: "Price × Value Mismatch",
  market_friction:      "Market Friction",
};

interface DecisionExplainerProps {
  drivers: DecisionDrivers | null;
  engineMode: "ml" | "rule_based" | null;
}

function DriverColumn({
  title,
  subtitle,
  contribs,
  accentColor,
  n,
  icon,
}: {
  title: string;
  subtitle: string;
  contribs: Record<string, number>;
  accentColor: "emerald" | "rose";
  n: number;
  icon: React.ReactNode;
}) {
  const entries = Object.entries(contribs).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const maxAbs  = Math.max(...entries.map(([, v]) => Math.abs(v)), 0.001);

  const textColor  = accentColor === "emerald" ? "text-emerald-400" : "text-rose-400";
  const borderCol  = accentColor === "emerald" ? "border-emerald-500/25" : "border-rose-500/25";
  const bgCol      = accentColor === "emerald" ? "bg-emerald-500/5" : "bg-rose-500/5";
  const headerBg   = accentColor === "emerald" ? "bg-emerald-500/10 border-b border-emerald-500/20" : "bg-rose-500/10 border-b border-rose-500/20";
  const countBg    = accentColor === "emerald" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-rose-500/15 text-rose-300 border-rose-500/30";

  return (
    <div className={`border ${borderCol} ${bgCol} rounded-lg overflow-hidden flex-1`}>
      {/* Column header */}
      <div className={`${headerBg} px-4 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <div className={textColor}>{icon}</div>
          <div>
            <p className={`text-[10px] font-mono font-bold uppercase tracking-widest ${textColor}`}>{title}</p>
            <p className="text-[9px] font-mono text-slate-500">{subtitle}</p>
          </div>
        </div>
        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${countBg}`}>
          {n} agents
        </span>
      </div>

      <div className="p-4">
        {entries.length === 0 ? (
          <p className="text-[10px] font-mono text-slate-600 text-center py-4">No data</p>
        ) : (
          <div className="space-y-3">
            {entries.map(([feat, val]) => {
              const label = FEATURE_LABELS[feat] ?? feat;
              const width = (Math.abs(val) / maxAbs) * 100;
              const isPos = val > 0;
              return (
                <div key={feat}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      {isPos
                        ? <TrendingUp   className="w-2.5 h-2.5 text-emerald-400 flex-shrink-0" />
                        : <TrendingDown className="w-2.5 h-2.5 text-rose-400 flex-shrink-0" />
                      }
                      <span className="text-[10px] font-mono text-slate-300">{label}</span>
                    </div>
                    <span className={`text-[10px] font-mono font-bold ${isPos ? "text-emerald-400" : "text-rose-400"}`}>
                      {val > 0 ? "+" : ""}{val.toFixed(3)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-800/80 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${isPos ? "bg-emerald-500" : "bg-rose-500"}`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function DecisionExplainer({ drivers, engineMode }: DecisionExplainerProps) {
  if (!drivers || (drivers.n_buy === 0 && drivers.n_reject === 0)) return null;

  return (
    <div className="bg-slate-900/60 border border-slate-700/60 rounded-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4">
      {/* Panel header */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between"
        style={{ background: "linear-gradient(90deg, rgba(6,182,212,0.05) 0%, transparent 100%)" }}>
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-cyan-500/10 rounded border border-cyan-500/20">
            <Microscope className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-slate-200 font-mono text-sm uppercase tracking-wider">
              Decision Driver Analysis
            </h3>
            <p className="text-[9px] font-mono text-slate-500 mt-0.5">
              Average feature contribution per outcome group
            </p>
          </div>
        </div>
        <span className="text-[9px] font-mono uppercase tracking-widest px-2 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 rounded">
          {engineMode === "ml" ? "ML Explainability" : "Rule Decomposition"}
        </span>
      </div>

      <div className="p-5">
        <p className="text-[10px] font-mono text-slate-500 mb-4 leading-relaxed">
          Positive values push toward <span className="text-emerald-400">BUY</span> · Negative values push toward <span className="text-rose-400">REJECT</span>
        </p>

        <div className="flex gap-4">
          <DriverColumn
            title="Why They Bought"
            subtitle="Conversion drivers"
            contribs={drivers.buy}
            accentColor="emerald"
            n={drivers.n_buy}
            icon={<ShoppingCart className="w-3.5 h-3.5" />}
          />
          <DriverColumn
            title="Why They Rejected"
            subtitle="Deal-killers"
            contribs={drivers.reject}
            accentColor="rose"
            n={drivers.n_reject}
            icon={<XCircle className="w-3.5 h-3.5" />}
          />
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800">
          <p className="text-[9px] font-mono text-slate-600">
            {engineMode === "ml"
              ? "Contributions = logistic regression coefficient × standardised feature value (BUY class)."
              : "Contributions are the exact weighted terms in the decision z-score formula (GhostEngine)."}
          </p>
        </div>
      </div>
    </div>
  );
}

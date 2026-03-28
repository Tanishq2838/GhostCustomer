import { Microscope, TrendingUp, TrendingDown } from "lucide-react";
import type { DecisionDrivers } from "@/types/simulation";

// Labels for both ML features and rule-based factors
const FEATURE_LABELS: Record<string, string> = {
  // ML engine features
  value:              "Perceived Value",
  urgency:            "Customer Urgency",
  trust:              "Brand Trust",
  price_to_budget:    "Price Stress",
  risk_tolerance:     "Risk Aversion",
  comp_quality_adv:   "Competitor Quality Gap",
  comp_price_adv:     "Competitor Price Advantage",
  pv_interaction:     "Price × Value Mismatch",
  risk_trust_penalty: "Risk × Low Trust",
  // Rule-based factors
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
}: {
  title: string;
  subtitle: string;
  contribs: Record<string, number>;
  accentColor: "emerald" | "rose";
  n: number;
}) {
  const entries = Object.entries(contribs).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const maxAbs  = Math.max(...entries.map(([, v]) => Math.abs(v)), 0.001);

  const barColor  = accentColor === "emerald" ? "bg-emerald-500" : "bg-rose-500";
  const textColor = accentColor === "emerald" ? "text-emerald-400" : "text-rose-400";
  const borderCol = accentColor === "emerald" ? "border-emerald-500/30" : "border-rose-500/30";
  const bgCol     = accentColor === "emerald" ? "bg-emerald-500/5" : "bg-rose-500/5";

  return (
    <div className={`border ${borderCol} ${bgCol} rounded-lg p-4 flex-1`}>
      <div className="mb-3">
        <p className={`text-xs font-mono font-bold uppercase tracking-widest ${textColor}`}>{title}</p>
        <p className="text-[10px] font-mono text-slate-500 mt-0.5">{n} agents · avg contributions</p>
        <p className="text-[10px] font-mono text-slate-600">{subtitle}</p>
      </div>

      {entries.length === 0 ? (
        <p className="text-[10px] font-mono text-slate-600 text-center py-4">No data</p>
      ) : (
        <div className="space-y-2.5">
          {entries.map(([feat, val]) => {
            const label = FEATURE_LABELS[feat] ?? feat;
            const width = (Math.abs(val) / maxAbs) * 100;
            const isPos = val > 0;
            return (
              <div key={feat}>
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-1">
                    {isPos
                      ? <TrendingUp   className="w-2.5 h-2.5 text-emerald-400 flex-shrink-0" />
                      : <TrendingDown className="w-2.5 h-2.5 text-rose-400 flex-shrink-0" />
                    }
                    <span className="text-[10px] font-mono text-slate-300">{label}</span>
                  </div>
                  <span className={`text-[10px] font-mono ${isPos ? "text-emerald-400" : "text-rose-400"}`}>
                    {val > 0 ? "+" : ""}{val.toFixed(3)}
                  </span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isPos ? "bg-emerald-500" : "bg-rose-500"} transition-all duration-500`}
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function DecisionExplainer({ drivers, engineMode }: DecisionExplainerProps) {
  if (!drivers || (drivers.n_buy === 0 && drivers.n_reject === 0)) return null;

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-5 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Microscope className="w-4 h-4 text-cyan-400" />
          <h3 className="text-slate-200 font-mono text-sm uppercase tracking-wider">
            Decision Driver Analysis
          </h3>
        </div>
        <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded">
          {engineMode === "ml" ? "ML Explainability" : "Rule-Based Decomposition"}
        </span>
      </div>
      <p className="text-[10px] font-mono text-slate-500 mb-4">
        Average feature contribution to the BUY decision score for each outcome group.
        Positive values push toward BUY; negative values push toward REJECT.
      </p>

      <div className="flex gap-4">
        <DriverColumn
          title="Why They Bought"
          subtitle="What drove the conversion"
          contribs={drivers.buy}
          accentColor="emerald"
          n={drivers.n_buy}
        />
        <DriverColumn
          title="Why They Rejected"
          subtitle="What killed the deal"
          contribs={drivers.reject}
          accentColor="rose"
          n={drivers.n_reject}
        />
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800">
        <p className="text-[10px] font-mono text-slate-600">
          {engineMode === "ml"
            ? "Contributions computed as logistic regression coefficient × standardised feature value (BUY class)."
            : "Contributions are the exact weighted terms in the decision z-score formula (GhostEngine)."}
        </p>
      </div>
    </div>
  );
}

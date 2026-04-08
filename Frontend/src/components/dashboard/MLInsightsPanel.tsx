import { useEffect, useState } from "react";
import axios from "axios";
import { Brain, TrendingUp, TrendingDown, Minus, Cpu } from "lucide-react";

const API = "http://localhost:8000";

let _cachedMLStatus: MLStatus | null = null;

const FEATURE_LABELS: Record<string, string> = {
  value:              "Perceived Value",
  urgency:            "Customer Urgency",
  trust:              "Brand Trust (Stage)",
  price_to_budget:    "Price Stress (P/Budget)",
  risk_aversion:      "Risk Aversion",
  comp_quality_adv:   "Competitor Quality Gap",
  comp_price_adv:     "Competitor Price Advantage",
  pv_interaction:     "Price × Low Value Penalty",
  risk_trust_penalty: "Risk × Low Trust Penalty",
};

interface MLStatus {
  status: string;
  model_type: string;
  n_features: number;
  feature_names: string[];
  classes: string[];
  coefficients: Record<string, Record<string, number>>;
}

interface MLInsightsPanelProps {
  engineMode: "ml" | "rule_based" | null;
}

export function MLInsightsPanel({ engineMode }: MLInsightsPanelProps) {
  const [mlStatus, setMLStatus] = useState<MLStatus | null>(null);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    if (_cachedMLStatus) {
      setMLStatus(_cachedMLStatus);
      return;
    }
    setLoading(true);
    axios.get(`${API}/ml-status`)
      .then(res => { _cachedMLStatus = res.data; setMLStatus(res.data); })
      .catch(() => setMLStatus(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (!mlStatus || mlStatus.status !== "loaded") return null;

  const buyCoefs = mlStatus.coefficients["BUY"] ?? {};
  const sorted   = Object.entries(buyCoefs).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const maxAbs   = Math.max(...sorted.map(([, v]) => Math.abs(v)));

  return (
    <div className="bg-slate-900/60 border border-purple-500/25 rounded-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4">
      {/* Panel header */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between"
        style={{ background: "linear-gradient(90deg, rgba(168,85,247,0.06) 0%, transparent 100%)" }}>
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-purple-500/15 rounded border border-purple-500/20">
            <Brain className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-slate-200 font-mono text-sm uppercase tracking-wider">
              ML Model — Feature Importance
            </h3>
            <p className="text-[9px] font-mono text-slate-500 mt-0.5">
              {mlStatus.model_type} · {mlStatus.n_features} features · trained on 5k synthetic agents
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {engineMode === "ml" ? (
            <span className="text-[9px] font-mono uppercase tracking-widest px-2 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              Active
            </span>
          ) : (
            <span className="text-[9px] font-mono uppercase tracking-widest px-2 py-1 bg-slate-800 text-slate-500 border border-slate-700 rounded">
              Standby
            </span>
          )}
        </div>
      </div>

      <div className="p-5">
        <p className="text-[10px] font-mono text-slate-500 mb-4 leading-relaxed">
          Logistic Regression coefficients for the <span className="text-emerald-400 font-bold">BUY</span> class.
          Positive = drives purchase · Negative = kills purchase.
        </p>

        <div className="space-y-2.5">
          {sorted.map(([feat, coef], idx) => {
            const isPositive = coef > 0;
            const width      = Math.abs(coef) / maxAbs * 100;
            const label      = FEATURE_LABELS[feat] ?? feat;
            const rank       = idx + 1;

            return (
              <div key={feat} className="flex items-center gap-3">
                {/* Rank */}
                <span className="text-[9px] font-mono text-slate-700 w-4 text-right flex-shrink-0">
                  #{rank}
                </span>

                {/* Feature label */}
                <div className="w-44 flex-shrink-0 flex items-center gap-1.5">
                  {isPositive
                    ? <TrendingUp   className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                    : coef < -0.05
                    ? <TrendingDown className="w-3 h-3 text-rose-400 flex-shrink-0" />
                    : <Minus        className="w-3 h-3 text-slate-600 flex-shrink-0" />
                  }
                  <span className="text-[10px] font-mono text-slate-300 leading-tight">{label}</span>
                </div>

                {/* Bar track */}
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        isPositive ? "bg-emerald-500" : "bg-rose-500"
                      }`}
                      style={{
                        width: `${width}%`,
                        boxShadow: isPositive
                          ? "0 0 4px rgba(16,185,129,0.4)"
                          : "0 0 4px rgba(244,63,94,0.4)",
                      }}
                    />
                  </div>
                  <span className={`text-[10px] font-mono w-12 text-right font-bold ${
                    isPositive ? "text-emerald-400" : "text-rose-400"
                  }`}>
                    {coef > 0 ? "+" : ""}{coef.toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Class summary footer */}
        <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-3 gap-3">
          {mlStatus.classes.map((cls) => {
            const color = cls === "BUY"   ? "text-emerald-400 border-emerald-500/25 bg-emerald-500/5"
                        : cls === "DELAY" ? "text-amber-400 border-amber-500/25 bg-amber-500/5"
                        : "text-rose-400 border-rose-500/25 bg-rose-500/5";
            return (
              <div key={cls} className={`border rounded-lg p-3 text-center ${color}`}>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Cpu className="w-2.5 h-2.5 opacity-60" />
                  <p className="text-[8px] font-mono uppercase tracking-widest opacity-70">{cls}</p>
                </div>
                <p className="text-sm font-bold font-mono">
                  {Object.values(mlStatus.coefficients[cls] ?? {}).length}
                </p>
                <p className="text-[8px] font-mono opacity-50">features</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import axios from "axios";
import { Brain, TrendingUp, TrendingDown, Minus } from "lucide-react";

const API = "http://localhost:8000";

const FEATURE_LABELS: Record<string, string> = {
  value:              "Perceived Value",
  urgency:            "Customer Urgency",
  trust:              "Brand Trust (Stage)",
  price_to_budget:    "Price Stress (P/Budget)",
  risk_tolerance:     "Risk Aversion",
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
    setLoading(true);
    axios.get(`${API}/ml-status`)
      .then(res => setMLStatus(res.data))
      .catch(() => setMLStatus(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (!mlStatus || mlStatus.status !== "loaded") return null;

  // Show BUY class coefficients sorted by absolute magnitude
  const buyCoefs = mlStatus.coefficients["BUY"] ?? {};
  const sorted   = Object.entries(buyCoefs).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const maxAbs   = Math.max(...sorted.map(([, v]) => Math.abs(v)));

  return (
    <div className="bg-slate-900 border border-purple-500/30 rounded-lg p-5 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-400" />
          <h3 className="text-slate-200 font-mono text-sm uppercase tracking-wider">
            ML Model — Feature Importance
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {engineMode === "ml" ? (
            <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded">
              Active
            </span>
          ) : (
            <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 bg-slate-700 text-slate-400 border border-slate-600 rounded">
              Rule-Based Active
            </span>
          )}
          <span className="text-[10px] font-mono text-slate-500">{mlStatus.model_type}</span>
        </div>
      </div>

      <p className="text-[10px] font-mono text-slate-500 mb-4">
        Logistic Regression coefficients for BUY class — learned from 5,000 synthetic agents.
        Positive = drives purchase. Negative = kills purchase.
      </p>

      <div className="space-y-2">
        {sorted.map(([feat, coef]) => {
          const isPositive = coef > 0;
          const width      = Math.abs(coef) / maxAbs * 100;
          const label      = FEATURE_LABELS[feat] ?? feat;

          return (
            <div key={feat} className="flex items-center gap-3">
              {/* Feature label */}
              <div className="w-44 flex-shrink-0 flex items-center gap-1.5">
                {isPositive
                  ? <TrendingUp  className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                  : coef < -0.05
                  ? <TrendingDown className="w-3 h-3 text-rose-400 flex-shrink-0" />
                  : <Minus        className="w-3 h-3 text-slate-500 flex-shrink-0" />
                }
                <span className="text-[10px] font-mono text-slate-300 leading-tight">{label}</span>
              </div>

              {/* Bar */}
              <div className="flex-1 flex items-center gap-2">
                <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isPositive ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                    style={{ width: `${width}%` }}
                  />
                </div>
                <span className={`text-[10px] font-mono w-12 text-right ${
                  isPositive ? "text-emerald-400" : "text-rose-400"
                }`}>
                  {coef > 0 ? "+" : ""}{coef.toFixed(2)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-3 gap-3 text-center">
        {mlStatus.classes.map((cls) => {
          const color = cls === "BUY" ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/5"
                      : cls === "DELAY" ? "text-amber-400 border-amber-500/30 bg-amber-500/5"
                      : "text-rose-400 border-rose-500/30 bg-rose-500/5";
          return (
            <div key={cls} className={`border rounded p-2 ${color}`}>
              <p className="text-[9px] font-mono uppercase tracking-widest opacity-60 mb-1">{cls}</p>
              <p className="text-[10px] font-mono">
                {Object.values(mlStatus.coefficients[cls] ?? {}).length} features
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

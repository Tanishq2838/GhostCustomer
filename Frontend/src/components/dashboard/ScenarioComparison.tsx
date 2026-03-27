import { TrendingUp, TrendingDown, Minus, X } from "lucide-react";
import type { ParsedKPIs, ProjectedNumbers, SimulationPayload } from "@/types/simulation";

interface Scenario {
  label: string;
  kpis: ParsedKPIs;
  projected: ProjectedNumbers | null;
  payload: Partial<SimulationPayload>;
}

interface ScenarioComparisonProps {
  scenarioA: Scenario;
  scenarioB: Scenario;
  onClear: () => void;
}

function Delta({ a, b, unit = "%" }: { a: number; b: number; unit?: string }) {
  const diff = b - a;
  if (Math.abs(diff) < 0.1) return <Minus className="w-3 h-3 text-slate-500" />;
  return (
    <span className={`flex items-center gap-0.5 text-[10px] font-mono ${diff > 0 ? "text-emerald-400" : "text-rose-400"}`}>
      {diff > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {diff > 0 ? "+" : ""}{diff.toFixed(1)}{unit}
    </span>
  );
}

function Row({ label, aVal, bVal, unit = "%", higherIsBetter = true }: {
  label: string; aVal: number; bVal: number; unit?: string; higherIsBetter?: boolean;
}) {
  const winner = higherIsBetter ? (aVal >= bVal ? "a" : "b") : (aVal <= bVal ? "a" : "b");
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-2 border-b border-slate-800 last:border-0">
      <div className={`text-right font-mono text-sm font-bold ${winner === "a" ? "text-emerald-400" : "text-slate-300"}`}>
        {unit === "₹" ? `₹${aVal.toLocaleString()}` : `${aVal.toFixed(1)}${unit}`}
      </div>
      <div className="text-center text-[10px] font-mono text-slate-500 uppercase tracking-wider w-32">
        {label}
      </div>
      <div className={`text-left font-mono text-sm font-bold ${winner === "b" ? "text-emerald-400" : "text-slate-300"}`}>
        {unit === "₹" ? `₹${bVal.toLocaleString()}` : `${bVal.toFixed(1)}${unit}`}
      </div>
    </div>
  );
}

export function ScenarioComparison({ scenarioA, scenarioB, onClear }: ScenarioComparisonProps) {
  return (
    <div className="bg-slate-900 border border-indigo-500/40 rounded-lg p-5 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-200 font-mono text-sm uppercase tracking-wider">
          Scenario Comparison
        </h3>
        <button onClick={onClear} className="text-slate-500 hover:text-slate-300 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scenario Headers */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 mb-3">
        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded p-3 text-center">
          <p className="text-[9px] font-mono uppercase tracking-widest text-indigo-400 mb-1">Scenario A</p>
          <p className="text-white font-mono text-sm font-bold">{scenarioA.label}</p>
          <p className="text-[10px] font-mono text-slate-400">₹{scenarioA.payload.product_price?.toLocaleString()}</p>
        </div>
        <div className="flex items-center justify-center text-slate-600 font-mono text-lg font-bold">vs</div>
        <div className="bg-purple-500/10 border border-purple-500/30 rounded p-3 text-center">
          <p className="text-[9px] font-mono uppercase tracking-widest text-purple-400 mb-1">Scenario B</p>
          <p className="text-white font-mono text-sm font-bold">{scenarioB.label}</p>
          <p className="text-[10px] font-mono text-slate-400">₹{scenarioB.payload.product_price?.toLocaleString()}</p>
        </div>
      </div>

      {/* Metrics */}
      <div className="bg-slate-950/50 rounded p-3 border border-slate-800">
        <Row label="Conversion Rate"  aVal={scenarioA.kpis.conversionRate} bVal={scenarioB.kpis.conversionRate} higherIsBetter={true}  />
        <Row label="Delay Rate"       aVal={scenarioA.kpis.delayRate}      bVal={scenarioB.kpis.delayRate}      higherIsBetter={false} />
        <Row label="Rejection Rate"   aVal={scenarioA.kpis.rejectionRate}  bVal={scenarioB.kpis.rejectionRate}  higherIsBetter={false} />
        {scenarioA.projected && scenarioB.projected && (
          <>
            <Row label="Proj. Customers"  aVal={scenarioA.projected.customers}   bVal={scenarioB.projected.customers}   unit="" higherIsBetter={true} />
            <Row label="Proj. Revenue"    aVal={scenarioA.projected.revenue}      bVal={scenarioB.projected.revenue}      unit="₹" higherIsBetter={true} />
          </>
        )}
      </div>

      {/* Delta summary */}
      <div className="mt-3 flex items-center gap-4 text-[10px] font-mono text-slate-500">
        <span>Conversion shift:</span>
        <Delta a={scenarioA.kpis.conversionRate} b={scenarioB.kpis.conversionRate} />
        {scenarioA.projected && scenarioB.projected && (
          <>
            <span className="ml-2">Revenue shift:</span>
            <Delta a={scenarioA.projected.revenue} b={scenarioB.projected.revenue} unit="₹" />
          </>
        )}
      </div>
    </div>
  );
}

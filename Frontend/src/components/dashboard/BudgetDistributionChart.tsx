import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine, Legend,
} from "recharts";
import type { AgentDecision } from "@/types/simulation";

interface Props {
  decisions: AgentDecision[] | null;
}

const NUM_BINS = 20;

function gaussianPDF(x: number, mean: number, std: number): number {
  if (std === 0) return 0;
  return (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * ((x - mean) / std) ** 2);
}

export function BudgetDistributionChart({ decisions }: Props) {
  if (!decisions || decisions.length === 0) return null;

  const budgets = decisions.map(d => d.budget);
  const n       = budgets.length;
  const mean    = budgets.reduce((s, b) => s + b, 0) / n;
  const std     = Math.sqrt(budgets.reduce((s, b) => s + (b - mean) ** 2, 0) / n);
  const minB    = Math.min(...budgets);
  const maxB    = Math.max(...budgets);
  const binW    = (maxB - minB) / NUM_BINS || 1;

  // Build histogram bins
  const bins: { x: number; count: number; gaussian: number }[] = [];
  for (let i = 0; i < NUM_BINS; i++) {
    const lo  = minB + i * binW;
    const mid = lo + binW / 2;
    const cnt = budgets.filter(b => b >= lo && b < lo + binW).length;
    // Scale PDF to match histogram (density × binWidth × n)
    const density = gaussianPDF(mid, mean, std) * binW * n;
    bins.push({ x: Math.round(mid), count: cnt, gaussian: Math.round(density * 10) / 10 });
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-slate-900 border border-slate-700 rounded p-2 text-[10px] font-mono">
        <p className="text-slate-400 mb-1">Budget ≈ ₹{label?.toLocaleString()}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name === "count" ? `Agents: ${p.value}` : `Gaussian: ${p.value}`}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="col-span-1 lg:col-span-2 bg-slate-900 border border-slate-700 p-4 rounded-lg animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="text-slate-300 font-mono text-sm uppercase tracking-wider">
            Agent Budget Distribution
          </h3>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
            Bars = actual · Curve = theoretical Gaussian · proves N(μ,σ) sampling
          </p>
        </div>
        <div className="flex gap-4 text-[10px] font-mono text-right">
          <div>
            <p className="text-slate-500 uppercase">Mean</p>
            <p className="text-cyan-400 font-bold">₹{Math.round(mean).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-slate-500 uppercase">Std Dev</p>
            <p className="text-purple-400 font-bold">₹{Math.round(std).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-slate-500 uppercase">Range</p>
            <p className="text-amber-400 font-bold">₹{Math.round(minB).toLocaleString()} – ₹{Math.round(maxB).toLocaleString()}</p>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={bins} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="x"
            tickFormatter={v => `₹${Number(v).toLocaleString()}`}
            tick={{ fill: "#64748b", fontSize: 9, fontFamily: "monospace" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#64748b", fontSize: 9, fontFamily: "monospace" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            x={Math.round(mean)}
            stroke="#06b6d4"
            strokeDasharray="4 2"
            label={{ value: "μ", fill: "#06b6d4", fontSize: 10, fontFamily: "monospace" }}
          />
          <Bar dataKey="count" name="count" fill="#6366f1" fillOpacity={0.6} radius={[2, 2, 0, 0]} />
          <Line
            dataKey="gaussian"
            name="gaussian"
            type="monotone"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
            strokeDasharray="5 3"
          />
          <Legend
            formatter={(value) => (
              <span style={{ fontSize: 9, fontFamily: "monospace", color: "#94a3b8" }}>
                {value === "count" ? "Actual Agent Count" : "Theoretical Gaussian N(μ,σ²)"}
              </span>
            )}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <p className="text-[9px] text-slate-600 font-mono mt-2">
        f(x) = (1 / σ√2π) · e^(−½·((x−μ)/σ)²) · scaled by bin width × N &nbsp;|&nbsp; μ={Math.round(mean).toLocaleString()} · σ={Math.round(std).toLocaleString()} · N={n}
      </p>
    </div>
  );
}

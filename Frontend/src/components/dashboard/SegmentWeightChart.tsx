import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend, Cell,
} from "recharts";
import type { AgentDecision, AgentSegment, SegmentStats } from "@/types/simulation";
import { DEFAULT_SEGMENT_WEIGHTS } from "@/types/simulation";

interface Props {
  decisions: AgentDecision[] | null;
  segBreakdown: Record<AgentSegment, SegmentStats> | null;
  segmentWeights?: Partial<Record<AgentSegment, number>>;
}

const SEGMENT_COLORS: Record<AgentSegment, { actual: string; target: string; label: string }> = {
  early_adopter:  { actual: "#22d3ee", target: "#0891b2", label: "Early Adopter"  },
  premium_seeker: { actual: "#a78bfa", target: "#7c3aed", label: "Premium Seeker" },
  price_hunter:   { actual: "#fbbf24", target: "#d97706", label: "Price Hunter"   },
  skeptic:        { actual: "#f87171", target: "#dc2626", label: "Skeptic"         },
};

const SEGMENTS: AgentSegment[] = ["early_adopter", "premium_seeker", "price_hunter", "skeptic"];

export function SegmentWeightChart({ decisions, segBreakdown, segmentWeights }: Props) {
  if (!decisions || decisions.length === 0 || !segBreakdown) return null;

  const n = decisions.length;

  // Resolve target weights — use custom if provided, else defaults
  const raw = segmentWeights ?? {};
  const hasCustom = Object.keys(raw).length > 0;
  const targetWeights: Record<AgentSegment, number> = hasCustom
    ? (() => {
        const total = SEGMENTS.reduce((s, k) => s + (raw[k] ?? 0), 0);
        return SEGMENTS.reduce((acc, k) => {
          acc[k] = total > 0 ? (raw[k] ?? 0) / total : DEFAULT_SEGMENT_WEIGHTS[k];
          return acc;
        }, {} as Record<AgentSegment, number>);
      })()
    : { ...DEFAULT_SEGMENT_WEIGHTS };

  const data = SEGMENTS.map(seg => {
    const actual = segBreakdown[seg]?.total ?? 0;
    const actualPct  = Math.round((actual / n) * 1000) / 10;
    const targetPct  = Math.round(targetWeights[seg] * 1000) / 10;
    const delta      = Math.round((actualPct - targetPct) * 10) / 10;
    return {
      seg,
      label: SEGMENT_COLORS[seg].label,
      actual: actualPct,
      target: targetPct,
      delta,
      count: actual,
    };
  });

  const maxDelta = Math.max(...data.map(d => Math.abs(d.delta)));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const row = data.find(d => d.label === label);
    return (
      <div className="bg-slate-900 border border-slate-700 rounded p-2 text-[10px] font-mono space-y-1">
        <p className="text-slate-300 font-bold mb-1">{label}</p>
        <p className="text-amber-400">Target: {row?.target}%</p>
        <p className="text-cyan-400">Actual: {row?.actual}%  ({row?.count} agents)</p>
        <p className={Math.abs(row?.delta ?? 0) < 3 ? "text-emerald-400" : "text-rose-400"}>
          Δ {row?.delta && row.delta > 0 ? "+" : ""}{row?.delta}%
        </p>
      </div>
    );
  };

  return (
    <div className="col-span-1 lg:col-span-2 bg-slate-900 border border-slate-700 p-4 rounded-lg animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="text-slate-300 font-mono text-sm uppercase tracking-wider">
            Segment Weight Validation
          </h3>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
            Target weight (amber) vs actual sampled proportion (teal) — proves weighted random sampling
          </p>
        </div>
        <div className="text-right text-[10px] font-mono">
          <p className="text-slate-500 uppercase">Max Δ</p>
          <p className={maxDelta < 3 ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
            {maxDelta}%
          </p>
          <p className="text-slate-600">{maxDelta < 3 ? "within tolerance" : "sampling variance"}</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="label"
            tick={{ fill: "#64748b", fontSize: 9, fontFamily: "monospace" }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={v => `${v}%`}
            tick={{ fill: "#64748b", fontSize: 9, fontFamily: "monospace" }}
            tickLine={false}
            axisLine={false}
            domain={[0, 60]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) => (
              <span style={{ fontSize: 9, fontFamily: "monospace", color: "#94a3b8" }}>
                {value === "target" ? "Target Weight (%)" : "Actual Sampled (%)"}
              </span>
            )}
          />
          <Bar dataKey="target" name="target" radius={[2, 2, 0, 0]} fillOpacity={0.5}>
            {data.map(d => <Cell key={d.seg} fill="#f59e0b" />)}
          </Bar>
          <Bar dataKey="actual" name="actual" radius={[2, 2, 0, 0]} fillOpacity={0.85}>
            {data.map(d => <Cell key={d.seg} fill={SEGMENT_COLORS[d.seg].actual} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Delta row */}
      <div className="grid grid-cols-4 gap-2 mt-3">
        {data.map(d => (
          <div key={d.seg} className="bg-slate-800/60 rounded p-2 text-center">
            <p className="text-[9px] font-mono text-slate-500 uppercase">{d.label}</p>
            <p className="text-[10px] font-mono font-bold mt-0.5"
               style={{ color: SEGMENT_COLORS[d.seg].actual }}>
              {d.actual}% <span className="text-slate-500 font-normal">actual</span>
            </p>
            <p className="text-[9px] font-mono text-amber-400">{d.target}% target</p>
            <p className={`text-[9px] font-mono font-bold ${Math.abs(d.delta) < 3 ? "text-emerald-500" : "text-rose-400"}`}>
              Δ {d.delta > 0 ? "+" : ""}{d.delta}%
            </p>
          </div>
        ))}
      </div>

      <p className="text-[9px] text-slate-600 font-mono mt-2">
        Sampling via weighted random.choices() · expected variance ≈ √(w·(1−w)/N) per segment · N={n} agents
      </p>
    </div>
  );
}

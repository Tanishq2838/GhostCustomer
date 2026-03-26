import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { AgentDecision } from "@/types/simulation";

interface ProbabilityChartProps {
  decisions: AgentDecision[] | null;
}

export function ProbabilityChart({ decisions }: ProbabilityChartProps) {
  if (!decisions || decisions.length === 0) {
    return (
      <div className="bg-card border border-border p-5 flex items-center justify-center h-[340px]">
        <p className="text-sm font-mono text-muted-foreground">
          Probability distribution will appear here
        </p>
      </div>
    );
  }

  const sorted = [...decisions].sort((a, b) => a.probability - b.probability);
  const data = sorted.map((d, i) => ({
    index: i,
    probability: +(d.probability * 100).toFixed(1),
  }));

  return (
    <div className="bg-card border border-border p-5">
      <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-4">
        Probability Distribution
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="probGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(230, 70%, 60%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(230, 70%, 60%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 16%)" />
          <XAxis
            dataKey="index"
            tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 11, fontFamily: "JetBrains Mono" }}
            axisLine={{ stroke: "hsl(215, 20%, 16%)" }}
            label={{ value: "Agent Index", position: "insideBottom", offset: -5, fill: "hsl(215, 15%, 50%)", fontSize: 10 }}
          />
          <YAxis
            tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 11, fontFamily: "JetBrains Mono" }}
            axisLine={{ stroke: "hsl(215, 20%, 16%)" }}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(222, 40%, 8%)",
              border: "1px solid hsl(215, 20%, 16%)",
              borderRadius: "2px",
              fontFamily: "JetBrains Mono",
              fontSize: 12,
            }}
            formatter={(value: number) => [`${value}%`, "Probability"]}
          />
          <Area
            type="monotone"
            dataKey="probability"
            stroke="hsl(230, 70%, 60%)"
            fill="url(#probGrad)"
            strokeWidth={2}
            animationDuration={800}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

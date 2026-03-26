import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { ParsedKPIs } from "@/types/simulation";

interface DistributionChartProps {
  kpis: ParsedKPIs | null;
}

export function DistributionChart({ kpis }: DistributionChartProps) {
  if (!kpis) {
    return <ChartPlaceholder />;
  }

  const data = [
    { name: "Buy", value: kpis.conversionRate, fill: "hsl(160, 84%, 39%)" },
    { name: "Delay", value: kpis.delayRate, fill: "hsl(38, 92%, 50%)" },
    { name: "Reject", value: kpis.rejectionRate, fill: "hsl(347, 77%, 50%)" },
  ];

  return (
    <div className="bg-card border border-border p-5">
      <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-4">
        Decision Distribution
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} barSize={48}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 16%)" />
          <XAxis
            dataKey="name"
            tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 11, fontFamily: "JetBrains Mono" }}
            axisLine={{ stroke: "hsl(215, 20%, 16%)" }}
          />
          <YAxis
            tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 11, fontFamily: "JetBrains Mono" }}
            axisLine={{ stroke: "hsl(215, 20%, 16%)" }}
            domain={[0, 100]}
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
            formatter={(value: number) => [`${value.toFixed(1)}%`, ""]}
          />
          <Bar dataKey="value" animationDuration={800}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartPlaceholder() {
  return (
    <div className="bg-card border border-border p-5 flex items-center justify-center h-[340px]">
      <p className="text-sm font-mono text-muted-foreground">
        Configure parameters and run simulation
      </p>
    </div>
  );
}

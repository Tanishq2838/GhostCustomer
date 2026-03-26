import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import type { ElasticityResponse } from "@/types/simulation";

interface ElasticityChartProps {
  data: ElasticityResponse | null;
}

export function ElasticityChart({ data }: ElasticityChartProps) {
  if (!data) return null;

  return (
    <div className="bg-card border border-border p-4 rounded-lg flex flex-col pt-6 pb-6 col-span-1 lg:col-span-2 shadow-sm animate-in fade-in zoom-in-95 duration-500">
      <div className="px-2 mb-6 text-center">
        <h3 className="text-xl font-bold tracking-tight text-foreground uppercase">
          Price Elasticity of Demand (PED)
        </h3>
        <p className="text-muted-foreground text-sm mt-1 max-w-2xl mx-auto">
          {data.insight}
        </p>
      </div>

      <div className="h-80 w-full mt-4 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data.curve}
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
            <XAxis 
              dataKey="price" 
              tickFormatter={(v) => `₹${v}`} 
              tick={{ fontSize: 12 }} 
              stroke="#888888" 
              dy={10}
            />
            <YAxis 
              yAxisId="left" 
              orientation="left" 
              tickFormatter={(v) => `${v}%`} 
              tick={{ fontSize: 12, fill: "#3b82f6" }} 
              stroke="#3b82f6" 
            />
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              tickFormatter={(v) => `₹${v}`} 
              tick={{ fontSize: 12, fill: "#10b981" }} 
              stroke="#10b981" 
            />
            <Tooltip 
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px" }}
              itemStyle={{ fontSize: 14 }}
              labelFormatter={(val) => `Price: ₹${val}`}
            />
            <Legend wrapperStyle={{ paddingTop: "20px" }} />
            
            <Bar 
              yAxisId="left" 
              dataKey="conversion" 
              name="Conversion Rate (%)" 
              fill="#3b82f6" 
              radius={[4, 4, 0, 0]} 
              barSize={30}
            />
            <Line 
              yAxisId="right" 
              type="monotone" 
              dataKey="revenue" 
              name="Projected Revenue" 
              stroke="#10b981" 
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 2, fill: "#10b981" }} 
              activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2 }} 
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

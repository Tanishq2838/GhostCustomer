import type { ParsedKPIs } from "@/types/simulation";
import { AlertTriangle, CheckCircle, TrendingDown } from "lucide-react";

interface InsightEngineProps {
  kpis: ParsedKPIs | null;
}

export function InsightEngine({ kpis }: InsightEngineProps) {
  if (!kpis) return null;

  const insights: { icon: React.ReactNode; text: string; color: string }[] = [];

  if (kpis.delayRate > kpis.conversionRate) {
    insights.push({
      icon: <AlertTriangle className="h-4 w-4" />,
      text: "High Market Hesitation: Pricing may exceed immediate urgency.",
      color: "border-amber text-amber bg-amber/5",
    });
  }

  if (kpis.conversionRate > 50) {
    insights.push({
      icon: <CheckCircle className="h-4 w-4" />,
      text: "Strong Market Fit: Value proposition outweighs friction.",
      color: "border-emerald text-emerald bg-emerald/5",
    });
  }

  if (kpis.rejectionRate > 40) {
    insights.push({
      icon: <TrendingDown className="h-4 w-4" />,
      text: "Critical Drop-off: Check budget-to-price alignment.",
      color: "border-rose text-rose bg-rose/5",
    });
  }

  if (insights.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3">
      {insights.map((insight, i) => (
        <div
          key={i}
          className={`flex items-center gap-2 px-4 py-2.5 border-l-2 text-xs font-mono ${insight.color}`}
        >
          {insight.icon}
          {insight.text}
        </div>
      ))}
    </div>
  );
}

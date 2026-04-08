import type { ParsedKPIs } from "@/types/simulation";
import { AlertTriangle, CheckCircle, TrendingDown, Lightbulb } from "lucide-react";

interface InsightEngineProps {
  kpis: ParsedKPIs | null;
}

export function InsightEngine({ kpis }: InsightEngineProps) {
  if (!kpis) return null;

  const insights: {
    icon: React.ReactNode;
    title: string;
    text: string;
    severity: "warn" | "good" | "bad";
  }[] = [];

  if (kpis.delayRate > kpis.conversionRate) {
    insights.push({
      icon: <AlertTriangle className="h-4 w-4 flex-shrink-0" />,
      title: "High Market Hesitation",
      text: "Delay rate exceeds conversion — pricing may outpace immediate urgency. Consider time-limited offers.",
      severity: "warn",
    });
  }

  if (kpis.conversionRate > 50) {
    insights.push({
      icon: <CheckCircle className="h-4 w-4 flex-shrink-0" />,
      title: "Strong Market Fit",
      text: "Over half of simulated agents chose to buy. Value proposition is clearly outweighing friction.",
      severity: "good",
    });
  }

  if (kpis.rejectionRate > 40) {
    insights.push({
      icon: <TrendingDown className="h-4 w-4 flex-shrink-0" />,
      title: "Critical Drop-off Detected",
      text: "High rejection rate suggests a price-budget mismatch. Lower price or target a premium segment.",
      severity: "bad",
    });
  }

  if (kpis.conversionRate >= 30 && kpis.conversionRate <= 50) {
    insights.push({
      icon: <Lightbulb className="h-4 w-4 flex-shrink-0" />,
      title: "Moderate Traction",
      text: "Conversion is in healthy territory. Small price adjustments could meaningfully shift outcomes.",
      severity: "warn",
    });
  }

  if (insights.length === 0) return null;

  const palette = {
    warn: {
      border: "border-amber-500/30",
      bg: "bg-amber-500/5",
      iconColor: "text-amber-400",
      titleColor: "text-amber-300",
      accent: "bg-amber-500",
    },
    good: {
      border: "border-emerald-500/30",
      bg: "bg-emerald-500/5",
      iconColor: "text-emerald-400",
      titleColor: "text-emerald-300",
      accent: "bg-emerald-500",
    },
    bad: {
      border: "border-rose-500/30",
      bg: "bg-rose-500/5",
      iconColor: "text-rose-400",
      titleColor: "text-rose-300",
      accent: "bg-rose-500",
    },
  };

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center gap-2 mb-1">
        <Lightbulb className="w-4 h-4 text-amber-400" />
        <h3 className="text-slate-300 font-mono text-sm uppercase tracking-wider">
          Automated Insights
        </h3>
        <span className="text-[9px] font-mono bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded border border-slate-700">
          {insights.length} signal{insights.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {insights.map((insight, i) => {
          const p = palette[insight.severity];
          return (
            <div key={i} className={`relative flex gap-3 p-4 border ${p.border} ${p.bg} rounded-lg overflow-hidden`}>
              {/* Left accent bar */}
              <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${p.accent}`} />
              <div className={`${p.iconColor} mt-0.5`}>{insight.icon}</div>
              <div className="min-w-0">
                <p className={`text-xs font-mono font-semibold ${p.titleColor} mb-0.5`}>
                  {insight.title}
                </p>
                <p className="text-[10px] font-mono text-slate-400 leading-relaxed">
                  {insight.text}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import type { AgentDecision, AgentSegment } from "@/types/simulation";

interface DecisionTableProps {
  decisions: AgentDecision[] | null;
}

const SEGMENT_STYLE: Record<AgentSegment, { label: string; color: string }> = {
  early_adopter:  { label: "Early Adopter",  color: "text-cyan-400"   },
  premium_seeker: { label: "Premium Seeker", color: "text-purple-400" },
  price_hunter:   { label: "Price Hunter",   color: "text-amber-400"  },
  skeptic:        { label: "Skeptic",        color: "text-rose-400"   },
};

export function DecisionTable({ decisions }: DecisionTableProps) {
  if (!decisions || decisions.length === 0) {
    return (
      <div className="bg-card border border-border p-5">
        <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-4">
          Live Decision Logs
        </h3>
        <p className="text-sm font-mono text-muted-foreground text-center py-8">
          No decision data yet
        </p>
      </div>
    );
  }

  const hasML = decisions.some(d => d.ml_probabilities != null);

  const badgeClass = (action: string) => {
    switch (action) {
      case "buy":    return "bg-emerald/15 text-emerald border border-emerald/30";
      case "delay":  return "bg-amber/15 text-amber border border-amber/30";
      case "reject": return "bg-rose/15 text-rose border border-rose/30";
      default:       return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="bg-card border border-border">
      <div className="p-5 pb-3 border-b border-border flex items-center justify-between">
        <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          Live Decision Logs
          <span className="ml-2 text-foreground">{decisions.length} agents</span>
        </h3>
        {hasML && (
          <span className="text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/30 rounded">
            ML Probabilities
          </span>
        )}
      </div>
      <div className="max-h-[400px] overflow-y-auto">
        <table className="w-full text-xs font-mono">
          <thead className="sticky top-0 bg-card z-10">
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left p-3">Agent</th>
              <th className="text-left p-3">Segment</th>
              <th className="text-left p-3">Budget</th>
              <th className="text-left p-3">Urgency</th>
              <th className="text-left p-3">Win Prob</th>
              {hasML && (
                <>
                  <th className="text-left p-3 text-emerald-500/60">BUY%</th>
                  <th className="text-left p-3 text-amber-500/60">DLY%</th>
                  <th className="text-left p-3 text-rose-500/60">REJ%</th>
                </>
              )}
              <th className="text-left p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {decisions.map((d) => {
              const seg = SEGMENT_STYLE[d.segment as AgentSegment];
              return (
                <tr key={d.agent_id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="p-3 text-muted-foreground">#{String(d.agent_id).padStart(4, "0")}</td>
                  <td className={`p-3 ${seg?.color ?? "text-slate-400"}`}>
                    {seg?.label ?? d.segment}
                  </td>
                  <td className="p-3">₹{d.budget.toFixed(0)}</td>
                  <td className="p-3">{d.urgency.toFixed(2)}</td>
                  <td className="p-3">{(d.probability * 100).toFixed(1)}%</td>
                  {hasML && (
                    <>
                      <td className="p-3 text-emerald-400">
                        {d.ml_probabilities ? `${(d.ml_probabilities.BUY * 100).toFixed(0)}%` : "—"}
                      </td>
                      <td className="p-3 text-amber-400">
                        {d.ml_probabilities ? `${(d.ml_probabilities.DELAY * 100).toFixed(0)}%` : "—"}
                      </td>
                      <td className="p-3 text-rose-400">
                        {d.ml_probabilities ? `${(d.ml_probabilities.REJECT * 100).toFixed(0)}%` : "—"}
                      </td>
                    </>
                  )}
                  <td className="p-3">
                    <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wider ${badgeClass(d.action)}`}>
                      {d.action}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

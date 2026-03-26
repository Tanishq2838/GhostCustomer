import type { AgentDecision } from "@/types/simulation";

interface DecisionTableProps {
  decisions: AgentDecision[] | null;
}

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

  const badgeClass = (action: string) => {
    switch (action) {
      case "buy":
        return "bg-emerald/15 text-emerald border border-emerald/30";
      case "delay":
        return "bg-amber/15 text-amber border border-amber/30";
      case "reject":
        return "bg-rose/15 text-rose border border-rose/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="bg-card border border-border">
      <div className="p-5 pb-3 border-b border-border">
        <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          Live Decision Logs
          <span className="ml-2 text-foreground">{decisions.length} agents</span>
        </h3>
      </div>
      <div className="max-h-[400px] overflow-y-auto">
        <table className="w-full text-xs font-mono">
          <thead className="sticky top-0 bg-card z-10">
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left p-3">Agent ID</th>
              <th className="text-left p-3">Budget</th>
              <th className="text-left p-3">Urgency</th>
              <th className="text-left p-3">Probability</th>
              <th className="text-left p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {decisions.map((d) => (
              <tr key={d.agent_id} className="border-b border-border/50 hover:bg-muted/30">
                <td className="p-3 text-muted-foreground">#{String(d.agent_id).padStart(4, "0")}</td>
                <td className="p-3">₹{d.budget.toFixed(0)}</td>
                <td className="p-3">{d.urgency.toFixed(2)}</td>
                <td className="p-3">{(d.probability * 100).toFixed(1)}%</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wider ${badgeClass(d.action)}`}>
                    {d.action}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

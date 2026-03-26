import { useEffect, useState } from "react";

interface KPICardProps {
  label: string;
  value: number | null;
  colorClass: "emerald" | "amber" | "rose";
  icon: React.ReactNode;
}

export function KPICard({ label, value, colorClass, icon }: KPICardProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (value === null) {
      setDisplayValue(0);
      return;
    }
    let start = 0;
    const end = value;
    const duration = 600;
    const stepTime = 16;
    const steps = duration / stepTime;
    const increment = end / steps;
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setDisplayValue(end);
        clearInterval(timer);
      } else {
        setDisplayValue(start);
      }
    }, stepTime);
    return () => clearInterval(timer);
  }, [value]);

  const borderColor = {
    emerald: "border-emerald",
    amber: "border-amber",
    rose: "border-rose",
  }[colorClass];

  const textColor = {
    emerald: "text-emerald",
    amber: "text-amber",
    rose: "text-rose",
  }[colorClass];

  const bgColor = {
    emerald: "bg-emerald/10",
    amber: "bg-amber/10",
    rose: "bg-rose/10",
  }[colorClass];

  return (
    <div className={`bg-card border ${borderColor} border-l-2 p-4 flex items-center gap-4`}>
      <div className={`${bgColor} ${textColor} p-2.5 rounded-sm`}>{icon}</div>
      <div>
        <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={`text-2xl font-mono font-bold ${textColor} animate-count-up`}>
          {value !== null ? `${displayValue.toFixed(1)}%` : "—"}
        </p>
      </div>
    </div>
  );
}

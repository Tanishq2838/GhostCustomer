export function SkeletonChart() {
  return (
    <div className="bg-card border border-border p-5 h-[340px] flex flex-col gap-4 animate-pulse">
      <div className="h-3 w-40 bg-muted rounded-sm" />
      <div className="flex-1 flex items-end gap-3 px-8">
        <div className="w-12 h-[40%] bg-muted rounded-sm" />
        <div className="w-12 h-[60%] bg-muted rounded-sm" />
        <div className="w-12 h-[30%] bg-muted rounded-sm" />
        <div className="w-12 h-[55%] bg-muted rounded-sm" />
        <div className="w-12 h-[45%] bg-muted rounded-sm" />
      </div>
    </div>
  );
}

import { useState, useCallback } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Zap, Loader2, Info, Brain } from "lucide-react";
import type { SimulationPayload, ProductStage, SegmentWeights } from "@/types/simulation";
import { STAGE_CONFIG, computePerceivedValue, DEFAULT_SEGMENT_WEIGHTS } from "@/types/simulation";
import axios from "axios";
import { toast } from "sonner";

const API = "http://localhost:8000";

interface ControlPanelProps {
  onSimulate: (payload: SimulationPayload) => void;
  onLiveUpdate?: (values: Partial<SimulationPayload>) => void;
  onFetchingChange?: (isFetching: boolean) => void;
  onCompetitorsFound?: (competitors: any[]) => void;
  isLoading: boolean;
}

const STAGE_KEYS = Object.keys(STAGE_CONFIG) as ProductStage[];

// Default dimension scores per stage (all start at 0.5 = neutral)
function defaultScores(stage: ProductStage): Record<string, number> {
  return Object.fromEntries(
    STAGE_CONFIG[stage].dimensions.map((d) => [d.key, 0.5])
  );
}

export function ControlPanel({
  onSimulate,
  onLiveUpdate,
  onFetchingChange,
  onCompetitorsFound,
  isLoading,
}: ControlPanelProps) {
  const [productPrice, setProductPrice] = useState(500);
  const [agentCount, setAgentCount]     = useState(100);
  const [compPrice, setCompPrice]       = useState(400);
  const [compStrength, setCompStrength] = useState(0.5);
  const [productName, setProductName]   = useState("");
  const [isFetchingMarket, setIsFetchingMarket] = useState(false);
  const [useML, setUseML] = useState(true);
  const [marketSize, setMarketSize] = useState(0);
  const [segWeights, setSegWeights] = useState<SegmentWeights>({ ...DEFAULT_SEGMENT_WEIGHTS });

  // Stage & dimension state
  const [stage, setStage]   = useState<ProductStage>("pre_launch");
  const [scores, setScores] = useState<Record<string, number>>(defaultScores("pre_launch"));
  const [hintKey, setHintKey] = useState<string | null>(null);

  const perceivedValue = computePerceivedValue(stage, scores);

  const handleStageChange = (s: ProductStage) => {
    setStage(s);
    setScores(defaultScores(s));
    triggerLiveUpdate({ product_value: computePerceivedValue(s, defaultScores(s)) });
  };

  const handleScoreChange = (key: string, val: number) => {
    const next = { ...scores, [key]: val };
    setScores(next);
    triggerLiveUpdate({ product_value: computePerceivedValue(stage, next) });
  };

  const triggerLiveUpdate = useCallback(
    (updates: Partial<SimulationPayload>) => {
      onLiveUpdate?.({
        product_price: productPrice,
        product_value: perceivedValue,
        comp_price: compPrice,
        comp_strength: compStrength,
        agent_count: agentCount,
        ...updates,
      });
    },
    [productPrice, perceivedValue, compPrice, compStrength, agentCount, onLiveUpdate]
  );

  const handleFetchMarketData = async () => {
    if (!productName) return;
    setIsFetchingMarket(true);
    onFetchingChange?.(true);
    try {
      const res = await axios.post(`${API}/fetch-market-data`, { product_name: productName });
      setCompPrice(res.data.comp_price);
      setCompStrength(res.data.comp_strength);
      onCompetitorsFound?.(res.data.competitors || []);
      triggerLiveUpdate({
        comp_price: res.data.comp_price,
        comp_strength: res.data.comp_strength,
      });
      toast.success(`Market Intel Loaded: Found ${res.data.competitors?.length || 0} competitors.`);
    } catch {
      toast.error("Research failed, using fallback data.");
      setCompPrice(500);
      setCompStrength(0.5);
    } finally {
      setIsFetchingMarket(false);
      onFetchingChange?.(false);
    }
  };

  // Normalise segment weights so they always sum to 1
  const normalisedWeights = (): SegmentWeights => {
    const total = Object.values(segWeights).reduce((s, v) => s + v, 0);
    if (total === 0) return { ...DEFAULT_SEGMENT_WEIGHTS };
    return {
      early_adopter:  segWeights.early_adopter  / total,
      premium_seeker: segWeights.premium_seeker / total,
      price_hunter:   segWeights.price_hunter   / total,
      skeptic:        segWeights.skeptic         / total,
    };
  };

  const handleRun = () => {
    onSimulate({
      agent_count:      Number(agentCount),
      product_price:    Number(productPrice),
      product_value:    perceivedValue,
      comp_price:       Number(compPrice),
      comp_strength:    Number(compStrength),
      product_stage:    stage,
      use_ml:           useML,
      market_size:      marketSize > 0 ? marketSize : undefined,
      segment_weights:  normalisedWeights(),
    });
  };

  const dims = STAGE_CONFIG[stage].dimensions;

  // Colour the value score
  const valueColor =
    perceivedValue >= 0.7 ? "text-emerald-400" :
    perceivedValue >= 0.45 ? "text-amber-400" :
    "text-rose-400";

  return (
    <aside className="w-80 min-h-screen border-r border-border bg-surface-sunken p-5 flex flex-col gap-5 shrink-0 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald animate-pulse" />
        <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          Control Room
        </h2>
      </div>

      {/* ── Product Price ── */}
      <div className="space-y-2">
        <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex justify-between">
          Product Price
          <span className="text-foreground font-semibold">₹{productPrice}</span>
        </label>
        <Slider
          min={100} max={5000} step={50}
          value={[productPrice]}
          onValueChange={([v]) => { setProductPrice(v); triggerLiveUpdate({ product_price: v }); }}
          className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-0 [&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
        />
      </div>

      {/* ── Agent Count ── */}
      <div className="space-y-2">
        <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex justify-between">
          Agent Count
          <span className="text-foreground font-semibold">{agentCount}</span>
        </label>
        <Slider
          min={10} max={500} step={50}
          value={[agentCount]}
          onValueChange={([v]) => { setAgentCount(v); triggerLiveUpdate({ agent_count: v }); }}
          className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-0 [&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
        />
      </div>

      {/* ── Product Value (Stage-based) ── */}
      <div className="border border-slate-800 rounded-lg p-3 space-y-3 bg-slate-950/50">

        {/* Stage selector */}
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">
            Product Stage
          </p>
          <div className="grid grid-cols-2 gap-1">
            {STAGE_KEYS.map((s) => (
              <button
                key={s}
                onClick={() => handleStageChange(s)}
                className={`text-[10px] font-mono px-2 py-1.5 rounded border transition-all text-left ${
                  stage === s
                    ? "bg-primary/20 border-primary/60 text-primary"
                    : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300"
                }`}
              >
                <span className="block font-bold">{STAGE_CONFIG[s].label}</span>
                <span className="block text-[9px] opacity-60">{STAGE_CONFIG[s].subtitle}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Computed value score */}
        <div className="flex items-center justify-between bg-slate-900 rounded px-3 py-2 border border-slate-800">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
            Computed Value Score
          </span>
          <span className={`text-lg font-bold font-mono ${valueColor}`}>
            {perceivedValue.toFixed(2)}
          </span>
        </div>

        {/* Dimension sliders */}
        <div className="space-y-3">
          {dims.map((dim) => (
            <div key={dim.key} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-slate-300">{dim.label}</span>
                  <button
                    onMouseEnter={() => setHintKey(dim.key)}
                    onMouseLeave={() => setHintKey(null)}
                    className="text-slate-600 hover:text-slate-400 transition-colors"
                  >
                    <Info className="w-2.5 h-2.5" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-slate-500 w-8 text-right">
                    {(dim.weight * 100).toFixed(0)}%
                  </span>
                  <span className="text-[10px] font-mono text-slate-200 w-6 text-right">
                    {(scores[dim.key] ?? 0.5).toFixed(1)}
                  </span>
                </div>
              </div>

              {/* Hint tooltip */}
              {hintKey === dim.key && (
                <p className="text-[9px] font-mono text-slate-500 italic leading-relaxed px-1">
                  {dim.hint}
                </p>
              )}

              <Slider
                min={0.1} max={1.0} step={0.1}
                value={[scores[dim.key] ?? 0.5]}
                onValueChange={([v]) => handleScoreChange(dim.key, v)}
                className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-0 [&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5"
              />
            </div>
          ))}
        </div>

        {/* Visual weight breakdown */}
        <div className="flex h-1.5 rounded-full overflow-hidden gap-px">
          {dims.map((dim, i) => {
            const colors = ["bg-cyan-500","bg-purple-500","bg-amber-500","bg-emerald-500","bg-rose-500"];
            const filled = Math.round((scores[dim.key] ?? 0.5) * dim.weight * 10);
            const total  = Math.round(dim.weight * 10);
            return (
              <div key={dim.key} className="flex gap-px" style={{ flex: dim.weight }}>
                {Array.from({ length: total }).map((_, j) => (
                  <div
                    key={j}
                    className={`flex-1 rounded-sm transition-all duration-300 ${
                      j < filled ? colors[i % colors.length] : "bg-slate-800"
                    }`}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Competitor Intel ── */}
      <div className="border-t border-border pt-4 space-y-4">
        <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          Competitor Intel
        </h3>

        <div className="space-y-1.5">
          <label className="text-xs font-mono text-muted-foreground">Product to Research</label>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="e.g. Premium Coffee Beans"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleFetchMarketData()}
              className="bg-card border-border font-mono text-sm h-9"
            />
            <Button
              onClick={handleFetchMarketData}
              disabled={isFetchingMarket || !productName}
              variant="outline"
              className="h-9 px-3 w-20 flex-shrink-0"
            >
              {isFetchingMarket
                ? <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                : "Fetch"}
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-mono text-muted-foreground">Competitor Price (₹)</label>
          <Input
            type="number"
            value={compPrice}
            onChange={(e) => {
              const v = Number(e.target.value);
              setCompPrice(v);
              triggerLiveUpdate({ comp_price: v });
            }}
            className="bg-card border-border font-mono text-sm h-9"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex justify-between">
            Competitor Strength
            <span className="text-foreground font-semibold">{compStrength.toFixed(1)}</span>
          </label>
          <Slider
            min={0.1} max={1.0} step={0.1}
            value={[compStrength]}
            onValueChange={([v]) => { setCompStrength(v); triggerLiveUpdate({ comp_strength: v }); }}
            className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-0 [&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
          />
        </div>
      </div>

      {/* ── Market Size ── */}
      <div className="space-y-1.5">
        <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex justify-between">
          Market Size (TAM)
          {marketSize > 0 && <span className="text-foreground font-semibold">{marketSize.toLocaleString()}</span>}
        </label>
        <Input
          type="number"
          placeholder="e.g. 10000 (optional)"
          value={marketSize || ""}
          onChange={(e) => setMarketSize(Math.max(0, Number(e.target.value)))}
          className="bg-card border-border font-mono text-sm h-9"
        />
        <p className="text-[9px] font-mono text-slate-600 leading-relaxed">
          Enables projected customers & revenue in results
        </p>
      </div>

      {/* ── Segment Mix ── */}
      <div className="border border-slate-800 rounded-lg p-3 space-y-3 bg-slate-950/50">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Market Segment Mix</p>
          <button
            onClick={() => setSegWeights({ ...DEFAULT_SEGMENT_WEIGHTS })}
            className="text-[9px] font-mono text-slate-600 hover:text-slate-400 transition-colors"
          >
            reset
          </button>
        </div>

        {(Object.entries(segWeights) as [keyof SegmentWeights, number][]).map(([seg, val]) => {
          const total = Object.values(segWeights).reduce((s, v) => s + v, 0);
          const pct   = total > 0 ? Math.round((val / total) * 100) : 0;
          const colors: Record<keyof SegmentWeights, string> = {
            early_adopter:  "text-cyan-400",
            premium_seeker: "text-purple-400",
            price_hunter:   "text-amber-400",
            skeptic:        "text-rose-400",
          };
          const labels: Record<keyof SegmentWeights, string> = {
            early_adopter:  "Early Adopter",
            premium_seeker: "Premium Seeker",
            price_hunter:   "Price Hunter",
            skeptic:        "Skeptic",
          };
          return (
            <div key={seg} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-mono ${colors[seg]}`}>{labels[seg]}</span>
                <span className="text-[10px] font-mono text-slate-400">{pct}%</span>
              </div>
              <Slider
                min={0} max={1} step={0.05}
                value={[val]}
                onValueChange={([v]) => setSegWeights(prev => ({ ...prev, [seg]: v }))}
                className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-0 [&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5"
              />
            </div>
          );
        })}

        {/* Stacked bar showing mix */}
        <div className="flex h-1.5 rounded-full overflow-hidden">
          {(Object.entries(segWeights) as [keyof SegmentWeights, number][]).map(([seg, val]) => {
            const total = Object.values(segWeights).reduce((s, v) => s + v, 0);
            const pct   = total > 0 ? (val / total) * 100 : 25;
            const bgColors: Record<keyof SegmentWeights, string> = {
              early_adopter:  "bg-cyan-500",
              premium_seeker: "bg-purple-500",
              price_hunter:   "bg-amber-500",
              skeptic:        "bg-rose-500",
            };
            return <div key={seg} className={`${bgColors[seg]} transition-all duration-300`} style={{ width: `${pct}%` }} />;
          })}
        </div>
      </div>

      {/* ── Engine Mode Toggle ── */}
      <div className="border border-slate-800 rounded-lg p-3 bg-slate-950/50">
        <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">Engine Mode</p>
        <div className="grid grid-cols-2 gap-1">
          <button
            onClick={() => setUseML(true)}
            className={`text-[10px] font-mono px-2 py-2 rounded border transition-all flex items-center justify-center gap-1.5 ${
              useML
                ? "bg-purple-500/20 border-purple-500/60 text-purple-300"
                : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600"
            }`}
          >
            <Brain className="w-3 h-3" />
            ML Model
          </button>
          <button
            onClick={() => setUseML(false)}
            className={`text-[10px] font-mono px-2 py-2 rounded border transition-all ${
              !useML
                ? "bg-cyan-500/20 border-cyan-500/60 text-cyan-300"
                : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600"
            }`}
          >
            Rule-Based
          </button>
        </div>
        <p className="text-[9px] font-mono text-slate-600 mt-1.5 leading-relaxed">
          {useML ? "Logistic Regression · 9 behavioral features · explainable weights" : "Interaction-based equation · deterministic · instant"}
        </p>
      </div>

      {/* ── Run Button ── */}
      <div className="mt-auto">
        <Button
          onClick={handleRun}
          disabled={isLoading}
          className={`w-full h-11 font-mono text-sm uppercase tracking-wider bg-primary text-primary-foreground hover:bg-accent ${
            !isLoading ? "animate-pulse-glow" : ""
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Crunching Probabilities...
            </>
          ) : (
            <>
              <Zap className="mr-2 h-4 w-4" />
              Run Decision Simulation
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}

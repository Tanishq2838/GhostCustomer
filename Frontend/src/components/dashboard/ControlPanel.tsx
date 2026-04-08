import { useState, useCallback } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Zap, Loader2, Info, Brain, Search, Globe, SlidersHorizontal, Users, ChevronRight, Cpu } from "lucide-react";
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
  onTraceReceived?: (trace: any[]) => void;
  isLoading: boolean;
}

const STAGE_KEYS = Object.keys(STAGE_CONFIG) as ProductStage[];

// Country-specific segment weights based on consumer behaviour research.
const COUNTRY_PROFILES: Record<string, { flag: string; weights: SegmentWeights; note: string }> = {
  India: {
    flag: "🇮🇳",
    weights: { early_adopter: 0.15, premium_seeker: 0.10, price_hunter: 0.45, skeptic: 0.30 },
    note: "Highly price-sensitive market. Value-for-money is primary driver (BCG 2023).",
  },
  USA: {
    flag: "🇺🇸",
    weights: { early_adopter: 0.25, premium_seeker: 0.22, price_hunter: 0.28, skeptic: 0.25 },
    note: "Balanced market. Strong early adopter culture and premium brand affinity (Pew 2023).",
  },
  Germany: {
    flag: "🇩🇪",
    weights: { early_adopter: 0.12, premium_seeker: 0.28, price_hunter: 0.22, skeptic: 0.38 },
    note: "Research-driven, quality-first buyers. High skepticism before purchase (GfK 2023).",
  },
  China: {
    flag: "🇨🇳",
    weights: { early_adopter: 0.30, premium_seeker: 0.25, price_hunter: 0.30, skeptic: 0.15 },
    note: "Fast-moving tech adopters. Tier-1 cities drive premium; tier-2/3 are price-focused (McKinsey 2023).",
  },
  Japan: {
    flag: "🇯🇵",
    weights: { early_adopter: 0.10, premium_seeker: 0.27, price_hunter: 0.20, skeptic: 0.43 },
    note: "Trust-first market. Very deliberate purchasers; brand reputation is critical (Dentsu 2023).",
  },
  UK: {
    flag: "🇬🇧",
    weights: { early_adopter: 0.18, premium_seeker: 0.22, price_hunter: 0.35, skeptic: 0.25 },
    note: "Post-Brexit price sensitivity elevated. Mix of value-seekers and brand loyalists (Deloitte 2023).",
  },
};

function defaultScores(stage: ProductStage): Record<string, number> {
  return Object.fromEntries(
    STAGE_CONFIG[stage].dimensions.map((d) => [d.key, 0.5])
  );
}

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <div className="text-slate-500">{icon}</div>
      <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-slate-500 font-semibold">
        {label}
      </span>
      <div className="flex-1 h-px bg-slate-800" />
    </div>
  );
}

export function ControlPanel({
  onSimulate,
  onLiveUpdate,
  onFetchingChange,
  onCompetitorsFound,
  onTraceReceived,
  isLoading,
}: ControlPanelProps) {
  const [productPrice, setProductPrice] = useState(500);
  const [priceMax, setPriceMax]         = useState(5000);
  const [agentCount, setAgentCount]     = useState(100);
  const [compPrice, setCompPrice]       = useState(400);
  const [compStrength, setCompStrength] = useState(0.5);
  const [productName, setProductName]   = useState("");
  const [country, setCountry]           = useState("India");
  const [isFetchingMarket, setIsFetchingMarket] = useState(false);
  const [useML, setUseML] = useState(true);
  const [marketSize, setMarketSize] = useState(0);
  const [segWeights, setSegWeights] = useState<SegmentWeights>({ ...DEFAULT_SEGMENT_WEIGHTS });

  const [stage, setStage]   = useState<ProductStage>("pre_launch");
  const [scores, setScores] = useState<Record<string, number>>(defaultScores("pre_launch"));
  const [hintKey, setHintKey]       = useState<string | null>(null);
  const [segHintKey, setSegHintKey] = useState<string | null>(null);

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

  const handleCountryChange = (c: string) => {
    setCountry(c);
    const newWeights = { ...COUNTRY_PROFILES[c].weights };
    setSegWeights(newWeights);
    onLiveUpdate?.({ segment_weights: newWeights });
  };

  const handleFetchMarketData = async () => {
    if (!productName) return;
    setIsFetchingMarket(true);
    onFetchingChange?.(true);
    try {
      const res = await axios.post(`${API}/fetch-market-data`, { product_name: productName, country });
      setCompPrice(res.data.comp_price);
      setCompStrength(res.data.comp_strength);
      onCompetitorsFound?.(res.data.competitors || []);
      onTraceReceived?.(res.data.trace || []);
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

  const valueColor =
    perceivedValue >= 0.7 ? "text-emerald-400" :
    perceivedValue >= 0.45 ? "text-amber-400" :
    "text-rose-400";

  const valueBg =
    perceivedValue >= 0.7 ? "bg-emerald-500/10 border-emerald-500/30" :
    perceivedValue >= 0.45 ? "bg-amber-500/10 border-amber-500/30" :
    "bg-rose-500/10 border-rose-500/30";

  return (
    <aside
      className="w-80 min-h-screen flex flex-col shrink-0 overflow-y-auto"
      style={{ scrollbarWidth: "none", borderRight: "1px solid #1e293b", background: "hsl(222,47%,5%)" }}
    >
      {/* ── Branded Header ── */}
      <div className="shrink-0 px-5 pt-5 pb-4 border-b border-slate-800/80"
        style={{ background: "linear-gradient(180deg, rgba(99,102,241,0.08) 0%, transparent 100%)" }}>
        <div className="flex items-center gap-2.5 mb-1">
          <div className="p-1.5 bg-indigo-500/15 rounded border border-indigo-500/20">
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-indigo-400 font-semibold">
              Control Room
            </p>
            <p className="text-[9px] font-mono text-slate-600 leading-tight">
              Configure simulation parameters
            </p>
          </div>
        </div>
      </div>

      {/* ── Scrollable Body ── */}
      <div className="flex-1 p-4 space-y-5 overflow-y-auto" style={{ scrollbarWidth: "none" }}>

        {/* ── Pricing ── */}
        <div className="space-y-4">
          <SectionHeader icon={<ChevronRight className="w-3 h-3" />} label="Pricing" />

          <div className="space-y-2">
            <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex justify-between items-center">
              <span>Your Price</span>
              <span className="text-white font-bold text-sm">₹{productPrice.toLocaleString()}</span>
            </label>
            <Slider
              min={100} max={priceMax} step={priceMax > 10000 ? 500 : 50}
              value={[productPrice]}
              onValueChange={([v]) => { setProductPrice(v); triggerLiveUpdate({ product_price: v }); }}
              className="[&_[role=slider]]:bg-indigo-500 [&_[role=slider]]:border-0 [&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[role=slider]]:shadow-[0_0_6px_rgba(99,102,241,0.6)]"
            />
            {productPrice >= priceMax && (
              <button
                onClick={() => setPriceMax(m => m * 2)}
                className="text-[9px] font-mono text-indigo-400 hover:text-indigo-300 transition-colors underline underline-offset-2"
              >
                Extend limit to ₹{(priceMax * 2).toLocaleString()}
              </button>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex justify-between items-center">
              <span>Agent Count</span>
              <span className="text-white font-bold">{agentCount}</span>
            </label>
            <Slider
              min={10} max={500} step={50}
              value={[agentCount]}
              onValueChange={([v]) => { setAgentCount(v); triggerLiveUpdate({ agent_count: v }); }}
              className="[&_[role=slider]]:bg-indigo-500 [&_[role=slider]]:border-0 [&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[role=slider]]:shadow-[0_0_6px_rgba(99,102,241,0.6)]"
            />
          </div>
        </div>

        {/* ── Product Value ── */}
        <div className="space-y-3">
          <SectionHeader icon={<ChevronRight className="w-3 h-3" />} label="Product Value" />

          {/* Stage selector */}
          <div>
            <p className="text-[9px] font-mono uppercase tracking-widest text-slate-600 mb-2">
              Launch Stage
            </p>
            <div className="grid grid-cols-2 gap-1">
              {STAGE_KEYS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleStageChange(s)}
                  className={`text-[9px] font-mono px-2 py-2 rounded border transition-all text-left ${
                    stage === s
                      ? "bg-indigo-500/15 border-indigo-500/50 text-indigo-300"
                      : "bg-slate-900/60 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-400"
                  }`}
                >
                  <span className="block font-bold text-[10px]">{STAGE_CONFIG[s].label}</span>
                  <span className="block text-[8px] opacity-60 mt-0.5">{STAGE_CONFIG[s].subtitle}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Computed value score */}
          <div className={`flex items-center justify-between rounded px-3 py-2.5 border ${valueBg}`}>
            <div>
              <p className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">Value Score</p>
              <p className="text-[9px] font-mono text-slate-600">Weighted across dimensions</p>
            </div>
            <span className={`text-2xl font-bold font-mono ${valueColor}`}>
              {perceivedValue.toFixed(2)}
            </span>
          </div>

          {/* Dimension sliders */}
          <div className="space-y-3 bg-slate-900/40 rounded-lg p-3 border border-slate-800/60">
            {dims.map((dim) => (
              <div key={dim.key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-slate-300">{dim.label}</span>
                    <button
                      onMouseEnter={() => setHintKey(dim.key)}
                      onMouseLeave={() => setHintKey(null)}
                      className="text-slate-700 hover:text-slate-400 transition-colors"
                    >
                      <Info className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-slate-600 w-7 text-right">
                      {(dim.weight * 100).toFixed(0)}%
                    </span>
                    <span className="text-[10px] font-mono text-slate-300 w-5 text-right font-bold">
                      {(scores[dim.key] ?? 0.5).toFixed(1)}
                    </span>
                  </div>
                </div>
                {hintKey === dim.key && (
                  <p className="text-[9px] font-mono text-slate-500 italic leading-relaxed px-1 border-l border-slate-700">
                    {dim.hint}
                  </p>
                )}
                <Slider
                  min={0.1} max={1.0} step={0.1}
                  value={[scores[dim.key] ?? 0.5]}
                  onValueChange={([v]) => handleScoreChange(dim.key, v)}
                  className="[&_[role=slider]]:bg-indigo-500 [&_[role=slider]]:border-0 [&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5"
                />
              </div>
            ))}

            {/* Visual weight breakdown */}
            <div className="flex h-1 rounded-full overflow-hidden gap-px mt-1">
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
        </div>

        {/* ── Competitor Intel ── */}
        <div className="space-y-3">
          <SectionHeader icon={<Search className="w-3 h-3" />} label="Market Research" />

          <div className="space-y-1.5">
            <label className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">Product to Research</label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="e.g. Premium Coffee Beans"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleFetchMarketData()}
                className="bg-slate-900/60 border-slate-700 font-mono text-xs h-9 focus:border-indigo-500/60 focus:ring-indigo-500/20 placeholder:text-slate-700"
              />
              <button
                onClick={handleFetchMarketData}
                disabled={isFetchingMarket || !productName}
                className={`h-9 px-3 w-20 flex-shrink-0 text-[10px] font-mono uppercase tracking-wide rounded border transition-all flex items-center justify-center ${
                  isFetchingMarket || !productName
                    ? "bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed"
                    : "bg-indigo-500/15 border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/25 hover:border-indigo-500/60"
                }`}
              >
                {isFetchingMarket
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : "Fetch"}
              </button>
            </div>
          </div>

          {/* Target Market */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Globe className="w-2.5 h-2.5 text-slate-600" />
              <label className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">Target Market</label>
            </div>
            <select
              value={country}
              onChange={(e) => handleCountryChange(e.target.value)}
              className="w-full h-9 rounded border border-slate-700 bg-slate-900/60 px-3 font-mono text-xs text-slate-300 focus:outline-none focus:border-indigo-500/60 focus:ring-0"
            >
              {Object.entries(COUNTRY_PROFILES).map(([name, profile]) => (
                <option key={name} value={name}>
                  {profile.flag} {name}
                </option>
              ))}
            </select>
            <p className="text-[8px] font-mono text-slate-700 leading-tight pl-0.5">
              {COUNTRY_PROFILES[country]?.note}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">Competitor Price</label>
            <Input
              type="number"
              value={compPrice}
              onChange={(e) => {
                const v = Number(e.target.value);
                setCompPrice(v);
                triggerLiveUpdate({ comp_price: v });
              }}
              className="bg-slate-900/60 border-slate-700 font-mono text-xs h-9 focus:border-indigo-500/60"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-mono text-slate-400 uppercase tracking-wider flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <span>Competitor Strength</span>
                <button
                  onMouseEnter={() => setHintKey("comp_strength")}
                  onMouseLeave={() => setHintKey(null)}
                  className="text-slate-700 hover:text-slate-400 transition-colors"
                >
                  <Info className="w-2.5 h-2.5" />
                </button>
              </div>
              <span className="text-white font-bold">{compStrength.toFixed(1)}</span>
            </label>
            {hintKey === "comp_strength" && (
              <p className="text-[9px] font-mono text-slate-500 italic leading-relaxed border-l border-slate-700 pl-2">
                How formidable the competitor is overall — combines brand reputation, product quality, and market presence.
              </p>
            )}
            <Slider
              min={0.1} max={1.0} step={0.1}
              value={[compStrength]}
              onValueChange={([v]) => { setCompStrength(v); triggerLiveUpdate({ comp_strength: v }); }}
              className="[&_[role=slider]]:bg-indigo-500 [&_[role=slider]]:border-0 [&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
            />
          </div>
        </div>

        {/* ── Market Size ── */}
        <div className="space-y-2">
          <SectionHeader icon={<Users className="w-3 h-3" />} label="Addressable Market" />

          <div className="space-y-1.5">
            <label className="text-[9px] font-mono text-slate-500 uppercase tracking-wider flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <span>Market Size (TAM)</span>
                <button
                  onMouseEnter={() => setHintKey("market_size")}
                  onMouseLeave={() => setHintKey(null)}
                  className="text-slate-700 hover:text-slate-400 transition-colors"
                >
                  <Info className="w-2.5 h-2.5" />
                </button>
              </div>
              {marketSize > 0 && <span className="text-cyan-400 font-bold">{marketSize.toLocaleString()}</span>}
            </label>
            {hintKey === "market_size" && (
              <p className="text-[9px] font-mono text-slate-500 italic leading-relaxed border-l border-slate-700 pl-2">
                Total Addressable Market — used to project real-world revenue and customer count.
              </p>
            )}
            <Input
              type="number"
              placeholder="e.g. 10000 (optional)"
              value={marketSize || ""}
              onChange={(e) => setMarketSize(Math.max(0, Number(e.target.value)))}
              className="bg-slate-900/60 border-slate-700 font-mono text-xs h-9 focus:border-indigo-500/60 placeholder:text-slate-700"
            />
            <p className="text-[8px] font-mono text-slate-700 leading-relaxed">
              Enables projected customers & revenue cards above
            </p>
          </div>
        </div>

        {/* ── Segment Mix ── */}
        <div className="space-y-3">
          <SectionHeader icon={<Users className="w-3 h-3" />} label="Segment Mix" />

          <div className="bg-slate-900/40 rounded-lg border border-slate-800/60 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-mono uppercase tracking-widest text-slate-600">Market Profile</p>
              <button
                onClick={() => {
                  setSegWeights({ ...DEFAULT_SEGMENT_WEIGHTS });
                  onLiveUpdate?.({ segment_weights: { ...DEFAULT_SEGMENT_WEIGHTS } });
                }}
                className="text-[8px] font-mono text-slate-700 hover:text-slate-400 transition-colors border border-slate-800 hover:border-slate-700 px-1.5 py-0.5 rounded"
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
              const hints: Record<keyof SegmentWeights, string> = {
                early_adopter:  "High urgency, high budget — excited to try new things.",
                premium_seeker: "Willing to pay more for quality — brand matters most.",
                price_hunter:   "Budget-constrained — will defect for a cheaper option.",
                skeptic:        "Low urgency, high risk aversion — needs strong proof.",
              };
              return (
                <div key={seg} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-mono font-medium ${colors[seg]}`}>{labels[seg]}</span>
                      <button
                        onMouseEnter={() => setSegHintKey(seg)}
                        onMouseLeave={() => setSegHintKey(null)}
                        className="text-slate-700 hover:text-slate-400 transition-colors"
                      >
                        <Info className="w-2.5 h-2.5" />
                      </button>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 font-bold">{pct}%</span>
                  </div>
                  {segHintKey === seg && (
                    <p className="text-[9px] font-mono text-slate-500 italic leading-relaxed border-l border-slate-700 pl-2">
                      {hints[seg]}
                    </p>
                  )}
                  <Slider
                    min={0} max={1} step={0.05}
                    value={[val]}
                    onValueChange={([v]) => {
                      const next = { ...segWeights, [seg]: v };
                      setSegWeights(next);
                      const t = Object.values(next).reduce((s, w) => s + w, 0);
                      if (t > 0) {
                        const normalised = Object.fromEntries(
                          Object.entries(next).map(([k, w]) => [k, w / t])
                        ) as typeof next;
                        onLiveUpdate?.({ segment_weights: normalised });
                      }
                    }}
                    className="[&_[role=slider]]:bg-indigo-500 [&_[role=slider]]:border-0 [&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5"
                  />
                </div>
              );
            })}

            {/* Stacked segment bar */}
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
        </div>

        {/* ── Engine Mode ── */}
        <div className="space-y-3">
          <SectionHeader icon={<Cpu className="w-3 h-3" />} label="Engine Mode" />

          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => setUseML(true)}
              className={`text-[9px] font-mono px-2 py-2.5 rounded border transition-all flex flex-col items-center gap-1 ${
                useML
                  ? "bg-purple-500/15 border-purple-500/50 text-purple-300"
                  : "bg-slate-900/60 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-400"
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              <span className="font-semibold uppercase tracking-wide">ML Model</span>
              <span className="text-[8px] opacity-60">Logistic Regression</span>
            </button>
            <button
              onClick={() => setUseML(false)}
              className={`text-[9px] font-mono px-2 py-2.5 rounded border transition-all flex flex-col items-center gap-1 ${
                !useML
                  ? "bg-cyan-500/15 border-cyan-500/50 text-cyan-300"
                  : "bg-slate-900/60 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-400"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span className="font-semibold uppercase tracking-wide">Rule-Based</span>
              <span className="text-[8px] opacity-60">Deterministic</span>
            </button>
          </div>

          <p className="text-[8px] font-mono text-slate-700 leading-relaxed px-0.5">
            {useML
              ? "9 behavioral features · trained on 5k synthetic agents · explainable weights"
              : "Weighted interaction equation · instant · transparent formula"}
          </p>
        </div>

      </div>

      {/* ── Run Button — pinned to bottom ── */}
      <div className="shrink-0 p-4 border-t border-slate-800/80"
        style={{ background: "linear-gradient(0deg, rgba(99,102,241,0.06) 0%, transparent 100%)" }}>
        <button
          onClick={handleRun}
          disabled={isLoading}
          className={`w-full h-12 font-mono text-sm uppercase tracking-widest rounded border transition-all flex items-center justify-center gap-2.5 font-semibold ${
            isLoading
              ? "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed"
              : "bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-500 hover:border-indigo-400 shadow-[0_0_24px_rgba(99,102,241,0.35)] hover:shadow-[0_0_32px_rgba(99,102,241,0.5)]"
          } ${!isLoading ? "animate-pulse-glow" : ""}`}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Crunching Probabilities...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              Run Decision Simulation
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

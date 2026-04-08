import { useState, useRef } from "react";
import axios from "axios";
import { ResearchTrace } from "@/components/dashboard/ResearchTrace";
import { ScenarioComparison } from "@/components/dashboard/ScenarioComparison";
import { Activity, Clock, XCircle, Beaker, Zap, TrendingUp, Users, Brain, DollarSign, BookmarkPlus, BookmarkCheck, BarChart2, FlaskConical, Search, Info } from "lucide-react";
import { ControlPanel } from "@/components/dashboard/ControlPanel";
import { KPICard } from "@/components/dashboard/KPICard";
import { InsightEngine } from "@/components/dashboard/InsightEngine";
import { CompetitorInsight } from "@/components/dashboard/CompetitorInsight";
import { DistributionChart } from "@/components/dashboard/DistributionChart";
import { BudgetDistributionChart } from "@/components/dashboard/BudgetDistributionChart";
import { SegmentWeightChart } from "@/components/dashboard/SegmentWeightChart";
import { ProbabilityChart } from "@/components/dashboard/ProbabilityChart";
import { DecisionTable } from "@/components/dashboard/DecisionTable";
import { SkeletonChart } from "@/components/dashboard/SkeletonChart";
import { ElasticityChart } from "@/components/dashboard/ElasticityChart";
import { MarketTopology } from "@/components/dashboard/MarketTopology";
import { MLInsightsPanel } from "@/components/dashboard/MLInsightsPanel";
import { DecisionExplainer } from "@/components/dashboard/DecisionExplainer";
import type {
  SimulationPayload,
  SimulationResponse,
  AgentDecision,
  AgentSegment,
  ParsedKPIs,
  ElasticityResponse,
  OptimizationResponse,
  SegmentStats,
  ProjectedNumbers,
  DecisionDrivers,
  AgentTraceEvent,
} from "@/types/simulation";
import { parsePercentage } from "@/types/simulation";

const API = "http://localhost:8000";

type Tab = "simulation" | "analytics" | "intelligence";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "simulation",   label: "Simulation",   icon: <FlaskConical className="w-3.5 h-3.5" /> },
  { id: "analytics",    label: "Analytics",    icon: <BarChart2    className="w-3.5 h-3.5" /> },
  { id: "intelligence", label: "Intelligence", icon: <Search       className="w-3.5 h-3.5" /> },
];

const SEGMENT_META: Record<AgentSegment, { label: string; color: string; bg: string; border: string }> = {
  early_adopter:  { label: "Early Adopter",  color: "text-cyan-400",    bg: "bg-cyan-500/10",    border: "border-cyan-500/30"   },
  premium_seeker: { label: "Premium Seeker", color: "text-purple-400",  bg: "bg-purple-500/10",  border: "border-purple-500/30" },
  price_hunter:   { label: "Price Hunter",   color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/30"  },
  skeptic:        { label: "Skeptic",        color: "text-rose-400",    bg: "bg-rose-500/10",    border: "border-rose-500/30"   },
};

export default function Index() {
  const [activeTab, setActiveTab]       = useState<Tab>("simulation");
  const [isLoading, setIsLoading]       = useState(false);
  const [kpis, setKpis]                 = useState<ParsedKPIs | null>(null);
  const [decisions, setDecisions]       = useState<AgentDecision[] | null>(null);
  const [verdict, setVerdict]           = useState<string | null>(null);
  const [monteCarlo, setMonteCarlo]     = useState<SimulationResponse["monte_carlo"] | null>(null);
  const [segBreakdown, setSegBreakdown] = useState<Record<AgentSegment, SegmentStats> | null>(null);
  const [elasticity, setElasticity]     = useState<ElasticityResponse | null>(null);
  const [optimization, setOptimization] = useState<OptimizationResponse | null>(null);
  const [engineMode, setEngineMode]     = useState<"ml" | "rule_based" | null>(null);
  const [projected, setProjected]       = useState<ProjectedNumbers | null>(null);
  const [decisionDrivers, setDecisionDrivers] = useState<DecisionDrivers | null>(null);
  const [savedScenario, setSavedScenario] = useState<{
    label: string;
    kpis: ParsedKPIs;
    projected: ProjectedNumbers | null;
    payload: Partial<SimulationPayload>;
  } | null>(null);

  const [liveValues, setLiveValues] = useState<Partial<SimulationPayload>>({
    product_price: 500,
    product_value: 0.5,
    comp_price: 400,
    comp_strength: 0.5,
    agent_count: 100,
    product_stage: "pre_launch",
    use_ml: true,
  });

  const [isFetchingMarket, setIsFetchingMarket] = useState(false);
  const [mcHint, setMcHint] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [competitorsFound, setCompetitorsFound] = useState<any[]>([]);
  const [agentTrace, setAgentTrace] = useState<AgentTraceEvent[]>([]);

  const handleLiveUpdate = (updates: Partial<SimulationPayload>) => {
    setLiveValues(prev => ({ ...prev, ...updates }));
  };

  const handleSaveScenario = () => {
    if (!kpis) return;
    const label = `₹${liveValues.product_price ?? "?"} · ${liveValues.product_stage ?? ""}`;
    setSavedScenario({ label, kpis, projected, payload: { ...liveValues } });
  };

  const handleSimulate = async (payload: SimulationPayload) => {
    setIsLoading(true);
    setActiveTab("simulation");
    // Capture segment weights so SegmentWeightChart targets the correct distribution
    if (payload.segment_weights) {
      setLiveValues(prev => ({ ...prev, segment_weights: payload.segment_weights }));
    }
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    }, 50);
    try {
      const { data } = await axios.post<SimulationResponse>(`${API}/simulate-market`, payload);

      setKpis({
        conversionRate: parsePercentage(data.conversion_rate),
        delayRate:      parsePercentage(data.delay_rate),
        rejectionRate:  parsePercentage(data.rejection_rate),
      });
      setVerdict(data.verdict);
      setMonteCarlo(data.monte_carlo);
      setSegBreakdown(data.segment_breakdown ?? null);
      setEngineMode(data.engine_mode ?? null);
      setProjected(data.projected ?? null);
      setDecisionDrivers(data.decision_drivers ?? null);
      setDecisions(
        data.logs.map((log) => ({
          ...log,
          action: log.action.toLowerCase() as "buy" | "delay" | "reject",
        }))
      );

      try {
        const [elasticityRes, optimizationRes] = await Promise.all([
          axios.post<ElasticityResponse>(`${API}/calculate-elasticity`, payload),
          axios.post<OptimizationResponse>(`${API}/optimize-price`, payload),
        ]);
        setElasticity(elasticityRes.data);
        setOptimization(optimizationRes.data);
      } catch (err) {
        console.error("Advanced analysis failed:", err);
      }
    } catch (err) {
      console.error("Simulation failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const currentLabel = `₹${liveValues.product_price ?? "?"} · ${liveValues.product_stage ?? ""}`;
  const showComparison = savedScenario && kpis && !(
    savedScenario.kpis.conversionRate === kpis.conversionRate &&
    savedScenario.label === currentLabel
  );

  return (
    <div className="flex h-screen bg-background">
      <ControlPanel
        onSimulate={handleSimulate}
        onLiveUpdate={handleLiveUpdate}
        onFetchingChange={setIsFetchingMarket}
        onCompetitorsFound={setCompetitorsFound}
        onTraceReceived={setAgentTrace}
        isLoading={isLoading}
      />

      <main className="flex-1 flex flex-col overflow-hidden bg-dot-grid">

        {/* ── Top bar: header + KPI row ── */}
        <div className="shrink-0" style={{ background: "linear-gradient(180deg, hsl(222,47%,5%) 0%, hsl(222,47%,6%) 100%)" }}>

          {/* ── Header strip ── */}
          <div className="px-6 pt-4 pb-3 flex items-center gap-3 border-b border-slate-800/60">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="relative">
                <Beaker className="h-5 w-5 text-indigo-400" />
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="flex items-baseline gap-2">
                <h1 className="text-base font-mono font-bold tracking-tight text-white">
                  Ghost Customer
                </h1>
                <span className="text-base font-mono font-light text-slate-500 hidden sm:inline">
                  : Decision Lab
                </span>
              </div>
              <span className="text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 rounded-sm">
                v2.0
              </span>

              {engineMode && (
                <span className={`hidden md:flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 border rounded-sm ${
                  engineMode === "ml"
                    ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                    : "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                }`}>
                  {engineMode === "ml" && <Brain className="w-2.5 h-2.5" />}
                  {engineMode === "ml" ? "ML Active" : "Rule-Based"}
                </span>
              )}
            </div>

            {kpis && (
              <button
                onClick={handleSaveScenario}
                className={`flex-shrink-0 flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 border rounded-sm transition-all ${
                  savedScenario
                    ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                    : "bg-slate-800/80 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-slate-300"
                }`}
              >
                {savedScenario ? <BookmarkCheck className="w-3 h-3" /> : <BookmarkPlus className="w-3 h-3" />}
                {savedScenario ? "Scenario A Saved" : "Save Scenario A"}
              </button>
            )}
          </div>

          {/* ── KPI Row ── */}
          <div className="px-6 py-4">
            <div className={`grid grid-cols-1 gap-3 ${projected ? "md:grid-cols-5" : "md:grid-cols-3"}`}>
              <KPICard label="Conversion Rate" value={kpis?.conversionRate ?? null} colorClass="emerald" icon={<Activity    className="h-5 w-5" />} />
              <KPICard label="Delay Rate"      value={kpis?.delayRate      ?? null} colorClass="amber"   icon={<Clock       className="h-5 w-5" />} />
              <KPICard label="Rejection Rate"  value={kpis?.rejectionRate  ?? null} colorClass="rose"    icon={<XCircle     className="h-5 w-5" />} />
              {projected && (
                <>
                  <KPICard
                    label="Proj. Customers"
                    value={null}
                    rawValue={projected.customers.toLocaleString()}
                    subtitle={`of ${projected.market_size.toLocaleString()} TAM`}
                    colorClass="cyan"
                    icon={<Users className="h-5 w-5" />}
                    fillPct={(projected.customers / projected.market_size) * 100}
                  />
                  <KPICard
                    label="Proj. Revenue"
                    value={null}
                    rawValue={`₹${projected.revenue.toLocaleString()}`}
                    subtitle={`MC: ₹${projected.mc_revenue.toLocaleString()}`}
                    colorClass="indigo"
                    icon={<DollarSign className="h-5 w-5" />}
                    fillPct={100}
                  />
                </>
              )}
            </div>
          </div>

          {/* ── Tab Bar ── */}
          <div className="flex gap-0 px-6 border-b border-slate-800">
            {TABS.map((tab) => {
              const hasData = tab.id === "simulation"   ? !!kpis
                            : tab.id === "analytics"    ? !!elasticity
                            : !!decisions;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 text-[11px] font-mono uppercase tracking-widest border-b-2 transition-all -mb-px ${
                    activeTab === tab.id
                      ? "border-indigo-500 text-indigo-300 bg-indigo-500/5"
                      : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/40"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  {hasData && (
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      activeTab === tab.id ? "bg-indigo-400" : "bg-slate-600"
                    }`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Tab Content ── */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ════ TAB 1: SIMULATION ════ */}
          {activeTab === "simulation" && (
            <>
              {showComparison && (
                <ScenarioComparison
                  scenarioA={savedScenario}
                  scenarioB={{ label: currentLabel, kpis, projected, payload: { ...liveValues } }}
                  onClear={() => setSavedScenario(null)}
                />
              )}

              <MarketTopology
                product_price={liveValues.product_price ?? 500}
                product_value={liveValues.product_value ?? 0.5}
                comp_price={liveValues.comp_price ?? 400}
                comp_strength={liveValues.comp_strength ?? 0.5}
                agent_count={liveValues.agent_count ?? 100}
                product_stage={liveValues.product_stage ?? "pre_launch"}
                isScanning={isFetchingMarket}
                simulationResults={decisions}
              />

              {/* Ghost Verdict */}
              {verdict && (
                <div className="relative overflow-hidden rounded-lg border border-indigo-500/50 animate-in fade-in slide-in-from-top-4"
                  style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(79,70,229,0.06) 100%)", boxShadow: "0 0 40px -10px rgba(99,102,241,0.3)" }}>
                  {/* Accent line */}
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent" />
                  <div className="p-5">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="p-1.5 bg-indigo-500/20 rounded-sm">
                        <Zap className="text-indigo-400 w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-indigo-400">
                        Strategic Ghost Verdict
                      </span>
                    </div>
                    <p className="text-slate-100 text-base leading-relaxed font-medium">
                      {verdict}
                    </p>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
                </div>
              )}

              {/* Monte Carlo */}
              {monteCarlo && (() => {
                const lo  = monteCarlo.confidence_interval[0];
                const hi  = monteCarlo.confidence_interval[1];
                const mid = monteCarlo.mean_conversion;
                const ciWidth = hi - lo;
                const stability = ciWidth < 3 ? "HIGH" : ciWidth < 8 ? "MEDIUM" : "LOW";
                const stabilityColor = ciWidth < 3 ? "text-emerald-400" : ciWidth < 8 ? "text-amber-400" : "text-rose-400";
                return (
                  <div className="bg-slate-900/80 border border-slate-700/60 rounded-lg p-5 animate-in fade-in slide-in-from-top-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-slate-400" />
                        <h3 className="text-slate-300 font-mono text-sm uppercase tracking-wider">
                          Monte Carlo — 50 Market Shocks
                        </h3>
                        <button onMouseEnter={() => setMcHint(true)} onMouseLeave={() => setMcHint(false)}
                          className="text-slate-600 hover:text-slate-400 transition-colors">
                          <Info className="w-3 h-3" />
                        </button>
                      </div>
                      <span className={`text-[10px] font-mono uppercase tracking-widest ${stabilityColor}`}>
                        {stability} STABILITY
                      </span>
                    </div>

                    {mcHint && (
                      <p className="text-[10px] font-mono text-slate-500 italic leading-relaxed mb-4 px-1 border-l-2 border-slate-700">
                        Runs the simulation 50× with ±5% urgency noise per iteration. A wide CI means your conversion is fragile; a tight CI means it's robust.
                      </p>
                    )}

                    {/* Visual confidence band */}
                    <div className="mb-4">
                      <div className="flex justify-between text-[10px] font-mono text-slate-500 mb-1.5">
                        <span>{lo}%</span>
                        <span className="text-emerald-400 font-bold">mean {mid}%</span>
                        <span>{hi}%</span>
                      </div>
                      <div className="relative h-7 bg-slate-800 rounded overflow-hidden">
                        {/* CI band */}
                        <div className="absolute inset-y-0 bg-amber-500/15 border-x border-amber-500/30 rounded"
                          style={{ left: `${lo}%`, width: `${ciWidth}%` }} />
                        {/* Mean marker */}
                        <div className="absolute inset-y-0 w-0.5 bg-emerald-400"
                          style={{ left: `${mid}%`, transform: "translateX(-50%)" }} />
                        {/* Mean label */}
                        <div className="absolute inset-y-0 flex items-center px-2"
                          style={{ left: `${Math.min(mid + 1, 80)}%` }}>
                          <span className="text-[9px] font-mono text-emerald-400">{mid}%</span>
                        </div>
                      </div>
                      <div className="flex justify-between text-[9px] font-mono text-slate-600 mt-1">
                        <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-800/80 px-3 py-2.5 rounded border border-slate-700/60">
                        <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wide mb-1">Mean Conversion</p>
                        <p className="text-xl font-bold text-emerald-400 font-mono">{mid}%</p>
                        <p className="text-[9px] text-slate-500 font-mono mt-0.5">50-scenario average</p>
                      </div>
                      <div className="bg-slate-800/80 px-3 py-2.5 rounded border border-slate-700/60">
                        <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wide mb-1">95% CI Range</p>
                        <p className="text-xl font-bold text-amber-400 font-mono">{lo}%–{hi}%</p>
                        <p className="text-[9px] text-slate-500 font-mono mt-0.5">spread: {(hi - lo).toFixed(1)} pp</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Segment Breakdown */}
              {segBreakdown && (
                <div className="bg-slate-900/80 border border-slate-700/60 rounded-lg p-5 animate-in fade-in slide-in-from-top-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="w-4 h-4 text-slate-400" />
                    <h3 className="text-slate-300 font-mono text-sm uppercase tracking-wider">
                      Behavioral Segment Breakdown
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {(Object.entries(segBreakdown) as [AgentSegment, SegmentStats][]).map(([seg, stats]) => {
                      const meta     = SEGMENT_META[seg];
                      const convPct  = stats.total > 0 ? (stats.buy    / stats.total) * 100 : 0;
                      const delayPct = stats.total > 0 ? (stats.delay  / stats.total) * 100 : 0;
                      const rejPct   = stats.total > 0 ? (stats.reject / stats.total) * 100 : 0;
                      return (
                        <div key={seg} className={`${meta.bg} border ${meta.border} rounded-lg p-3 flex flex-col gap-2`}>
                          <div>
                            <p className={`text-[10px] font-mono uppercase tracking-widest ${meta.color} mb-1`}>
                              {meta.label}
                            </p>
                            <p className={`text-2xl font-bold font-mono ${meta.color} leading-none`}>{convPct.toFixed(0)}%</p>
                            <p className="text-[10px] text-slate-500 font-mono">conversion</p>
                          </div>
                          {/* Stacked bar */}
                          <div className="flex h-1.5 rounded-full overflow-hidden gap-px">
                            <div className="bg-emerald-500 rounded-full" style={{ width: `${convPct}%`, transition: "width 0.6s ease-out" }} />
                            <div className="bg-amber-500 rounded-full"   style={{ width: `${delayPct}%`, transition: "width 0.6s ease-out" }} />
                            <div className="bg-rose-500 rounded-full"    style={{ width: `${rejPct}%`,  transition: "width 0.6s ease-out" }} />
                          </div>
                          <div className="flex gap-2 text-[9px] font-mono text-slate-400">
                            <span className="text-emerald-400">{stats.buy}B</span>
                            <span className="text-amber-400">{stats.delay}D</span>
                            <span className="text-rose-400">{stats.reject}R</span>
                            <span className="ml-auto opacity-50">{stats.total}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ════ TAB 2: ANALYTICS ════ */}
          {activeTab === "analytics" && (
            <>
              {!kpis && !isLoading && (
                <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                  <div className="p-4 bg-slate-800/60 rounded-full border border-slate-700">
                    <BarChart2 className="w-8 h-8 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-slate-500 font-mono text-sm uppercase tracking-wider">No Data Yet</p>
                    <p className="text-slate-600 font-mono text-xs mt-1">Run a simulation to unlock analytics charts</p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {isLoading ? (
                  <>
                    <SkeletonChart />
                    <SkeletonChart />
                    <SkeletonChart />
                    <SkeletonChart />
                  </>
                ) : (
                  <>
                    <DistributionChart kpis={kpis} />
                    <ProbabilityChart decisions={decisions} />
                    <ElasticityChart data={elasticity} />
                    <BudgetDistributionChart decisions={decisions} />
                    <SegmentWeightChart decisions={decisions} segBreakdown={segBreakdown} segmentWeights={liveValues.segment_weights} />

                    {optimization && (
                      <div className="col-span-1 lg:col-span-2 relative overflow-hidden rounded-lg border border-slate-700/60 animate-in fade-in slide-in-from-bottom-4"
                        style={{ background: "hsl(222,40%,7%)" }}>
                        {/* Top accent — split: emerald left half, purple right half */}
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-600/60 to-transparent" />

                        <div className="p-6">
                          <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2.5">
                              <div className="p-1.5 bg-emerald-500/15 rounded border border-emerald-500/25">
                                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                              </div>
                              <div>
                                <h3 className="text-slate-200 font-mono font-bold uppercase tracking-widest text-sm">
                                  Price Optimizer
                                </h3>
                                <p className="text-[9px] font-mono text-slate-500 mt-0.5">
                                  Revenue vs Profit — 20-point price sweep
                                </p>
                              </div>
                            </div>
                            <span className="text-[9px] font-mono bg-slate-800 text-slate-400 border border-slate-700 px-2 py-1 rounded uppercase tracking-wide">
                              20-Point Sweep
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            {/* Revenue optimal */}
                            <div className="relative bg-slate-900/60 border border-emerald-500/25 rounded-lg p-4 overflow-hidden">
                              <div className="absolute top-0 left-0 bottom-0 w-0.5 bg-emerald-500" />
                              <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1">Revenue-Optimal</p>
                              <p className="text-3xl font-bold text-emerald-400 font-mono leading-none">
                                ₹{optimization.optimal_price.toLocaleString()}
                              </p>
                              <div className="mt-3 pt-3 border-t border-slate-800">
                                <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-0.5">Max Revenue</p>
                                <p className="text-lg font-bold font-mono text-emerald-300">
                                  ₹{optimization.max_revenue.toLocaleString()}
                                </p>
                              </div>
                            </div>

                            {/* Profit optimal */}
                            <div className="relative bg-slate-900/60 border border-indigo-500/25 rounded-lg p-4 overflow-hidden">
                              <div className="absolute top-0 left-0 bottom-0 w-0.5 bg-indigo-500" />
                              <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1">Profit-Optimal</p>
                              <p className="text-3xl font-bold text-indigo-400 font-mono leading-none">
                                ₹{optimization.optimal_profit_price.toLocaleString()}
                              </p>
                              <div className="mt-3 pt-3 border-t border-slate-800">
                                <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-0.5">
                                  Est. Gross Profit <span className="opacity-60">(40% margin)</span>
                                </p>
                                <p className="text-lg font-bold font-mono text-indigo-300">
                                  ₹{optimization.max_profit.toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>

                          <p className="text-[9px] font-mono text-slate-600 mt-4 border-t border-slate-800/60 pt-3">
                            Sweep anchored to competitor price range · 40% gross margin assumed for profit estimate
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}

          {/* ════ TAB 3: INTELLIGENCE ════ */}
          {activeTab === "intelligence" && (
            <>
              {!kpis && !isLoading && (
                <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                  <div className="p-4 bg-slate-800/60 rounded-full border border-slate-700">
                    <Brain className="w-8 h-8 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-slate-500 font-mono text-sm uppercase tracking-wider">No Analysis Yet</p>
                    <p className="text-slate-600 font-mono text-xs mt-1">Run a simulation to unlock intelligence panels</p>
                  </div>
                </div>
              )}
              <CompetitorInsight competitors={competitorsFound} onClose={() => setCompetitorsFound([])} />
              <InsightEngine kpis={kpis} />
              <DecisionExplainer drivers={decisionDrivers} engineMode={engineMode} />
              <MLInsightsPanel engineMode={engineMode} />
              <DecisionTable decisions={decisions} />
            </>
          )}

        </div>
      </main>

      {/* Research trace modal — always mounted, visible on any tab */}
      <ResearchTrace isFetching={isFetchingMarket} productName="" agentTrace={agentTrace} competitors={competitorsFound} />
    </div>
  );
}

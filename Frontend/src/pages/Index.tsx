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

      <main className="flex-1 flex flex-col overflow-hidden">

        {/* ── Top bar: header + KPI row ── */}
        <div className="p-6 pb-0 space-y-4 shrink-0">

          {/* Header */}
          <div className="flex items-center gap-3">
            <Beaker className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-mono font-bold tracking-tight text-foreground">
              Ghost Customer: Decision Lab
            </h1>
            <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 bg-primary/10 text-primary border border-primary/20">
              v2.0
            </span>
            {engineMode && (
              <span className={`flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 border rounded ${
                engineMode === "ml"
                  ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                  : "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
              }`}>
                {engineMode === "ml" && <Brain className="w-2.5 h-2.5" />}
                {engineMode === "ml" ? "ML Engine" : "Rule-Based"}
              </span>
            )}
            {kpis && (
              <button
                onClick={handleSaveScenario}
                className={`ml-auto flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 border rounded transition-all ${
                  savedScenario
                    ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                    : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500"
                }`}
              >
                {savedScenario ? <BookmarkCheck className="w-3 h-3" /> : <BookmarkPlus className="w-3 h-3" />}
                {savedScenario ? "Scenario A Saved" : "Save as Scenario A"}
              </button>
            )}
          </div>

          {/* KPI Row — always visible */}
          <div className={`grid grid-cols-1 gap-4 ${projected ? "md:grid-cols-5" : "md:grid-cols-3"}`}>
            <KPICard label="Conversion Rate" value={kpis?.conversionRate ?? null} colorClass="emerald" icon={<Activity className="h-5 w-5" />} />
            <KPICard label="Delay Rate"      value={kpis?.delayRate      ?? null} colorClass="amber"   icon={<Clock    className="h-5 w-5" />} />
            <KPICard label="Rejection Rate"  value={kpis?.rejectionRate  ?? null} colorClass="rose"    icon={<XCircle  className="h-5 w-5" />} />
            {projected && (
              <>
                <div className="bg-card border border-cyan-500/30 border-l-2 p-4 flex items-center gap-4">
                  <div className="bg-cyan-500/10 text-cyan-400 p-2.5 rounded-sm"><Users className="h-5 w-5" /></div>
                  <div>
                    <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Projected Customers</p>
                    <p className="text-2xl font-mono font-bold text-cyan-400">{projected.customers.toLocaleString()}</p>
                    <p className="text-[10px] font-mono text-slate-500">of {projected.market_size.toLocaleString()} TAM</p>
                  </div>
                </div>
                <div className="bg-card border border-emerald-500/30 border-l-2 p-4 flex items-center gap-4">
                  <div className="bg-emerald-500/10 text-emerald-400 p-2.5 rounded-sm"><DollarSign className="h-5 w-5" /></div>
                  <div>
                    <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Projected Revenue</p>
                    <p className="text-2xl font-mono font-bold text-emerald-400">₹{projected.revenue.toLocaleString()}</p>
                    <p className="text-[10px] font-mono text-slate-500">MC mean: ₹{projected.mc_revenue.toLocaleString()}</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Tab Bar */}
          <div className="flex gap-1 border-b border-slate-800 mt-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono uppercase tracking-widest border-b-2 transition-all -mb-px ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-slate-500 hover:text-slate-300"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
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
                <div className="bg-indigo-900/30 border border-indigo-500 p-4 rounded-lg animate-in fade-in slide-in-from-top-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="text-indigo-400 w-5 h-5" />
                    <h3 className="text-indigo-100 font-bold uppercase tracking-wider text-sm">Strategic Ghost Verdict</h3>
                  </div>
                  <p className="text-indigo-200 text-lg italic">"{verdict}"</p>
                </div>
              )}

              {/* Monte Carlo */}
              {monteCarlo && (
                <div className="bg-slate-900 border border-slate-700 p-4 rounded-lg animate-in fade-in slide-in-from-top-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-slate-400" />
                    <h3 className="text-slate-300 font-mono text-sm uppercase tracking-wider">
                      Monte Carlo Analysis — 50 Market Shocks
                    </h3>
                    <button
                      onMouseEnter={() => setMcHint(true)}
                      onMouseLeave={() => setMcHint(false)}
                      className="text-slate-600 hover:text-slate-400 transition-colors ml-1"
                    >
                      <Info className="w-3 h-3" />
                    </button>
                  </div>
                  {mcHint && (
                    <p className="text-[10px] font-mono text-slate-500 italic leading-relaxed mb-3 px-1">
                      Runs the simulation 50 times with small random shocks to customer urgency, simulating real-world market unpredictability. The result is a statistically robust conversion range rather than a single fragile point estimate.
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800 p-3 rounded border border-slate-700">
                      <p className="text-xs text-slate-400 font-mono mb-1">Mean Conversion</p>
                      <p className="text-2xl font-bold text-emerald-400">{monteCarlo.mean_conversion}%</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-1">across 50 market-noise scenarios</p>
                    </div>
                    <div className="bg-slate-800 p-3 rounded border border-slate-700">
                      <p className="text-xs text-slate-400 font-mono mb-1">95% Confidence Interval</p>
                      <p className="text-2xl font-bold text-amber-400">
                        {monteCarlo.confidence_interval[0]}% – {monteCarlo.confidence_interval[1]}%
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono mt-1">true conversion likely in this range</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Segment Breakdown */}
              {segBreakdown && (
                <div className="bg-slate-900 border border-slate-700 p-4 rounded-lg animate-in fade-in slide-in-from-top-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-slate-400" />
                    <h3 className="text-slate-300 font-mono text-sm uppercase tracking-wider">
                      Behavioral Segment Breakdown
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {(Object.entries(segBreakdown) as [AgentSegment, SegmentStats][]).map(([seg, stats]) => {
                      const meta     = SEGMENT_META[seg];
                      const convRate = stats.total > 0 ? ((stats.buy / stats.total) * 100).toFixed(0) : "0";
                      return (
                        <div key={seg} className={`${meta.bg} border ${meta.border} rounded-lg p-3`}>
                          <p className={`text-[10px] font-mono uppercase tracking-widest ${meta.color} mb-2`}>
                            {meta.label}
                          </p>
                          <p className={`text-xl font-bold ${meta.color}`}>{convRate}%</p>
                          <p className="text-[10px] text-slate-500 font-mono">conversion</p>
                          <div className="mt-2 flex gap-2 text-[9px] font-mono text-slate-400">
                            <span className="text-emerald-400">{stats.buy}B</span>
                            <span className="text-amber-400">{stats.delay}D</span>
                            <span className="text-rose-400">{stats.reject}R</span>
                            <span className="ml-auto">{stats.total} agents</span>
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

                    {optimization && (
                      <div className="col-span-1 lg:col-span-2 bg-emerald-900/20 border border-emerald-500/50 p-6 rounded-lg animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-emerald-100 font-mono font-bold uppercase tracking-widest text-sm">
                            Price Optimizer — Revenue vs Profit
                          </h3>
                          <div className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded uppercase">
                            30-Point Sweep
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <p className="text-xs text-slate-400 font-mono uppercase tracking-wider mb-1">Revenue-Optimal Price</p>
                            <p className="text-4xl font-bold text-white font-mono">₹{optimization.optimal_price.toLocaleString()}</p>
                            <p className="text-emerald-400/80 text-sm mt-1">
                              Max Revenue: <span className="font-bold text-emerald-400">₹{optimization.max_revenue.toLocaleString()}</span>
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 font-mono uppercase tracking-wider mb-1">Profit-Optimal Price</p>
                            <p className="text-4xl font-bold text-purple-300 font-mono">₹{optimization.optimal_profit_price.toLocaleString()}</p>
                            <p className="text-purple-400/80 text-sm mt-1">
                              Est. Gross Profit (40%): <span className="font-bold text-purple-400">₹{optimization.max_profit.toLocaleString()}</span>
                            </p>
                          </div>
                        </div>
                        <p className="text-emerald-200/60 text-xs mt-4 border-t border-emerald-500/20 pt-3 font-mono">
                          Sweep anchored to competitor price range · 40% gross margin assumed for profit calculation
                        </p>
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
              <ResearchTrace isFetching={isFetchingMarket} productName="" agentTrace={agentTrace} />
              <CompetitorInsight competitors={competitorsFound} onClose={() => setCompetitorsFound([])} />
              <InsightEngine kpis={kpis} />
              <DecisionExplainer drivers={decisionDrivers} engineMode={engineMode} />
              <MLInsightsPanel engineMode={engineMode} />
              <DecisionTable decisions={decisions} />
            </>
          )}

        </div>
      </main>
    </div>
  );
}

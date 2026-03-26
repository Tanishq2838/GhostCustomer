import { useState } from "react";
import axios from "axios";
import { ResearchTrace } from "@/components/dashboard/ResearchTrace";
import { Activity, Clock, XCircle, Beaker, Zap } from "lucide-react";
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
import type {
  SimulationPayload,
  SimulationResponse,
  AgentDecision,
  ParsedKPIs,
  ElasticityResponse,
  OptimizationResponse,
} from "@/types/simulation";
import { parsePercentage } from "@/types/simulation";

export default function Index() {
  const [isLoading, setIsLoading] = useState(false);
  const [kpis, setKpis] = useState<ParsedKPIs | null>(null);
  const [decisions, setDecisions] = useState<AgentDecision[] | null>(null);
  const [verdict, setVerdict] = useState<string | null>(null);
  const [monteCarlo, setMonteCarlo] = useState<SimulationResponse['monte_carlo'] | null>(null);
  const [elasticity, setElasticity] = useState<ElasticityResponse | null>(null);
  const [optimization, setOptimization] = useState<OptimizationResponse | null>(null);

  // Live values for the Market Topology (Canvas)
  const [liveValues, setLiveValues] = useState<Partial<SimulationPayload>>({
    product_price: 500,
    product_value: 0.5,
    comp_price: 400,
    comp_strength: 0.5,
    agent_count: 100,
  });

  const [isFetchingMarket, setIsFetchingMarket] = useState(false);
  const [competitorsFound, setCompetitorsFound] = useState<any[]>([]);

  const handleLiveUpdate = (updates: Partial<SimulationPayload>) => {
    setLiveValues(prev => ({ ...prev, ...updates }));
  };

  const handleSimulate = async (payload: SimulationPayload) => {
    setIsLoading(true);
    try {
      const { data } = await axios.post<SimulationResponse>(
        "http://localhost:8000/simulate-market",
        payload
      );
      setKpis({
        conversionRate: parsePercentage(data.conversion_rate),
        delayRate: parsePercentage(data.delay_rate),
        rejectionRate: parsePercentage(data.rejection_rate),
      });
      setVerdict(data.verdict);
      setMonteCarlo(data.monte_carlo);
      setDecisions(
        data.logs.map((log) => ({
          ...log,
          action: log.action.toLowerCase() as "buy" | "delay" | "reject",
        }))
      );
      
      try {
        const [elasticityRes, optimizationRes] = await Promise.all([
          axios.post<ElasticityResponse>("http://localhost:8000/calculate-elasticity", payload),
          axios.post<OptimizationResponse>("http://localhost:8000/optimize-price", payload)
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

  return (
    <div className="flex min-h-screen bg-background">
      <ControlPanel 
        onSimulate={handleSimulate} 
        onLiveUpdate={handleLiveUpdate}
        onFetchingChange={setIsFetchingMarket}
        onCompetitorsFound={setCompetitorsFound}
        isLoading={isLoading} 
      />

      <main className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Beaker className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-mono font-bold tracking-tight text-foreground">
            Ghost Customer: Decision Lab
          </h1>
          <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 bg-primary/10 text-primary border border-primary/20">
            v1.0
          </span>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPICard
            label="Conversion Rate"
            value={kpis?.conversionRate ?? null}
            colorClass="emerald"
            icon={<Activity className="h-5 w-5" />}
          />
          <KPICard
            label="Delay Rate"
            value={kpis?.delayRate ?? null}
            colorClass="amber"
            icon={<Clock className="h-5 w-5" />}
          />
          <KPICard
            label="Rejection Rate"
            value={kpis?.rejectionRate ?? null}
            colorClass="rose"
            icon={<XCircle className="h-5 w-5" />}
          />
        </div>

        {/* Market Topology (Live Simulation) */}
        <MarketTopology 
          product_price={liveValues.product_price ?? 500}
          product_value={liveValues.product_value ?? 0.5}
          comp_price={liveValues.comp_price ?? 400}
          comp_strength={liveValues.comp_strength ?? 0.5}
          agent_count={liveValues.agent_count ?? 100}
          isScanning={isFetchingMarket}
        />

        <ResearchTrace isFetching={isFetchingMarket} productName="" />

        {/* Competitor Insight Overlay */}
        <CompetitorInsight 
          competitors={competitorsFound} 
          onClose={() => setCompetitorsFound([])} 
        />

        {/* Insight Engine */}
        <InsightEngine kpis={kpis} />

        {/* Monte Carlo Stats */}
        {monteCarlo && (
          <div className="bg-slate-900 border border-slate-700 p-4 rounded-lg mb-6 animate-in fade-in slide-in-from-top-4">
            <h3 className="text-slate-300 font-mono text-sm uppercase tracking-wider mb-2">
              Monte Carlo Analysis (50 Iterations)
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800 p-3 rounded border border-slate-700">
                <p className="text-xs text-slate-400 font-mono">Mean Conversion</p>
                <p className="text-xl font-bold text-emerald-400">{monteCarlo.mean_conversion}%</p>
              </div>
              <div className="bg-slate-800 p-3 rounded border border-slate-700">
                <p className="text-xs text-slate-400 font-mono">95% Confidence Interval</p>
                <p className="text-xl font-bold text-amber-400">
                  {monteCarlo.confidence_interval[0]}% - {monteCarlo.confidence_interval[1]}%
                </p>
              </div>
            </div>
          </div>
        )}

        {verdict && (
          <div className="bg-indigo-900/30 border border-indigo-500 p-4 rounded-lg mb-6 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="text-indigo-400 w-5 h-5" />
              <h3 className="text-indigo-100 font-bold uppercase tracking-wider text-sm">Strategic Ghost Verdict</h3>
            </div>
            <p className="text-indigo-200 text-lg italic">"{verdict}"</p>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {isLoading ? (
            <>
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
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-emerald-100 font-mono font-bold uppercase tracking-widest text-sm">
                      AI Price Optimizer (Peak Potential)
                    </h3>
                    <div className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded uppercase">
                      Recommendation
                    </div>
                  </div>
                  <div className="flex items-baseline gap-4 mt-2">
                    <div className="text-4xl font-bold text-white font-mono">
                      ₹{optimization.optimal_price}
                    </div>
                    <div className="text-emerald-400/80 text-sm">
                      Max Revenue Potential: <span className="font-bold text-emerald-400">₹{optimization.max_revenue.toLocaleString()}</span>
                    </div>
                  </div>
                  <p className="text-emerald-200/70 text-sm mt-3 border-t border-emerald-500/20 pt-3">
                    Our sweep of 20 distinct price points identifies ₹{optimization.optimal_price} as the high-water mark for revenue. 
                    Setting your price here maximizes the balance between conversion volume and per-unit profit.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Decision Trace Table */}
        <DecisionTable decisions={decisions} />
      </main>
    </div>
  );
}

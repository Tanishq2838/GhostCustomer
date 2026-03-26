import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Zap, Loader2, Search } from "lucide-react";
import type { SimulationPayload } from "@/types/simulation";
import axios from "axios";
import { toast } from "sonner";

interface ControlPanelProps {
  onSimulate: (payload: SimulationPayload) => void;
  onLiveUpdate?: (values: Partial<SimulationPayload>) => void;
  onFetchingChange?: (isFetching: boolean) => void;
  onCompetitorsFound?: (competitors: any[]) => void;
  isLoading: boolean;
}

export function ControlPanel({ onSimulate, onLiveUpdate, onFetchingChange, onCompetitorsFound, isLoading }: ControlPanelProps) {
  const [productPrice, setProductPrice] = useState(500);
  const [perceivedValue, setPerceivedValue] = useState(0.5);
  const [agentCount, setAgentCount] = useState(100);
  const [compPrice, setCompPrice] = useState(400);
  const [compStrength, setCompStrength] = useState(0.5);

  const [productName, setProductName] = useState("");
  const [isFetchingMarket, setIsFetchingMarket] = useState(false);

  // Notify parent of live changes for the Market Topology
  const triggerLiveUpdate = (updates: Partial<SimulationPayload>) => {
    onLiveUpdate?.({
      product_price: productPrice,
      product_value: perceivedValue,
      comp_price: compPrice,
      comp_strength: compStrength,
      agent_count: agentCount,
      ...updates
    });
  };

  const handleFetchMarketData = async () => {
    if (!productName) return;
    setIsFetchingMarket(true);
    onFetchingChange?.(true);
    try {
      const res = await axios.post("http://localhost:8000/fetch-market-data", {
        product_name: productName
      });
      
      // --- THE MAGIC SYNC ---
      setCompPrice(res.data.comp_price);
      setCompStrength(res.data.comp_strength);
      
      onCompetitorsFound?.(res.data.competitors || []);

      triggerLiveUpdate({ 
        comp_price: res.data.comp_price, 
        comp_strength: res.data.comp_strength 
      });

      toast.success(`Market Intel Loaded: Found ${res.data.competitors?.length || 0} competitors.`);
    } catch (err) {
      console.error("Research failed", err);
      toast.error("Research failed, using fallback data.");
      setCompPrice(500);
      setCompStrength(0.5);
    } finally {
      setIsFetchingMarket(false);
      onFetchingChange?.(false);
    }
  };

  const handleRun = () => {
    onSimulate({
      agent_count: Number(agentCount),
      product_price: Number(productPrice),
      product_value: Number(perceivedValue),
      comp_price: Number(compPrice),
      comp_strength: Number(compStrength),
    });
  };

  return (
    <aside className="w-80 min-h-screen border-r border-border bg-surface-sunken p-5 flex flex-col gap-6 shrink-0">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 rounded-full bg-emerald animate-pulse" />
        <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          Control Room
        </h2>
      </div>

      {/* Product Price */}
      <div className="space-y-2">
        <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex justify-between">
          Product Price
          <span className="text-foreground font-semibold">₹{productPrice}</span>
        </label>
        <Slider
          min={100}
          max={5000}
          step={50}
          value={[productPrice]}
          onValueChange={([v]) => {
            setProductPrice(v);
            triggerLiveUpdate({ product_price: v });
          }}
          className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-0 [&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
        />
      </div>

      {/* Perceived Value */}
      <div className="space-y-2">
        <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex justify-between">
          Perceived Value
          <span className="text-foreground font-semibold">{perceivedValue.toFixed(1)}</span>
        </label>
        <Slider
          min={0.1}
          max={1.0}
          step={0.1}
          value={[perceivedValue]}
          onValueChange={([v]) => {
            setPerceivedValue(v);
            triggerLiveUpdate({ product_value: v });
          }}
          className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-0 [&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
        />
      </div>

      {/* Agent Count */}
      <div className="space-y-2">
        <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex justify-between">
          Agent Count
          <span className="text-foreground font-semibold">{agentCount}</span>
        </label>
        <Slider
          min={10}
          max={500}
          step={50}
          value={[agentCount]}
          onValueChange={([v]) => {
            setAgentCount(v);
            triggerLiveUpdate({ agent_count: v });
          }}
          className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-0 [&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
        />
      </div>

      {/* Competitor Section */}
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
              className="bg-card border-border font-mono text-sm h-9"
            />
            <Button
              onClick={handleFetchMarketData}
              disabled={isFetchingMarket || !productName}
              variant="outline"
              className="h-9 px-3 w-20 flex-shrink-0"
            >
              {isFetchingMarket ? (
                <Loader2 className="h-4 w-4 animate-spin flex items-center justify-center mx-auto" />
              ) : (
                "Fetch"
              )}
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
            min={0.1}
            max={1.0}
            step={0.1}
            value={[compStrength]}
            onValueChange={([v]) => {
              setCompStrength(v);
              triggerLiveUpdate({ comp_strength: v });
            }}
            className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-0 [&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
          />
        </div>
      </div>

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

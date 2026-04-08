import { useEffect, useRef, useState } from "react";
import type { AgentDecision, ProductStage } from "@/types/simulation";

interface Agent {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  budget: number;
  urgency: number;
  risk_aversion: number;
  status: "buy" | "delay" | "reject";
}

interface MarketTopologyProps {
  product_price: number;
  product_value: number;
  comp_price: number;
  comp_strength: number;
  agent_count: number;
  product_stage: ProductStage;
  isScanning?: boolean;
  simulationResults?: AgentDecision[] | null;
}

// Engine constants — must match Backend/engine.py exactly
const ALPHA    = 3.0;
const BETA     = 2.5;
const GAMMA    = 1.5;
const DELTA    = 1.0;
const MU       = 2.0;
const ETA      = 1.5;
const FRICTION = 0.10;
const BUY_THRESHOLD   = 0.72;
const DELAY_THRESHOLD = 0.38;

const STAGE_TRUST: Record<string, number> = {
  pre_launch:    0.10,
  just_launched: 0.30,
  growing:       0.60,
  established:   0.85,
};

const DAMPING    = 0.96;
const EASE       = 0.02;
const FLOAT_AMP  = 22;
const FLOAT_FREQ = 0.0012;
const MAX_VEL    = 2.5;
const SPREAD     = 60;

function generateNormal(mean: number, std: number): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + std * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export function MarketTopology({
  product_price,
  product_value,
  comp_price,
  comp_strength,
  agent_count,
  product_stage,
  isScanning = false,
  simulationResults,
}: MarketTopologyProps) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const agentsRef    = useRef<Agent[]>([]);
  const requestRef   = useRef<number>();

  // All props that the animation loop reads go through refs — no stale closures
  const propsRef         = useRef({ product_price, product_value, comp_price, comp_strength, agent_count });
  const productStageRef  = useRef<string>(product_stage);
  const isScanningRef    = useRef(isScanning);
  const simHasRunRef     = useRef(false);
  const hasSimResultsRef = useRef(false); // true once backend results are injected

  const scannerRef       = useRef({ y: 0, dir: 1 });
  const mouseRef         = useRef({ x: -100, y: -100 });
  const prevMarketPriceRef = useRef((product_price + comp_price) / 2);

  // Hover: state for JSX, ref for animation-loop comparisons (no stale closure)
  const [hoveredAgent, setHoveredAgent] = useState<Agent | null>(null);
  const hoveredAgentRef = useRef<Agent | null>(null);

  // ── Sync props into refs every render ─────────────────────────────────────
  useEffect(() => {
    propsRef.current = { product_price, product_value, comp_price, comp_strength, agent_count };
  }, [product_price, product_value, comp_price, comp_strength, agent_count]);

  useEffect(() => { productStageRef.current = product_stage; }, [product_stage]);
  useEffect(() => { isScanningRef.current   = isScanning;    }, [isScanning]);

  // ── Rescale budgets when market price shifts >20% ─────────────────────────
  useEffect(() => {
    const newMkt = (product_price + comp_price) / 2;
    const ratio  = newMkt / (prevMarketPriceRef.current || 1);
    if (ratio > 1.2 || ratio < 0.8) {
      agentsRef.current = agentsRef.current.map(a => ({
        ...a,
        budget: Math.max(1, a.budget * ratio),
      }));
      prevMarketPriceRef.current = newMkt;
    }
  }, [product_price, comp_price]);

  // ── Manage agent population ──────────────────────────────────────────────
  useEffect(() => {
    const current = agentsRef.current.length;
    const { product_price: pp, comp_price: cp } = propsRef.current;
    const mktPrice = (pp + cp) / 2 || 1000;
    const rect = canvasRef.current?.getBoundingClientRect();
    const CW   = rect?.width  || 800;
    const CH   = rect?.height || 256;

    if (agent_count > current) {
      const newAgents: Agent[] = [];
      for (let i = 0; i < agent_count - current; i++) {
        // Single Gaussian budget centred at 1.3× market price — simple, stable, scales with price
        const budget        = Math.max(1, generateNormal(1.3 * mktPrice, 0.4 * mktPrice));
        const urgency       = Math.pow(Math.random(), 1.4);
        const risk_aversion = Math.random();
        newAgents.push({
          id:      `agent-${current + i}-${Math.random().toString(36).substr(2, 4)}`,
          x:       Math.random() * CW,
          y:       Math.random() * CH,
          targetX: CW / 2,
          targetY: CH / 2,
          vx:      (Math.random() - 0.5) * 0.2,
          vy:      (Math.random() - 0.5) * 0.2,
          budget,
          urgency,
          risk_aversion,
          status: "delay" as const,
        });
      }
      agentsRef.current = [...agentsRef.current, ...newAgents];
    } else if (agent_count < current) {
      agentsRef.current = agentsRef.current.slice(0, agent_count);
    }
  }, [agent_count]);

  // ── Inject simulation results from backend ────────────────────────────────
  useEffect(() => {
    if (!simulationResults || simulationResults.length === 0) return;

    simHasRunRef.current     = true;
    hasSimResultsRef.current = true;

    const rect   = canvasRef.current?.getBoundingClientRect();
    const width  = rect?.width  || 800;
    const height = rect?.height || 256;

    agentsRef.current = simulationResults.map((d, i) => {
      const existing = agentsRef.current[i];
      const status   = d.action as "buy" | "delay" | "reject";
      let zoneX = width * 0.5;
      if (status === "buy")    zoneX = width * 0.8;
      if (status === "reject") zoneX = width * 0.2;

      return {
        id:      `sim-${d.agent_id}`,
        x:       existing?.x ?? Math.random() * width,
        y:       existing?.y ?? Math.random() * height,
        targetX: zoneX,
        targetY: height * 0.25 + d.urgency * height * 0.5,
        vx:      existing?.vx ?? 0,
        vy:      existing?.vy ?? 0,
        budget:  d.budget,
        urgency: d.urgency,
        risk_aversion: d.risk_aversion,
        status,
      };
    });
  }, [simulationResults]);

  // ── One-time animation loop ───────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    const resizeCanvas = () => {
      const r = canvas.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      canvas.width  = r.width  * dpr;
      canvas.height = r.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resizeCanvas();

    const animate = () => {
      // Always read live canvas dimensions — never stale
      const W = canvas.width  / dpr;
      const H = canvas.height / dpr;
      if (W === 0 || H === 0) { requestRef.current = requestAnimationFrame(animate); return; }

      ctx.clearRect(0, 0, W, H);

      const { product_price, product_value, comp_price, comp_strength } = propsRef.current;
      const now        = Date.now();
      const mouse      = mouseRef.current;
      const simRan     = simHasRunRef.current;
      const hasResults = hasSimResultsRef.current;
      const scanning   = isScanningRef.current;
      const T          = STAGE_TRUST[productStageRef.current] ?? 0.30;

      if (scanning) {
        scannerRef.current.y += 3 * scannerRef.current.dir;
        if (scannerRef.current.y > H) scannerRef.current.dir = -1;
        if (scannerRef.current.y < 0) scannerRef.current.dir =  1;
      }

      let closest: Agent | null = null;
      let minDist = 15;

      agentsRef.current.forEach((agent) => {
        const P_B = product_price / agent.budget;
        const C_B = comp_price    / agent.budget;
        const c_quality_adv = Math.max(0, comp_strength - product_value);
        const c_price_adv   = Math.max(0, P_B - C_B) * comp_strength;
        const pv_penalty    = P_B * (1 - product_value);
        const z    = ALPHA * product_value
                   - BETA  * P_B
                   + GAMMA * agent.urgency
                   - DELTA * agent.risk_aversion * (1 - T)
                   - MU    * (c_quality_adv + c_price_adv)
                   - ETA   * pv_penalty
                   - FRICTION;
        const prob = 1 / (1 + Math.exp(-z));

        // Always update status from rule engine unless backend results are locked in
        if (!hasResults) {
          if      (prob > BUY_THRESHOLD)   agent.status = "buy";
          else if (prob > DELAY_THRESHOLD) agent.status = "delay";
          else                             agent.status = "reject";
        }

        // Always target zone positions (rule-based preview pre-sim, locked results post-sim)
        let zoneX = W * 0.5;
        if (agent.status === "buy")    zoneX = W * 0.8;
        if (agent.status === "reject") zoneX = W * 0.2;
        agent.targetX = zoneX + Math.cos(agent.budget) * SPREAD;
        agent.targetY = H * 0.25 + agent.urgency * H * 0.5 + Math.sin(agent.risk_aversion * 10) * 20;

        // Physics step
        agent.vx += (agent.targetX - agent.x) * EASE;
        agent.vy += (agent.targetY - agent.y) * EASE;
        agent.vx *= DAMPING;
        agent.vy *= DAMPING;
        const speed = Math.sqrt(agent.vx ** 2 + agent.vy ** 2);
        if (speed > MAX_VEL) { agent.vx *= MAX_VEL / speed; agent.vy *= MAX_VEL / speed; }
        agent.x += agent.vx;
        agent.y += agent.vy;

        // Hover detection
        const dx = agent.x - mouse.x;
        const dy = agent.y - mouse.y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < minDist) {
          minDist = d;
          (agent as any).currentProb = prob;
          closest = agent;
        }

        // Render
        const isHovered      = agent.id === hoveredAgentRef.current?.id;
        const timeOffset     = now * FLOAT_FREQ;
        const amp            = isHovered ? 0 : FLOAT_AMP;
        const renderX        = agent.x + Math.sin(timeOffset + agent.budget) * amp;
        const renderY        = agent.y + Math.cos(timeOffset * 0.8 + agent.risk_aversion * 5) * (amp / 2);
        const isHitByScanner = scanning && Math.abs(renderY - scannerRef.current.y) < 8;

        ctx.beginPath();
        ctx.arc(renderX, renderY, isHovered ? 4.5 : (isHitByScanner ? 3.5 : 2.5), 0, Math.PI * 2);

        if (isHitByScanner) {
          ctx.fillStyle   = "#fff";
          ctx.shadowBlur  = 15;
          ctx.shadowColor = "#06b6d4";
        } else {
          ctx.fillStyle   = agent.status === "buy"   ? "#10b981"
                          : agent.status === "delay" ? "#f59e0b"
                          :                            "#f43f5e";
          // Pre-sim: dimmer to indicate these are predictions, not locked results
          if (!simRan) ctx.globalAlpha = 0.45;
          ctx.shadowBlur  = isHovered ? 15 : 0;
          ctx.shadowColor = ctx.fillStyle as string;
        }

        if (isHovered) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 1; ctx.stroke(); }
        ctx.fill();
        ctx.closePath();
        ctx.shadowBlur  = 0;    // reset after each particle
        ctx.globalAlpha = 1.0;  // reset alpha
      });

      // Scanner beam overlay
      if (scanning) {
        const scanY = scannerRef.current.y;
        const grad  = ctx.createLinearGradient(0, scanY - 4, 0, scanY + 4);
        grad.addColorStop(0,   "rgba(6,182,212,0)");
        grad.addColorStop(0.5, "rgba(6,182,212,0.4)");
        grad.addColorStop(1,   "rgba(6,182,212,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, scanY - 4, W, 8);
        ctx.strokeStyle = "rgba(103,232,249,0.8)";
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(0, scanY);
        ctx.lineTo(W, scanY);
        ctx.stroke();
      }

      // Update hover — use ref for comparison, never stale
      if (closest?.id !== hoveredAgentRef.current?.id) {
        hoveredAgentRef.current = closest;
        setHoveredAgent(closest ? { ...closest } : null);
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const simRan = !!(simulationResults && simulationResults.length > 0);

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-lg p-5 w-full overflow-hidden shadow-2xl relative">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-slate-500">
            Live Market Topology
          </h3>
          {simRan && (
            <span className="text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded animate-in fade-in duration-500">
              Real Simulation Data
            </span>
          )}
        </div>
        <div className="flex gap-4 text-[10px] uppercase font-mono tracking-tighter">
          <span className="flex items-center gap-1.5 text-rose-500">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Reject
          </span>
          <span className="flex items-center gap-1.5 text-amber-500">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Delay
          </span>
          <span className="flex items-center gap-1.5 text-emerald-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Buy
          </span>
        </div>
      </div>

      <div className="relative h-64 w-full border border-slate-900 bg-[radial-gradient(circle_at_center,_#0f172a_0%,_#020617_100%)] rounded-sm overflow-hidden">

        <div className={`absolute inset-0 flex justify-between px-10 items-end pb-4 pointer-events-none transition-opacity duration-700 ${simRan ? "opacity-20" : "opacity-10"}`}>
          <div className="text-[10px] font-mono uppercase text-rose-400">Reject Zone</div>
          <div className="text-[10px] font-mono uppercase text-amber-400">Hesitation Zone</div>
          <div className="text-[10px] font-mono uppercase text-emerald-400">Buy Zone</div>
        </div>

        <canvas
          ref={canvasRef}
          onMouseMove={(e) => {
            const r = canvasRef.current?.getBoundingClientRect();
            if (r) mouseRef.current = { x: e.clientX - r.left, y: e.clientY - r.top };
          }}
          onMouseLeave={() => {
            mouseRef.current       = { x: -100, y: -100 };
            hoveredAgentRef.current = null;
            setHoveredAgent(null);
          }}
          className="w-full h-full block cursor-crosshair"
        />

        {/* Pre-simulation overlay — agents visible as dim rule-based preview */}
        {!simRan && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none">
            <p className="text-[10px] font-mono text-slate-600 tracking-wider">
              preview · run simulation for actual results
            </p>
          </div>
        )}

        {/* Hover tooltip */}
        {hoveredAgent && (
          <div
            className="absolute top-4 left-4 z-20 bg-slate-900/90 backdrop-blur border border-slate-700 p-3 rounded-lg shadow-2xl pointer-events-none animate-in fade-in zoom-in-95 duration-200"
            style={{
              boxShadow: `0 0 20px ${
                hoveredAgent.status === "buy"   ? "rgba(16,185,129,0.2)"  :
                hoveredAgent.status === "delay" ? "rgba(245,158,11,0.2)"  :
                                                  "rgba(244,63,94,0.2)"
              }`,
            }}
          >
            <div className="flex items-center gap-2 mb-2 border-b border-slate-700/50 pb-2">
              <div className={`w-2 h-2 rounded-full ${
                hoveredAgent.status === "buy"   ? "bg-emerald-500" :
                hoveredAgent.status === "delay" ? "bg-amber-500"   : "bg-rose-500"
              }`} />
              <span className="font-mono text-[10px] uppercase text-slate-300">
                {hoveredAgent.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <span className="text-[10px] text-slate-500 font-mono">BUDGET :</span>
              <span className="text-[10px] text-slate-100 font-mono">
                ₹{Math.round(hoveredAgent.budget).toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">URGENCY:</span>
              <span className="text-[10px] text-slate-100 font-mono">
                {(hoveredAgent.urgency * 100).toFixed(0)}%
              </span>
              <span className="text-[10px] text-slate-500 font-mono">RISK:</span>
              <span className="text-[10px] text-slate-100 font-mono">
                {(hoveredAgent.risk_aversion * 100).toFixed(0)}%
              </span>
              <div className="col-span-2 pt-1 border-t border-slate-700/50 mt-1 flex justify-between">
                <span className="text-[10px] text-slate-400 font-mono italic">WIN PROB:</span>
                <span className="text-[10px] text-white font-bold font-mono">
                  {(((hoveredAgent as any).currentProb ?? 0) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
    </div>
  );
}

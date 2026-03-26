import { useEffect, useRef, useState } from "react";

interface Agent {
  id: string; // Added for tooltips
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  budget: number;
  urgency: number;
  risk: number;
  status: "buy" | "delay" | "reject";
}

interface MarketTopologyProps {
  product_price: number;
  product_value: number;
  comp_price: number;
  comp_strength: number;
  agent_count: number;
  isScanning?: boolean;
}

export function MarketTopology({
  product_price,
  product_value,
  comp_price,
  comp_strength,
  agent_count,
  isScanning = false,
}: MarketTopologyProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const agentsRef = useRef<Agent[]>([]);
  const requestRef = useRef<number>();
  const propsRef = useRef({ product_price, product_value, comp_price, comp_strength, agent_count });
  
  const scannerRef = useRef({ y: 0, dir: 1 });

  // Hover & Idle State
  const [hoveredAgent, setHoveredAgent] = useState<Agent | null>(null);
  const mouseRef = useRef({ x: -100, y: -100 });

  // Update props ref without restarting loop
  useEffect(() => {
    propsRef.current = { product_price, product_value, comp_price, comp_strength, agent_count };
  }, [product_price, product_value, comp_price, comp_strength, agent_count]);

  // Particle Settings ("Medium" Speed - Balanced for responsiveness and Zen)
  const FRICTION = 0.96;  
  const EASE = 0.02;     
  const FLOAT_AMP = 22;   
  const FLOAT_FREQ = 0.0012; 
  const MAX_VEL = 2.5;    
  const SPREAD = 60;      

  // Robust Normal Distribution (Box-Muller)
  const generateNormal = (mean: number, std: number) => {
    let u = 0, v = 0;
    while(u === 0) u = Math.random();
    while(v === 0) v = Math.random();
    return mean + std * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  };

  // Manage Agent Population Dynamically
  useEffect(() => {
    const currentCount = agentsRef.current.length;
    
    if (agent_count > currentCount) {
      // Add agents
      const newAgents: Agent[] = [];
      for (let i = 0; i < agent_count - currentCount; i++) {
        // "On Point" DNA: Normal distribution for Budget (centered at 1300)
        // This simulates a "Middle Class" majority with fewer extremely poor/rich agents
        const budget = Math.max(200, generateNormal(1300, 500)); 
        
        // Beta-like distribution: Most have low/mid urgency, few are high
        const urgency = Math.pow(Math.random(), 1.4);
        
        const risk = Math.random();
        
        newAgents.push({
          id: `agent-${currentCount + i}-${Math.random().toString(36).substr(2, 4)}`,
          x: Math.random() * 800,
          y: Math.random() * 300,
          targetX: 400,
          targetY: 150,
          vx: (Math.random() - 0.5) * 0.2,
          vy: (Math.random() - 0.5) * 0.2,
          budget,
          urgency,
          risk,
          status: "delay"
        });
      }
      agentsRef.current = [...agentsRef.current, ...newAgents];
    } else if (agent_count < currentCount) {
      // Remove agents
      agentsRef.current = agentsRef.current.slice(0, agent_count);
    }
  }, [agent_count]);

  // One-time Animation Loop Setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle high PPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const animate = () => {
      if (!canvas) return;
      const { width, height } = rect; // Use rect dimensions for logical units
      ctx.clearRect(0, 0, width, height);

      const { product_price, product_value, comp_price, comp_strength } = propsRef.current;
      const now = Date.now();
      const mouse = mouseRef.current;

      // Update Scanner
      if (isScanning) {
        scannerRef.current.y += 3 * scannerRef.current.dir;
        if (scannerRef.current.y > height) scannerRef.current.dir = -1;
        if (scannerRef.current.y < 0) scannerRef.current.dir = 1;
      }

      // constants for the engine
      const w_value = 2.2;
      const w_price = -2.0;
      const w_urgency = 1.8; // Increased impact
      const w_risk = -1.2;
      const market_friction = 0.08; // Lowered friction for more movement

      let closest: Agent | null = null;
      let minDistance = 15; // Hit radius

      agentsRef.current.forEach((agent) => {
        const p_stress = product_price / agent.budget;
        const c_stress = comp_price / agent.budget;

        // "Innovation Bias" Logic:
        // Urgency drives people AWAY from the baseline and TOWARD the new solution.
        const p_score = (product_value * w_value) + (p_stress * w_price) + (agent.urgency * w_urgency);
        const c_score = (comp_strength * w_value) + (c_stress * w_price); // No urgency for stale baseline
        
        const final_score = p_score - c_score - (agent.risk * w_risk) - market_friction;
        
        const prob = 1 / (1 + Math.exp(-final_score));

        // Assign Status & Zones (STATIC targets)
        let zoneX = width / 2;
        if (prob > 0.65) { // More aggressive threshold (was 0.72)
          agent.status = "buy";
          zoneX = width * 0.8;
        } else if (prob > 0.35) { // More inclusive middle (was 0.38)
          agent.status = "delay";
          zoneX = width * 0.5;
        } else {
          agent.status = "reject";
          zoneX = width * 0.2;
        }

        // Static target with per-agent fixed offset for spread
        agent.targetX = zoneX + (Math.cos(agent.budget) * SPREAD); 
        agent.targetY = (height * 0.25) + (agent.urgency * height * 0.5) + (Math.sin(agent.risk * 10) * 20);

        // Velocity acceleration
        let dvx = (agent.targetX - agent.x) * EASE;
        let dvy = (agent.targetY - agent.y) * EASE;
        
        agent.vx += dvx;
        agent.vy += dvy;

        // Velocity Damping
        agent.vx *= FRICTION;
        agent.vy *= FRICTION;

        // Speed Cap (Prevents snapping/fast jumps)
        const speed = Math.sqrt(agent.vx * agent.vx + agent.vy * agent.vy);
        if (speed > MAX_VEL) {
          const ratio = MAX_VEL / speed;
          agent.vx *= ratio;
          agent.vy *= ratio;
        }

        agent.x += agent.vx;
        agent.y += agent.vy;

        // 2. Render-time "Zen" Float Offset
        const timeOffset = now * FLOAT_FREQ;
        
        // 3. Hover Detection (Physics-based)
        // We detect hover on the BASE x,y to ensure stability
        const dx = agent.x - mouse.x;
        const dy = agent.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < minDistance) {
          minDistance = dist;
          (agent as any).currentProb = prob;
          closest = agent;
        }

        const isHovered = closest === agent;

        // Apply visual float ONLY if NOT hovered
        // This makes the dot stay perfectly still while inspecting
        const currentAmp = isHovered ? 0 : FLOAT_AMP;
        
        const renderX = agent.x + (Math.sin(timeOffset + agent.budget) * currentAmp);
        const renderY = agent.y + (Math.cos(timeOffset * 0.8 + agent.risk * 5) * (currentAmp / 2));

        // Draw the point at the RENDER-only position
        const isHitByScanner = isScanning && Math.abs(renderY - scannerRef.current.y) < 8;

        ctx.beginPath();
        ctx.arc(renderX, renderY, isHovered ? 4.5 : (isHitByScanner ? 3.5 : 2.5), 0, Math.PI * 2);
        
        if (isHitByScanner) {
          ctx.fillStyle = "#fff";
          ctx.shadowBlur = 15;
          ctx.shadowColor = "#06b6d4";
        } else {
          if (agent.status === "buy") ctx.fillStyle = "#10b981"; 
          else if (agent.status === "delay") ctx.fillStyle = "#f59e0b"; 
          else ctx.fillStyle = "#f43f5e"; 
          ctx.shadowBlur = isHovered ? 15 : 0;
          ctx.shadowColor = ctx.fillStyle;
        }
        
        if (isHovered) {
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        
        ctx.fill();
        ctx.closePath();
      });

      // Draw Scanner Line
      if (isScanning) {
        ctx.beginPath();
        const scanY = scannerRef.current.y;
        const gradient = ctx.createLinearGradient(0, scanY - 4, 0, scanY + 4);
        gradient.addColorStop(0, 'rgba(6, 182, 212, 0)');
        gradient.addColorStop(0.5, 'rgba(6, 182, 212, 0.4)');
        gradient.addColorStop(1, 'rgba(6, 182, 212, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, scanY - 4, width, 8);
        
        ctx.strokeStyle = "rgba(103, 232, 249, 0.8)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, scanY);
        ctx.lineTo(width, scanY);
        ctx.stroke();
      }

      // Update hovered state in React safely
      if (closest !== hoveredAgent) {
        setHoveredAgent(closest);
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []); // Empty dependency array means this loop runs once on mount

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-lg p-5 w-full overflow-hidden shadow-2xl relative">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-slate-500">
          Live Market Topology
        </h3>
        <div className="flex gap-4 text-[10px] uppercase font-mono tracking-tighter">
          <span className="flex items-center gap-1.5 text-rose-500">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Stale Market
          </span>
          <span className="flex items-center gap-1.5 text-amber-500">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Ghost Segment
          </span>
          <span className="flex items-center gap-1.5 text-emerald-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active Buyers
          </span>
        </div>
      </div>

      <div className="relative h-64 w-full border border-slate-900 bg-[radial-gradient(circle_at_center,_#0f172a_0%,_#020617_100%)] rounded-sm overflow-hidden">
        {/* Labels Overlay */}
        <div className="absolute inset-0 flex justify-between px-10 items-end pb-4 pointer-events-none opacity-20">
          <div className="text-[10px] font-mono uppercase text-slate-400">Baseline</div>
          <div className="text-[10px] font-mono uppercase text-slate-400">Hesitation Zone</div>
          <div className="text-[10px] font-mono uppercase text-slate-400">My Innovation</div>
        </div>
        
        <canvas
          ref={canvasRef}
          width={800}
          height={300}
          onMouseMove={(e) => {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (rect) {
              mouseRef.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
              };
            }
          }}
          onMouseLeave={() => {
            mouseRef.current = { x: -100, y: -100 };
            setHoveredAgent(null);
          }}
          className="w-full h-full block cursor-crosshair"
        />

        {/* Hover Tooltip */}
        {hoveredAgent && (
          <div 
            className="absolute top-4 left-4 z-20 bg-slate-900/90 backdrop-blur border border-slate-700 p-3 rounded-lg shadow-2xl pointer-events-none animate-in fade-in zoom-in-95 duration-200"
            style={{ 
              boxShadow: `0 0 20px ${
                hoveredAgent.status === 'buy' ? 'rgba(16,185,129,0.2)' : 
                hoveredAgent.status === 'delay' ? 'rgba(245,158,11,0.2)' : 
                'rgba(244,63,94,0.2)'
              }`
            }}
          >
            <div className="flex items-center gap-2 mb-2 border-b border-slate-700/50 pb-2">
              <div className={`w-2 h-2 rounded-full ${
                hoveredAgent.status === 'buy' ? 'bg-emerald-500' : 
                hoveredAgent.status === 'delay' ? 'bg-amber-500' : 
                'bg-rose-500'
              }`} />
              <span className="font-mono text-[10px] uppercase text-slate-300">
                Segment: {hoveredAgent.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <span className="text-[10px] text-slate-500 font-mono">BUDGET :</span>
              <span className="text-[10px] text-slate-100 font-mono">₹{hoveredAgent.budget.toLocaleString()}</span>
              
              <span className="text-[10px] text-slate-500 font-mono">URGENCY:</span>
              <span className="text-[10px] text-slate-100 font-mono">{(hoveredAgent.urgency * 100).toFixed(0)}%</span>
              
              <span className="text-[10px] text-slate-500 font-mono">RISK   :</span>
              <span className="text-[10px] text-slate-100 font-mono">{(hoveredAgent.risk * 100).toFixed(0)}%</span>
              
              <div className="col-span-2 pt-1 border-t border-slate-700/50 mt-1 flex justify-between">
                <span className="text-[10px] text-slate-400 font-mono italic">WIN PROBABILITY:</span>
                <span className="text-[10px] text-white font-bold font-mono">
                  {((hoveredAgent as any).currentProb * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Decorative Grid Trace */}
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
    </div>
  );
}

from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from engine import GhostEngine, GhostMLEngine
from generator import generate_synthetic_crowd
from researcher import MarketResearcher, extract_market_json
from dotenv import load_dotenv
import numpy as np
import os

load_dotenv()

app = FastAPI(title="Ghost Customer: Decision Lab")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instantiate both engines once at startup
rule_engine = GhostEngine()
ml_engine   = GhostMLEngine()   # loads model; falls back silently if unavailable


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def generate_ghost_verdict(stats: dict, p_price: float, c_price: float) -> str:
    conv   = float(stats["conversion_rate"].strip("%"))
    delay  = float(stats["delay_rate"].strip("%"))
    reject = float(stats["rejection_rate"].strip("%"))

    if conv > 50:
        return "MARKET DOMINANCE: Your value-to-price ratio is elite. You have room to increase price by 10% without losing the lead."
    elif delay > 40:
        return f"URGENCY GAP: Customers like the product but aren't buying now. Drop price to ₹{p_price * 0.9:.0f} or add a limited-time offer to convert the Ghost (Delay) segment."
    elif p_price > c_price * 1.5 and reject > 30:
        return "PREMIUM TRAP: You are significantly more expensive than the market. Unless you raise Feature Strength above 0.8, conversion will stagnate."
    else:
        return "STAGNANT ZONE: Your product is 'fine' but forgettable. Increase Feature Strength or lower Risk Perception to move the needle."


def run_monte_carlo(req, engine: GhostEngine, crowd_base: list[dict], iterations: int = 50) -> tuple[float, list[float]]:
    all_runs: list[float] = []
    for _ in range(iterations):
        noise = float(np.random.normal(0, 0.05))
        buys  = 0
        for agent in crowd_base:
            noisy = dict(agent)
            noisy["urgency"] = float(np.clip(agent["urgency"] + noise, 0.01, 1.0))
            action, _ = engine.calculate_decision(
                noisy, req.product_price, req.product_value,
                req.comp_price, req.comp_strength, req.product_stage,
            )
            if action == "BUY":
                buys += 1
        all_runs.append((buys / len(crowd_base)) * 100)

    mean_conv = float(np.mean(all_runs))
    std_err   = float(np.std(all_runs)) / (iterations ** 0.5)
    ci = [round(mean_conv - 1.96 * std_err, 1), round(mean_conv + 1.96 * std_err, 1)]
    return round(mean_conv, 1), ci


# ---------------------------------------------------------------------------
# Request model
# ---------------------------------------------------------------------------

class MarketSimRequest(BaseModel):
    agent_count:      int
    product_price:    float
    product_value:    float
    comp_price:       float
    comp_strength:    float
    product_stage:    str   = "pre_launch"
    use_ml:           bool  = True
    market_size:      int   = 0          # 0 = disabled; >0 = total addressable market
    segment_weights:  dict  = {}         # e.g. {"early_adopter": 0.4, "price_hunter": 0.6}


# ---------------------------------------------------------------------------
# /simulate-market
# ---------------------------------------------------------------------------

@app.post("/simulate-market")
async def simulate(req: MarketSimRequest):
    crowd  = generate_synthetic_crowd(req.agent_count, custom_weights=req.segment_weights or None)
    results = []
    buys = delays = rejects = 0
    prob_curve = []
    seg_stats: dict[str, dict] = {}

    # ── Choose engine and run decisions ──────────────────────────────────────
    if req.use_ml and ml_engine.ml_available:
        # Vectorized batch prediction — fast single sklearn call
        ml_results = ml_engine.predict_crowd(
            crowd, req.product_price, req.product_value,
            req.comp_price, req.comp_strength, req.product_stage,
        )
        for i, (agent, (action, prob, ml_probs)) in enumerate(zip(crowd, ml_results)):
            # Enforce hard budget gate even in ML mode
            if req.product_price > agent["budget"] and req.comp_price > agent["budget"]:
                action, prob = "REJECT", 0.05
                ml_probs = {"REJECT": 0.95, "DELAY": 0.03, "BUY": 0.02}

            if   action == "BUY":   buys    += 1
            elif action == "DELAY": delays  += 1
            else:                   rejects += 1

            seg = agent.get("segment", "unknown")
            if seg not in seg_stats:
                seg_stats[seg] = {"total": 0, "buy": 0, "delay": 0, "reject": 0}
            seg_stats[seg]["total"]        += 1
            seg_stats[seg][action.lower()] += 1

            results.append({
                "agent_id":        i + 1,
                "segment":         seg,
                "budget":          agent["budget"],
                "urgency":         agent["urgency"],
                "risk_tolerance":  agent["risk_tolerance"],
                "probability":     prob,
                "action":          action,
                "ml_probabilities": ml_probs,
            })
            prob_curve.append({"agent": i + 1, "probability": prob})

    else:
        # Rule-based fallback
        for i, agent in enumerate(crowd):
            action, prob = rule_engine.calculate_decision(
                agent, req.product_price, req.product_value,
                req.comp_price, req.comp_strength, req.product_stage,
            )
            if   action == "BUY":   buys    += 1
            elif action == "DELAY": delays  += 1
            else:                   rejects += 1

            seg = agent.get("segment", "unknown")
            if seg not in seg_stats:
                seg_stats[seg] = {"total": 0, "buy": 0, "delay": 0, "reject": 0}
            seg_stats[seg]["total"]        += 1
            seg_stats[seg][action.lower()] += 1

            results.append({
                "agent_id":        i + 1,
                "segment":         seg,
                "budget":          agent["budget"],
                "urgency":         agent["urgency"],
                "risk_tolerance":  agent["risk_tolerance"],
                "probability":     prob,
                "action":          action,
                "ml_probabilities": None,
            })
            prob_curve.append({"agent": i + 1, "probability": prob})

    summary_stats = {
        "conversion_rate": f"{(buys    / req.agent_count) * 100:.1f}%",
        "delay_rate":      f"{(delays  / req.agent_count) * 100:.1f}%",
        "rejection_rate":  f"{(rejects / req.agent_count) * 100:.1f}%",
    }

    engine_for_mc = rule_engine   # always use rule-based for Monte Carlo (speed)
    mean_conv, conf_interval = run_monte_carlo(req, engine_for_mc, crowd)

    # Projected market numbers (only when market_size provided)
    projected: dict = {}
    if req.market_size > 0:
        conv_frac = buys / req.agent_count
        proj_customers = round(conv_frac * req.market_size)
        proj_revenue   = round(proj_customers * req.product_price)
        mc_proj_customers = round((mean_conv / 100) * req.market_size)
        mc_proj_revenue   = round(mc_proj_customers * req.product_price)
        projected = {
            "customers":          proj_customers,
            "revenue":            proj_revenue,
            "mc_customers":       mc_proj_customers,
            "mc_revenue":         mc_proj_revenue,
            "market_size":        req.market_size,
        }

    return {
        "conversion_rate":   summary_stats["conversion_rate"],
        "delay_rate":        summary_stats["delay_rate"],
        "rejection_rate":    summary_stats["rejection_rate"],
        "distribution":      {"buy": buys, "delay": delays, "reject": rejects},
        "segment_breakdown": seg_stats,
        "probability_curve": prob_curve,
        "logs":              results,
        "verdict":           generate_ghost_verdict(summary_stats, req.product_price, req.comp_price),
        "monte_carlo": {
            "mean_conversion":     mean_conv,
            "confidence_interval": conf_interval,
        },
        "engine_mode": "ml" if (req.use_ml and ml_engine.ml_available) else "rule_based",
        "projected":   projected,
    }


# ---------------------------------------------------------------------------
# /ml-status
# ---------------------------------------------------------------------------

@app.get("/ml-status")
async def ml_status():
    return ml_engine.get_model_info()


# ---------------------------------------------------------------------------
# /fetch-market-data
# ---------------------------------------------------------------------------

researcher = MarketResearcher()

class ResearchRequest(BaseModel):
    product_name: str

@app.post("/fetch-market-data")
async def fetch_market_data(req: ResearchRequest):
    try:
        raw     = researcher.fetch_competitor_intel(req.product_name)
        data    = extract_market_json(raw, req.product_name)
        data["source_snippet"] = raw[:200] + "..."
        data["success"]        = True
        return data
    except Exception:
        return {
            "comp_price": 500.0, "comp_strength": 0.5,
            "competitors": [], "success": False,
            "source_snippet": "Market research unavailable — using baseline.",
        }


# ---------------------------------------------------------------------------
# /calculate-elasticity
# ---------------------------------------------------------------------------

@app.post("/calculate-elasticity")
async def calculate_elasticity(req: MarketSimRequest):
    base_price  = req.product_price
    test_prices = np.linspace(base_price * 0.5, base_price * 2.0, 15)
    crowd_base  = generate_synthetic_crowd(req.agent_count, custom_weights=req.segment_weights or None)
    data        = []

    for p in test_prices:
        temp = req.model_copy(update={"product_price": float(p)})
        mean_conv, _ = run_monte_carlo(temp, rule_engine, crowd_base, iterations=10)
        data.append({
            "price":      round(float(p), 2),
            "conversion": round(mean_conv, 1),
            "revenue":    round(float(p) * (mean_conv / 100) * req.agent_count, 2),
        })

    optimal = max(data, key=lambda x: x["revenue"])
    return {
        "curve": data, "optimal_price": optimal["price"],
        "max_revenue": optimal["revenue"],
        "insight": f"Maximum revenue at ₹{optimal['price']:.0f}. Beyond this, volume loss outpaces per-unit gains.",
    }


# ---------------------------------------------------------------------------
# /optimize-price
# ---------------------------------------------------------------------------

GROSS_MARGIN = 0.40

@app.post("/optimize-price")
async def optimize_price(req: MarketSimRequest):
    lo           = max(100.0, req.comp_price * 0.4)
    hi           = req.comp_price * 2.5
    price_points = np.linspace(lo, hi, 30)
    crowd_base   = generate_synthetic_crowd(req.agent_count, custom_weights=req.segment_weights or None)
    curve        = []

    for p in price_points:
        temp = req.model_copy(update={"product_price": float(p)})
        mean_conv, _ = run_monte_carlo(temp, rule_engine, crowd_base, iterations=10)
        units   = (mean_conv / 100) * req.agent_count
        revenue = float(p) * units
        curve.append({"price": round(float(p), 2), "revenue": round(revenue, 2), "profit": round(revenue * GROSS_MARGIN, 2)})

    best_rev    = max(curve, key=lambda x: x["revenue"])
    best_profit = max(curve, key=lambda x: x["profit"])
    return {
        "curve": curve,
        "optimal_price":        best_rev["price"],
        "max_revenue":          best_rev["revenue"],
        "optimal_profit_price": best_profit["price"],
        "max_profit":           best_profit["profit"],
    }

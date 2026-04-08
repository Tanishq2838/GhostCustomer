from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from engine import GhostEngine, GhostMLEngine
from generator import generate_synthetic_crowd
from researcher import MarketResearcher, extract_market_json, AgentResearcher
from dotenv import load_dotenv
import numpy as np
import os

load_dotenv()

app = FastAPI(title="Ghost Customer: Decision Lab")  # v2.1 — explainability

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
    is_expensive = p_price > c_price * 1.4

    # Priority order: best → worst
    if conv >= 60:
        return f"MARKET DOMINANCE: Exceptional product-market fit. {conv:.0f}% conversion is elite. You have room to test a 10–15% price increase — demand is inelastic here."

    if conv >= 40 and delay < 25:
        return f"STRONG TRACTION: {conv:.0f}% conversion with low hesitation. Focus now on scaling reach — the product is working. Consider a premium tier to capture willingness-to-pay upside."

    if delay > conv and delay >= 35:
        return f"URGENCY GAP: {delay:.0f}% of customers want the product but won't commit. Price isn't the main barrier — urgency is. Try a limited-time offer, a waitlist, or a usage-based free trial. Target price: ₹{p_price * 0.88:.0f}."

    if reject >= 55:
        return f"CRITICAL REJECTION: {reject:.0f}% hard rejections signal a fundamental mismatch — either price is too high relative to perceived value, or the wrong audience is being reached. Reassess positioning before scaling spend."

    if is_expensive and reject >= 30:
        return f"PREMIUM TRAP: You're priced {((p_price / c_price - 1) * 100):.0f}% above the market average. Customers are defecting to cheaper alternatives. Either justify the premium with a stronger value story or price closer to ₹{c_price * 1.1:.0f}."

    if conv < 20 and reject > 40:
        return "MARKET MISMATCH: Low conversion AND high rejection together suggest the value proposition isn't landing. This is a messaging or positioning problem, not a price problem. Don't discount — reframe."

    return f"BALANCED MARKET: Conversion at {conv:.0f}% is reasonable but not dominant. The segment mix is split. Run elasticity analysis to find the price point that breaks the DELAY segment toward BUY."


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
    market_price = (req.product_price + req.comp_price) / 2
    crowd  = generate_synthetic_crowd(req.agent_count, custom_weights=req.segment_weights or None, market_price=market_price)
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
        for i, (agent, (action, prob, ml_probs, contributions)) in enumerate(zip(crowd, ml_results)):
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
                "agent_id":             i + 1,
                "segment":              seg,
                "budget":               agent["budget"],
                "urgency":              agent["urgency"],
                "risk_aversion":        agent["risk_aversion"],
                "probability":          prob,
                "action":               action,
                "ml_probabilities":     ml_probs,
                "feature_contributions": contributions,
            })
            prob_curve.append({"agent": i + 1, "probability": prob})

    else:
        # Rule-based fallback
        for i, agent in enumerate(crowd):
            action, prob = rule_engine.calculate_decision(
                agent, req.product_price, req.product_value,
                req.comp_price, req.comp_strength, req.product_stage,
            )
            contributions = rule_engine.explain_contributions(
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
                "agent_id":             i + 1,
                "segment":              seg,
                "budget":               agent["budget"],
                "urgency":              agent["urgency"],
                "risk_aversion":        agent["risk_aversion"],
                "probability":          prob,
                "action":               action,
                "ml_probabilities":     None,
                "feature_contributions": contributions,
            })
            prob_curve.append({"agent": i + 1, "probability": prob})

    summary_stats = {
        "conversion_rate": f"{(buys    / req.agent_count) * 100:.1f}%",
        "delay_rate":      f"{(delays  / req.agent_count) * 100:.1f}%",
        "rejection_rate":  f"{(rejects / req.agent_count) * 100:.1f}%",
    }

    # ── Decision drivers: mean feature contributions for BUY vs REJECT groups ──
    def _avg_contributions(group: list[dict]) -> dict:
        if not group:
            return {}
        keys = group[0].keys()
        return {k: round(sum(c[k] for c in group) / len(group), 4) for k in keys}

    buy_contribs = [r["feature_contributions"] for r in results if r["action"] == "BUY"   and r.get("feature_contributions")]
    rej_contribs = [r["feature_contributions"] for r in results if r["action"] == "REJECT" and r.get("feature_contributions")]
    decision_drivers = {
        "buy":      _avg_contributions(buy_contribs),
        "reject":   _avg_contributions(rej_contribs),
        "n_buy":    len(buy_contribs),
        "n_reject": len(rej_contribs),
    }

    engine_for_mc = rule_engine   # always use rule-based for Monte Carlo (speed)
    mean_conv, conf_interval = run_monte_carlo(req, engine_for_mc, crowd)

    # Projected market numbers (only when market_size provided)
    projected: dict | None = None
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
        "engine_mode":      "ml" if (req.use_ml and ml_engine.ml_available) else "rule_based",
        "projected":        projected,
        "decision_drivers": decision_drivers,
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

researcher       = MarketResearcher()
agent_researcher = AgentResearcher()

class ResearchRequest(BaseModel):
    product_name: str
    country: str = "India"

@app.post("/fetch-market-data")
async def fetch_market_data(req: ResearchRequest):
    try:
        data = agent_researcher.run(req.product_name, req.country)
        data["success"] = True
        return data
    except Exception as e:
        return {
            "comp_price": 500.0, "comp_strength": 0.5,
            "competitors": [], "success": False,
            "source_snippet": "Market research unavailable — using baseline.",
            "trace": [{"type": "ERROR", "message": str(e)}],
            "market_summary": "", "pricing_insight": "",
        }


# ---------------------------------------------------------------------------
# /calculate-elasticity
# ---------------------------------------------------------------------------

@app.post("/calculate-elasticity")
async def calculate_elasticity(req: MarketSimRequest):
    base_price  = req.product_price
    lo_price    = max(100.0, base_price * 0.3)
    hi_price    = base_price * 2.5
    test_prices = np.linspace(lo_price, hi_price, 15)
    crowd_base  = generate_synthetic_crowd(req.agent_count, custom_weights=req.segment_weights or None, market_price=(req.product_price + req.comp_price) / 2)
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
    lo           = max(100.0, min(req.comp_price * 0.4, req.product_price * 0.4))
    hi           = max(req.comp_price * 2.5, req.product_price * 1.5)
    price_points = np.linspace(lo, hi, 30)
    crowd_base   = generate_synthetic_crowd(req.agent_count, custom_weights=req.segment_weights or None, market_price=(req.product_price + req.comp_price) / 2)
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

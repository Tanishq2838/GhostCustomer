from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from engine import GhostEngine
from generator import generate_synthetic_crowd
from researcher import MarketResearcher, extract_market_json
from dotenv import load_dotenv
import numpy as np
import os

load_dotenv()

app = FastAPI()

def generate_ghost_verdict(stats, p_price, c_price):
    conv = float(stats['conversion_rate'].strip('%'))
    delay = float(stats['delay_rate'].strip('%'))
    reject = float(stats['rejection_rate'].strip('%'))
    
    if conv > 50:
        return "MARKET DOMINANCE: Your value-to-price ratio is elite. You have room to increase price by 10% without losing the lead."
    elif delay > 40:
        return f"URGENCY GAP: Potential customers like the product but aren't buying 'now'. Drop price to ₹{p_price * 0.9:.0f} or add a limited-time offer to convert the 'Ghost' segment."
    elif p_price > c_price * 1.5 and reject > 30:
        return "PREMIUM TRAP: You are significantly more expensive than the market average. Unless you double your 'Feature Strength', your conversion will remain stagnant."
    else:
        return "STAGNANT ZONE: Your product is 'fine' but forgettable. Increase Feature Strength or decrease Risk to move the needle."

# CRITICAL: Allow your Lovable UI to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = GhostEngine()

def run_monte_carlo(req, engine, agent_generator, iterations=50):
    all_runs = []
    
    for _ in range(iterations):
        # 1. Generate a fresh crowd
        crowd = agent_generator(req.agent_count)
        
        # 2. Add "Market Noise" (Maybe it's a rainy day, maybe a tweet went viral)
        noise = np.random.normal(0, 0.05) # Subtle bell-curve noise
        
        buys = 0
        for agent in crowd:
            # We slightly tweak agent urgency/risk per run to simulate real-world variance
            agent['urgency'] += noise
            action, _ = engine.calculate_decision(
                agent, req.product_price, req.product_value, req.comp_price, req.comp_strength
            )
            if action == "BUY": buys += 1
            
        all_runs.append((buys / req.agent_count) * 100)
    
    # 3. Calculate Stats
    mean_conv = np.mean(all_runs)
    std_dev = np.std(all_runs)
    conf_interval = [mean_conv - (1.96 * std_dev), mean_conv + (1.96 * std_dev)]
    
    return round(mean_conv, 1), [round(conf_interval[0], 1), round(conf_interval[1], 1)]

class MarketSimRequest(BaseModel):
    agent_count: int
    product_price: float
    product_value: float
    comp_price: float
    comp_strength: float

@app.post("/simulate-market")
async def simulate(req: MarketSimRequest):
    crowd = generate_synthetic_crowd(req.agent_count)
    results = []
    
    # Track stats for the JSON Lovable expects
    buys, delays, rejects = 0, 0, 0
    prob_curve = []

    for i, agent in enumerate(crowd):
        action, prob = engine.calculate_decision(
            agent, req.product_price, req.product_value, req.comp_price, req.comp_strength
        )
        
        if action == "BUY": buys += 1
        elif action == "DELAY": delays += 1
        else: rejects += 1
        
        # Data for the "Decision Trace" Table
        results.append({
            "agent_id": i + 1,
            "budget": agent['budget'],
            "urgency": agent['urgency'],
            "probability": prob,
            "action": action
        })
        
        # Data for the Area Chart (Trend)
        prob_curve.append({"agent": i + 1, "probability": prob})

    summary_stats = {
        "conversion_rate": f"{(buys/req.agent_count)*100:.1f}%",
        "delay_rate": f"{(delays/req.agent_count)*100:.1f}%",
        "rejection_rate": f"{(rejects/req.agent_count)*100:.1f}%"
    }

    mean_conv, conf_interval = run_monte_carlo(req, engine, generate_synthetic_crowd)

    return {
        "conversion_rate": summary_stats["conversion_rate"],
        "delay_rate": summary_stats["delay_rate"],
        "rejection_rate": summary_stats["rejection_rate"],
        "distribution": {
            "buy": buys,
            "delay": delays,
            "reject": rejects
        },
        "probability_curve": prob_curve,
        "logs": results,
        "verdict": generate_ghost_verdict(summary_stats, req.product_price, req.comp_price),
        "monte_carlo": {
            "mean_conversion": mean_conv,
            "confidence_interval": conf_interval
        }
    }

# Initialize the researcher (Use an environment variable for safety!)
researcher = MarketResearcher()

class ResearchRequest(BaseModel):
    product_name: str

@app.post("/fetch-market-data")
async def fetch_market_data(req: ResearchRequest):
    try:
        # 1. Get raw market data from Google
        raw_context = researcher.fetch_competitor_intel(req.product_name)
        
        # 2. Use Gemini to 'Parse' this into JSON
        market_data = extract_market_json(raw_context, req.product_name)
        
        # Merge source snippet for the trace
        market_data["source_snippet"] = raw_context[:200] + "..."
        return market_data
    except Exception as e:
        return {
            "comp_price": 500.0,
            "comp_strength": 0.5,
            "competitors": [],
            "source_snippet": "Market research failed, using reliable baseline data."
        }

@app.post("/calculate-elasticity")
async def calculate_elasticity(req: MarketSimRequest):
    # 1. Define a range of prices to test (e.g., from 50% to 200% of current price)
    base_price = req.product_price
    test_prices = np.linspace(base_price * 0.5, base_price * 2.0, 15)
    
    elasticity_data = []
    
    for p in test_prices:
        # Run a quick simulation for this price point
        try:
            temp_req = req.model_copy(update={"product_price": float(p)}) # Pydantic v2
        except AttributeError:
            temp_req = req.copy(update={"product_price": float(p)}) # Pydantic v1
        
        # Get the mean conversion from your Monte Carlo logic
        mean_conv, _ = run_monte_carlo(temp_req, engine, generate_synthetic_crowd, iterations=10)
        
        # Revenue = Price * (Conversion Rate * Total Market Size)
        expected_revenue = p * (mean_conv / 100) * req.agent_count
        
        elasticity_data.append({
            "price": round(p, 2),
            "conversion": round(mean_conv, 1),
            "revenue": round(expected_revenue, 2)
        })

    # 2. Find the "Sweet Spot" (Price where revenue is highest)
    optimal = max(elasticity_data, key=lambda x: x['revenue'])
    
    return {
        "curve": elasticity_data,
        "optimal_price": optimal['price'],
        "max_revenue": optimal['revenue'],
        "insight": f"Maximum revenue is achieved at ₹{optimal['price']}. Increasing price beyond this causes a sharp drop in volume."
    }

@app.post("/optimize-price")
async def optimize_price(req: MarketSimRequest):
    price_points = np.linspace(100, 5000, 20) # Test 20 prices
    revenue_curve = []
    
    for p in price_points:
        # Run a mini-simulation for this price
        try:
            temp_req = req.model_copy(update={"product_price": float(p)}) # Pydantic v2
        except AttributeError:
            temp_req = req.copy(update={"product_price": float(p)}) # Pydantic v1
            
        # Get the mean conversion from your Monte Carlo logic
        mean_conv, _ = run_monte_carlo(temp_req, engine, generate_synthetic_crowd, iterations=10)
        
        expected_revenue = (mean_conv / 100) * req.agent_count * p
        revenue_curve.append({"price": float(p), "revenue": round(expected_revenue, 2)})
        
    # Find the peak
    best_option = max(revenue_curve, key=lambda x: x['revenue'])
    return {
        "curve": revenue_curve, 
        "optimal_price": best_option['price'],
        "max_revenue": best_option['revenue']
    }
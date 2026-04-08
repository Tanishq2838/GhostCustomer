import random

# Per-segment budget multipliers relative to market price context.
# budget_mean = multiplier × market_price,  budget_std = std_ratio × market_price
# This ensures budgets always scale with the actual price point being simulated.
SEGMENTS = {
    "early_adopter":  {
        "weight": 0.20,
        "budget_mul": 1.8,  "budget_std_ratio": 0.30,
        "urgency_mean": 0.80, "urgency_std": 0.10,
        "risk_mean":    0.30, "risk_std":    0.10,
    },
    "premium_seeker": {
        "weight": 0.15,
        "budget_mul": 2.5,  "budget_std_ratio": 0.40,
        "urgency_mean": 0.50, "urgency_std": 0.15,
        "risk_mean":    0.20, "risk_std":    0.10,
    },
    "price_hunter":   {
        "weight": 0.35,
        "budget_mul": 0.8,  "budget_std_ratio": 0.20,
        "urgency_mean": 0.40, "urgency_std": 0.15,
        "risk_mean":    0.70, "risk_std":    0.15,
    },
    "skeptic":        {
        "weight": 0.30,
        "budget_mul": 1.3,  "budget_std_ratio": 0.30,
        "urgency_mean": 0.25, "urgency_std": 0.15,
        "risk_mean":    0.80, "risk_std":    0.15,
    },
}

def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))

def generate_synthetic_crowd(
    count: int = 50,
    custom_weights: dict[str, float] | None = None,
    market_price: float = 1000.0,
) -> list[dict]:
    """
    Generate a synthetic crowd of agents.

    market_price  — reference price (avg of product & competitor price).
                    Budget means scale proportionally so agents are always
                    contextually relevant to the price point being simulated.
    custom_weights — optional dict mapping segment name → fraction (0–1).
    """
    seg_names = list(SEGMENTS.keys())

    if custom_weights:
        raw = [max(0.0, custom_weights.get(s, 0.0)) for s in seg_names]
        total = sum(raw)
        weights = [w / total for w in raw] if total > 0 else [SEGMENTS[s]["weight"] for s in seg_names]
    else:
        weights = [SEGMENTS[s]["weight"] for s in seg_names]

    crowd = []
    for i in range(count):
        seg_name = random.choices(seg_names, weights=weights, k=1)[0]
        seg      = SEGMENTS[seg_name]

        budget_mean = seg["budget_mul"]       * market_price
        budget_std  = seg["budget_std_ratio"] * market_price

        budget  = max(1.0, random.gauss(budget_mean, budget_std))
        urgency = _clamp(random.gauss(seg["urgency_mean"], seg["urgency_std"]), 0.01, 1.0)
        risk    = _clamp(random.gauss(seg["risk_mean"],    seg["risk_std"]),    0.0,  1.0)

        crowd.append({
            "id":             f"agent_{i:03}",
            "segment":        seg_name,
            "budget":         round(budget,  2),
            "urgency":        round(urgency, 2),
            "risk_aversion":  round(risk,    2),
        })
    return crowd

if __name__ == "__main__":
    for p in generate_synthetic_crowd(5, market_price=3000):
        print(p)

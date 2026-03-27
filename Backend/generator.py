import random

# Four behaviorally distinct market segments with correlated attributes.
# Default weights must sum to 1.0.
SEGMENTS = {
    "early_adopter":  {
        "weight": 0.20,
        "budget_mean": 1400, "budget_std": 300,
        "urgency_mean": 0.80, "urgency_std": 0.10,
        "risk_mean":    0.30, "risk_std":    0.10,
    },
    "premium_seeker": {
        "weight": 0.15,
        "budget_mean": 1800, "budget_std": 400,
        "urgency_mean": 0.50, "urgency_std": 0.15,
        "risk_mean":    0.20, "risk_std":    0.10,
    },
    "price_hunter":   {
        "weight": 0.35,
        "budget_mean": 700,  "budget_std": 200,
        "urgency_mean": 0.40, "urgency_std": 0.15,
        "risk_mean":    0.70, "risk_std":    0.15,
    },
    "skeptic":        {
        "weight": 0.30,
        "budget_mean": 1100, "budget_std": 350,
        "urgency_mean": 0.25, "urgency_std": 0.15,
        "risk_mean":    0.80, "risk_std":    0.15,
    },
}

def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))

def generate_synthetic_crowd(
    count: int = 50,
    custom_weights: dict[str, float] | None = None,
) -> list[dict]:
    """
    Generate a synthetic crowd of agents.

    custom_weights — optional dict mapping segment name → fraction (0–1).
    Values are normalised automatically so they don't need to sum exactly to 1.
    Missing segments default to 0. If all values are 0, falls back to defaults.
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

        budget  = _clamp(random.gauss(seg["budget_mean"],  seg["budget_std"]),  200.0, 5000.0)
        urgency = _clamp(random.gauss(seg["urgency_mean"], seg["urgency_std"]),  0.01,  1.0)
        risk    = _clamp(random.gauss(seg["risk_mean"],    seg["risk_std"]),     0.0,   1.0)

        crowd.append({
            "id":             f"agent_{i:03}",
            "segment":        seg_name,
            "budget":         round(budget,  2),
            "urgency":        round(urgency, 2),
            "risk_tolerance": round(risk,    2),
        })
    return crowd

if __name__ == "__main__":
    for p in generate_synthetic_crowd(5):
        print(p)

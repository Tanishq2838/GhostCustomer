import numpy as np

class GhostEngine:
    def __init__(self):
        self.market_friction = 0.15 

    def calculate_decision(self, agent, p_price, p_value, c_price, c_strength):
        # 1. Budget check - Instant rejection if both are too expensive
        if p_price > agent['budget'] and c_price > agent['budget']:
            return "REJECT", 0.05

        # 2. Relative Price Strength (Cheaper is better)
        # We compare how much of the budget each takes
        p_stress = p_price / agent['budget']
        c_stress = c_price / agent['budget']
        
        # 3. Decision Weights
        w_value = 2.2
        w_price = -2.0
        w_urgency = 1.5
        w_risk = -1.2
        
        # 4. Your Product's Score
        p_score = (p_value * w_value) + (p_stress * w_price) + (agent['urgency'] * w_urgency)
        
        # 5. Competitor's Score
        c_score = (c_strength * w_value) + (c_stress * w_price) + (agent['urgency'] * w_urgency)
        
        # 6. Final Logic: Did you beat the competitor and the agent's risk?
        final_score = p_score - c_score - (agent['risk_tolerance'] * w_risk) - self.market_friction
        
        probability = 1 / (1 + np.exp(-final_score))
        
        if probability > 0.72:
            action = "BUY"
        elif probability > 0.38:
            action = "DELAY"
        else:
            action = "REJECT"

        return action, round(float(probability), 4)
import numpy as np
import os
import sys

# Stage → Trust mapping.
STAGE_TRUST: dict[str, float] = {
    "pre_launch":    0.10,
    "just_launched": 0.30,
    "growing":       0.60,
    "established":   0.85,
}

# ── Model weights ────────────────────────────────────────────────────────────
ALPHA    = 3.0
BETA     = 2.5
GAMMA    = 1.5
DELTA    = 1.0
MU       = 2.0
ETA      = 1.5
FRICTION = 0.10

BUY_THRESHOLD   = 0.72
DELAY_THRESHOLD = 0.38
# ─────────────────────────────────────────────────────────────────────────────

CLASS_NAMES = {0: "REJECT", 1: "DELAY", 2: "BUY"}
FEATURE_NAMES = [
    "price_to_budget", "value", "urgency", "risk_aversion", "trust",
    "comp_quality_adv", "comp_price_adv", "pv_interaction", "risk_trust_penalty",
]


class GhostEngine:
    """
    Rule-based interaction model. Single coherent decision field with:
    - Price-value interaction (luxury tolerance)
    - Trust-modulated risk aversion
    - Decomposed competitor pull
    """

    def __init__(self):
        self.market_friction = FRICTION
        self.buy_threshold   = BUY_THRESHOLD
        self.delay_threshold = DELAY_THRESHOLD

    def calculate_decision(
        self,
        agent: dict,
        p_price: float, p_value: float,
        c_price: float, c_strength: float,
        stage: str = "pre_launch",
    ) -> tuple[str, float]:

        if p_price > agent["budget"] and c_price > agent["budget"]:
            return "REJECT", 0.05

        V   = float(p_value)
        P_B = p_price / agent["budget"]
        C_B = c_price / agent["budget"]
        U   = float(agent["urgency"])
        R   = float(agent["risk_aversion"])
        CS  = float(c_strength)
        T   = STAGE_TRUST.get(stage, 0.30)

        c_quality_adv = max(0.0, CS - V)
        c_price_adv   = max(0.0, P_B - C_B) * CS
        C             = c_quality_adv + c_price_adv
        pv_penalty    = P_B * (1.0 - V)

        z = (
            ALPHA  *  V
            - BETA  *  P_B
            + GAMMA *  U
            - DELTA *  R * (1.0 - T)
            - MU    *  C
            - ETA   *  pv_penalty
            - FRICTION
        )

        probability = float(1.0 / (1.0 + np.exp(-z)))

        if probability > BUY_THRESHOLD:
            action = "BUY"
        elif probability > DELAY_THRESHOLD:
            action = "DELAY"
        else:
            action = "REJECT"

        return action, round(probability, 4)

    def explain_contributions(
        self,
        agent: dict,
        p_price: float, p_value: float,
        c_price: float, c_strength: float,
        stage: str = "pre_launch",
    ) -> dict[str, float]:
        """Signed contribution of each factor to the decision z-score (positive = pushes toward BUY)."""
        T   = STAGE_TRUST.get(stage, 0.30)
        V   = float(p_value)
        P_B = p_price / agent["budget"]
        C_B = c_price / agent["budget"]
        U   = float(agent["urgency"])
        R   = float(agent["risk_aversion"])
        CS  = float(c_strength)

        c_quality_adv = max(0.0, CS - V)
        c_price_adv   = max(0.0, P_B - C_B) * CS
        C             = c_quality_adv + c_price_adv
        pv_penalty    = P_B * (1.0 - V)

        return {
            "perceived_value":      round(ALPHA  * V,              4),
            "price_stress":         round(-BETA  * P_B,            4),
            "urgency_lift":         round(GAMMA  * U,              4),
            "risk_trust_drag":      round(-DELTA * R * (1.0 - T),  4),
            "competitor_pull":      round(-MU    * C,              4),
            "price_value_mismatch": round(-ETA   * pv_penalty,     4),
            "market_friction":      round(-FRICTION,               4),
        }


class GhostMLEngine(GhostEngine):
    """
    ML-backed engine using a trained Logistic Regression model.
    Vectorized batch prediction over the full agent crowd in a single
    sklearn call — much faster than looping predict_decision().
    Falls back to rule-based GhostEngine if the model is unavailable.
    """

    def __init__(self):
        super().__init__()
        self.ml_available = False
        self._model  = None
        self._scaler = None

        try:
            sys.path.insert(0, os.path.join(os.path.dirname(__file__), "ML"))
            from ML.ml_engine import get_models, FEATURE_NAMES as _fn
            self._model, self._scaler = get_models()
            self.ml_available = True
            print("[ML] Model loaded successfully.")
        except Exception as e:
            print(f"[ML] Model unavailable — falling back to rule-based: {e}")

    def _build_feature_matrix(
        self,
        agents: list[dict],
        p_price: float, p_value: float,
        c_price: float, c_strength: float,
        stage: str,
    ):
        """Build a (N × 9) feature matrix for the whole crowd in one shot."""
        import pandas as pd

        T   = STAGE_TRUST.get(stage, 0.30)
        V   = float(p_value)
        CS  = float(c_strength)

        rows = []
        for agent in agents:
            budget = float(agent["budget"])
            P_B    = p_price / budget
            C_B    = c_price / budget
            R      = float(agent["risk_aversion"])
            rows.append({
                "price_to_budget":    P_B,
                "value":              V,
                "urgency":            float(agent["urgency"]),
                "risk_aversion":      R,
                "trust":              T,
                "comp_quality_adv":   max(0.0, CS - V),
                "comp_price_adv":     max(0.0, P_B - C_B) * CS,
                "pv_interaction":     P_B * (1.0 - V),
                "risk_trust_penalty": R * (1.0 - T),
            })

        return pd.DataFrame(rows)[FEATURE_NAMES]

    def predict_crowd(
        self,
        agents: list[dict],
        p_price: float, p_value: float,
        c_price: float, c_strength: float,
        stage: str = "pre_launch",
    ) -> list[tuple[str, float, dict, dict]]:
        """
        Vectorized prediction for the full crowd.
        Returns list of (action, buy_prob, {REJECT, DELAY, BUY probabilities}, feature_contributions).
        """
        if not self.ml_available:
            results = []
            for agent in agents:
                action, prob = self.calculate_decision(
                    agent, p_price, p_value, c_price, c_strength, stage
                )
                contribs = self.explain_contributions(
                    agent, p_price, p_value, c_price, c_strength, stage
                )
                results.append((action, prob, {"REJECT": 0.0, "DELAY": 0.0, "BUY": prob}, contribs))
            return results

        X       = self._build_feature_matrix(agents, p_price, p_value, c_price, c_strength, stage)
        X_sc    = self._scaler.transform(X)
        probs   = self._model.predict_proba(X_sc)   # (N, 3)
        preds   = self._model.predict(X_sc)          # (N,)

        # BUY is class index 2; contributions = coef_BUY × scaled_feature_value
        buy_coefs      = self._model.coef_[2]        # shape (9,)
        contrib_matrix = X_sc * buy_coefs            # (N, 9)

        results = []
        for i, (pred, prob_row) in enumerate(zip(preds, probs)):
            action   = CLASS_NAMES[int(pred)]
            contribs = {feat: round(float(c), 4) for feat, c in zip(FEATURE_NAMES, contrib_matrix[i])}
            results.append((
                action,
                round(float(prob_row[2]), 4),
                {
                    "REJECT": round(float(prob_row[0]), 3),
                    "DELAY":  round(float(prob_row[1]), 3),
                    "BUY":    round(float(prob_row[2]), 3),
                },
                contribs,
            ))
        return results

    def get_model_info(self) -> dict:
        """Return model coefficients + metadata for the /ml-status endpoint."""
        if not self.ml_available:
            return {"status": "unavailable"}

        class_names = ["REJECT", "DELAY", "BUY"]
        coefficients = {
            cls: {feat: round(float(coef), 4) for feat, coef in zip(FEATURE_NAMES, self._model.coef_[i])}
            for i, cls in enumerate(class_names)
        }
        return {
            "status":       "loaded",
            "model_type":   type(self._model).__name__,
            "n_features":   int(self._model.n_features_in_),
            "feature_names": FEATURE_NAMES,
            "classes":      class_names,
            "coefficients": coefficients,
        }

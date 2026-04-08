import os
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import joblib
from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn

# Global models cache to avoid reloading on each request
_model = None
_scaler = None

FEATURE_NAMES = [
    "price_to_budget",
    "value",
    "urgency",
    "risk_aversion",
    "trust",
    "comp_quality_adv",
    "comp_price_adv",
    "pv_interaction",
    "risk_trust_penalty"
]

def generate_data(num_samples=5000):
    """Generates synthetic dataset using the validated behavioral model.

    Budgets are now generated relative to market_price (avg of product &
    competitor price) using segment multipliers — matching the runtime
    generator.py behaviour so the ML model's price_to_budget feature
    distribution stays consistent across all price points.

    Segment budget multipliers (weighted population mix):
        early_adopter  (20%) : mul=1.8, std_ratio=0.30
        premium_seeker (15%) : mul=2.5, std_ratio=0.40
        price_hunter   (35%) : mul=0.8, std_ratio=0.20
        skeptic        (30%) : mul=1.3, std_ratio=0.30
    """
    np.random.seed(42)

    # 1. Generate base parameters
    # Sample prices over a wide range so the model generalises across markets
    product_price = np.random.uniform(100, 50000, num_samples)
    comp_price    = np.random.uniform(100, 50000, num_samples)
    market_price  = (product_price + comp_price) / 2

    # Sample a budget multiplier per agent from the segment population mix
    MUL_OPTIONS     = [1.8,  2.5,   0.8,   1.3]
    STD_OPTIONS     = [0.30, 0.40,  0.20,  0.30]
    SEG_WEIGHTS     = [0.20, 0.15,  0.35,  0.30]
    seg_indices     = np.random.choice(len(MUL_OPTIONS), size=num_samples, p=SEG_WEIGHTS)
    mul             = np.array([MUL_OPTIONS[i] for i in seg_indices])
    std_ratio       = np.array([STD_OPTIONS[i] for i in seg_indices])
    budget_mean     = mul      * market_price
    budget_std      = std_ratio * market_price
    agent_budget    = np.maximum(1.0, np.random.normal(budget_mean, budget_std))

    value          = np.random.uniform(0, 1, num_samples)
    urgency        = np.random.uniform(0, 1, num_samples)
    risk_aversion  = np.random.uniform(0, 1, num_samples)
    comp_strength  = np.random.uniform(0.1, 1.0, num_samples)

    trust_levels = [0.10, 0.30, 0.60, 0.85]
    trust = np.random.choice(trust_levels, num_samples)
    
    # 2. Compute features
    price_to_budget = product_price / agent_budget
    comp_price_to_budget = comp_price / agent_budget
    
    comp_quality_adv = np.maximum(0, comp_strength - value)
    comp_price_adv = np.maximum(0, price_to_budget - comp_price_to_budget) * comp_strength
    
    pv_interaction = price_to_budget * (1 - value)
    risk_trust_penalty = risk_aversion * (1 - trust)
    
    # Create DataFrame to preserve feature order
    df = pd.DataFrame({
        "price_to_budget": price_to_budget,
        "value": value,
        "urgency": urgency,
        "risk_aversion": risk_aversion,
        "trust": trust,
        "comp_quality_adv": comp_quality_adv,
        "comp_price_adv": comp_price_adv,
        "pv_interaction": pv_interaction,
        "risk_trust_penalty": risk_trust_penalty
    })
    
    # 3. Label Generation
    z = (3.0 * value
         - 2.5 * price_to_budget
         + 1.5 * urgency
         - 1.0 * risk_trust_penalty
         - 2.0 * (comp_quality_adv + comp_price_adv)
         - 1.5 * pv_interaction
         - 0.10)
    
    # Sigmoid
    prob = 1.0 / (1.0 + np.exp(-z))
    
    # Add Gaussian noise and clip
    prob += np.random.normal(0, 0.05, num_samples)
    prob = np.clip(prob, 0, 1)
    
    # Classify: BUY=2, DELAY=1, REJECT=0
    labels = np.zeros(num_samples, dtype=int)
    labels[prob > 0.72] = 2
    labels[(prob > 0.38) & (prob <= 0.72)] = 1
    
    return df, labels

def train_and_save_model():
    """Trains the Logistic Regression model and saves it with the scaler."""
    print("Generating synthetic data...")
    df, y = generate_data(5000)
    
    X = df[FEATURE_NAMES]
    
    print("Splitting data...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )
    
    print("Scaling features...")
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    print("Training Logistic Regression model...")
    try:
        clf = LogisticRegression(
            multi_class='multinomial', 
            solver='lbfgs', 
            max_iter=1000, 
            C=1.0
        )
    except TypeError:
        # Fallback for scikit-learn >= 1.5
        clf = LogisticRegression(
            solver='lbfgs', 
            max_iter=1000, 
            C=1.0
        )
    clf.fit(X_train_scaled, y_train)
    
    print("Evaluating model...")
    y_pred = clf.predict(X_test_scaled)
    
    print("\n--- Evaluation Metrics ---")
    print(f"Accuracy: {accuracy_score(y_test, y_pred):.4f}")
    
    print("\nClassification Report:")
    target_names = ["REJECT", "DELAY", "BUY"]
    print(classification_report(y_test, y_pred, target_names=target_names))
    
    print("\nConfusion Matrix:")
    print(confusion_matrix(y_test, y_pred))
    
    print("\n--- Feature Coefficients per Class ---")
    for i, class_label in enumerate(target_names):
        print(f"\nClass: {class_label}")
        for feature, coef in zip(FEATURE_NAMES, clf.coef_[i]):
            print(f"  {feature}: {coef:+.4f}")
            
    # Save the artifacts
    joblib.dump(clf, "decision_model.pkl")
    joblib.dump(scaler, "decision_scaler.pkl")
    print("\nSuccessfully saved 'decision_model.pkl' and 'decision_scaler.pkl'.")


_ML_DIR = os.path.dirname(os.path.abspath(__file__))

def get_models():
    """Lazily load models using paths relative to this file — works regardless of cwd."""
    global _model, _scaler
    if _model is None or _scaler is None:
        model_path  = os.path.join(_ML_DIR, "decision_model.pkl")
        scaler_path = os.path.join(_ML_DIR, "decision_scaler.pkl")
        if not os.path.exists(model_path) or not os.path.exists(scaler_path):
            raise RuntimeError(f"Model files not found in {_ML_DIR}. Run train_and_save_model() first.")
        _model  = joblib.load(model_path)
        _scaler = joblib.load(scaler_path)
    return _model, _scaler

def predict_decision(
    product_price: float,
    product_value: float,
    agent_budget: float,
    agent_urgency: float,
    agent_risk_aversion: float,
    comp_price: float,
    comp_strength: float,
    trust: float  # 0.10/0.30/0.60/0.85 based on stage
) -> dict:
    """Predicts user decision using exactly the required signature."""
    clf, scaler = get_models()
    
    # 1. Compute features
    price_to_budget = product_price / agent_budget
    comp_price_to_budget = comp_price / agent_budget
    
    comp_quality_adv = max(0.0, comp_strength - product_value)
    comp_price_adv = max(0.0, price_to_budget - comp_price_to_budget) * comp_strength
    
    pv_interaction = price_to_budget * (1 - product_value)
    risk_trust_penalty = agent_risk_aversion * (1 - trust)
    
    features = pd.DataFrame([{
        "price_to_budget": price_to_budget,
        "value": product_value,
        "urgency": agent_urgency,
        "risk_aversion": agent_risk_aversion,
        "trust": trust,
        "comp_quality_adv": comp_quality_adv,
        "comp_price_adv": comp_price_adv,
        "pv_interaction": pv_interaction,
        "risk_trust_penalty": risk_trust_penalty
    }])
    
    # 2. Scale features
    features_scaled = scaler.transform(features)
    
    # 3. Predict probabilties and class
    probs = clf.predict_proba(features_scaled)[0]
    pred_class_idx = clf.predict(features_scaled)[0]
    
    classes_map = {0: "REJECT", 1: "DELAY", 2: "BUY"}
    decision = classes_map[pred_class_idx]
    
    return {
        "decision": decision,
        "probabilities": {
            "REJECT": float(probs[0]),
            "DELAY": float(probs[1]),
            "BUY": float(probs[2])
        }
    }


# ==========================================
# FastAPI Implementation
# ==========================================

app = FastAPI(title="Ghost Customer: Decision Lab API")

class PredictionRequest(BaseModel):
    product_price: float
    product_value: float
    agent_budget: float
    agent_urgency: float
    agent_risk_aversion: float
    comp_price: float
    comp_strength: float
    product_stage: str

STAGE_TRUST_MAP = {
    "pre_launch": 0.10,
    "just_launched": 0.30,
    "growing": 0.60,
    "established": 0.85
}

@app.post("/predict-decision")
def api_predict_decision(req: PredictionRequest):
    # Map string stage to float trust value (default to 0.30 if unknown)
    trust_val = STAGE_TRUST_MAP.get(req.product_stage, 0.30)
    
    return predict_decision(
        product_price=req.product_price,
        product_value=req.product_value,
        agent_budget=req.agent_budget,
        agent_urgency=req.agent_urgency,
        agent_risk_aversion=req.agent_risk_aversion,
        comp_price=req.comp_price,
        comp_strength=req.comp_strength,
        trust=trust_val
    )

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "train":
        train_and_save_model()
    else:
        print("Usage:")
        print("  python ml_engine.py train  -> to train and save the model")
        print("  uvicorn ml_engine:app --reload -> to run the FastAPI server")
        print("\nFastAPI needs the model to be generated first, running training...")
        train_and_save_model()

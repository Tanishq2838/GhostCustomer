import requests
import json
import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

# Try these models in order
PREFERRED_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
]


class MarketResearcher:
    def __init__(self, serper_api_key: str = None):
        self.api_key    = serper_api_key or os.getenv("SERPER_API_KEY")
        self.search_url = "https://google.serper.dev/search"
        if not self.api_key:
            print("[CRITICAL] SERPER_API_KEY not found in environment!")

    def fetch_competitor_intel(self, product_name: str) -> str:
        payload  = {"q": f"pricing and top brands for {product_name}", "num": 10}
        headers  = {"X-API-KEY": self.api_key}
        response = requests.post(self.search_url, headers=headers, json=payload, timeout=10)
        if response.status_code != 200:
            raise Exception(f"Serper error [{response.status_code}]")
        search_results = response.json()
        snippets = [r.get("snippet", "") for r in search_results.get("organic", [])]
        return " ".join(snippets)


def extract_market_json(raw_text: str, product_name: str) -> dict:
    if not str(raw_text).strip():
        return {"comp_price": 500, "comp_strength": 0.5, "competitors": []}

    system_prompt = f"""
You are a Market Intelligence Bot.
Analyze the following search results for '{product_name}'.

TASK:
1. Identify the top 3 specific competitors (companies or brands) and their individual retail prices in INR.
2. Assess the 'Competitor Strength' for each on a scale of 0.1 to 1.0 (1.0 = Dominant market leader).
3. Calculate the overall 'comp_price' (average price) and 'comp_strength' (average strength) of these top 3.

OUTPUT FORMAT:
Return ONLY a raw JSON object. No markdown, no explanations.
{{
  "competitors": [
    {{"name": "string", "price": number, "strength": number}},
    {{"name": "string", "price": number, "strength": number}},
    {{"name": "string", "price": number, "strength": number}}
  ],
  "comp_price": number,
  "comp_strength": number
}}
"""

    key    = os.getenv("GEMINI_API_KEY")
    client = genai.Client(api_key=key)

    response   = None
    last_error = None

    for model_name in PREFERRED_MODELS:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=f"{system_prompt}\n\nSearch Results: {raw_text}",
            )
            if response and response.text:
                break
        except Exception as e:
            last_error = e
            continue

    if not response or not response.text:
        raise Exception(f"All Gemini models failed. Last error: {last_error}")

    # Strip optional markdown code fences
    text = response.text.strip()
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0]
    elif "```" in text:
        text = text.split("```")[1].split("```")[0]

    try:
        data = json.loads(text.strip())
    except Exception as e:
        return {"comp_price": 500.0, "comp_strength": 0.5, "competitors": [], "error": str(e)}

    def clean_val(v, default: float) -> float:
        if v is None:
            return default
        if isinstance(v, (int, float)):
            return float(v)
        try:
            return float(str(v).replace("₹", "").replace("$", "").replace(",", "").strip())
        except Exception:
            return default

    data["comp_price"]    = clean_val(data.get("comp_price")    or data.get("average_price"),    500.0)
    data["comp_strength"] = clean_val(data.get("comp_strength") or data.get("average_strength"), 0.5)

    for c in data.get("competitors", []):
        c["price"]    = clean_val(c.get("price"),    500.0)
        c["strength"] = clean_val(c.get("strength"), 0.5)

    return data

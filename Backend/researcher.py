import requests
import json
import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

class MarketResearcher:
    def __init__(self, serper_api_key: str = None):
        self.api_key = serper_api_key or os.getenv("SERPER_API_KEY")
        if not self.api_key:
            print("[CRITICAL] SERPER_API_KEY not found in environment!")
        self.search_url = "https://google.serper.dev/search"

    def fetch_competitor_intel(self, product_name: str):
        # 1. Search Google for real pricing/competitors
        payload = {
            "q": f"pricing and top brands for {product_name}",
            "num": 10
        }
        headers = {
            'X-API-KEY': self.api_key,
        }

        response = requests.post(self.search_url, headers=headers, json=payload)
        if response.status_code != 200:
            raise Exception(f"Serper Error [{response.status_code}]")
        search_results = response.json()
        
        # 2. Extract snippets for the LLM
        snippets = [result.get('snippet', '') for result in search_results.get('organic', [])]
        context = " ".join(snippets)
        
        return context

def extract_market_json(raw_text: str, product_name: str):
    if not str(raw_text).strip():
        print("[DEBUG] No search results found, returning defaults.")
        return {"comp_price": 500, "comp_strength": 0.5, "competitors": []}

    # This is the "System Prompt" - the secret sauce
    system_prompt = f"""
    You are a Market Intelligence Bot. 
    Analyze the following search results for '{product_name}'.
    
    TASK:
    1. Identify the top 3 specific competitors (companies or brands) and their individual retail prices in INR.
    2. Assess the 'Competitor Strength' for each on a scale of 0.1 to 1.0 (1.0 = Dominant market leader).
    3. Calculate the overall 'average_price' and 'average_strength' of these top 3.
    
    OUTPUT FORMAT:
    Return ONLY a raw JSON object. Do not include markdown, text, or explanations.
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

    # Use os.getenv to fetch the Gemini API key securely
    key = os.getenv("GEMINI_API_KEY")
    genai.configure(api_key=key)
    
    # Automatically discover the best available model for this key
    try:
        available_models = [m.name for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
        print(f"[GEMINI] Key has access to: {available_models}")
    except Exception as e:
        print(f"[GEMINI] Could not list models: {e}")
        available_models = ['models/gemini-1.5-flash', 'models/gemini-pro']

    response = None
    last_error = None

    for m_name in available_models:
        try:
            model = genai.GenerativeModel(model_name=m_name)
            response = model.generate_content(
                f"{system_prompt}\n\nSearch Results: {raw_text}"
            )
            if response and response.text:
                break
        except Exception:
            continue

    if not response or not response.text:
        raise Exception("Failed to generate with any discovered model.")
    
    try:
        raw_text_clean = response.text
        if "```json" in raw_text_clean:
            raw_text_clean = raw_text_clean.split("```json")[1].split("```")[0]
        elif "```" in raw_text_clean:
            raw_text_clean = raw_text_clean.split("```")[1].split("```")[0]
            
        data = json.loads(raw_text_clean.strip())
    except Exception as e:
        return {
            "comp_price": 500.0,
            "comp_strength": 0.5,
            "competitors": [],
            "error": str(e)
        }
    
    # Sanitize Prices & Strengths (sometimes Gemini returns strings with symbols)
    def clean_val(v, default):
        if v is None: return default
        if isinstance(v, (int, float)): return float(v)
        try:
            # Remove currency symbols and commas
            clean = str(v).replace("₹", "").replace("$", "").replace(",", "").strip()
            return float(clean)
        except:
            return default

    # Clean the top-level averages
    data["comp_price"] = clean_val(data.get("comp_price") or data.get("average_price"), 500.0)
    data["comp_strength"] = clean_val(data.get("comp_strength") or data.get("average_strength"), 0.5)

    # Clean the competitors list
    if "competitors" in data:
        for c in data["competitors"]:
            c["price"] = clean_val(c.get("price"), 500.0)
            c["strength"] = clean_val(c.get("strength"), 0.5)
            
    return data

# Note: You'll need a free API key from serper.dev
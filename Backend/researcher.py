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


class AgentResearcher:
    MAX_SEARCHES = 4
    MAX_ITERATIONS = 8

    def __init__(self):
        self.serper_key = os.getenv("SERPER_API_KEY")
        self.search_url = "https://google.serper.dev/search"
        self.client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        self.trace: list[dict] = []

    def _log(self, type_: str, message: str):
        self.trace.append({"type": type_, "message": message})

    def _search(self, query: str) -> str:
        self._log("SEARCH", f'Searching: "{query}"')
        try:
            r = requests.post(
                self.search_url,
                headers={"X-API-KEY": self.serper_key},
                json={"q": query, "num": 8},
                timeout=10,
            )
            organic = r.json().get("organic", [])
            snippets = [f"[{i+1}] {res.get('title','')}: {res.get('snippet','')}"
                        for i, res in enumerate(organic[:6])]
            result = "\n".join(snippets) or "No results."
            self._log("RESULTS", f"Retrieved {len(organic)} results")
            return result
        except Exception as e:
            self._log("ERROR", f"Search failed: {e}")
            return f"Search failed: {e}"

    def _parse_action(self, text: str) -> tuple[str, str]:
        """Parse ACTION line from ReAct response. Returns (action_type, value)."""
        for line in text.split('\n'):
            s = line.strip()
            if s.startswith("ACTION:"):
                content = s[7:].strip()
                if content.upper().startswith("SEARCH:"):
                    return "SEARCH", content[7:].strip().strip('"\'')
                if content.upper().startswith("DONE:"):
                    # collect everything after DONE: including subsequent lines
                    idx = text.find("DONE:")
                    return "DONE", text[idx + 5:].strip()
        # fallback: if response contains a JSON block, treat as DONE
        if "{" in text and '"competitors"' in text:
            idx = text.find("{")
            return "DONE", text[idx:]
        return "UNKNOWN", ""

    def _extract_thought(self, text: str) -> str:
        for line in text.split('\n'):
            s = line.strip()
            if s.startswith("THOUGHT:"):
                return s[8:].strip()
        return ""

    def _clean_float(self, v, default: float) -> float:
        if v is None:
            return default
        try:
            return float(str(v).replace("₹","").replace("$","").replace(",","").strip())
        except:
            return default

    def _parse_final_json(self, raw: str) -> dict:
        text = raw.strip()
        # strip markdown fences
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]
        # find JSON object
        start = text.find("{")
        end   = text.rfind("}") + 1
        if start >= 0 and end > start:
            text = text[start:end]
        try:
            data = json.loads(text.strip())
        except:
            return {}
        data["comp_price"]    = self._clean_float(data.get("comp_price"),    500.0)
        data["comp_strength"] = self._clean_float(data.get("comp_strength"), 0.5)
        for c in data.get("competitors", []):
            c["price"]    = self._clean_float(c.get("price"),    500.0)
            c["strength"] = self._clean_float(c.get("strength"), 0.5)
        return data

    def _forced_synthesis(self, product_name: str, conversation: list) -> dict:
        """Final fallback: ask Gemini to synthesise whatever was gathered."""
        self._log("FALLBACK", "Forcing final synthesis from gathered data")
        prompt = (
            f'Based on your research for "{product_name}", output ONLY a JSON object:\n'
            '{"competitors":[{"name":"...","price":number,"strength":0.0-1.0,"market_position":"..."}],'
            '"comp_price":number,"comp_strength":number,"market_summary":"...","pricing_insight":"..."}'
        )
        try:
            for model in ["gemini-2.0-flash", "gemini-1.5-flash"]:
                try:
                    r = self.client.models.generate_content(
                        model=model,
                        contents=conversation + [{"role":"user","parts":[{"text":prompt}]}],
                    )
                    data = self._parse_final_json(r.text)
                    if data:
                        return data
                except:
                    continue
        except:
            pass
        return {"comp_price": 500.0, "comp_strength": 0.5, "competitors": [],
                "market_summary": "", "pricing_insight": ""}

    def run(self, product_name: str) -> dict:
        self.trace = []
        self._log("INIT",   f"Agent initialised for: {product_name}")
        self._log("PLAN",   "Building multi-step research strategy")

        SYSTEM = f"""You are a Market Intelligence Agent. Research competitive pricing for "{product_name}" in the Indian market.

Use SEARCH actions to gather data. After 2-4 searches call DONE.

ALWAYS respond in this EXACT format:
THOUGHT: <your reasoning>
ACTION: SEARCH: <specific search query>

When ready to finalise:
THOUGHT: <synthesis reasoning>
ACTION: DONE: <JSON>

Required JSON:
{{
  "competitors": [
    {{"name":"Brand","price":499,"strength":0.7,"market_position":"brief note"}},
    {{"name":"Brand","price":999,"strength":0.85,"market_position":"brief note"}},
    {{"name":"Brand","price":699,"strength":0.6,"market_position":"brief note"}}
  ],
  "comp_price": 732,
  "comp_strength": 0.72,
  "market_summary": "2-3 sentence overview of the market landscape.",
  "pricing_insight": "Key pricing recommendation for a new entrant."
}}

Rules: max {self.MAX_SEARCHES} searches · prices in INR (numbers only) · strength 0.1-1.0"""

        conversation = [{"role":"user","parts":[{"text": SYSTEM + "\n\nBegin research now."}]}]
        search_count = 0

        for iteration in range(self.MAX_ITERATIONS):
            try:
                model = "gemini-2.0-flash" if iteration < 6 else "gemini-1.5-flash"
                resp  = self.client.models.generate_content(model=model, contents=conversation)
                text  = resp.text.strip()
            except Exception as e:
                self._log("ERROR", f"LLM call failed: {e}")
                break

            thought = self._extract_thought(text)
            if thought:
                self._log("THINK", thought)

            action_type, action_value = self._parse_action(text)
            conversation.append({"role":"model","parts":[{"text":text}]})

            if action_type == "SEARCH":
                if search_count >= self.MAX_SEARCHES:
                    self._log("LIMIT", f"Search limit ({self.MAX_SEARCHES}) reached — finalising")
                    conversation.append({"role":"user","parts":[{"text":
                        "Search limit reached. You MUST call DONE now with your findings."}]})
                    continue
                search_count += 1
                results = self._search(action_value)
                feedback = (
                    f'Search results for "{action_value}":\n\n{results}\n\n'
                    f'Searches used: {search_count}/{self.MAX_SEARCHES}. '
                    + ("Call DONE now." if search_count >= self.MAX_SEARCHES
                       else "Continue or call DONE if you have enough data.")
                )
                conversation.append({"role":"user","parts":[{"text":feedback}]})

            elif action_type == "DONE":
                self._log("SYNTHESIZE", "Synthesising all gathered intelligence")
                data = self._parse_final_json(action_value)
                if not data:
                    data = self._forced_synthesis(product_name, conversation)
                n   = len(data.get("competitors", []))
                avg = data.get("comp_price", 0)
                self._log("COMPLETE", f"{n} competitors identified · avg price ₹{avg:.0f}")
                data["trace"] = self.trace
                return data

            else:
                self._log("WARN", "Unexpected format — prompting agent to retry")
                conversation.append({"role":"user","parts":[{"text":
                    "Follow the format exactly: THOUGHT: ... then ACTION: SEARCH: ... or ACTION: DONE: ..."}]})

        # Loop exhausted without DONE
        data = self._forced_synthesis(product_name, conversation)
        data["trace"] = self.trace
        return data

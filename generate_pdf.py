from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER

OUTPUT = "GhostCustomer_Technical_Details.pdf"

doc = SimpleDocTemplate(
    OUTPUT,
    pagesize=A4,
    leftMargin=2*cm, rightMargin=2*cm,
    topMargin=2*cm, bottomMargin=2*cm,
)

W = A4[0] - 4*cm  # usable width

# ── Colour palette ─────────────────────────────────────────────────────────────
DARK_GREY  = colors.HexColor("#333333")
MID_GREY   = colors.HexColor("#555555")
BORDER     = colors.HexColor("#cccccc")
ACCENT     = colors.HexColor("#1a1a2e")
HEAD_BG    = colors.HexColor("#1a1a2e")
HEAD_FG    = colors.white
ALT_ROW    = colors.HexColor("#f9f9f9")

# ── Styles ─────────────────────────────────────────────────────────────────────
base = getSampleStyleSheet()

Title = ParagraphStyle("GCTitle", parent=base["Normal"],
    fontSize=22, leading=28, textColor=ACCENT,
    fontName="Helvetica-Bold", alignment=TA_CENTER, spaceAfter=4)

Subtitle = ParagraphStyle("GCSubtitle", parent=base["Normal"],
    fontSize=11, leading=16, textColor=MID_GREY,
    fontName="Helvetica", alignment=TA_CENTER, spaceAfter=20)

H1 = ParagraphStyle("GCH1", parent=base["Normal"],
    fontSize=12, leading=17, textColor=colors.white,
    fontName="Helvetica-Bold", spaceBefore=18, spaceAfter=8,
    backColor=ACCENT, leftIndent=-0.3*cm, rightIndent=-0.3*cm,
    borderPad=5)

H2 = ParagraphStyle("GCH2", parent=base["Normal"],
    fontSize=10.5, leading=14, textColor=ACCENT,
    fontName="Helvetica-Bold", spaceBefore=10, spaceAfter=4)

Body = ParagraphStyle("GCBody", parent=base["Normal"],
    fontSize=9.5, leading=14, textColor=DARK_GREY,
    fontName="Helvetica", spaceAfter=5)

Bullet = ParagraphStyle("GCBullet", parent=base["Normal"],
    fontSize=9.5, leading=14, textColor=DARK_GREY,
    fontName="Helvetica", spaceAfter=3,
    leftIndent=14, firstLineIndent=-10)

Code = ParagraphStyle("GCCode", parent=base["Normal"],
    fontSize=8.5, leading=13, textColor=colors.HexColor("#222222"),
    fontName="Courier", spaceAfter=3,
    backColor=colors.HexColor("#f0f0f0"),
    leftIndent=10, borderPad=4)

def tbl_style():
    return TableStyle([
        ("FONTNAME",        (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE",        (0, 0), (-1, -1), 8.5),
        ("LEADING",         (0, 0), (-1, -1), 12),
        ("TEXTCOLOR",       (0, 0), (-1, -1), DARK_GREY),
        ("ALIGN",           (0, 0), (-1, -1), "LEFT"),
        ("VALIGN",          (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",      (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING",   (0, 0), (-1, -1), 5),
        ("LEFTPADDING",     (0, 0), (-1, -1), 8),
        ("RIGHTPADDING",    (0, 0), (-1, -1), 8),
        ("GRID",            (0, 0), (-1, -1), 0.4, BORDER),
        ("ROWBACKGROUNDS",  (0, 1), (-1, -1), [colors.white, ALT_ROW]),
        ("BACKGROUND",      (0, 0), (-1,  0), HEAD_BG),
        ("TEXTCOLOR",       (0, 0), (-1,  0), HEAD_FG),
        ("FONTNAME",        (0, 0), (-1,  0), "Helvetica-Bold"),
    ])

def make_table(data, col_widths=None):
    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(tbl_style())
    return t

def h1(text):      return Paragraph(f"&nbsp;&nbsp;{text}", H1)
def h2(text):      return Paragraph(text, H2)
def body(text):    return Paragraph(text, Body)
def bullet(text):  return Paragraph(f"• &nbsp;{text}", Bullet)
def code(text):    return Paragraph(text, Code)
def sp(h=6):       return Spacer(1, h)
def rule():        return HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceAfter=4)

# ══════════════════════════════════════════════════════════════════════════════
story = []

# Cover
story += [
    sp(20),
    Paragraph("Ghost Customer", Title),
    Paragraph("Decision Lab — Complete Technical Brief", Subtitle),
    rule(),
    body("A full-stack pricing simulation and market intelligence platform. Set your product price and quality, simulate a synthetic crowd of AI agents representing real customer segments, and receive actionable predictions on buy/delay/reject outcomes with optimal pricing recommendations."),
    sp(6),
    body("<b>Core question answered:</b> <i>If I price my product at ₹X, how many customers will actually buy — and why?</i>"),
    sp(20),
]

# 1. Problem Statement
story += [
    h1("1.  Problem Statement"),
    body("Founders and product teams price blindly — they guess, copy competitors, or run expensive surveys. Ghost Customer simulates the market before launch using agent-based modelling, Monte Carlo statistics, and live competitor intelligence fetched from the web."),
]

# 2. Tech Stack
story += [
    h1("2.  Tech Stack"),
    make_table([
        ["Layer",           "Technology"],
        ["Frontend",        "React 18 + TypeScript + Vite"],
        ["UI Components",   "shadcn/ui (60+ components) + Tailwind CSS"],
        ["Charts",          "Recharts"],
        ["Canvas / Viz",    "HTML5 Canvas API — custom particle physics engine"],
        ["Backend",         "Python + FastAPI"],
        ["ML",              "scikit-learn — Logistic Regression"],
        ["LLM",             "Google Gemini API (2.5-flash → 2.0-flash → 2.0-flash-lite → 1.5-flash cascade)"],
        ["Web Search",      "Serper.dev (Google Search API)"],
        ["Data Processing", "NumPy + Pandas"],
        ["HTTP Client",     "Axios"],
    ], col_widths=[4.5*cm, W - 4.5*cm]),
]

# 3. Architecture
story += [
    h1("3.  Architecture & Data Flow"),
    make_table([
        ["Step", "Action",                              "Component"],
        ["1",    "User adjusts product sliders",        "ControlPanel.tsx"],
        ["2",    "Fetch Market Data clicked",           "POST /fetch-market-data"],
        ["3",    "Serper.dev searches Google",          "researcher.py"],
        ["4",    "Gemini parses results → comp JSON",   "AgentResearcher (ReAct loop)"],
        ["5",    "Run Simulation clicked",              "POST /simulate-market"],
        ["6",    "Synthetic crowd generated",           "generator.py"],
        ["7",    "Each agent scored → BUY/DELAY/REJECT","engine.py / ML engine"],
        ["8",    "50× Monte Carlo → confidence interval","run_monte_carlo()"],
        ["9",    "Results rendered across all panels",  "Index.tsx → child components"],
    ], col_widths=[1*cm, 7*cm, W - 8*cm]),
]

# 4. Behavioral Segments
story += [
    h1("4.  Behavioral Segments"),
    body("Every synthetic agent belongs to one of four segments sampled by weighted random selection. Attributes are drawn from Gaussian distributions. Budgets scale with market price (average of product + competitor price)."),
    sp(4),
    make_table([
        ["Segment",        "Population", "Budget (× market price)", "Urgency",      "Risk Aversion"],
        ["Early Adopter",  "20%",        "1.8× (std 0.30×)",        "High — 0.80",  "Low — 0.30"],
        ["Premium Seeker", "15%",        "2.5× (std 0.40×)",        "Medium — 0.50","Very Low — 0.20"],
        ["Price Hunter",   "35%",        "0.8× (std 0.20×)",        "Low — 0.40",   "High — 0.70"],
        ["Skeptic",        "30%",        "1.3× (std 0.30×)",        "Low — 0.25",   "Very High — 0.80"],
    ], col_widths=[3.2*cm, 2.2*cm, 3.8*cm, 2.8*cm, W - 12*cm]),
]

# 5. Decision Model
story += [
    h1("5.  The Decision Model"),
    body("Each agent runs a logistic sigmoid on a z-score built from seven weighted factors:"),
    sp(4),
    code("z  =  3.0 × Value  −  2.5 × (Price/Budget)  +  1.5 × Urgency"),
    code("   −  1.0 × Risk × (1−Trust)  −  2.0 × CompetitorPull"),
    code("   −  1.5 × (Price/Budget) × (1−Value)  −  0.10"),
    code("P(buy) = sigmoid(z) = 1 / (1 + e^−z)"),
    sp(6),
    make_table([
        ["Factor",                 "Weight", "Formula",                      "Effect"],
        ["Perceived Value",        "α = 3.0","3.0 × value",                 "Strongest BUY driver"],
        ["Price Stress",           "β = 2.5","−2.5 × (price / budget)",     "Strongest REJECT driver"],
        ["Urgency Lift",           "γ = 1.5","1.5 × urgency",               "Pushes toward BUY"],
        ["Risk × Trust Drag",      "δ = 1.0","−1.0 × risk × (1 − trust)",  "Modulated by product stage"],
        ["Competitor Pull",        "μ = 2.0","−2.0 × competitor advantage", "Pulls away from product"],
        ["Price × Value Mismatch", "η = 1.5","−1.5 × P/B × (1 − value)",   "Penalty: expensive + low value"],
        ["Market Friction",        "—",      "−0.10 (fixed)",               "Baseline resistance"],
    ], col_widths=[4.2*cm, 2*cm, 4.8*cm, W - 11*cm]),
    sp(8),
    h2("Decision Thresholds"),
    make_table([
        ["Outcome", "Condition",         "Meaning"],
        ["BUY",     "P > 0.72",          "Strong product-market fit for this agent"],
        ["DELAY",   "0.38 < P ≤ 0.72",  "Interested but not committed — urgency gap"],
        ["REJECT",  "P ≤ 0.38",          "Price, value, or competition mismatch"],
    ], col_widths=[2.5*cm, 3.5*cm, W - 6*cm]),
    sp(6),
    body("<b>Hard budget gate:</b> If both product price AND competitor price exceed the agent's budget, the outcome is forced to REJECT regardless of the probability score — no credit buying is assumed."),
]

# 6. Stage & Trust
story += [
    h1("6.  Product Stage & Trust"),
    body("Trust modulates the risk aversion penalty. A more established product makes risk-averse customers less hesitant."),
    sp(4),
    make_table([
        ["Stage",         "Trust Value", "Interpretation"],
        ["Pre-Launch",    "0.10",        "Unknown product — risk aversion hits hardest"],
        ["Just Launched", "0.30",        "Minimal track record"],
        ["Growing",       "0.60",        "Gaining social proof"],
        ["Established",   "0.85",        "Trusted brand — risk aversion nearly neutralised"],
    ], col_widths=[3.5*cm, 2.5*cm, W - 6*cm]),
]

# 7. Monte Carlo
story += [
    h1("7.  Monte Carlo Simulation"),
    body("The same crowd is re-run 50 times. Each iteration injects ±5% Gaussian noise into every agent's urgency. This produces a distribution of conversion rates from which a mean and 95% confidence interval are extracted."),
    sp(4),
    code("noise ~ N(0, 0.05)   for each of 50 iterations"),
    code("urgency_noisy = clip(urgency + noise, 0.01, 1.0)"),
    code("CI = mean_conv  ±  1.96 × (std / √50)"),
    sp(4),
    body("A wide CI signals fragile conversion — sensitive to market variability. A tight CI means the result is robust."),
]

# 8. ML Engine
story += [
    h1("8.  ML Engine — Logistic Regression"),
    make_table([
        ["Property",          "Detail"],
        ["Model type",        "Multinomial Logistic Regression"],
        ["Solver",            "lbfgs,  max_iter=1000,  C=1.0"],
        ["Training set",      "5,000 synthetic agents  (random seed = 42)"],
        ["Classes",           "REJECT (0)  ·  DELAY (1)  ·  BUY (2)"],
        ["9 Features",        "price_to_budget, value, urgency, risk_aversion, trust, comp_quality_adv, comp_price_adv, pv_interaction, risk_trust_penalty"],
        ["Preprocessing",     "StandardScaler — zero mean, unit variance"],
        ["Batch inference",   "Entire crowd vectorised in one sklearn call — no per-agent loop"],
        ["Explainability",    "Per-agent contribution = scaled_feature × BUY_coefficient (SHAP-style)"],
        ["Fallback",          "Silently reverts to rule-based engine if model files are missing"],
    ], col_widths=[3.8*cm, W - 3.8*cm]),
]

# 9. Market Research Agent
story += [
    h1("9.  Market Research Agent (ReAct Pattern)"),
    make_table([
        ["Step",        "Action"],
        ["1 — Plan",    "Gemini LLM builds a search strategy for the product + country"],
        ["2 — Search",  "Issues up to 4 Serper.dev (Google Search) queries"],
        ["3 — Observe", "Raw search snippets fed back to Gemini as context"],
        ["4 — Reason",  "LLM reasons about pricing signals in the results"],
        ["5 — Output",  "Structured JSON: competitor names, prices, strength scores (0–1)"],
        ["6 — Fallback","Cascade: gemini-2.5-flash → 2.0-flash → 2.0-flash-lite → 1.5-flash"],
    ], col_widths=[3*cm, W - 3*cm]),
    sp(6),
    body("Supported countries: India (INR), USA (USD), Germany (EUR), China (CNY), Japan (JPY), UK (GBP). Each country receives a custom system prompt with local platform context — e.g. Amazon.in + Flipkart for India."),
]

# 10. Price Analysis
story += [
    h1("10. Price Analysis Tools"),
    make_table([
        ["Tool",             "Endpoint",               "Price Range",                         "Points","MC Iter.","Output"],
        ["Elasticity",       "/calculate-elasticity",  "30% – 250% of your current price",    "15",   "10",      "Demand curve + revenue peak"],
        ["Price Optimizer",  "/optimize-price",        "40% of min(yours,comp) → 250% of max","30",   "10",      "Max revenue & max profit prices"],
    ], col_widths=[3*cm, 4.2*cm, 5.3*cm, 1.5*cm, 1.5*cm, W - 15.5*cm]),
    sp(8),
    h2("Projected Revenue Formulas"),
    make_table([
        ["Method",       "Formula",                                     "Note"],
        ["Direct",       "conv_rate × TAM × product_price",             "Single simulation run"],
        ["Monte Carlo",  "(mean_conv / 100) × TAM × product_price",     "50-run average — more reliable"],
        ["Profit",       "revenue × 0.40  (hardcoded gross margin)",    "Price optimizer only"],
    ], col_widths=[3*cm, 7.5*cm, W - 10.5*cm]),
    sp(6),
    body("Projected revenue is only calculated when a Total Addressable Market (TAM) value is provided in the request. Profit curve peaks at the same price as revenue because profit is a flat 40% multiplier — same optimal price point."),
]

# 11. Frontend Components
story += [
    h1("11. Frontend Components"),
    make_table([
        ["Component",                  "Role"],
        ["ControlPanel.tsx",           "All sliders + Fetch Market Data / Run Simulation buttons"],
        ["MarketTopology.tsx",         "Canvas particle physics — agents animate to BUY / DELAY / REJECT zones"],
        ["DecisionExplainer.tsx",      "Bar chart — average feature contributions for buyers vs rejecters"],
        ["MLInsightsPanel.tsx",        "Logistic Regression coefficients — global feature importance (BUY class)"],
        ["ResearchTrace.tsx",          "Terminal-style live log of every step the Gemini research agent takes"],
        ["BudgetDistributionChart.tsx","Histogram of agent budget distribution across the four segments"],
        ["SegmentWeightChart.tsx",     "Visual breakdown of segment population mix"],
        ["InsightEngine.tsx",          "AI-generated strategic verdict with pricing recommendation"],
    ], col_widths=[5.5*cm, W - 5.5*cm]),
]

# 12. Canvas Engine
story += [
    h1("12. Live Market Topology — Canvas Physics"),
    make_table([
        ["Parameter", "Value",        "Effect"],
        ["EASE",      "0.02",         "Spring strength toward target — smooth, not snappy"],
        ["DAMPING",   "0.96",         "Velocity decay — prevents oscillation"],
        ["MAX_VEL",   "2.5 px/frame", "Speed cap — prevents agents teleporting"],
        ["FLOAT_AMP", "22 px",        "Idle oscillation amplitude — organic, alive feel"],
        ["SPREAD",    "60 px",        "Zone spread via cos(budget) — each agent gets a unique slot"],
    ], col_widths=[3*cm, 3.5*cm, W - 6.5*cm]),
    sp(6),
    bullet("Before simulation: agents shown as dim rule-engine predictions, update live as sliders move"),
    bullet("After simulation: full brightness, locked to actual backend results"),
    bullet("Zone positions: Reject (left 20%), Hesitation (centre 50%), Buy (right 80%)"),
    bullet("Hover tooltip: budget, urgency, risk aversion, win probability per agent"),
    bullet("Scanner beam plays during market data fetch"),
]

# 13. API Reference
story += [
    h1("13. API Reference"),
    make_table([
        ["Method", "Endpoint",              "Purpose"],
        ["POST",   "/simulate-market",       "Core simulation — full agent log + KPIs + Monte Carlo + drivers"],
        ["POST",   "/fetch-market-data",     "Agentic competitor research via Gemini + Serper"],
        ["POST",   "/calculate-elasticity",  "15-point price sweep → demand curve + revenue peak"],
        ["POST",   "/optimize-price",        "30-point sweep → revenue + profit optimum"],
        ["GET",    "/ml-status",             "Logistic Regression coefficients + model metadata"],
    ], col_widths=[1.5*cm, 4.5*cm, W - 6*cm]),
]

# 14. Key Numbers
story += [
    h1("14. Key Numbers at a Glance"),
    make_table([
        ["Metric",                               "Value"],
        ["Default agent crowd size",             "50 agents (configurable per request)"],
        ["Monte Carlo iterations — main sim",    "50"],
        ["Monte Carlo iterations — sweeps",      "10 per price point"],
        ["ML training samples",                  "5,000 synthetic agents"],
        ["ML features",                          "9"],
        ["Elasticity price sweep points",        "15"],
        ["Optimizer price sweep points",         "30"],
        ["Gemini model cascade depth",           "4 models"],
        ["Max Serper searches per run",          "4 queries"],
        ["Gross margin assumption (optimizer)",  "40% (hardcoded)"],
        ["BUY threshold",                        "P > 0.72"],
        ["REJECT threshold",                     "P ≤ 0.38"],
        ["Supported countries",                  "India, USA, Germany, China, Japan, UK"],
        ["Frontend dev port",                    "8080"],
        ["Backend dev port",                     "8000"],
    ], col_widths=[8*cm, W - 8*cm]),
]

# 15. Design Constraints
story += [
    h1("15. Key Design Constraints"),
    bullet("No database — all simulation results are ephemeral (in-memory only)"),
    bullet("No authentication — all endpoints are public (internal tool design)"),
    bullet("CORS open (*) — designed for local or trusted-network use"),
    bullet("Dual engine — ML for per-agent explainability; rule-based for Monte Carlo speed"),
    bullet("Budgets scale with market price — valid at any price point from ₹100 to ₹100,000"),
    bullet("Competitor data feeds directly into the decision z-score — not decorative"),
    bullet("Profit curve peaks at the same price as revenue (flat 40% multiplier — same optimal)"),
    bullet("No LTV, churn, or margin modelling — revenue = conversion × TAM × price only"),
]

doc.build(story)
print(f"PDF saved: {OUTPUT}")

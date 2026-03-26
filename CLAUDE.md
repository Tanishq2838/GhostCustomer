# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Ghost Customer: Decision Lab** — a full-stack pricing simulation platform. Users tune product/competitor parameters, and the system runs agent-based Monte Carlo simulations to predict customer buy/delay/reject behavior and recommend optimal pricing. Competitor intelligence is fetched via Serper.dev (Google Search) and parsed by the Gemini LLM.

## Commands

### Frontend (`Frontend/`)

```bash
npm run dev          # Dev server on port 8080
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Run Vitest once
npm run test:watch   # Watch mode
```

### Backend (`Backend/`)

```bash
# Activate venv first
source venv/Scripts/activate   # Windows Git Bash
# or
venv\Scripts\activate.bat      # Windows CMD

uvicorn main:app --reload      # Dev server on port 8000
```

Backend requires `SERPER_API_KEY` and `GEMINI_API_KEY` in `Backend/.env`.

## Architecture

### Data Flow

1. User adjusts sliders in `ControlPanel.tsx`
2. "Fetch Market Data" → `POST /fetch-market-data` → `researcher.py` (Serper search → Gemini parse → competitor prices/strength)
3. "Run Simulation" → `POST /simulate-market` → `engine.py` (logistic regression decision model × N agents × 50 Monte Carlo iterations)
4. Results rendered across KPI cards, charts, and the canvas particle view

### Backend (`Backend/`)

| File | Role |
|------|------|
| `main.py` | FastAPI app; 4 routes: `/simulate-market`, `/fetch-market-data`, `/calculate-elasticity`, `/optimize-price` |
| `engine.py` | `GhostEngine` — core decision model; logistic function on weighted score of value, price stress, urgency, risk |
| `generator.py` | Generates synthetic agent crowd (budget, urgency, risk_tolerance) |
| `researcher.py` | `MarketResearcher` — Serper search + Gemini LLM → structured competitor JSON |

**Decision thresholds** (engine.py): P > 0.72 = BUY, 0.38–0.72 = DELAY, < 0.38 = REJECT.
**Monte Carlo**: 50 iterations with noise; `/simulate-market` returns confidence intervals.
**Elasticity sweep**: 15 price points; **Optimize sweep**: 20 price points.

### Frontend (`Frontend/src/`)

| Path | Role |
|------|------|
| `pages/Index.tsx` | Root page — holds all simulation state via `useState`; orchestrates API calls |
| `components/dashboard/ControlPanel.tsx` | Sliders + "Fetch Market Data" / "Run Simulation" buttons |
| `components/dashboard/MarketTopology.tsx` | Canvas particle physics engine visualizing agents in real time |
| `components/dashboard/InsightEngine.tsx` | Renders Gemini-generated strategic verdict |
| `components/dashboard/ResearchTrace.tsx` | Terminal-style log of competitor research steps |
| `types/simulation.ts` | All TypeScript interfaces for API request/response shapes |
| `components/ui/` | 60+ pre-built shadcn/ui components — do not edit directly |

**API base URL** is hardcoded as `http://localhost:8000` in `Index.tsx` — change this for non-local deployments.

### Key Design Constraints

- No database — all simulation results are ephemeral (in-memory only)
- No authentication — all endpoints are public
- CORS is open (`"*"`) in `main.py`
- Frontend uses `@` as an alias for `./src` (configured in `vite.config.ts`)

# Samsung Guided Troubleshooting Engine

> **Samsung PRISM Gen AI Hackathon 3.0 — Theme 2: Guided Troubleshooting**

A production-quality, full-stack AI application that transforms raw Samsung SIIS knowledge articles into interactive, step-by-step diagnostic workflows enriched with official Samsung device settings deeplinks.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│               React + TypeScript Frontend  (port 5173)          │
│  Navigation │ HomeScreen │ TroubleshootForm │ ResultsDisplay    │
│  History    │ HowItWorks │ Settings          │ Toast System     │
└──────────────────────────┬──────────────────────────────────────┘
                           │  POST /api/troubleshoot
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│           Fastify Node.js Application Backend  (port 3000)      │
│  Schema Validation → Request Proxy → Error Handling             │
└──────────────────────────┬──────────────────────────────────────┘
                           │  POST /internal/troubleshoot
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              Python FastAPI AI Gateway  (port 8001)             │
│                                                                 │
│  ┌──────────────────────┐    ┌──────────────────────────────┐  │
│  │  Semantic Query Cache │    │  Gemini 3.6 Flash API        │  │
│  │  (256-entry LRU)      │    │  (Grounded JSON generation)  │  │
│  │  Jaccard similarity   │    │  → Deterministic fallback    │  │
│  └──────────────────────┘    └──────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  TF-IDF Deeplink Retriever  (578 official entries)       │  │
│  │  threshold=0.22 → 88.4% step match rate                  │  │
│  │  100% catalog membership verification                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Features

| Feature | Details |
|---|---|
| **Grounded Generation** | Gemini extracts diagnostic steps strictly from SIIS text — zero hallucination |
| **578 Official Deeplinks** | TF-IDF cosine similarity matching against Samsung's full official catalog |
| **100% Catalog Verified** | Every returned deeplink is verified to exist in the official catalog |
| **Semantic Cache** | In-memory LRU cache with exact + Jaccard paraphrase matching (threshold 0.50) |
| **Two UI Modes** | Overview Mode (all actions) + Interactive Step Mode with progress tracking |
| **20 Benchmark Cases** | Complete evaluation against all 20 official SIIS benchmark cases |
| **History & Sessions** | LocalStorage-persisted troubleshooting history with restore functionality |
| **Deterministic Fallback** | Structured SIIS parser ensures response even without Gemini API access |
| **Theme Support** | Dark / Light / System theme with full CSS variable system |
| **19 Automated Tests** | 100% test pass rate across unit, integration, and quality audit suites |

---

## Official Data Kit (Immutable)

Stored under `data/` as read-only reference inputs from Samsung PRISM:

| File | Description |
|---|---|
| `data/schema.py` | Official Pydantic schema: `ContextDeeplinkResponse`, `Goal`, `Action`, `StepGroup` |
| `data/deeplinks.json` | 578 official Samsung device settings & validation deeplinks |
| `data/siis_responses.json` | 20 official benchmark SIIS test cases |
| `data/sample_output.json` | Official reference response payload |
| `data/input.txt` | 20 raw device complaint queries |

---

## API Contracts

### Node Backend (port 3000)

```
GET  /api/health          → {"status":"ok","service":"node-backend"}
POST /api/troubleshoot    → ContextDeeplinkResponse
```

**Request body:**
```json
{
  "query": "My Samsung A115G tablet screen flashes and goes blank whenever I open Gmail.",
  "siis_response": {
    "title": "Email server not responding on Samsung phone or tablet",
    "content": "# Troubleshooting Email Connection Issues...\n## Step 1: ..."
  }
}
```

**Response:** Official `ContextDeeplinkResponse` with `contexts: [Goal]`, where each `Goal` contains `actions`, `stepGroups`, actionable deeplinks, and a bounded TF-IDF relevance `score`.

### Python AI Gateway (port 8001)

```
GET  /health                      → {"status":"ok","service":"ai-gateway"}
POST /internal/troubleshoot       → ContextDeeplinkResponse (strict contract)
POST /v1/troubleshoot             → ContextDeeplinkResponse (alias)
```

---

## Benchmark Results (20-Case Official Evaluation)

| Metric | Result |
|---|---|
| **Schema Pass Rate** | **100%** (20/20 valid `ContextDeeplinkResponse`) |
| **Official Catalog Membership** | **100%** (all returned deeplinks verified in catalog) |
| **Total Actions Generated** | 124 across 20 cases |
| **Total Steps Generated** | 357 across 20 cases |
| **Total Actionable Deeplinks** | 146 matched deeplinks |
| **Cache Exact Hit Speedup** | **Instant** (0.0ms vs ~850ms miss) |
| **Cache Paraphrase Hit** | ✅ (Jaccard similarity: 0.7895) |
| **Avg Local Pipeline Latency** | ~25ms (deterministic TF-IDF path) |
| **URL Leak Protection** | ✅ PASSED (zero leaked URLs in responses) |
| **Unseen Scenario Generalization** | ✅ PASSED (S Pen scenario) |
| **Retrieval Threshold (0.22)** | 88.43% step match rate, avg similarity 0.34 |

---

## Local Development Setup

### Prerequisites
- Node.js v18+
- Python 3.11+

### 1. Configure Environment

```bash
cp .env.example .env
# Edit .env and set GEMINI_API_KEY=your_key_here
```

### 2. Start Python AI Gateway

```bash
# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # Linux/Mac

pip install -r ai-gateway/requirements.txt
uvicorn ai-gateway.app.main:app --host 0.0.0.0 --port 8001
```

### 3. Start Node.js Backend

```bash
cd backend
npm install
npm run dev
```

### 4. Start React Frontend

```bash
cd frontend
npm install
npm run dev
```

### 5. Access Application

Open http://localhost:5173 in your browser.

---

## Docker Setup

```bash
docker compose up --build
```

Services:
- Frontend: http://localhost:5173
- Backend: http://localhost:3000  
- AI Gateway: http://localhost:8001

---

## Testing & Evaluation

### Python Test Suite (19 tests)

```bash
pytest -v
```

All 19 tests pass:
- `test_data_loader.py` — Data integrity, schema validation
- `test_health.py` — API endpoint contract verification
- `test_quality_audit.py` — URL leak protection, catalog membership, cache behavior, unseen scenarios

### Node Backend Tests

```bash
cd backend && npm test
```

### Frontend Type Check

```bash
cd frontend && npx tsc --noEmit
```

### 20-Case Benchmark Evaluation

```bash
python scripts/evaluate.py
```

Runs full benchmark: 20 SIIS cases, cache evaluation, threshold audit (0.10–0.50), edge case audit. Outputs to `scripts/output/evaluation_report.json`.

---

## Pipeline Details

### Gemini Grounded Generation

The pipeline sends a strict prompt instructing Gemini to:
1. Extract diagnostic actions strictly from the provided SIIS article text
2. Never invent steps or include external URLs
3. Return structured JSON with `actions`, `stepGroups`, `category` fields
4. Falls back to deterministic SIIS parser when API key is unavailable or quota exceeded

### TF-IDF Deeplink Retrieval

The `DeeplinkRetriever` class:
1. Builds TF-IDF vectors for all 578 deeplink descriptions at startup
2. For each step group, computes cosine similarity against the full catalog
3. Returns the best-matching actionable deeplink and optional validation deeplink
4. Threshold of 0.22 chosen empirically across all 20 benchmark cases

### Semantic Response Cache

The `TroubleshootingCache` class:
- **Exact match**: SHA-256 hash of SIIS content + normalized query
- **Paraphrase match**: Jaccard similarity of content words (stopword-filtered), threshold 0.50
- **LRU eviction**: Max 256 entries, oldest evicted first

---

## Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite | Type-safe, fast HMR, modern component model |
| Styling | Tailwind CSS + Custom CSS | Responsive design, dark/light themes, animations |
| Backend | Fastify (Node.js + TypeScript) | High-performance REST API, request validation |
| AI Gateway | FastAPI + Python 3.11 | Async, Pydantic v2 schema enforcement, Gemini integration |
| LLM | Google Gemini 3.6 Flash / 2.5 Flash | Structured JSON output, grounded generation |
| Retrieval | Custom TF-IDF (scikit-learn pattern) | Deterministic, fast, no ML dependencies |
| Testing | Pytest + anyio + FastAPI TestClient | Async test support, contract verification |

---

## AI-Assisted Development Disclosure

This repository was built with Antigravity AI assistant for architecture design, schema translation, component development, test suite creation, and quality optimization. All code and test results have been verified against official Samsung PRISM specifications.

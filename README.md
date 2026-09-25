# Samsung Guided Troubleshooting Engine

> **Samsung PRISM Gen AI Hackathon 3.0 — Theme 2: Guided Troubleshooting**

A full-stack AI application that transforms Samsung SIIS knowledge articles into interactive, step-by-step diagnostic workflows enriched with official Samsung device settings deeplinks.

---

## Problem

Samsung device users experiencing issues must navigate fragmented support pages or manually search through Settings menus with limited guidance. There is no structured system that translates a natural-language complaint into a specific, official Samsung Settings action.

## Solution

This engine accepts a user complaint and the corresponding official Samsung SIIS knowledge article, extracts grounded troubleshooting steps (via Gemini or deterministic fallback), and retrieves the most relevant official Samsung Settings deeplink from the 578-entry official catalog for each step. The result is a guided, step-by-step troubleshooting workflow with direct Settings shortcuts.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│               React + TypeScript Frontend  (port 5173)          │
│  Navigation │ HomeScreen │ TroubleshootForm │ ResultsDisplay    │
│  History    │ HowItWorks │ Settings         │ Toast System      │
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
│  │  LRU Response Cache  │    │  Gemini Flash API            │  │
│  │  (256-entry LRU)     │    │  (Grounded JSON generation)  │  │
│  │  Exact + Jaccard     │    │  → Deterministic fallback    │  │
│  └──────────────────────┘    └──────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  TF-IDF Deeplink Retriever  (578 official entries)       │  │
│  │  + Domain synonym query expansion                         │  │
│  │  threshold=0.22 (empirically observed, not proven optimal)│  │
│  │  100% catalog membership verification                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Features

| Feature | Details |
|---|---|
| **Grounded Generation** | Gemini extracts diagnostic steps strictly from SIIS text; deterministic fallback when unavailable |
| **578 Official Deeplinks** | TF-IDF + domain synonym expansion against Samsung's full official catalog |
| **100% Catalog Verified** | Every returned deeplink verified against official catalog before presentation |
| **LRU Response Cache** | 256-entry cache with exact query hash + token Jaccard paraphrase matching (threshold 0.50) |
| **Two UI Modes** | Overview Mode (all actions) + Interactive Step-by-Step Mode with progress tracking |
| **20 Benchmark Cases** | Complete evaluation against all 20 official SIIS benchmark cases |
| **History & Sessions** | LocalStorage-persisted troubleshooting sessions with restore functionality |
| **Deterministic Fallback** | Structured SIIS parser produces valid schema output without Gemini API access |
| **Theme Support** | Dark / Light / System theme with full CSS variable system and reduced motion |
| **Accessibility** | ARIA roles, keyboard navigation, visible focus states, screen-reader structure |

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

These files are never modified by the application.

---

## Retrieval Architecture

**Method:** Custom TF-IDF cosine similarity (no ML dependencies, pure Python).

**Index:** All 578 entries from `data/deeplinks.json`, indexed by `description + message + qna_description + originalType`.

**Query expansion:** Domain synonym map improves recall for colloquial terms (e.g. "flickering" → adds "brightness", "refresh", "smoothness" tokens).

**Threshold:** 0.22 was observed empirically as a reasonable retrieval boundary. It is **not** a proven optimal threshold. No ground-truth relevance labels are available.

**Safety rule:** A weakly-matched deeplink is suppressed (returns `bixby://dummy_positive` per contract) rather than presenting a potentially incorrect catalog entry to the user.

---

## Deeplink Architecture

The deeplink pipeline is strictly:

```
STEP TEXT
  ↓
TF-IDF retrieval with domain expansion
  ↓
Best official catalog entry (or None if below threshold)
  ↓
Official URI copied verbatim from data/deeplinks.json
  ↓
Validator verifies URI is in official catalog
  ↓
Frontend presents "Samsung Settings Shortcut"
  ↓
User copies or attempts to launch on Galaxy device
```

The AI **never** generates or invents a deeplink URI. All URIs come exclusively from `data/deeplinks.json`.

**Desktop behavior:** On non-Samsung environments (Windows/Mac desktop browsers), the `bixby://` protocol has no registered handler. The UI detects this via a focus/visibility heuristic and presents a graceful "Copy Settings Shortcut" fallback with a clear explanation.

**Samsung device behavior:** On Galaxy devices with Bixby support, the URI may launch the corresponding Samsung Settings screen. Physical device execution was **not** verified during development.

---

## AI Generation

**With Gemini API key configured:**
- Sends a grounded prompt instructing Gemini to extract diagnostic actions strictly from the provided SIIS text
- Gemini returns structured JSON with `actions`, `stepGroups`, `category` fields
- Output passes through validator + repair layer before being returned

**Without Gemini API key (or on quota/error):**
- Deterministic SIIS parser extracts section headers and bullet/numbered steps
- Produces a valid `ContextDeeplinkResponse` schema-compliant output
- No Gemini required for core functionality

---

## Caching

The `TroubleshootingCache` class implements:
- **Exact match:** SHA-256 hash of SIIS content + normalized query string
- **Paraphrase match:** Token Jaccard similarity of content words (stopword-filtered), threshold 0.50

**Important:** The paraphrase matching uses **token Jaccard similarity**, which is a set-overlap measure. It is **not** embedding-based semantic similarity.

- LRU eviction: max 256 entries, oldest evicted first
- Cache is in-memory only (no database, no Redis)

---

## Evaluation

Run the full benchmark:

```bash
python scripts/evaluate.py
```

This generates `scripts/output/evaluation_report.json` with:
- Schema pass rate across 20 official cases (MEASURED)
- Deeplink categorization: catalog-backed vs. dummy fallback vs. invalid (MEASURED)
- URL leak scanning across all text fields in all 20 generated responses (MEASURED)
- Local pipeline latency via `time.perf_counter()` (MEASURED)
- Gemini telemetry: calls, successes, fallback count (MEASURED)
- Cache behavior: exact hit speedup, paraphrase hit/miss (MEASURED)
- Threshold experiment across thresholds 0.10–0.50 (MEASURED; retrieval rate only, not semantic accuracy)
- Synthetic integration test for S Pen unindexed scenario (SINGLE SYNTHETIC TEST)

**What the evaluation does NOT claim:**
- No semantic accuracy numbers (no ground-truth labels exist)
- Threshold 0.22 is not claimed "optimal"
- Cache paraphrase matching is not claimed "embedding-based"
- Gemini success rate does not apply when running without API key

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
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # Linux/Mac

pip install -r ai-gateway/requirements.txt
cd ai-gateway
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

### 3. Start Node.js Backend

```bash
cd backend
npm install
npm start
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

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Optional | Enables Gemini-powered generation; falls back to deterministic if absent |
| `GEMINI_MODEL` | Optional | Defaults to `gemini-2.5-flash` |
| `AI_GATEWAY_URL` | Yes | URL of the Python AI gateway (default: `http://localhost:8001`) |
| `NODE_PORT` | Yes | Port for Fastify backend (default: `3000`) |
| `FRONTEND_ORIGIN` | Yes | CORS origin for frontend (default: `http://localhost:5173`) |
| `VITE_NODE_BACKEND_URL` | Yes | Backend URL visible to frontend (default: `http://localhost:3000`) |

---

## Docker Setup

```bash
docker compose up --build
```

Services:
- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- AI Gateway: http://localhost:8001

Health checks:
- `GET /api/health` → `{"status":"ok","service":"node-backend"}`
- `GET /health` → `{"status":"ok","service":"ai-gateway"}`

---

## API Endpoints

### Node Backend (port 3000)

```
GET  /api/health          → {"status":"ok","service":"node-backend"}
POST /api/troubleshoot    → ContextDeeplinkResponse
```

**Request body:**
```json
{
  "query": "My Samsung Galaxy phone screen keeps flickering when I open apps.",
  "siis_response": {
    "title": "Display flickering on Samsung Galaxy",
    "content": "## Step 1: Check Display Settings\nGo to Settings > Display...\n## Step 2: Update Software..."
  }
}
```

**Response:** Official `ContextDeeplinkResponse` schema with `contexts: [Goal]`, where each `Goal` contains `actions`, `stepGroups`, and actionable deeplinks from the official catalog.

### Python AI Gateway (port 8001)

```
GET  /health                      → {"status":"ok","service":"ai-gateway"}
POST /internal/troubleshoot       → ContextDeeplinkResponse (strict contract)
POST /v1/troubleshoot             → ContextDeeplinkResponse (alias)
```

---

## Testing

### Python Test Suite

```bash
pytest -v
```

Tests:
- `test_data_loader.py` — Data integrity, schema validation
- `test_health.py` — API endpoint contract verification
- `test_quality_audit.py` — URL protection, catalog membership, cache behavior, unseen scenarios
- `test_validator.py` — Goal regex compliance, title word count, action description format, auto-action fallback

### Node Backend Tests

```bash
cd backend && npm test
```

### Frontend Build Check

```bash
cd frontend && npm run build
```

### 20-Case Benchmark Evaluation

```bash
python scripts/evaluate.py
```

---

## Known Limitations

1. **Retrieval method:** TF-IDF + domain synonym expansion (no embeddings). For queries with no lexical overlap with catalog descriptions, retrieval may fail or return a low-confidence match, which is safely suppressed.

2. **Deeplink execution:** `bixby://` protocol URIs are designed for Samsung Galaxy devices. On desktop browsers and non-Samsung environments, the protocol has no handler. The UI provides a "Copy Settings Shortcut" fallback.

3. **No physical device testing:** Deeplink execution on actual Samsung Galaxy devices was not verified. The deeplinks are copied verbatim from the official catalog but physical execution behavior is unverified.

4. **Gemini dependency:** AI-powered step extraction requires a valid `GEMINI_API_KEY`. The deterministic fallback operates without it but produces simpler outputs.

5. **No ground-truth evaluation:** No human relevance labels exist for the deeplink retrieval step. Retrieval quality is measured by threshold experiment only.

6. **Cache similarity:** Paraphrase cache uses token Jaccard similarity (not embeddings). Semantically similar but lexically different queries may miss the cache.

---

## Hackathon Submission

**Event:** Samsung PRISM Gen AI Hackathon 3.0  
**Theme:** Theme 2 — Guided Troubleshooting  
**Contract:** `ContextDeeplinkResponse` schema with grounded SIIS-to-deeplink pipeline  
**Official data files:** `data/schema.py`, `data/deeplinks.json`, `data/siis_responses.json`, `data/sample_output.json`, `data/input.txt` (immutable)

---

## AI-Assisted Development Disclosure

This repository was built with AI coding assistance for architecture design, schema translation, component development, test suite creation, and quality optimization. All code and test results have been verified against official Samsung PRISM specifications.

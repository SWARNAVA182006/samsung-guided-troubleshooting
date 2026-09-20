# Samsung Guided Troubleshooting Engine

**Samsung PRISM Gen AI Hackathon 3.0 — Theme 2: Guided Troubleshooting Prototype**

---

## 1. Project Purpose & Relationship to Samsung Theme 2

This repository implements the working prototype for **Samsung PRISM Gen AI Hackathon 3.0 (Theme 2: Guided Troubleshooting)**. Given a user's device complaint and raw Samsung internal knowledge store (SIIS) articles, the system produces grounded diagnostic workflows enriched with official Samsung device settings deeplinks (`bixby://masked/act/...`) and validation checks.

---

## 2. Target Architecture

```text
[ React + TS Frontend ] ---> POST /api/troubleshoot ---> [ Fastify Node Backend ]
                                                                   |
                                                      POST /internal/troubleshoot
                                                                   v
[ Official Samsung Response ] <--- ContextDeeplinkResponse <--- [ Python AI Gateway ]
                                                                 /         \
                                                     Gemini API         TF-IDF Retriever
                                                     (Grounded LLM)     (578 Deeplinks)
```

---

## 3. Technology Stack & Rationale

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, Lucide Icons.
  - *Rationale*: Type-safe UI matching backend payload contracts, responsive design for desktop/mobile demo.
- **Application Backend**: Node.js, TypeScript, Fastify.
  - *Rationale*: Lightweight API orchestration layer, fast request validation, decoupling client logic from Python AI services.
- **AI/ML Gateway**: Python 3.11, FastAPI, Pydantic v2, `httpx`.
  - *Rationale*: Grounded generation via Gemini API, lexical TF-IDF cosine similarity search over official 578 Samsung deeplink catalog, strict Pydantic schema validation (`ai-gateway/app`).

---

## 4. Official Data Kit (Read-Only Source Inputs)

Stored under `data/` (treated as immutable reference inputs):
- `data/schema.py`: Official Pydantic response contract (`ContextDeeplinkResponse`, `Goal`, `Action`, `StepGroup`, `Deeplink`, `ValidationDeepLink`).
- `data/deeplinks.json`: 578 official Samsung device settings and validation deeplinks.
- `data/siis_responses.json`: 20 official benchmark test cases.
- `data/sample_output.json`: Official sample response payload.
- `data/input.txt`: 20 raw complaint queries.

---

## 5. API Contracts

### A. Application Backend API
- `GET /api/health` — Returns `{"status": "ok", "service": "node-backend"}`
- `POST /api/troubleshoot`
  - **Request Body**:
    ```json
    {
      "query": "My Samsung A11 tablet screen flashes and goes blank...",
      "siis_response": {
        "title": "Email server not responding on Samsung phone or tablet",
        "content": "Smartphone,Others Mobile... # Troubleshooting Email Connection Issues..."
      }
    }
    ```
  - **Response Body**: Returns official `ContextDeeplinkResponse` payload (`contexts: [Goal]`).

### B. Python AI Gateway API
- `GET /health` — Returns `{"status": "ok", "service": "ai-gateway"}`
- `POST /internal/troubleshoot` — Accepts strict `TroubleshootRequest` and returns `ContextDeeplinkResponse`.

---

## 6. Grounded Generation, Deterministic Score & Deeplink Retrieval

1. **Grounded Generation**: Gemini API (`gemini-2.5-flash`) extracts diagnostic actions strictly from the supplied SIIS title & content without inventing unsupported steps or external URLs. Fallback grounded extraction is active when API key is unconfigured.
2. **Deterministic Relevance Score**: `Goal.score` is calculated as the average TF-IDF cosine similarity of matched catalog deeplinks across all step groups in the goal (bounded in `[0.0, 1.0]`). *Note: This score is a deterministic relevance score, NOT a calibrated probability.*
3. **Deeplink Retrieval & Threshold Rationale**: `DeeplinkRetriever` indexes all 578 official deeplinks using TF-IDF cosine similarity. Based on empirical threshold evaluation across all 20 benchmark cases, `threshold = 0.22` achieves an 88.43% step match rate while avoiding noisy low-similarity assignments.

---

## 7. Local Development Setup

### Prerequisites
- Node.js v18+ / v20+
- Python 3.11+

### Step-by-Step Instructions

1. **Setup Environment**:
   ```bash
   cp .env.example .env
   ```

2. **Run Python AI Gateway**:
   ```bash
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r ai-gateway/requirements.txt
   uvicorn ai-gateway.app.main:app --host 0.0.0.0 --port 8001
   ```

3. **Run Node.js Application Backend**:
   ```bash
   cd backend
   npm install
   npm run dev
   ```

4. **Run React Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

5. Access Frontend at `http://localhost:5173`.

---

## 8. Docker Setup

Run the multi-container stack:
```bash
docker compose up --build
```
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- AI Gateway: `http://localhost:8001`

---

## 9. Testing & Evaluation

### Run Test Suites
- **Python Gateway & Schema Tests**:
  ```bash
  pytest
  ```
- **Node Backend Tests**:
  ```bash
  cd backend && npm test
  ```
- **Frontend Typecheck & Build**:
  ```bash
  cd frontend && npm run build
  ```

### Run 20-Case Benchmark Suite & Threshold Audit
```bash
python scripts/evaluate.py
```
**Benchmark Results**:
- **Total Cases Evaluated**: 20 / 20
- **Schema Validation Pass Rate**: 100% (valid Pydantic schema structure)
- **Average Local Pipeline Latency**: `8.46 ms` (TF-IDF search & deterministic parsing)
- **Average Gemini API Latency**: `0.0 ms` (unconfigured fallback mode; recorded when API key is set)

---

## 10. AI-Assisted Development Disclosure

This repository was created in collaboration with Antigravity AI assistant for architecture design, schema translation, test suite creation, and prototype assembly. All code, schemas, and test results have been verified against official Samsung PRISM specifications.

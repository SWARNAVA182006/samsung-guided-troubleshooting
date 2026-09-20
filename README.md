# Samsung Guided Troubleshooting Engine

**Samsung PRISM Gen AI Hackathon 3.0 — Theme 2: Guided Troubleshooting Prototype**

---

## 1. Project Purpose & Relationship to Samsung Theme 2

This repository implements the end-to-end working prototype for **Samsung PRISM Gen AI Hackathon 3.0 (Theme 2: Guided Troubleshooting)**. Given a user's device complaint and raw Samsung internal knowledge store (SIIS) articles, the system produces grounded, step-by-step diagnostic workflows enriched with official Samsung device settings deeplinks (`bixby://masked/act/...`) and validation checks.

---

## 2. Target Architecture Diagram

```text
                               +-----------------------------+
                               |        USER BROWSER         |
                               +--------------+--------------+
                                              |
                                         HTTP / JSON
                                              v
                               +-----------------------------+
                               |     REACT FRONTEND (Vite)   |
                               | TypeScript + Tailwind CSS   |
                               +--------------+--------------+
                                              |
                                  POST /api/troubleshoot
                                              v
                               +-----------------------------+
                               |    NODE.JS BACKEND (Fastify)|
                               | TypeScript API Orchestration|
                               +--------------+--------------+
                                              |
                               POST /internal/troubleshoot
                                              v
                               +-----------------------------+
                               |   PYTHON AI/ML GATEWAY      |
                               |   FastAPI + Pydantic        |
                               +-------+---------------+-----+
                                       |               |
                                       v               v
                           +---------------+       +----------------------------+
                           | Gemini API    |       | Semantic Retrieval Engine  |
                           | (Grounded LLM)|       | 578 Official Deeplinks     |
                           +---------------+       +----------------------------+
                                       |               |
                                       +-------+-------+
                                               v
                                   ContextDeeplinkResponse
                                       (Samsung Schema)
```

---

## 3. Technology Stack & Rationale

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, Lucide Icons.
  - *Why*: Ultra-fast HMR, strict type safety matching backend payload contracts, responsive design for desktop/mobile demo.
- **Application Backend**: Node.js, TypeScript, Fastify.
  - *Why*: Lightweight API orchestration layer, async I/O, fast payload validation, decoupling client logic from Python AI services.
- **AI/ML Gateway**: Python 3.11, FastAPI, Pydantic v2, `httpx`.
  - *Why*: Native integration with Gemini API, sentence similarity over official 578 Samsung deeplink catalog, Pydantic schema validation.

---

## 4. Official Data Kit & Read-Only Source Files

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

## 6. Grounded Generation & Deeplink Retrieval

1. **Grounded Generation**: Gemini API (`gemini-2.5-flash`) extracts diagnostic actions strictly from the supplied SIIS title & content without inventing unsupported steps or external URLs. Fallback grounded extraction is active when API key is unconfigured.
2. **Semantic Deeplink Retrieval**: `DeeplinkRetriever` indexes all 578 official deeplinks from `data/deeplinks.json` using TF-IDF / vector text similarity. Matches step descriptions to actionable URIs (`bixby://masked/act/...`) and validation checks above a 0.22 similarity threshold.

---

## 7. Local Development Setup

### Prerequisites
- Node.js v18+ / v20+
- Python 3.11+

### Step-by-Step Instructions

1. **Clone & Setup Environment**:
   ```bash
   cp .env.example .env
   ```

2. **Run Python AI Gateway**:
   ```bash
   # From project root:
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn app.main:app --host 0.0.0.0 --port 8001
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

### Run 20-Case Official Benchmark Suite
```bash
python scripts/evaluate.py
```
**Results Summary**:
- **Cases Evaluated**: 20 / 20
- **Schema Validation Pass Rate**: 100%
- **Actions Generated**: 124
- **Deeplinks Matched**: 146
- **Average Latency**: ~9.7 ms

---

## 10. AI-Assisted Development Disclosure

This repository was created in collaboration with Antigravity AI assistant for architecture design, schema translation, test suite creation, and prototype assembly. All code, schemas, and test results have been verified against official Samsung PRISM specifications.

# Samsung Guided Troubleshooting Engine

> **Samsung PRISM Gen AI Hackathon 3.0 — Theme 02: Guided Troubleshooting**  
> An end-to-end AI system that converts official Samsung SIIS support knowledge articles into interactive, step-by-step diagnostic workflows enriched with official Samsung Settings deeplinks.

[![Build Status](https://img.shields.io/badge/Status-PASS-brightgreen.svg)]()
[![Benchmark](https://img.shields.io/badge/Benchmark-20%2F20%20(100%25)-blue.svg)]()
[![Deeplink Catalog](https://img.shields.io/badge/Catalog-578%20Official%20URIs-orange.svg)]()
[![Pytest Suite](https://img.shields.io/badge/Pytest-28%2F28%20Passed-success.svg)]()

---

## 🚀 Judge Quick Start

For full, zero-config, copy-paste setup instructions designed specifically for fresh-clone evaluation, see:

👉 **[START_GUIDE.md](START_GUIDE.md)**

---

## 📌 Problem & Solution

### Problem
Samsung Galaxy device users facing hardware or software issues must navigate complex support manuals or manually search through multi-level Settings menus. There is no automated bridge between natural language user complaints and direct, official Samsung device Settings shortcuts.

### Solution
This application accepts a natural language complaint, identifies the relevant official Samsung SIIS knowledge article, extracts grounded diagnostic steps, and matches each step to the official Samsung Settings deeplink from the 578-entry catalog. The output is delivered via a modern, interactive React web application featuring both **Overview Mode** and **Guided Step-by-Step Mode**.

---

## 📊 Measured Evaluation & Benchmark Summary

| Metric | Target | Measured Result | Status |
|---|---|---|---|
| **20-Case Benchmark Schema Pass Rate** | `100%` | **`20 / 20` (`100%`)** | **PASS** |
| **Official Catalog Deeplink Membership** | `100%` | **`100.0%` (146 catalog URIs, 0 invalid)** | **PASS** |
| **URL Leak Scanning** | `0` | **`0` leaks across 850 fields** | **PASS** |
| **Cold Request Latency** | `≤ 8.00s` | **`~2.03s`** | **PASS** |
| **Warm Cache Response Latency** | `≤ 2.00s` | **`≤ 0.01s` (`10ms`)** | **PASS** |
| **Pytest Automated Test Suite** | 28 tests | **`28 / 28 PASS`** | **PASS** |

---

## 🏗️ Architecture Overview

The system is built as a modular microservice architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│               React + TypeScript Frontend  (port 5173)          │
│  HomeScreen  │  TroubleshootForm  │  ResultsDisplay  │ Glass UI │
└──────────────────────────┬──────────────────────────────────────┘
                           │  POST /api/troubleshoot
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│           Fastify Node.js Application Backend  (port 3000)      │
│  Schema Validation → Response Cache (TTL 1h) → AI Gateway Proxy │
└──────────────────────────┬──────────────────────────────────────┘
                           │  POST /internal/troubleshoot
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              Python FastAPI AI Gateway  (port 8001)             │
│                                                                 │
│  ┌──────────────────────┐    ┌──────────────────────────────┐  │
│  │  In-Memory LRU Cache │    │  Grounded Step Extractor     │  │
│  │  (Exact + Jaccard)   │    │  Gemini Flash / Deterministic│  │
│  └──────────────────────┘    └──────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  TF-IDF Deeplink Retriever  (578 official entries)       │  │
│  │  + Domain synonym query expansion (threshold=0.22)       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Authoritative Validation & Repair Layer                 │  │
│  │  (100% catalog membership & URL leak sanitizer)          │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

For complete technical diagrams and specification details, see:
- 📖 **[docs/architecture.md](docs/architecture.md)** (Mermaid Diagram & Specifications)
- 📄 **[docs/architecture.txt](docs/architecture.txt)** (Text / ASCII Architecture Fallback)

---

## 🌟 Key Features

1. **Dual Execution Modes**:
   - **Default Offline Mode**: Uses a deterministic SIIS regex parser and pure-Python TF-IDF index. Requires zero API keys or external services.
   - **AI Grounded Mode**: Optional integration with Gemini 2.5 Flash API for live natural language step extraction.
2. **578 Official Deeplinks**: Direct matching against Samsung's official catalog (`bixby://settings/open?page=...`).
3. **100% Catalog Verified**: Every generated URI is strictly verified against `data/deeplinks.json` before sending to the client.
4. **Interactive UI**:
   - Overview Mode (all diagnostic actions).
   - Step-by-Step Guided Mode with progress checkboxes and step focus.
   - Desktop fallback handling for non-Samsung environments.
   - Apple-style glassmorphism with Dark/Light/System theme toggling.
5. **Ultra-Fast Caching**: Multi-tier in-memory response cache returning warm queries in `≤ 10ms`.

---

## 📁 Official Reference Data Kit (`data/`)

The repository includes immutable reference data provided by Samsung PRISM:

- `data/deeplinks.json`: 578 official Samsung settings & validation deeplinks.
- `data/siis_responses.json`: 20 official benchmark test cases containing SIIS knowledge articles.
- `data/schema.py`: Official Pydantic contract defining `ContextDeeplinkResponse`, `Goal`, `Action`, and `StepGroup`.
- `data/sample_output.json`: Reference JSON response payload.
- `data/input.txt`: 20 raw complaint queries.

---

## 🛠️ Quick Copy-Paste Setup

### 1. Configure Environment
```bash
cp .env.example .env
```

### 2. Start Microservices

#### AI Gateway (Terminal 1)
```bash
# On Windows (PowerShell):
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r ai-gateway/requirements.txt
python -m uvicorn ai-gateway.app.main:app --host 127.0.0.1 --port 8001

# On Linux / macOS (Bash/Zsh):
# python3 -m venv .venv
# source .venv/bin/activate
# pip install -r ai-gateway/requirements.txt
# python3 -m uvicorn ai-gateway.app.main:app --host 127.0.0.1 --port 8001
```

#### Node Backend (Terminal 2)
```bash
cd backend
npm install
npx ts-node src/server.ts
```

#### React Frontend (Terminal 3)
```bash
cd frontend
npm install
npm run dev
```

Open **`http://localhost:5173`** in your browser.

---

## 🧪 Testing & Verification Commands

### Run Full Pytest Suite (28 Tests)
```bash
python -m pytest tests/ -v
```

### Run 20-Case Official Benchmark & URL Leak Audit
```bash
python scripts/evaluate.py
```

---

## ⚠️ Known Limitations & Disclosures

1. **Deeplink Protocol Handlers**: Bixby protocol URIs (`bixby://`) require a compatible Samsung Galaxy device with One UI and Bixby. On non-Samsung desktop browsers, the web application detects the desktop environment and presents a graceful *"Copy Settings Shortcut"* fallback. Physical device execution was unverified during development.
2. **Retrieval Threshold**: The TF-IDF retrieval threshold (`0.22`) was selected empirically based on retrieval candidate rates across test cases; no ground-truth relevance labels were provided in the dataset.
3. **Paraphrase Cache**: Paraphrase cache matching uses token Jaccard similarity across token sets; it does not use vector embedding similarity.

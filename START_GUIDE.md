# Quick Start & Judge Verification Guide

> **Samsung PRISM Gen AI Hackathon 3.0 — Theme 2: Guided Troubleshooting**  
> Complete fresh-clone evaluation guide for judges and reviewers.

---

## ⚡ Executive Summary

This project is fully functional out of the box with **ZERO required API keys, ZERO databases, and ZERO external cloud setup**.

- **Default Mode**: Operates using a deterministic SIIS grounding engine + custom TF-IDF catalog retriever. No Gemini API key is required.
- **Optional AI Mode**: Set `GEMINI_API_KEY` in `.env` to enable live LLM grounded step extraction via Gemini.

### Final Measured Verification Benchmark
- **Schema Compliance**: `20 / 20` official benchmark cases (`100% PASS`)
- **Deeplink Catalog Membership**: `100%` (All returned URIs verified against official 578-entry catalog)
- **URL Leak Scanning**: `0` external URL leaks detected across all 850 text fields
- **Warm Cache Latency**: `≤ 0.01s` (`10ms`)
- **Pytest Suite**: `28 / 28 PASS`

---

## 📋 Judge Flow Overview

```
Fresh Clone ──► Environment Setup ──► Start Services ──► Open Frontend ──► Test UI Complaint ──► Run Benchmark Suite
```

---

## 🛠️ Step 1: Environment Setup

### Option A: Local Native Setup (Recommended)

#### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Python**: 3.11 or higher
- **npm**: v9.0.0 or higher

#### Environment File Configuration
Copy the template environment file. No changes to `.env` are necessary for deterministic mode.

```bash
cp .env.example .env
```

*(Optional: If you wish to test with live Gemini LLM generation, open `.env` and set `GEMINI_API_KEY=your_key_here`)*.

---

## 🚀 Step 2: Start Services

Open 3 terminal windows (or tabs) from the project root:

### Terminal 1: Python AI Gateway (Port 8001)

#### On Windows (PowerShell):
```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r ai-gateway/requirements.txt
python -m uvicorn ai-gateway.app.main:app --host 127.0.0.1 --port 8001
```

#### On Linux / macOS (Bash/Zsh):
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r ai-gateway/requirements.txt
python3 -m uvicorn ai-gateway.app.main:app --host 127.0.0.1 --port 8001
```

---

### Terminal 2: Fastify Node Backend (Port 3000)

```bash
# Navigate to backend directory
cd backend

# Install Node dependencies
npm install

# Start Backend server
npx ts-node src/server.ts
```

---

### Terminal 3: React Vite Frontend (Port 5173)

```bash
# Navigate to frontend directory
cd frontend

# Install Node dependencies
npm install

# Start Vite dev server
npm run dev
```

---

## 🐳 Option B: Docker Setup (Single Command)

If Docker & Docker Compose are installed on your system:

```bash
# Build and launch all 3 services (Frontend: 5173, Backend: 3000, AI Gateway: 8001)
docker-compose up --build
```

---

## 🏥 Step 3: Health Checks & Direct API Verification

Run the following commands in a terminal to confirm all microservices are responsive:

### 1. AI Gateway Health Check (Port 8001)
```bash
curl -X GET http://127.0.0.1:8001/health
```
**Expected Output:**
```json
{"status":"ok","service":"ai-gateway"}
```

### 2. Node Backend Health Check (Port 3000)
```bash
curl -X GET http://127.0.0.1:3000/api/health
```
**Expected Output:**
```json
{"status":"ok","service":"node-backend"}
```

### 3. First End-to-End API Test Query
```bash
curl -X POST http://127.0.0.1:3000/api/troubleshoot \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"Wi-Fi keeps disconnecting randomly\"}"
```
**Expected Response Structure:**
Returns a schema-compliant `ContextDeeplinkResponse` payload containing:
- `contexts`: Array of goal objects (`goal`, `title`, `score`, `actions`)
- `actions`: Array of logical repair actions (`actionName`, `description`, `category`, `stepGroups`)
- `stepGroups`: Array of step text lists + catalog-verified `actionableDeeplink` (`deeplink`, `description`, `message`)

---

## 📱 Step 4: Web UI Judge Experience Flow

1. Open your browser and navigate to: **`http://localhost:5173`**
2. **Preset Queries**: Click any preset button on the home screen (e.g., *"Wi-Fi disconnecting"*, *"Screen flickering"*, *"Battery draining fast"*).
3. **Custom Complaint**: Type a complaint into the search bar (e.g., `"My Galaxy S22 screen is completely black and won't turn on"`) and click **Troubleshoot**.
4. **Interactive Fix Mode**:
   - Toggle between **Overview Mode** (complete diagnostic breakdown) and **Step-by-Step Mode** (interactive guided repair flow).
   - Click **Open Settings Shortcut** to inspect official Samsung Bixby deeplinks (`bixby://...`).
   - On non-Samsung desktop browsers, the app detects desktop environment and presents a graceful *"Copy Settings Shortcut"* fallback.
5. **Theme & Glassmorphism**: Toggle between Light Mode and Dark Mode in top navigation bar to verify theme readability and Apple-style frosted glass UI.

---

## 🧪 Step 5: Benchmark & Test Execution

Run the complete test suite to reproduce official judge evaluation metrics:

### 1. Run Full Regression Pytest Suite (28 Tests)
```bash
# Run pytest from repository root
python -m pytest tests/ -v
```
**Expected Result:** `28 passed` (100% PASS)

### 2. Run 20-Case Benchmark Evaluation & URL Leak Audit
```bash
python scripts/evaluate.py
```
**Expected Output Summary:**
```
================================================================================
EVALUATION & BENCHMARK SUMMARY REPORT
================================================================================
Total Cases Evaluated:                  20
Schema Pass Rate (Structure Valid):     20 / 20 (100.0%)
Official Catalog Deeplink Membership:   100.0%
  Catalog-backed URIs:                  146
  Dummy fallback URIs:                  0
  Invalid URIs:                         0
URL Leaks Found (across all 20 cases):  0 (fields scanned: 850)
Total Actions Generated:                124
Total Steps Generated:                  357
Total Actionable Deeplinks:             146
================================================================================
```

---

## 📁 Repository Quick Reference

| Directory / File | Description |
|---|---|
| `data/deeplinks.json` | 578 official Samsung device settings & validation deeplinks |
| `data/siis_responses.json` | 20 official benchmark SIIS test cases |
| `data/schema.py` | Official Pydantic contract definition |
| `ai-gateway/app/` | Python FastAPI AI engine, retrieval index, & validator |
| `backend/src/` | Node.js Fastify API server & response cache |
| `frontend/src/` | React TypeScript frontend app & UI components |
| `docs/architecture.md` | System Architecture Diagram & Technical Description |
| `docs/architecture.txt` | Text / ASCII Architecture Diagram Fallback |
| `scripts/evaluate.py` | Official 20-case evaluation & benchmark harness |

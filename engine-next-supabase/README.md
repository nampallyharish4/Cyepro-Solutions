# Notification Prioritization Engine (SENS Stack)

**Supabase · Express · Next.js · Supabase (PostgreSQL)**

An intelligent notification management system that classifies events, prevents spam, and ensures critical alerts reach users immediately (**NOW**), while deferring informational ones (**LATER**) or dropping noise (**NEVER**).

## 🚀 Phase 5: High-Fidelity Intelligence & Control

The latest evolution adds a strategic control layer to the autonomous decision pipeline:

- **Rule Protocol Sandbox**: Full pre-flight validation suite. Simulate rule matching against mock payloads to verify logic BEFORE committing to production.
- **Intelligence Tuning Hub**: Dynamic, zero-restart control over system thresholds (Dedupe Sensitivity, Alert Fatigue Limits) and active AI architectures.
- **Forensic Simulator**: Immersive terminal-style stress tester with real-time decision-vector visualization and historical telemetry stream.
- **System Pulse Telemetry**: Persistent navigation heartbeat monitoring system vitality and active AI model state (Llama-3.3-70b/Gemini-1.5).
- **Cognitive Analytics 2.0**: High-end visualization of engine efficiency, noise attribution, and AI confidence trends.

## Live Deployments

- **Frontend (Vercel)**: https://cyepro-solutions.vercel.app

- **GitHub Repository**: https://github.com/nampallyharish4/Cyepro-Solutions.git

## Tech Stack

- **Frontend**: Next.js 15 (App Router) with Tailwind CSS, Framer Motion, and Recharts.
- **Backend**: Express.js with TypeScript and Supabase Admin SDK.
- **Database**: Supabase (PostgreSQL) with `pg_trgm` for near-duplicate text detection.
- **AI**: **Groq (Llama-3.3-70b-versatile)** for sub-second classification. **Google Gemini** serves as the automatic secondary fallback layer.

## Setup & Running

### Prerequisites

- Node.js v18+
- npm or yarn
- Supabase Project (PostgreSQL)

### 1. Database Setup

1. Create a Supabase project.
2. Run `backend/database/migrations/01_init_schema.sql` in the Supabase SQL Editor.

### 2. Backend Setup (`/backend`)

```bash
npm install
cp .env.example .env      # Set SUPABASE_URL, SERVICE_ROLE_KEY, GROQ_API_KEY, JWT_SECRET
npm run dev               # Starts on port 5000
```

### 3. Frontend Setup (`/frontend`)

```bash
npm install
cp .env.local.example .env.local   # Set NEXT_PUBLIC_API_URL=http://localhost:5000/api
npm run dev                         # Starts on port 3000
```

## Architecture Overview

The system flows through a **Deterministic → Intelligent → Fail-Safe** pipeline:

1. **Rule Protocol Sandbox**: Validates logic strings (Source, Type, Title-contains, Metadata-match) before production use.
2. **Deduplication**: Exact `dedupe_key` match **or** `pg_trgm` similarity > 0.8 → **NEVER**.
3. **Deterministic Rules**: Human-defined patterns evaluated in `priority_order DESC`. First match wins, AI bypassed.
4. **Alert Fatigue**: Per-user NOW count capped by dynamic `FATIGUE_LIMIT` (runtime configurable).
5. **AI Classification**: Real-time analysis with Llama-3.3 (Groq) or Gemini fallback.
6. **Fail-Safe**: Circuit breaker (5 failures → 5 min cooldown) ensures zero data loss by defaulting to **LATER**.

## Documentation

- [PLAN_OF_ACTION.md](./PLAN_OF_ACTION.md) — Phased development log and roadmap.
- [SYSTEM_WORKFLOW.md](./SYSTEM_WORKFLOW.md) — Detailed runtime logic and failure flows.
- [TEST_CASES_DOCUMENTATION.md](./TEST_CASES_DOCUMENTATION.md) — 60+ structured test cases and verification checklist.
- [DEPLOYMENT.md](./DEPLOYMENT.md) — Live URLs and production environment specs.

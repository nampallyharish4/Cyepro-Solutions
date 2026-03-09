# Notification Prioritization Engine (SENS Stack)

**Supabase · Express · Next.js · Supabase (PostgreSQL)**

An intelligent notification management system that classifies events, prevents spam, and ensures critical alerts reach users immediately (**NOW**), while deferring informational ones (**LATER**) or dropping noise (**NEVER**).

## Live Deployments

- **Frontend (Vercel)**: https://cyepro-solutions.vercel.app
- **Backend (Render)**: https://cyepro-notification-engine-backend.onrender.com
- **Health Endpoint**: https://cyepro-notification-engine-backend.onrender.com/health
- **GitHub Repository**: https://github.com/nampallyharish4/Cyepro-Solutions.git

## Tech Stack

- **Frontend**: Next.js 15 (App Router) with Tailwind CSS, Framer Motion, and Recharts.
- **Backend**: Express.js with TypeScript and Supabase Admin SDK.
- **Database**: Supabase (PostgreSQL) with `pg_trgm` for near-duplicate text detection.
- **AI**: **Groq (Llama-3.3-70b-versatile)** for sub-second classification. Google Gemini is the active fallback layer.

## Setup & Running

### Prerequisites

- Node.js v18+
- npm or yarn
- Supabase Project (PostgreSQL)

### Environment Variables

**Backend (`backend/.env`)**
- `SUPABASE_URL`: The URL to your Supabase project.
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (bypasses RLS for admin tasks).
- `GROQ_API_KEY`: API Key from Groq Cloud for Llama-3 inference.
- `MODEL_NAME`: The model string (e.g., `llama-3.3-70b-versatile`).
- `GEMINI_API_KEY`: (Optional fallback) Google Gemini API Key.
- `JWT_SECRET`: Secret string used to sign auth tokens.
- `PORT`: (Optional) Default `5000`.

**Frontend (`frontend/.env.local`)**
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase public anon key.
- `NEXT_PUBLIC_API_URL`: Backend URL (`http://127.0.0.1:5000/api` locally, or the Render URL in production).

### 1. Database Setup

1. Create a Supabase project.
2. Run `backend/database/migrations/01_init_schema.sql` in the Supabase SQL Editor (enables `pg_trgm`, creates tables, sets up the near-duplicate RPC).

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env      # fill in keys
npm run dev               # port 5000
```

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.local.example .env.local   # fill in NEXT_PUBLIC_API_URL
npm run dev                         # port 3000
```

## Architecture Overview

The system flows through a **Deterministic → Intelligent → Fail-Safe** pipeline:

1. **Expiry Check**: Events with `expires_at` in the past → **NEVER**.
2. **Deduplication**: Exact `dedupe_key` match **or** `pg_trgm` similarity > 0.8 → **NEVER**.
3. **Rules**: Human-defined patterns evaluated in `priority_order DESC`. First match wins, AI bypassed.
4. **Fatigue Check**: Per-user NOW count in 60-min window capped by `FATIGUE_LIMIT` (configurable at runtime).
5. **Fail-Safe**: Hard 3-second timeout → circuit breaker (5 failures → 5 min cooldown) → safe **LATER** fallback.

## AI Integration & Prompts

- **Primary Provider**: Groq Cloud (LPU Inference)
- **Model**: `llama-3.3-70b-versatile`
- **Prompt**:
  ```text
  You are a Notification Prioritization Engine.
  - NOW: Critical security, OTP, or immediate fatal failure.
  - LATER: Warnings (low balance, disk space), daily updates, non-critical alerts.
  - NEVER: Spam, ads, gamification noise.
  Return JSON: {"priority":"NOW"|"LATER"|"NEVER", "reason":"string", "confidence":float}
  ```
- **Parsing Output**: Parses `priority`, `reason`, and `confidence` and routes the notification.

### What happens when the AI is unavailable?

1. `axiosRetry` attempts 2 retries (500ms, 1000ms backoff).
2. If 3-second hard timeout or 429 quota error occurs, exception thrown.
3. `catch` block increments `circuitBreakerFailureCount`.
4. `AIService.fallBack()` executes → event assigned **LATER** + `is_fallback: true`.
5. Event stored in DB and queued for later processing — **zero data loss**.
6. After 5 consecutive failures, Circuit Breaker trips OPEN (5 min cooldown).

## Known Limitations

1. **Single Stack Submission**: Due to time constraints, the project relies solely on the Node.js/Next.js/Supabase stack. The architecture is decoupled (JSON API) — a Spring Boot backend with the same endpoints would slot in without frontend changes.
2. **PostgreSQL vs MongoDB**: `pg_trgm` is superior for near-duplicate text detection without external vector databases, and enforces relational integrity across audit trails.
3. **Queue Scalability**: The 1-minute polling scheduler works but for massive production scale would need a Redis/BullMQ worker cluster.

## Documentation

- [PLAN_OF_ACTION.md](./PLAN_OF_ACTION.md) — Phased development log and decisions.
- [SYSTEM_WORKFLOW.md](./SYSTEM_WORKFLOW.md) — Detailed runtime logic and failure flows.
- [DEPLOYMENT.md](./DEPLOYMENT.md) — Live URLs and production setup.

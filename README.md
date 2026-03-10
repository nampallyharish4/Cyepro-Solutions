# Cyepro AI — Notification Prioritization Engine

## Overview

An intelligent notification management system that classifies events, prevents spam, and ensures critical alerts reach users immediately (**NOW**), while deferring informational ones (**LATER**) or dropping noise (**NEVER**).

The system flows through a **Deterministic → Intelligent → Fail-Safe** pipeline:

1. **Expiry Check**: Events with `expires_at` in the past → **NEVER** immediately.
2. **Deduplication**: Exact `dedupe_key` match **or** `pg_trgm` similarity > 0.8 in last 24h → **NEVER**.
3. **Rules**: Human-defined patterns evaluated in `priority_order DESC`. First match wins; AI bypassed.
4. **Fatigue Check**: Per-user NOW count in a 60-minute rolling window capped by `FATIGUE_LIMIT` (admin-configurable at runtime, no restart needed).
5. **Fail-Safe Circuit Breaker**: Hard 3-second timeout per LLM call. Exponential retry (2 attempts). If AI fails, circuit breaker trips after 5 failures, defaulting events to safe **LATER** — **zero data loss guaranteed**.

## Live Deployments

| Service           | URL                                                     |
| ----------------- | ------------------------------------------------------- |
| Frontend (Vercel) | https://cyepro-solutions.vercel.app                     |
| GitHub Repository | https://github.com/nampallyharish4/Cyepro-Solutions.git |

## Tech Stack

| Layer             | Technology                                                     | Reason                                                                                               |
| ----------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Frontend**      | Next.js 15 (App Router), Tailwind CSS, Framer Motion, Recharts | Performance, SEO, premium management console UX                                                      |
| **Backend**       | Node.js / Express.js, TypeScript, Supabase Admin SDK           | Reliable orchestration, simple AI integration                                                        |
| **Database**      | Supabase (PostgreSQL)                                          | Strict schema safety, relational integrity for audit trails, `pg_trgm` near-duplicate text detection |
| **AI (Primary)**  | Groq (Llama-3.3-70b-versatile)                                 | Sub-second LPU inference                                                                             |
| **AI (Fallback)** | Google Gemini                                                  | Automatic secondary fallback                                                                         |

## Setup & Running

### Prerequisites

- Node.js v18+
- npm or yarn
- Supabase Project (PostgreSQL)

### Environment Variables

**Backend (`engine-next-supabase/backend/.env`)**
| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (bypasses RLS) |
| `GROQ_API_KEY` | Groq Cloud API key |
| `MODEL_NAME` | e.g. `llama-3.3-70b-versatile` |
| `GEMINI_API_KEY` | (Optional) Google Gemini API Key |
| `JWT_SECRET` | Token signing secret |
| `PORT` | (Optional) Default `5000` |
| `FRONTEND_URL` | (Optional) Primary allowed frontend origin |
| `CORS_ALLOWED_ORIGINS` | (Optional) Additional comma-separated allowed origins |
| `TRUST_PROXY` | (Optional) Proxy hops to trust (set `1` on Render) |

**Frontend (`engine-next-supabase/frontend/.env.local`)**
| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key |
| `NEXT_PUBLIC_API_URL` | Backend URL (local: `http://127.0.0.1:5000/api`) |

### Local Execution Runbook

1. **Database**: Run `engine-next-supabase/backend/database/migrations/01_init_schema.sql` in your Supabase SQL Editor.
2. **Backend**:
   ```bash
   cd engine-next-supabase/backend
   npm install
   npm run dev
   ```
3. **Frontend**:
   ```bash
   cd engine-next-supabase/frontend
   npm install
   npm run dev
   ```

## AI Integration & Prompts

- **Primary Provider**: Groq Cloud (LPU Inference)
- **Model**: `llama-3.3-70b-versatile`
- **Prompt**:
  ```text
  You are a Notification Prioritization Engine.
  - NOW: Critical security, OTP, or immediate fatal failure.
  - LATER: Warnings (low balance, disk space), daily updates, non-critical alerts.
  - NEVER: Spam, ads, gamification noise.
  Return strict JSON: {"priority":"NOW"|"LATER"|"NEVER", "reason":"string", "confidence":float}
  ```

### AI Failure Resilience

1. `axiosRetry` with 2 retries (500ms / 1000ms backoff) on network failure.
2. Hard 3-second timeout per LLM request.
3. 429 quota errors → instant fallback (no retry waste).
4. `catch` block → `circuitBreakerFailureCount++` → `fallBack(reason, 0.0)`.
5. Event assigned **LATER** + `is_fallback: true` + stored in `audit_logs` and `deferred_queue`.
6. After 5 consecutive failures → Circuit Breaker **OPEN** for 5 minutes.

## Key Design Decisions

### What the frontend does differently

- **Login "Stay" fix**: Token is held in React state only until the user confirms "Enter System". Clicking "Stay" discards credentials — no auto-login on modal dismiss.
- **Logout confirmation**: A confirmation modal prevents accidental session termination.
- **Rules null-safety**: `getRules` always returns `[]`, frontend guards `.find()` / `.filter()` with `Array.isArray()`.
- **Loaders everywhere**: Triple-ring spinner for page-level loading, skeleton rows/cards for data tables/lists.

### PostgreSQL vs MongoDB

`pg_trgm` provides superior near-duplicate text detection without external vector databases, and enforces relational integrity across event audits.

### Soft Deletes

All rule deletions set `is_active = false` — hard deletes are never executed, preserving full data recovery capability.

### Queue Scalability

The LATER queue uses a 1-minute `setInterval` poller. Production scale would require Redis/BullMQ, but this implementation demonstrates the full lifecycle (WAITING → PROCESSING → SENT / FAILED → DEAD_LETTER).

## Additional Documentation

- [TEST_CASES_DOCUMENTATION.md](./TEST_CASES_DOCUMENTATION.md) — 50+ structured manual test cases
- [engine-next-supabase/PLAN_OF_ACTION.md](./engine-next-supabase/PLAN_OF_ACTION.md) — Phased development log
- [engine-next-supabase/SYSTEM_WORKFLOW.md](./engine-next-supabase/SYSTEM_WORKFLOW.md) — Runtime logic and failure flows
- [engine-next-supabase/DEPLOYMENT.md](./engine-next-supabase/DEPLOYMENT.md) — Live URLs and cloud configuration

## Repository Hygiene

- Removed temporary debug scripts that were not part of runtime or build flow.
- Build artifacts and local caches (for example `node_modules`, `.next`, and `dist`) should remain untracked.
- Temporary local files (for example `*.tmp`, `*.bak`, and ad-hoc output logs) are now covered by `.gitignore` rules.

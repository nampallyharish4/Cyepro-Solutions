# Notification Prioritization Engine (Stack 1)

**Supabase · Express · Next.js · PostgreSQL + AI**

An intelligent notification management system that classifies events as **NOW** (critical), **LATER** (deferred), or **NEVER** (noise), with real AI integration, fail-safe architecture, and a mobile-first responsive dashboard.

---

## Live Deployments

| Service           | URL                                                     |
| ----------------- | ------------------------------------------------------- |
| Frontend (Vercel) | https://cyepro-solutions.vercel.app                     |
| Backend (Render)  | _(configured via Render dashboard)_                     |
| Health Endpoint   | `<BACKEND_URL>/health`                                  |
| GitHub Repository | https://github.com/nampallyharish4/Cyepro-Solutions.git |

### Demo Credentials (shown on login page)

| Role     | Email                 | Password      |
| -------- | --------------------- | ------------- |
| Admin    | `admin@cyepro.com`    | `password123` |
| Operator | `operator@cyepro.com` | `operator123` |

---

## Tech Stack

| Technology                | Version | Why                                                                                                     |
| ------------------------- | ------- | ------------------------------------------------------------------------------------------------------- |
| **Next.js**               | 15.5.12 | App Router with React 19 server components — fastest iteration for a mobile-first dashboard             |
| **Express.js**            | 5.2.1   | Lightweight, battle-tested HTTP framework for the REST API                                              |
| **TypeScript**            | 5.9.3   | Type safety across the full stack, catches contract mismatches at compile time                          |
| **Supabase (PostgreSQL)** | —       | Managed PostgreSQL with built-in auth infra, RPC functions, and `pg_trgm` for trigram similarity        |
| **Groq (Llama 3.3 70B)**  | —       | Sub-second LLM inference (~400ms) — chosen over OpenAI for speed in a real-time classification pipeline |
| **Google Gemini**         | —       | Automatic secondary fallback when Groq is unavailable or rate-limited                                   |
| **Tailwind CSS**          | 4.0.0   | Utility-first CSS for rapid mobile-first responsive design                                              |
| **Framer Motion**         | 12.35   | Production-grade animations for toast notifications, modals, and page transitions                       |
| **Recharts**              | 3.7.0   | Responsive charting library for dashboard metrics and trend visualization                               |
| **JSON Web Tokens**       | —       | Stateless auth with 24h expiry — lightweight for a single-backend architecture                          |
| **bcryptjs**              | 3.0.3   | Industry-standard password hashing with salt rounds                                                     |
| **Helmet**                | 8.0.0   | Security HTTP headers for production hardening                                                          |

---

## Setup & Running

### Prerequisites

- **Node.js** v18.0 or higher
- **npm** v9+ (or yarn)
- **Supabase account** — free tier works ([supabase.com](https://supabase.com))
- **Groq API key** — free tier at [console.groq.com](https://console.groq.com)
- **Google Gemini API key** _(optional fallback)_ — at [aistudio.google.com](https://aistudio.google.com)

### 1. Database Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Copy and run the contents of `backend/database/migrations/01_init_schema.sql`.
4. This creates all 6 tables (`users`, `notification_events`, `rules`, `system_settings`, `audit_logs`, `deferred_queue`), enables `pg_trgm`, and installs the RPC functions.

### 2. Backend Setup (`/backend`)

```bash
cd engine-next-supabase/backend
npm install
cp .env.example .env
# Edit .env with your actual keys (see Environment Variables below)
npm run dev                # Starts on http://localhost:5000
```

**Seed the database** (creates admin + operator accounts):

```bash
npx ts-node seed_user.ts
```

### 3. Frontend Setup (`/frontend`)

```bash
cd engine-next-supabase/frontend
npm install
cp .env.example .env.local
# Edit .env.local with your Supabase keys and API URL
npm run dev                # Starts on http://localhost:3000
```

### 4. Running Both Together

Open two terminal windows and start backend (`npm run dev` in `/backend`) and frontend (`npm run dev` in `/frontend`). The frontend auto-connects to `http://127.0.0.1:5000/api` by default.

---

## Environment Variables

### Backend (`.env`)

| Variable                    | Required | Description                                          | Where to Get                                                     |
| --------------------------- | -------- | ---------------------------------------------------- | ---------------------------------------------------------------- |
| `SUPABASE_URL`              | Yes      | Your Supabase project API URL                        | Supabase Dashboard → Settings → API → Project URL                |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes      | Service role key (bypasses RLS)                      | Supabase Dashboard → Settings → API → Service Role Key           |
| `PORT`                      | No       | Server port (default: `5000`)                        | Choose any available port                                        |
| `JWT_SECRET`                | Yes      | Secret for signing auth tokens                       | Generate with `openssl rand -hex 32` or any strong random string |
| `GROQ_API_KEY`              | Yes      | Groq Cloud API key for Llama-3.3                     | [console.groq.com](https://console.groq.com) → API Keys          |
| `GROQ_MODEL`                | No       | Groq model name (default: `llama-3.3-70b-versatile`) | See [Groq docs](https://console.groq.com/docs/models)            |
| `GEMINI_API_KEY`            | No       | Google Gemini key (fallback AI)                      | [aistudio.google.com](https://aistudio.google.com) → API Keys    |
| `MODEL_NAME`                | No       | Gemini model (default: `gemini-flash-latest`)        | See [Gemini docs](https://ai.google.dev/models)                  |
| `NODE_ENV`                  | No       | `development` or `production`                        | Set to `production` on Render                                    |
| `FRONTEND_URL`              | No       | Frontend origin for CORS (prod only)                 | Your Vercel deployment URL                                       |

### Frontend (`.env.local`)

| Variable                        | Required | Description                   | Where to Get                                                  |
| ------------------------------- | -------- | ----------------------------- | ------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Yes      | Supabase project URL          | Same as backend `SUPABASE_URL`                                |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes      | Supabase anonymous/public key | Supabase Dashboard → Settings → API → Anon Key                |
| `NEXT_PUBLIC_API_URL`           | Yes      | Backend API base URL          | `http://localhost:5000/api` locally, Render URL in production |

---

## Architecture Overview

The system flows through a **Deterministic → Intelligent → Fail-Safe** pipeline:

```
Incoming Event
    │
    ▼
┌─────────────────┐
│  Save to DB      │  Status: PENDING
│  Run Pipeline    │  Decision returned in API response
└────────┬────────┘
         ▼
┌─────────────────┐
│  Expiry Check    │  expires_at in the past? → NEVER
└────────┬────────┘
         ▼
┌─────────────────┐
│  Exact Dedup     │  Same dedupe_key exists? → NEVER
└────────┬────────┘
         ▼
┌─────────────────┐
│  Near-Duplicate  │  pg_trgm similarity > threshold → NEVER
│  (pg_trgm)       │
└────────┬────────┘
         ▼
┌─────────────────┐
│  Rule Engine     │  Human-configured rules, priority_order DESC
│                  │  First match wins → NOW/LATER/NEVER
└────────┬────────┘
         ▼
┌─────────────────┐
│  Fatigue Check   │  Per-user NOW count in last 60min > limit → LATER
└────────┬────────┘
         ▼
┌─────────────────┐
│  AI Classification│  Groq (Llama-3.3) → Gemini fallback → Safe fallback
│  (with circuit    │
│   breaker)        │
└────────┬────────┘
         ▼
┌─────────────────┐
│  Finalize        │  Write audit_log, update status, queue if LATER
│  + Status API    │  GET /api/notifications/:id for pending fallback polling
└─────────────────┘
```

### Layer Responsibilities

- **Express API Layer**: Request validation, rate limiting (500/15min), JWT auth, route dispatch
- **DecisionEngine**: Orchestrates the full pipeline — expiry check → dedup → rules → fatigue → AI → finalize
- **AIService**: Manages LLM calls with circuit breaker pattern, provider failover, and response parsing
- **SchedulerService**: Background job (1-min interval) processes LATER queue items, handles retries and dead-lettering
- **Supabase (PostgreSQL)**: All state management — events, rules, audit trail, deferred queue, system settings

---

## AI Integration

### LLM Provider & Model

- **Primary**: Groq — `llama-3.3-70b-versatile` (sub-second inference)
- **Fallback**: Google Gemini — `gemini-flash-latest` (activates when Groq fails)
- **Safe Fallback**: Rule-based — classifies as `LATER` when both providers fail

### Prompt Template

The exact system prompt used for classification:

```
You are a Notification Prioritization Engine. Classify each notification into exactly one category.

Rules:
- NOW: Critical security alerts, OTP/2FA codes, fraud detection, system outages, payment failures, unauthorized access. Anything requiring immediate human action.
- LATER: Warnings (low balance, disk space), informational updates, daily digests, non-critical status changes. Can wait minutes or hours.
- NEVER: Spam, promotional offers, gamification badges, social media likes, newsletters, marketing emails. No matter how "urgent" the language sounds.

Important: Judge by actual content severity, NOT by urgent-sounding words like "CRITICAL", "URGENT", "LAST CHANCE" in promotional/marketing contexts.

Return ONLY valid JSON: {"priority":"NOW"|"LATER"|"NEVER", "reason":"concise explanation", "confidence":0.0-1.0}
```

**User content** sent to the model:

```
Title: {event.title}
Message: {event.message}
Type: {event.event_type}
Source: {event.source}
Hint: {event.priority_hint}  (if provided)
```

### AI Response Parsing

1. AI returns JSON: `{"priority": "NOW", "reason": "Critical security alert", "confidence": 0.95}`
2. `safeParseJSON()` attempts `JSON.parse()` first; if it fails, extracts JSON from markdown code blocks
3. `normalizePriority()` validates the priority is one of `NOW | LATER | NEVER`; defaults to `LATER` for unrecognized values
4. Confidence is clamped to `[0.0, 1.0]`; reason is truncated to 500 chars
5. Every AI result is stored in `audit_logs` with: `ai_used`, `ai_model`, `ai_confidence`, `is_fallback`

### What Happens When AI Is Unavailable

1. **Timeout**: Groq call has a strict 3-second timeout; Gemini has a 2-second timeout
2. **Retry**: `axiosRetry` attempts 2 retries with 500ms/1000ms exponential backoff before giving up
3. **Provider Failover**: If Groq fails, system automatically tries Gemini
4. **Circuit Breaker**: After 5 consecutive failures, the circuit opens for 5 minutes — all subsequent events skip AI entirely
5. **Safe Fallback**: Events are classified as `LATER` with reason `"Safe Fallback: {error detail}"` and confidence `0.0`
6. **Audit Trail**: Fallback decisions are logged with `is_fallback: true`, `ai_model: "fallback-engine"`
7. **Health Endpoint**: `GET /health` reports `ai_service.status: "CIRCUIT_OPEN"` so monitoring can alert
8. **Dashboard**: The frontend health bar shows AI circuit status in real-time

---

## UI Screens

1. **Login** — Email/password auth with mock credentials shown directly on the page
2. **Signup** — New account creation with live password strength meter and validation
3. **Event Simulator** — Submit test notification events with all input fields; see classification results in real-time
4. **Live Dashboard** — Auto-refreshing (8s polling) metrics, charts, rule efficiency, noise sources, AI performance
5. **Audit Log** — Searchable, filterable, paginated history with expandable trace details
6. **LATER Queue** — Deferred items with status filtering, force-send capability, and countdown timers
7. **Rules Manager** — CRUD for classification rules, fatigue threshold config, dry-run validation sandbox
8. **Intelligence Settings** — Dynamic control of AI model, dedupe threshold, fatigue limit, queue delay

---

## Documentation

- [SYSTEM_WORKFLOW.md](./SYSTEM_WORKFLOW.md) — Detailed runtime execution flows

## Cleanup Notes

- Removed non-essential local debug scripts from `backend/` and `frontend/`.
- Generated directories such as `backend/dist`, `frontend/.next`, and package manager installs must not be committed.
- `.gitignore` rules were expanded to ignore common temporary and backup files.
- [PLAN_OF_ACTION.md](./PLAN_OF_ACTION.md) — Phased development log with reasoning
- [ARCHITECTURE_DECISIONS.md](./ARCHITECTURE_DECISIONS.md) — Technical decision justifications
- [DEPLOYMENT.md](./DEPLOYMENT.md) — Live URLs and production environment specs
- [TEST_CASES_DOCUMENTATION.md](./TEST_CASES_DOCUMENTATION.md) — Structured test cases and verification

---

## Known Limitations

1. **Single Stack**: This submission focuses on Stack 1 (Supabase + Next.js). The architecture is designed for portability — the frontend communicates via a standard REST contract, so pointing it at a Spring Boot backend requires zero frontend changes.
2. **Polling, Not WebSockets**: The dashboard and simulator use HTTP polling (5–8s intervals) rather than WebSocket push. For production scale, WebSocket or Server-Sent Events would eliminate polling overhead.
3. **LATER Queue Delivery**: The scheduler marks items as "SENT" but does not push to an actual notification channel (e.g., email, push notification). In production, this would integrate with a delivery provider.
4. **Near-Duplicate Scope**: `pg_trgm` similarity compares only `title` text for the same `user_id` within 24 hours. At high volumes (millions/hour), a dedicated vector database or `pgvector` would provide better semantic matching.
5. **No OpenTelemetry**: Basic audit traces exist in the decision pipeline, but full distributed tracing (OpenTelemetry) would improve observability in a multi-service architecture.
6. **Rate Limiting**: Global rate limit of 500 requests per 15 minutes per IP. Per-user rate limiting would be more granular for production.

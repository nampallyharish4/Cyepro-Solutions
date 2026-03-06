# Notification Prioritization Engine (SENS Stack)

**Supabase · Express · Next.js · Supabase (PostgreSQL)**

This project implements an intelligent notification management system that classifies events, prevents spam, and ensures critical alerts reach users immediately (NOW), while deferring informational ones (LATER) or dropping noise (NEVER).

## Live Deployments

- **Frontend (Vercel)**: `[Paste your Vercel URL here]`
- **Backend (Render)**: `https://cyepro-notification-engine-backend.onrender.com`
- **Health Endpoint**: `https://cyepro-notification-engine-backend.onrender.com/health`

## Tech Stack

- **Frontend**: Next.js 14 (App Router) with Tailwind CSS, Framer Motion, and Recharts. Chosen for its performance, SEO-friendliness, and rapid development of premium management consoles.
- **Backend**: Express.js with TypeScript and Supabase Admin SDK. Chosen for reliability in orchestration and simple AI integration.
- **Database**: Supabase (PostgreSQL). Chosen over MongoDB for strict schema safety, relational integrity (essential for audit trails), and advanced text similarity features (`pg_trgm`).
- **AI**: **Groq (Llama-3.3-70b)** for ultra-fast (sub-second) classification logic. Google Gemini 1.5 Flash is maintained as an active fallback layer.

## Setup & Running

### Prerequisites

- Node.js v18+
- npm or yarn
- Supabase Project (for PostgreSQL)

### Environment Variables

You must create `.env` files using `.env.example` as a template.

**Backend (`backend/.env`)**
- `SUPABASE_URL`: The URL to your Supabase project (from your Supabase dashboard).
- `SUPABASE_SERVICE_ROLE_KEY`: The secret service role key to bypass RLS for admin tasks.
- `GROQ_API_KEY`: API Key from Groq Cloud for fast Llama-3 inference.
- `MODEL_NAME`: The model string (e.g., `llama-3.3-70b-versatile`).
- `GEMINI_API_KEY`: (Optional fallabck) Google Gemini API Key.
- `JWT_SECRET`: A secret string used to sign auth tokens for the admin login.
- `PORT`: (Optional) Port to run the server on, default 5000.

**Frontend (`frontend/.env`)**
- `NEXT_PUBLIC_SUPABASE_URL`: The URL to your Supabase project.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: The public anon key for Supabase client.
- `NEXT_PUBLIC_API_URL`: The URL pointing to your backend (e.g., `http://127.0.0.1:5000/api` locally, or `https://cyepro-notification-engine-backend.onrender.com/api` in production).

### 1. Database Setup

1. Create a new Supabase project.
2. Run the SQL script found in `backend/database/migrations/01_init_schema.sql` in the Supabase SQL Editor. This will enable `pg_trgm`, create tables, and set up the near-duplicate detection RPC.

### 2. Backend Setup

1. `cd backend`
2. `npm install`
3. Copy `.env.example` to `.env` and fill in your Supabase and Groq/Gemini keys.
4. `npm run dev` (Runs on port 5000)

### 3. Frontend Setup

1. `cd frontend`
2. `npm install`
3. Copy `.env.local.example` up to `.env.local` and fill in your Supabase and local API URL (`http://127.0.0.1:5000/api`).
4. `npm run dev` (Runs on port 3000)

## Architecture Overview

The system flows through a **Deterministic -> Intelligent -> Fail-Safe** pipeline:

1. **Deduplication**: Checks for exact `dedupe_key` or 80%+ text similarity in the last 24h using pg_trgm.
2. **Rules**: Evaluates human-defined patterns (e.g., "Source: SECURITY -> NOW") from the Rules Manager.
3. **AI Analysis (Asynchronous)**: If undecided by rules, Groq (Llama-3.3-70b) performs sub-second semantic analysis.
4. **Fatigue Check**: Prevents spam by capping "NOW" notifications (Admin configurable thresholds).
5. **Fail-Safe**: Hard 3-second timeout. If AI fails or rate limits, a circuit breaker trips, and the engine defaults to a "Safe LATER" priority with a fallback reason.

## Documentation
- [PLAN_OF_ACTION.md](./PLAN_OF_ACTION.md) — Day-by-day development log.
- [SYSTEM_WORKFLOW.md](./SYSTEM_WORKFLOW.md) — Detailed runtime logic and failure flows.
- [ARCHITECTURE_DECISIONS.md](./ARCHITECTURE_DECISIONS.md) — Justification for tech choices.
- [DEPLOYMENT.md](./DEPLOYMENT.md) — Live URLs and production setup instructions.

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
- **Parsing Output**: The system expects a strict JSON object back. It parses `priority`, `reason`, and `confidence` and passes it to the Decision Engine to route the notification.

### What happens when the AI is unavailable?
1. The backend implements `axios-retry` to attempt exactly 1 rapid retry if the initial Groq network request fails.
2. If the request times out (hard 3-second limit) or receives a 429 Quota error, the system throws an error.
3. The `catch` block intercepts the error, increments a static `circuitBreakerFailureCount`, and logs the failure locally.
4. The system immediately executes `fallBack(friendlyError, 0.0)`.
5. The original event is gracefully assigned a `LATER` priority and an explainable reason (e.g., "Safe Fallback: AI Quota Exceeded").
6. The event is safely stored in the DB and queued for later background processing, ensuring zero data loss.
7. If 5 consecutive failures happen, the Circuit Breaker trips OPEN, meaning all subsequent events bypass the AI entirely for 5 minutes, instantly receiving the safe fallback to protect system resources.

## Known Limitations

1. **Single Stack Submission**: Due to time constraints and a focus on building one high-quality, production-ready, fail-safe architecture, the Java/Spring Boot stack was not completed. This submission relies solely on the Node.js/Next.js/Supabase implementation to demonstrate deep feature completeness (circuit breaking, pg_trgm near-duplicate detection, and dynamic alert fatigue configuration).
2. **PostgreSQL vs MongoDB**: I intentionally elected to use Supabase (PostgreSQL) instead of MongoDB. While MongoDB is traditionally "MERN", PostgreSQL's `pg_trgm` extension is dramatically superior for near-duplicate text detection without relying on heavy external vector databases.
3. **Queue Scalability**: The `LATER` queue is processed by a simple `setInterval` background poller running on the main Node thread. For massive production scale, this would block the event loop and would need to be moved to a dedicated Redis/BullMQ worker cluster.

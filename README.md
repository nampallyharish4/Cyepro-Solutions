# Cyepro AI - Notification Prioritization Engine

## Overview
This project implements an intelligent notification management system that classifies events, prevents spam, and ensures critical alerts reach users immediately (NOW), while deferring informational ones (LATER) or dropping noise (NEVER).

The system flows through a **Deterministic -> Intelligent -> Fail-Safe** pipeline:
1. **Deduplication**: Checks for exact `dedupe_key` or 80%+ text similarity in the last 24h using PostgreSQL `pg_trgm`.
2. **Rules**: Evaluates human-defined patterns from the Rules Manager.
3. **AI Analysis (Asynchronous)**: If undecided by rules, Groq (Llama-3.3-70b-versatile) performs sub-second semantic analysis.
4. **Fatigue Check**: Prevents spam by capping "NOW" notifications (Admin configurable custom thresholds).
5. **Fail-Safe Circuit Breaker**: Hard 3-second timeout. If AI fails, an exponential retry kicks in. If that fails, a circuit breaker trips, and the engine defaults to a "Safe LATER" priority with a fallback reason to guarantee zero data loss.

## Live Deployments
- **Frontend (Vercel)**: `[Paste your Vercel URL here]`
- **Backend (Render)**: `https://cyepro-notification-engine-backend.onrender.com`
- **Health Endpoint**: `https://cyepro-notification-engine-backend.onrender.com/health`

## Tech Stack
- **Frontend**: Next.js 16 (App Router) with Tailwind CSS, Framer Motion, and Recharts. Chosen for its performance, SEO-friendliness, and rapid development of premium management consoles.
- **Backend**: Node.js/Express.js with TypeScript and Supabase Admin SDK. Chosen for reliability in orchestration and simple AI integration.
- **Database**: Supabase (PostgreSQL). Chosen over MongoDB for strict schema safety, relational integrity (essential for audit trails), and advanced text similarity features (`pg_trgm`).
- **AI**: **Groq (Llama-3.3-70b-versatile)** for ultra-fast (sub-second) classification logic. Google Gemini is available as an active fallback layer.

## Setup & Running

### Prerequisites
- Node.js v18+
- npm or yarn
- Supabase Project (PostgreSQL)

### Environment Variables
You must create `.env` files in both the frontend and backend using the `.env.example` configurations as templates.

**Backend (`engine-next-supabase/backend/.env`)**
- `SUPABASE_URL`: The URL to your Supabase project.
- `SUPABASE_SERVICE_ROLE_KEY`: The secret service role key to bypass RLS.
- `GROQ_API_KEY`: API Key from Groq Cloud for fast Llama-3 inference.
- `MODEL_NAME`: The model string (e.g., `llama-3.3-70b-versatile`).
- `GEMINI_API_KEY`: (Optional fallback) Google Gemini API Key.
- `JWT_SECRET`: A secret string used to sign auth tokens for the admin login.
- `PORT`: (Optional) Port to run the server on, default 5000.

**Frontend (`engine-next-supabase/frontend/.env.local`)**
- `NEXT_PUBLIC_SUPABASE_URL`: The URL to your Supabase project.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: The public anon key for Supabase client.
- `NEXT_PUBLIC_API_URL`: The URL pointing to your backend (e.g., `http://127.0.0.1:5000/api` locally, or `https://cyepro-notification-engine-backend.onrender.com/api` in production).

### Local Execution Runbook
1. **Database**: Run the SQL schema found in the database directory in your Supabase SQL Editor to provision your `pg_trgm` extensions, `audit_logs`, `rules`, and `notification_events` tables.
2. **Backend**:
   ```bash
   cd engine-next-supabase/backend
   npm install
   npm run build
   npm start
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
- **Prompt Formulation**: 
  ```text
  You are a Notification Prioritization Engine. 
  - NOW: Critical security, OTP, or immediate fatal failure.
  - LATER: Warnings (low balance, disk space), daily updates, non-critical alerts.
  - NEVER: Spam, ads, gamification noise.
  Return strict JSON: {"priority":"NOW"|"LATER"|"NEVER", "reason":"string", "confidence":float}
  ```
- **Parsing Output**: The system expects a strict JSON object back. It parses `priority`, `reason`, and `confidence` and passes it to the Decision Engine to route the notification.

### What happens when the AI is unavailable? (Architecture Resilience)
1. The backend implements `axios-retry` using an exponential backoff to attempt rapid retries if the initial Groq network request fails.
2. If all requests time out (hard 3-second limit per request) or receives a 429 Quota Rate Limit error, the system throws a localized exception.
3. The `catch` block intercepts the error, increments a static `circuitBreakerFailureCount`, and logs the failure locally.
4. The system immediately executes `fallBack(friendlyError, 0.0)`.
5. The original event is gracefully assigned a `LATER` priority and an explainable reason (e.g., "Safe Fallback: Authorization Network Error").
6. The event is safely stored in the Audit Database and queued for later background processing, ensuring **zero data loss for the business**.
7. If the Circuit Breaker trips completely OPEN, it means all subsequent events bypass the AI entirely for 5 minutes, instantly receiving the safe fallback, serving to protect and backoff API system resources.

## Known Limitations & Deliberate Design Choices
1. **Single Stack Submission Requirement**: Due to time constraints and a focus on building one high-quality, production-ready, fail-safe architecture, the Java/Spring Boot stack was omitted. This assignment relies exclusively on the Node.js/Next.js/Supabase implementation to demonstrate deep feature completeness across the core requirements (exponential circuit breaking, `pg_trgm` PostgreSQL near-duplicate detection, soft-deletion architectures, and dynamic runtime alert fatigue modification).
2. **PostgreSQL vs MongoDB**: I intentionally elected to use Supabase (PostgreSQL) instead of MongoDB. While MongoDB is traditionally "MERN", PostgreSQL's `pg_trgm` extension is dramatically superior for exact string and near-duplicate text semantic detection without relying on heavy external vector databases. Furthermore, it strictly enforces relational integrity across event audits!
3. **Queue Scalability**: The `LATER` queue is currently processed by an async background interval poller running on the main Node thread. For massive production scale, this would temporarily throttle the V8 event loop and would need to be moved to a dedicated Redis/BullMQ worker cluster architecture.
4. **Soft Deletes Protocol**: Deletions in the frontend AI Rules Engine execute a database soft-delete (modifying an `is_active` boolean flag) to strictly adhere to the prompt requirement that "deleted data must be recoverable — hard deletes are not acceptable."

## Additional Documentation
- [TEST_CASES_DOCUMENTATION.md](./TEST_CASES_DOCUMENTATION.md) - Outlines full manual testing instructions mimicking real-world edge cases. Explains exactly how a reviewer can intentionally break the AI API Key logic in the `.env` to visually demonstrate the Circuit Breaker saving data!
- [ARCHITECTURE_DECISIONS.md](./engine-next-supabase/ARCHITECTURE_DECISIONS.md) - Full technical details and justification on tech stack choice and design flow.
- [DEPLOYMENT.md](./engine-next-supabase/DEPLOYMENT.md) - Exact live URLs and cloud configuration details.
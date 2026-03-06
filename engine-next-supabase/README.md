# Notification Prioritization Engine (SENS Stack)

**Supabase · Express · Next.js · Supabase (PostgreSQL)**

This project implements an intelligent notification management system that classifies events, prevents spam, and ensures critical alerts reach users immediately (NOW), while deferring informational ones (LATER) or dropping noise (NEVER).

## Live Deployments (Mock)

- **Frontend (Vercel)**: `https://cyepro-ai-frontend.vercel.app`
- **Backend (Railway/AWS)**: `https://cyepro-ai-backend.up.railway.app`
- **Health Endpoint**: `https://cyepro-ai-backend.up.railway.app/health`

## Tech Stack

- **Frontend**: Next.js 14 (App Router) with Tailwind CSS, Framer Motion, and Recharts. Chosen for its performance, SEO-friendliness, and rapid development of premium management consoles.
- **Backend**: Express.js with TypeScript and Supabase Admin SDK. Chosen for reliability in orchestration and simple AI integration.
- **Database**: Supabase (PostgreSQL). Chosen over MongoDB for strict schema safety, relational integrity (essential for audit trails), and advanced text similarity features (`pg_trgm`).
- **AI**: **Groq (Llama-3.3-70b)** for ultra-fast (sub-second) classification logic. Google Gemini 1.5 Flash is maintained as an active fallback layer.

## Setup & Running

### Prerequisites

- Node.js v18+
- Supabase Project URL & Keys
- Groq API Key (Primary)
- Google Gemini API Key (Fallback)

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
- **Prompt**: "You are a Notification Prioritization Engine. 
  - NOW: Critical security, OTP, or immediate fatal failure.
  - LATER: Warnings, daily updates, non-critical alerts.
  - NEVER: Spam, ads, gamification noise.
  Format Output as JSON: { "priority": "...", "reason": "...", "confidence": ... }"
- **Reliability**: Asynchronous pipeline with 3s timeout and Circuit Breaker logic. Fallback automatically routes to "LATER" to ensure no data loss.


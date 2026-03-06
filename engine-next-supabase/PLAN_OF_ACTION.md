# Plan of Action — Engine Execution

This document outlines the phased development of the Notification Prioritization Engine across two days of rapid prototyping and optimization.

## Day 1: Foundation & Core Logic
- **Goal**: Establish a working pipeline from ingestion to classification.
- **Milestones**:
  - [x] Initialized **Supabase Project** and defined relational schema (Events, Audit Logs, Rules).
  - [x] Implemented **Deduplication Engine** using `pg_trgm` for similarity matching.
  - [x] Built the **Deterministic Rules Manager** (Static and Dynamic protocols).
  - [x] Created the **Next.js Frontend** with live polling against the Express API.
  - [x] Integrated basic AI Classification using Google Gemini.

## Day 2: Optimization & Resilience (Current)
- **Goal**: Make the system production-grade, fast, and fail-safe.
- **Milestones**:
  - [x] **Latency Optimization**: Switched to **Groq (Llama-3.3-70b)** for sub-second classification response.
  - [x] **Resilience Layer**: Implemented a **3-second hard timeout** and a **Circuit Breaker** to protect the API during outages.
  - [x] **Fallback Engine**: Automated routing to "LATER" (Safe Default) during 429 Quota errors or timeouts.
  - [x] **Alert Fatigue**: Implemented dynamic user threshold tracking (e.g., max 5 critical alerts per minute).
  - [x] **Deployment Prep**: Verified the advanced `/health` endpoint and secured `.gitignore` against secret leaks.
  - [x] **Documentation Clean-up**: Finalizing README, SYSTEM_WORKFLOW, and ARCHITECTURE_DECISIONS.

## Future Roadmap
- **Scalability**: Move from polling to a genuine Message Broker (RabbitMQ/BullMQ).
- **Security**: Implement JWT-based RBAC for individual Rules management.
- **Observability**: Integrate OpenTelemetry for deep tracing of the decision pipeline.

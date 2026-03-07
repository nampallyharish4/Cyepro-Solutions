# Plan of Action — Engine Execution

This document outlines the phased development of the Notification Prioritization Engine, including the reasoning behind sequencing decisions and lessons learned.

---

## Phase 0: Database Design First

- **Why DB First?**: The entire system revolves around event lifecycle state — ingestion, deduplication, rule matching, AI classification, audit logging, and deferred queue management. Designing the relational schema upfront forced me to think through every state transition before writing a single line of application code.
- **Key Schema Decisions**:
  - `notification_events` as the central fact table with `status` tracking (PENDING → PROCESSED → FAILED)
  - `audit_logs` linked via `event_id` foreign key for immutable decision records
  - `deferred_queue` as a separate table (not a filtered view of audit_logs) to support retry semantics, `process_after` scheduling, and optimistic concurrency via `status` guard (WAITING → PROCESSING → SENT / FAILED → DEAD_LETTER)
  - `rules` with `is_active` soft-delete pattern and `priority_order` for deterministic evaluation ordering
  - `pg_trgm` extension installed at migration time to enable indexed trigram similarity for near-duplicate detection

## Phase 1: Core Pipeline Without AI

- **Goal**: Validate the full ingestion → deduplication → rule engine → audit pipeline using only deterministic logic.
- **Milestones**:
  - [x] Implemented `POST /api/notifications` with deduplication (exact `dedupe_key` + fuzzy `title` similarity via `pg_trgm`)
  - [x] Built the deterministic rule engine evaluating `source`, `type`, `title_contains`, and `metadata_match` conditions in `priority_order`
  - [x] Created audit log entries recording every decision with structured `reason` text
  - [x] Tested full pipeline end-to-end with only rules — no AI calls — confirming correct NOW/LATER/NEVER outcomes
- **Why Before AI?**: This confirmed the pipeline was sound before introducing the highest-risk, highest-latency component (LLM calls). If AI fails, the deterministic path must still produce correct results — testing this path first ensures the fallback is never broken.

## Phase 2: AI Integration & Resilience

- **Goal**: Add intelligent classification and make the system resilient to AI failures.
- **Milestones**:
  - [x] Integrated **Groq (Llama-3.3-70b-versatile)** as primary AI service for sub-second classification
  - [x] Added **Google Gemini** as automatic fallback when Groq fails or is rate-limited
  - [x] Implemented **3-second hard timeout**, **circuit breaker** (5 failures → 5 min cooldown), and **instant 429 quota fallback**
  - [x] Built the "Fail-Safe" pipeline stage — when both AI providers fail, events default to LATER with a clear audit reason
  - [x] Alert fatigue tracking: per-user NOW count within a 60-minute sliding window, backed by DB query against `audit_logs`

## Phase 3: Frontend Sequenced Against Backend

- **Goal**: Build the dashboard, simulator, audit viewer, rules manager, and deferred queue UI.
- **Sequencing Strategy**: The backend API contract was frozen after Phase 2, so frontend development could proceed without chasing a moving target.
- **Milestones**:
  - [x] **Login** → JWT auth, token stored in localStorage, shared axios interceptor adds Bearer header to all requests
  - [x] **Simulator** → POST form submitting to `/api/notifications`, polling `/api/audit` for real-time classification result display
  - [x] **Dashboard** → Metrics summary + PieChart (distribution) + AreaChart (24h hourly trend via `/api/metrics/timeline`)
  - [x] **Audit Log** → Filterable/searchable table with decision badges and AI confidence display
  - [x] **Rules Manager** → CRUD with inline edit, system fatigue threshold control, `metadata_match` condition type
  - [x] **Deferred Pipeline** → Real queue data from `/api/deferred-queue`, dynamic remaining-time calculation, functional Force Send button

## Phase 4: Hardening & Documentation

- **Milestones**:
  - [x] JWT auth middleware protecting all API routes (admin-only for rule mutations)
  - [x] Scheduler retry logic: MAX_RETRIES=3, optimistic concurrency (PROCESSING status), DEAD_LETTER for exhausted items
  - [x] Seed script using upsert pattern (no hard deletes)
  - [x] Comprehensive README, SYSTEM_WORKFLOW, ARCHITECTURE_DECISIONS

---

## What I Would Do Differently

1. **WebSocket Instead of Polling**: The simulator polls at 800ms intervals to show classification results. A WebSocket or SSE (Server-Sent Events) connection would reduce overhead and deliver results instantly. This was a pragmatic tradeoff for build speed.

2. **Proper Job Queue**: The 1-minute polling scheduler works but introduces up to 60s latency for deferred items. In production, a BullMQ/Redis-backed job queue with precise delay scheduling would be strictly better.

3. **Stack 2 (Spring Boot)**: Time constraints prevented building the second stack. The architecture is deliberately decoupled — the frontend talks exclusively to a JSON API — so a Spring Boot backend with the same endpoints and schema would slot in without frontend changes.

4. **End-to-End Tests**: While the system was manually tested through the simulator, automated integration tests (e.g., with Supertest for API routes, Playwright for the frontend) would catch regressions and serve as living documentation.

5. **Observability**: Adding structured logging (correlation IDs per event) and OpenTelemetry traces through the decision pipeline would make debugging production issues far easier than relying on console output.

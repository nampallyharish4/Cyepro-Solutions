# Plan of Action — Engine Execution

This document outlines the phased development of the Notification Prioritization Engine, including reasoning behind sequencing decisions and lessons learned.

---

## Phase 0: Database Design First

- **Why DB First?**: The entire system revolves around event lifecycle state — ingestion, deduplication, rule matching, AI classification, audit logging, and deferred queue management. Designing the relational schema upfront forced me to think through every state transition before writing a single line of application code.
- **Key Schema Decisions**:
  - `notification_events` as the central fact table with `status` tracking (`PENDING → PROCESSED → FAILED`)
  - `audit_logs` linked via `event_id` foreign key for immutable decision records
  - `deferred_queue` as a separate table (not a filtered view) to support retry semantics, `process_after` scheduling, and optimistic concurrency via `status` guard (`WAITING → PROCESSING → SENT / FAILED → DEAD_LETTER`)
  - `rules` with `is_active` soft-delete pattern and `priority_order` for deterministic evaluation
  - `pg_trgm` extension installed at migration time for indexed trigram similarity (near-duplicate detection)

---

## Phase 1: Core Pipeline Without AI

- **Goal**: Validate the full ingestion → deduplication → rule engine → audit pipeline using only deterministic logic.
- **Milestones**:
  - [x] `POST /api/notifications` with exact `dedupe_key` + fuzzy `title` similarity via `pg_trgm`
  - [x] Deterministic rule engine evaluating `source`, `type`, `title_contains`, `metadata_match` in `priority_order DESC`
  - [x] Audit log entries recording every decision with structured `reason` text
  - [x] End-to-end pipeline test with only rules — no AI — confirming correct NOW/LATER/NEVER outcomes
- **Why Before AI?**: Confirmed the pipeline was sound before introducing the highest-risk, highest-latency component. If AI fails, the deterministic path must still work — testing it first ensures the fallback is never broken.

---

## Phase 2: AI Integration & Resilience

- **Goal**: Add intelligent classification and make the system resilient to AI failures.
- **Milestones**:
  - [x] **Groq (Llama-3.3-70b-versatile)** as primary AI service for sub-second classification
  - [x] **Google Gemini** as automatic fallback when Groq fails or is rate-limited
  - [x] **3-second hard timeout**, **circuit breaker** (5 failures → 5 min cooldown), and **instant 429 quota fallback**
  - [x] "Fail-Safe" pipeline stage — when both providers fail, events default to `LATER` with a clear audit reason
  - [x] Alert fatigue tracking: per-user NOW count within a 60-minute sliding window, backed by DB query on `audit_logs`
  - [x] `getRules` null-safety: backend always returns `[]` on error, frontend guards `.find()` / `.filter()` with `Array.isArray()` check

---

## Phase 3: Frontend Sequenced Against Backend

- **Goal**: Build the dashboard, simulator, audit viewer, rules manager, and deferred queue UI.
- **Sequencing Strategy**: Backend API contract was frozen after Phase 2 so frontend could proceed without chasing a moving target.
- **Milestones**:
  - [x] **Login** → JWT auth modal: token held in state, only committed to `localStorage` on "Enter System"
  - [x] **Signup** → Live password-strength meter, email format validation, duplicate-email detection, success/error modals
  - [x] **Simulator** → POST form → `/api/notifications`, polling `/api/audit` for real-time classification result
  - [x] **Dashboard** → Metrics summary + PieChart + AreaChart (24h timeline) + 3 health badges + 3 recent activity items
  - [x] **Audit Log** → Filterable/searchable, paginated, expandable rows with AI confidence display
  - [x] **Rules Manager** → CRUD with inline edit, system fatigue threshold, API error banner with Retry button
  - [x] **Deferred Pipeline** → Real queue from `/api/deferred-queue`, remaining-time countdown, Force Send button

---

## Phase 4: UX Hardening & Polish

- **Milestones**:
  - [x] **Logout confirmation modal** — clicking Logout opens a modal; only confirmed logout clears session
  - [x] **Shared loader components** — `PageLoader` (triple-ring spinner), `SkeletonRow` (tables), `SkeletonCard` (cards)
  - [x] **Auth guard loader** — `fixed inset-0` full-screen triple-ring centered spinner while verifying token
  - [x] **Login "Stay" bug fix** — token no longer auto-saved before modal confirmation
  - [x] JWT auth middleware protecting all API routes (admin-only for rule mutations)
  - [x] Scheduler retry logic: `MAX_RETRIES = 3`, optimistic concurrency (`PROCESSING` status guard), `DEAD_LETTER` for exhausted items
  - [x] Seed script using upsert pattern (no hard deletes)
  - [x] Comprehensive README, SYSTEM_WORKFLOW, PLAN_OF_ACTION, DEPLOYMENT docs

---

## What I Would Do Differently

1. **WebSocket Instead of Polling**: The simulator polls at 800ms intervals for classification results. A WebSocket or SSE connection would reduce overhead and deliver results instantly. Pragmatic tradeoff for build speed.

2. **Proper Job Queue**: The 1-minute polling scheduler works but introduces up to 60s latency for deferred items. In production, BullMQ/Redis with precise delay scheduling would be strictly better.

3. **Stack 2 (Spring Boot)**: Time constraints prevented building the second stack. The architecture is deliberately decoupled — the frontend talks to a JSON API — so a Spring Boot backend with the same endpoints and schema would slot in without frontend changes.

4. **End-to-End Tests**: While the system was manually tested through the simulator, automated integration tests (Supertest for API, Playwright for the frontend) would catch regressions.

5. **Observability**: Structured logging with correlation IDs per event and OpenTelemetry traces through the decision pipeline would make debugging production issues far easier than relying on console output.

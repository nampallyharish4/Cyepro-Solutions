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

## Phase 5: High-Fidelity Intelligence & Advanced Control

- **Goal**: Transform the dashboard into a strategic intelligence hub and provide advanced control over rule logic.
- **Milestones**:
  - [x] **Command Dashboard 2.0** — High-fidelity analytics: Area charts for cognitive trends, Pie charts for logic distribution, and real-time AI Confidence monitors.
  - [x] **Rule Efficiency Analytics** — Integrated hit-rate tracking for deterministic protocols to measure rule ROI.
  - [x] **Noise Attribution Engine** — Automated identification of high-volume sources contributing to NEVER/LATER outcomes (spam detection).
  - [x] **Rule Sandbox (Dry Run)** — Full-flight validation suite in the Rules Manager; simulate packet matching against protocol logic before production commit.
  - [x] **System Pulse Telemetry** — Persistent navigation heartbeat showing system vitality and active AI model architecture (DeepSeek/Gemini/Llama).
  - [x] **Intelligence Tuning Hub** — Centralized settings manager for dynamic control of engine thresholds, intervals, and AI models.
  - [x] **Advanced Simulator 2.0** — Immersive "Forensic Terminal" for packet injection with deep decision-vector visualization (Source, Reason, Rule ID, AI Confidence).
  - [x] **Auth Gateway Hardening** — Removal of development credentials and implementation of "Clean Slate" form resets for secure access.

---

## Future Roadmap & Lessons Learned

1. **Edge Intelligence (Planned)**: Moving deterministic rule evaluation to the network edge (Vercel Edge / Cloudflare Workers) to bypass the main engine for high-volume, low-complexity packets.
2. **LLM-Logic Co-evolution**: Using processed event history to suggest *new* deterministic rules, closing the loop between AI observation and deterministic automation.
3. **Observability**: While basic audit traces exist, full OpenTelemetry integration would provide industry-standard tracing for complex decision trees.
4. **WebSocket Real-time**: The transition from polling to WebSockets for the Simulator and Dashboard would further enhance the "Live Engine" feel.
5. **Multi-Backend Interop**: The architecture is ready for a Spring Boot (Stack 2) migration, as all contracts represent a standard JSON REST API.

# System Workflow — Notification Prioritization Engine

This document describes the runtime execution flows for the Next.js + Supabase implementation of the engine.

---

## 1. Happy Path — Event Submission

1. **User Interaction**: An operator submits a notification event via the **Event Simulator** in the Next.js frontend.
2. **API Request**: The frontend sends a `POST /api/notifications` to the Express backend.
3. **Initial Storage**:
   - The backend saves the raw event to `notification_events` (status `PENDING`).
   - API immediately returns `202 Accepted` with the `event_id`.
4. **Asynchronous Pipeline**: The `DecisionEngine` triggers processing in the background.
5. **Deduplication**:
   - **Exact**: Checks matching `dedupe_key`.
   - **Near-Duplicate**: PostgreSQL `pg_trgm` similarity > 0.8 against same user's events in last 24h.
6. **Rule Engine**: Evaluates all active rules ordered by `priority_order DESC`. First match wins; AI is bypassed.
7. **Alert Fatigue**: If still undecided, counts per-user NOW decisions in the last 60 minutes against the `FATIGUE_LIMIT` system rule (configurable from the Rules UI without restart).
8. **AI Analysis**: If no deterministic match, **Groq (Llama-3.3-70b-versatile)** classifies the event with a 3-second timeout and 2-retry backoff. Google Gemini serves as automatic secondary fallback.
9. **Finalization**:
   - Entry created in `audit_logs` with decision (NOW/LATER/NEVER), reason, AI metadata.
   - `notification_events` status updated to `PROCESSED`.
   - If LATER: entry added to `deferred_queue` with `process_after = now + 30min`.
   - Dashboard auto-refreshes via 5-second polling interval.

---

## 2. Failure Path — AI Service Unavailable

1. **Network Timeout**: `AIService` enforces a strict **3-second timeout** on all LLM calls.
2. **Quota Handling**: 429 rate-limit errors skip retry chains to deliver an immediate safe fallback.
3. **Retry**: `axiosRetry` attempts 2 retries (500ms, 1000ms backoff) before throwing.
4. **Circuit Breaker**: If failures exceed 5, the breaker opens for **5 minutes** — subsequent events skip AI entirely.
5. **Fallback Trigger**: `AIService.fallBack()` executes.
6. **Fallback Classification**: Event is assigned **LATER** with a friendly reason (e.g., `"Safe Fallback: AI Quota Exceeded"`).
7. **Audit Trail**: Stored with `is_fallback = true`, `ai_model = "fallback-engine"`, `confidence = 0.0`.
8. **Health Report**: `GET /health` exposes accurate circuit state (`CLOSED`/`OPEN`).

---

## 3. LATER Queue Processing

1. **Scheduling**: `SchedulerService` polls every **1 minute**.
2. **Querying**: Selects up to 10 items from `deferred_queue` where `process_after <= now` and `status = 'WAITING'`.
3. **Optimistic Concurrency**: Status is set to `PROCESSING` before work begins, preventing duplicate execution.
4. **Execution**: For each item:
   - Notification is "sent" (mocked delivery).
   - `deferred_queue` status → `SENT`.
   - Final delivery action logged in `audit_logs` with `decision: SENT`.
5. **Resilience**: Delivery failure → `retry_count + 1`. After 3 failures → `DEAD_LETTER` (never silently dropped).

---

## 4. Rule Change & Fatigue Config Flow

1. **Interface**: Admin creates/edits a rule or updates the fatigue threshold in the **Rules Manager**.
2. **Update**: API call updates the `rules` table. `FATIGUE_LIMIT` is stored as `condition_type = 'system_setting'`, `name = 'FATIGUE_LIMIT'`.
3. **Zero-Downtime**: `DecisionEngine` reads active rules and the `FATIGUE_LIMIT` value from the database for every event — no server restart required.
4. **Frontend Safety**: `getRules` always returns an array (never `null`). If the API fails, the Rules page shows an error banner with a **Retry** button.

---

## 5. Deduplication Flow (Near-Duplicate)

1. **Mechanism**: Uses `similarity()` from PostgreSQL `pg_trgm` extension.
2. **Threshold**: Similarity score > 0.8 = near-duplicate.
3. **Scope**: Comparison is scoped per `user_id` across the last 24 hours.
4. **Decision**: Match found → `NEVER` with reason `"Near-duplicate detected (Similarity: 0.XX)"`.

---

## 6. Authentication Flow

1. User submits credentials on the Login page.
2. Backend returns `{ token, user }` on success.
3. Token is held in **React state only** — not written to `localStorage` yet.
4. Success modal appears: **"Stay"** discards credentials, **"Enter System"** commits token to `localStorage` and navigates.
5. All API requests attach `Authorization: Bearer <token>` via axios interceptor.
6. `401` responses auto-redirect to `/login` and clear `localStorage`.
7. On logout, a confirmation modal appears — only confirmed logout clears the session.

---

## 7. Rule Protocol Sandbox (Validation)

1. **Simulator Stage**: Admin defines a new classification rule (e.g., `TITLE_CONTAINS = 'Urgent'`).
2. **Pre-flight Check**: Before saving, the admin uses the **Validation Sandbox** within the Rules Manager.
3. **Mock Payload**: Admin enters test values for `Source`, `Type`, and `Title`.
4. **Dry Run**: Frontend calls `POST /api/rules/dry-run`.
5. **Validation Logic**: Backend executes a simulation of the `DecisionEngine`'s rule-matching logic *without* writing to the database or affecting production logs.
6. **Instant Feedback**: Frontend displays a "MATCHED" or "SKIPPED" status with the simulated outcome (`NOW`/`LATER`/`NEVER`) and the rule match reason.
7. **Production Commit**: Admin saves the rule only after confirming it behaves as expected.

---

## 8. Intelligence Settings & Telemetry

1. **Dynamic Configuration**: System parameters (Dedupe Threshold, Fatigue Limit, AI Models) are managed via `system_settings` table.
2. **Zero-Restart Updates**: Updating a setting (e.g., changing AI model to `DeepSeek-V3`) is instantly reflected in the next `DecisionEngine` processing cycle.
3. **Sidebar Pulse**: A global "Pulse" widget monitors system vitality, fetching the active AI model architecture and displaying a heartbeat animation.
4. **Cognitive Analytics**: The dashboard provides real-time telemetry:
   - **Rule Efficiency**: Hit-rates for deterministic vs. AI classification.
   - **Noise Attribution**: automated identification of high-volume sources causing `NEVER` outcomes.
   - **AI Confidence**: Continuous monitoring of LLM certainty scores to detect classification drift.

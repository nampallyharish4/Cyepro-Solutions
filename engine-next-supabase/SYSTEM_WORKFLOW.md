# System Workflow — Notification Prioritization Engine

This document describes the runtime execution flows for the Next.js + Supabase implementation of the engine.

## 1. Happy Path — Event Submission
1. **User Interaction**: An operator submits a notification event via the **Event Simulator** in the Next.js frontend.
2. **API Request**: The frontend sends a `POST /api/notifications` request to the Express backend.
3. **Initial Storage**: 
   - The backend saves the raw event to the `notification_events` table in Supabase with a `PENDING` status.
   - The API immediately returns a `202 Accepted` response with the `event_id`.
4. **Asynchronous Pipeline**: The `DecisionEngine` triggers the processing pipeline in the background.
5. **Deduplication**: 
   - **Exact**: Checks for matching `dedupe_key`.
   - **Near-Duplicate**: Executes a PostgreSQL similarity check (`pg_trgm`) against recent events.
6. **AI Analysis**: If no deterministic rule matches, the event content is sent to the **AIService** for classification. **Groq (Llama-3.3-70b)** is the primary provider for sub-second inference.
7. **Finalization**: 
   - An entry is created in `audit_logs` with the decision (NOW/LATER/NEVER) and the reason.
   - The `notification_events` status is updated to `PROCESSED`.
   - The frontend **Dashboard** reflects the new metrics via live polling (800ms).

## 2. Failure Path — AI Service Unavailable
1. **Network Timeout**: The `AIService` imposes a strict **3-second timeout** on all LLM calls.
2. **Quota Handling**: If a 429 (Rate Limit/Quota Exceeded) occurs, the system skips long retry chains to provide an immediate "Safe Fallback" response.
3. **Circuit Breaker**: If failures exceed the threshold (5), the circuit breaker opens for 5 minutes.
4. **Fallback Trigger**: The system catches the error and executes `AIService.fallBack()`.
5. **Fallback Classification**: The event is categorized as **LATER** (safe default) with a friendly reason (e.g., "AI Quota Exceeded").
6. **Audit Trail**: The audit log stores the fallback decision and flags `is_fallback = true` with `confidence: 0.0%`.
7. **Health Report**: The `/health` endpoint provides a detailed report of the AI circuit status and database health.

## 3. LATER Queue Processing
1. **Scheduling**: A `SchedulerService` runs a polling job every 1 minute.
2. **Querying**: It selects up to 10 items from `deferred_queue` where `process_after` <= current time and status is `WAITING`.
3. **Execution**: For each item:
   - The system "sends" the notification (mocked).
   - Updates `deferred_queue` status to `SENT`.
   - Logs the final delivery action in `audit_logs`.
4. **Resilience**: If an item fails during delivery, the `retry_count` is incremented. If it exceeds 3, it is marked as `FAILED`.

## 4. Rule Change & Fatigue Config Flow
1. **Interface**: Admin creates/edits a protocol or updates the "Alert Fatigue Threshold" in the **Rules Manager**.
2. **Update**: A `POST /api/rules` call updates the `rules` table in Supabase. The Fatigue Limit is stored specifically under the rule name `FATIGUE_LIMIT` with the type `system_setting`.
3. **Zero-Downtime**: The `DecisionEngine` queries active rules (and the dynamic `FATIGUE_LIMIT` value) directly from the database for every new event processing. No server restart is required as logic is entirely data-driven.

## 5. Deduplication Flow (Near-Duplicate)
1. **Mechanism**: Uses the `similarity()` function from PostgreSQL's `pg_trgm` extension.
2. **Threshold**: A similarity score > 0.8 is considered a near-duplicate.
3. **Logic**: The engine compares the incoming title against messages from the same user in the last 24 hours.
4. **Decision**: If a match is found, the priority is set to `NEVER` with the reason "Near-duplicate detected".

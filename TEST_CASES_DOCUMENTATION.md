# Notification Engine — Complete Test Suite

> **Live URLs for Testing**
>
> - **Frontend**: https://cyepro-solutions.vercel.app
> - **Backend**: https://cyepro-notification-engine-backend.onrender.com
> - **Health**: https://cyepro-notification-engine-backend.onrender.com/health

This document provides **50+ structured test cases** covering every requirement from the build test document. Tests are organized by system capability: Authentication, AI Classification, Deduplication, Alert Fatigue, Rule Engine, Fail-Safe Architecture, LATER Queue, Dashboard & Metrics, Audit Logging, and API Contract.

**Credentials for all tests:**
| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@cyepro.com` | `password123` |
| Operator | `operator@cyepro.com` | `operator123` |

---

## TABLE OF CONTENTS

1. [Authentication & Authorization](#-1-authentication--authorization)
2. [AI Contextual Intelligence](#-2-ai-contextual-intelligence-nowlaternever)
3. [Fintech & High-Stakes Security](#-3-fintech--high-stakes-security)
4. [DevOps & Site Reliability](#-4-devops--site-reliability-sre)
5. [Noise Filter (Psychological Test)](#-5-the-noise-filter-psychological-test)
6. [Data Integrity & Deduplication](#-6-data-integrity--deduplication)
7. [Alert Fatigue Protection](#-7-alert-fatigue-protection)
8. [Dynamic Rule Engine Override](#-8-dynamic-rule-engine-override)
9. [Fail-Safe Architecture & Circuit Breaker](#-9-fail-safe-architecture--circuit-breaker)
10. [LATER Queue & Scheduler](#-10-later-queue--scheduler)
11. [Dashboard & Real-Time Metrics](#-11-dashboard--real-time-metrics)
12. [Audit Log Integrity](#-12-audit-log-integrity)
13. [API Contract & Edge Cases](#-13-api-contract--edge-cases)
14. [UI Responsiveness & Mobile-First](#-14-ui-responsiveness--mobile-first)
15. [End-to-End Happy Path](#-15-end-to-end-happy-path)
16. [Simulator UI — Copy-Paste Test Cases](#️-16-simulator-ui--copy-paste-test-cases)
17. [Verification Checklist](#-verification-checklist)

---

## 🔐 1. Authentication & Authorization

### TC-1.1: Admin Login — Valid Credentials

| Field        | Value                                                                              |
| ------------ | ---------------------------------------------------------------------------------- |
| **Endpoint** | `POST /api/login`                                                                  |
| **Body**     | `{ "email": "admin@cyepro.com", "password": "password123" }`                       |
| **Expected** | `200 OK` with `{ token: "jwt...", user: { role: "admin" } }`                       |
| **UI Step**  | Open login page → pre-filled credentials → click Sign In → redirected to Dashboard |

### TC-1.2: Operator Login — Valid Credentials

| Field        | Value                                                                |
| ------------ | -------------------------------------------------------------------- |
| **Endpoint** | `POST /api/login`                                                    |
| **Body**     | `{ "email": "operator@cyepro.com", "password": "operator123" }`      |
| **Expected** | `200 OK` with `{ token: "jwt...", user: { role: "operator" } }`      |
| **UI Step**  | Enter operator credentials → click Sign In → redirected to Dashboard |

### TC-1.3: Login — Invalid Password

| Field        | Value                                                          |
| ------------ | -------------------------------------------------------------- |
| **Body**     | `{ "email": "admin@cyepro.com", "password": "wrongpassword" }` |
| **Expected** | `401 Unauthorized` with `{ error: "Invalid credentials" }`     |
| **UI Step**  | Error toast appears, stays on login page                       |

### TC-1.4: Login — Non-Existent User

| Field        | Value                                                      |
| ------------ | ---------------------------------------------------------- |
| **Body**     | `{ "email": "nobody@cyepro.com", "password": "whatever" }` |
| **Expected** | `401 Unauthorized` with `{ error: "Invalid credentials" }` |

### TC-1.5: Protected Route — No Token

| Field        | Value                                                             |
| ------------ | ----------------------------------------------------------------- |
| **Endpoint** | `GET /api/metrics` (no Authorization header)                      |
| **Expected** | `401` with `{ error: "Missing or invalid authorization header" }` |

### TC-1.6: Protected Route — Expired/Invalid Token

| Field        | Value                                              |
| ------------ | -------------------------------------------------- |
| **Header**   | `Authorization: Bearer invalid_jwt_here`           |
| **Expected** | `401` with `{ error: "Invalid or expired token" }` |

### TC-1.7: Admin-Only Route — Operator Blocked

| Field         | Value                                                                    |
| ------------- | ------------------------------------------------------------------------ |
| **Action**    | Login as operator, then `POST /api/rules`                                |
| **Expected**  | `403 Forbidden` with `{ error: "Admin access required" }`                |
| **Validates** | Operator can view rules (`GET /api/rules`) but cannot create/edit/delete |

### TC-1.8: Admin-Only Route — Admin Allowed

| Field        | Value                                                  |
| ------------ | ------------------------------------------------------ |
| **Action**   | Login as admin, then `POST /api/rules` with valid body |
| **Expected** | `201 Created` — rule is created                        |

---

## 🚀 2. AI Contextual Intelligence (NOW/LATER/NEVER)

These verify that the **Groq Llama-3.3-70b-versatile** model classifies based on _meaning_, not keywords.

### TC-2.1: High-Urgency — Security Alert

| Field           | Value                                                                      |
| --------------- | -------------------------------------------------------------------------- |
| **Title**       | `Unauthorized Access Attempt`                                              |
| **Message**     | `We blocked a login attempt from a new IP in Russia.`                      |
| **Type**        | `SECURITY`                                                                 |
| **Source**      | `AUTH_SERVICE`                                                             |
| **Expected**    | **NOW** — Critical security event                                          |
| **Audit Check** | `ai_used: true`, `ai_model: "llama-3.3-70b-versatile"`, `confidence > 0.8` |

### TC-2.2: Medium Priority — Informational

| Field        | Value                                             |
| ------------ | ------------------------------------------------- |
| **Title**    | `Team Meeting Minutes`                            |
| **Message**  | `The notes from today's sync have been uploaded.` |
| **Type**     | `INFO`                                            |
| **Source**   | `SLACK`                                           |
| **Expected** | **LATER** — Non-urgent information                |

### TC-2.3: Low Priority — Gamification Noise

| Field        | Value                                                |
| ------------ | ---------------------------------------------------- |
| **Title**    | `You've Earned a Badge!`                             |
| **Message**  | `Congratulations! You've logged in 5 days in a row.` |
| **Type**     | `SOCIAL`                                             |
| **Source**   | `APP`                                                |
| **Expected** | **NEVER** — Engagement spam                          |

### TC-2.4: Critical — OTP / Two-Factor

| Field        | Value                                                        |
| ------------ | ------------------------------------------------------------ |
| **Title**    | `Your OTP Code`                                              |
| **Message**  | `Your one-time password is 482910. It expires in 5 minutes.` |
| **Type**     | `AUTH`                                                       |
| **Source**   | `OTP_SERVICE`                                                |
| **Expected** | **NOW** — Time-sensitive authentication                      |

### TC-2.5: Edge — Urgent Language, Non-Urgent Content

| Field        | Value                                                 |
| ------------ | ----------------------------------------------------- |
| **Title**    | `CRITICAL: Act Now Before It's Too Late!`             |
| **Message**  | `Summer sale ends tonight. 50% off all sneakers!`     |
| **Type**     | `PROMO`                                               |
| **Source**   | `EMAIL_MARKETING`                                     |
| **Expected** | **NEVER** — AI should see through "clickbait" urgency |

---

## 🏦 3. Fintech & High-Stakes Security

| TC#     | Scenario        | User ID  | Type       | Source       | Title                      | Message                                                                | Expected  |
| :------ | :-------------- | :------- | :--------- | :----------- | :------------------------- | :--------------------------------------------------------------------- | :-------- |
| **3.1** | Fraud Alert     | `fin_01` | `FRAUD`    | `BANK_CORE`  | `Transaction Blocked`      | `Your card ending in 9012 was used for $2,400 at 'Luxury Watches'.`    | **NOW**   |
| **3.2** | Low Balance     | `fin_02` | `WALLET`   | `STRIPE`     | `Balance Warning`          | `Your connected account balance has dropped below $50.00.`             | **LATER** |
| **3.3** | New Payee Added | `fin_03` | `PROFILE`  | `BANK_WEB`   | `Payee Added`              | `A new external payee 'John Doe' was added to your account.`           | **NOW**   |
| **3.4** | Tax Docs Ready  | `fin_04` | `DOCS`     | `QUICKBOOKS` | `1099-K Available`         | `Your tax documents for the current year are ready for download.`      | **LATER** |
| **3.5** | Wire Transfer   | `fin_05` | `TRANSFER` | `BANK_CORE`  | `Large Transfer Initiated` | `A wire transfer of $15,000 was initiated from your checking account.` | **NOW**   |

---

## 🛠️ 4. DevOps & Site Reliability (SRE)

| TC#     | Scenario           | User ID    | Type       | Source       | Title                  | Message                                                                            | Expected  |
| :------ | :----------------- | :--------- | :--------- | :----------- | :--------------------- | :--------------------------------------------------------------------------------- | :-------- |
| **4.1** | Database Down      | `sre_lead` | `CRITICAL` | `POSTGRES`   | `FATAL Error`          | `Connection limit exceeded. Database is no longer accepting writes in Production.` | **NOW**   |
| **4.2** | Disk Space Warning | `sys_adm`  | `WARN`     | `AWS_EC2`    | `EBS Volume 80% Full`  | `Instance i-0abc1 is reaching 80% disk capacity.`                                  | **LATER** |
| **4.3** | CI/CD Success      | `dev_user` | `BUILD`    | `GITHUB`     | `Action Completed`     | `Workflow 'Unit Tests' passed on branch 'feature/ui-fix'.`                         | **NEVER** |
| **4.4** | DDoS Detected      | `net_eng`  | `SECURITY` | `CLOUDFLARE` | `Increased Traffic`    | `Unexpected spike (400% increase) in HTTP requests detected.`                      | **NOW**   |
| **4.5** | SSL Expiring       | `ops_team` | `WARN`     | `CERTBOT`    | `Certificate Expiring` | `SSL certificate for api.cyepro.com expires in 7 days.`                            | **LATER** |

---

## 🔇 5. The "Noise" Filter (Psychological Test)

Tests the AI's ability to distinguish real urgency from fake urgency.

| TC#     | Scenario             | User ID    | Type      | Source     | Title                     | Message                                                                     | Expected  |
| :------ | :------------------- | :--------- | :-------- | :--------- | :------------------------ | :-------------------------------------------------------------------------- | :-------- |
| **5.1** | FOMO Promo           | `u_noise`  | `SHOP`    | `ZALANDO`  | `URGENT: LAST CHANCE`     | `Your 20% coupon expires in 59 minutes! Don't let your shoes walk away!`    | **NEVER** |
| **5.2** | Fake Survey          | `u_noise`  | `SURVEY`  | `INTERCOM` | `Feedback Request`        | `URGENT! We need 2 minutes of your time to make our app better for you.`    | **NEVER** |
| **5.3** | Real Billing Failure | `u_admin`  | `BILLING` | `SAAS_P`   | `Payment Failed`          | `Your subscription failed to renew. Access will be restricted in 24 hours.` | **NOW**   |
| **5.4** | Social Like          | `u_social` | `SOCIAL`  | `APP`      | `Someone liked your post` | `John liked your recent photo from last Tuesday.`                           | **NEVER** |
| **5.5** | Newsletter           | `u_digest` | `DIGEST`  | `SUBSTACK` | `Weekly Newsletter`       | `Your weekly tech roundup is ready. 12 articles curated just for you.`      | **NEVER** |

---

## 🛡️ 6. Data Integrity & Deduplication

### TC-6.1: Exact Dedupe Key — Block Second Attempt

| Step             | Action                                                                  |
| ---------------- | ----------------------------------------------------------------------- |
| 1                | In Simulator, set Dedupe Key = `unique_test_key_abc`                    |
| 2                | Fill other fields (any user_id, title, etc.) and click **Launch Event** |
| 3                | **Without changing any field**, click **Launch Event** again            |
| **Expected**     | 1st event → classified by AI (NOW/LATER/NEVER). 2nd event → **NEVER**   |
| **Audit Reason** | `Duplicate event (Matched dedupe_key)`                                  |
| **Validates**    | Exact dedup query: `WHERE dedupe_key = $1 AND id != $current_id`        |

### TC-6.2: Near-Duplicate Detection (pg_trgm Similarity > 0.8)

| Step             | Action                                                                                                    |
| ---------------- | --------------------------------------------------------------------------------------------------------- |
| 1                | Send event: User = `dedup_user`, Title = `Database CPU at 95% on PRODUCTION`                              |
| 2                | Wait for the first event to be processed (check Audit Log)                                                |
| 3                | Send second event: User = `dedup_user`, Title = `Database CPU is at 96% on PRODUCTION` (clear dedupe key) |
| **Expected**     | 2nd event → **NEVER**                                                                                     |
| **Audit Reason** | `Near-duplicate detected (Similarity: 0.XX)` where XX > 80                                                |
| **Validates**    | `find_near_duplicates` PostgreSQL RPC function, pg_trgm similarity, 24-hour lookback                      |

### TC-6.3: Near-Duplicate — Different User IDs

| Step          | Action                                                                                    |
| ------------- | ----------------------------------------------------------------------------------------- |
| 1             | Send: User = `user_A`, Title = `Server is down in prod`                                   |
| 2             | Send: User = `user_B`, Title = `Server is down in prod` (identical title, different user) |
| **Expected**  | **Both** events are processed independently (NOT flagged as duplicates)                   |
| **Validates** | Near-duplicate is scoped per `user_id` (the RPC filters by `p_user_id`)                   |

### TC-6.4: Similar But NOT Duplicate (Below Threshold)

| Step         | Action                                                                 |
| ------------ | ---------------------------------------------------------------------- |
| 1            | Send: User = `thresh_user`, Title = `Payment processed successfully`   |
| 2            | Send: User = `thresh_user`, Title = `Refund processed for order #4521` |
| **Expected** | Both events classified independently — similarity < 0.8                |

### TC-6.5: Dedupe Key Missing — No Exact Match Attempted

| Step         | Action                                                                                    |
| ------------ | ----------------------------------------------------------------------------------------- |
| 1            | Send two events with identical content but **no dedupe_key**                              |
| **Expected** | Exact dedup is skipped (code checks `if (event.dedupe_key)`), near-dup may still catch it |

---

## 🕒 7. Alert Fatigue Protection

### TC-7.1: Fatigue Threshold — Default (5 per 60 min)

| Step             | Action                                                                          |
| ---------------- | ------------------------------------------------------------------------------- |
| 1                | Verify FATIGUE_LIMIT rule is set to `5` in Rules page                           |
| 2                | Send **5 different critical events** to `user_id = fatigue_test_user` rapidly   |
| 3                | Check Audit Log — all 5 should be classified as **NOW**                         |
| 4                | Send a **6th critical event** to the same `fatigue_test_user`                   |
| **Expected**     | 6th event → **LATER**                                                           |
| **Audit Reason** | `Alert Fatigue: User reached notification limit in current window.`             |
| **Validates**    | Per-user fatigue check, 60-minute rolling window, dynamic FATIGUE_LIMIT from DB |

### TC-7.2: Fatigue — Dynamic Threshold Update

| Step          | Action                                                                        |
| ------------- | ----------------------------------------------------------------------------- |
| 1             | Go to Rules page → edit FATIGUE_LIMIT → change value to `2`                   |
| 2             | Send 3 events to a **new** `user_id = fatigue_update_user`                    |
| **Expected**  | Events 1-2 → AI classified. Event 3 → **LATER** (fatigue with new limit of 2) |
| **Validates** | Runtime-configurable fatigue without server restart                           |

### TC-7.3: Fatigue — Different Users Are Independent

| Step          | Action                                                                             |
| ------------- | ---------------------------------------------------------------------------------- |
| 1             | Send 5 NOW events to `user_A` (hits fatigue)                                       |
| 2             | Send 1 event to `user_B`                                                           |
| **Expected**  | `user_B`'s first event is NOT affected by `user_A`'s fatigue                       |
| **Validates** | Per-user fatigue isolation via `notification_events.user_id` filter in audit query |

### TC-7.4: Fatigue — Window Expiry

| Step         | Action                                                   |
| ------------ | -------------------------------------------------------- |
| 1            | Hit fatigue limit for a user                             |
| 2            | Wait 60 minutes (or manipulate `processed_at` in DB)     |
| 3            | Send a new event                                         |
| **Expected** | New event is processed normally (fatigue window expired) |

---

## ⚙️ 8. Dynamic Rule Engine Override

### TC-8.1: Block a Source (NEVER)

| Step             | Action                                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1                | Go to **Rules** tab → Create Rule: Name = `Block Marketing`, Condition Type = `source`, Value = `MARKETING_TEAM`, Target = **NEVER** |
| 2                | In Simulator: Source = `MARKETING_TEAM`, Title = `CRITICAL: Server is on fire!` (highly urgent)                                      |
| **Expected**     | **NEVER** — Rule matched, AI completely bypassed                                                                                     |
| **Audit Reason** | `Rule matched: Block Marketing`                                                                                                      |
| **Audit Check**  | `ai_used: false`, `rule_id` is populated                                                                                             |

### TC-8.2: Force an Event Type to NOW

| Step         | Action                                                                                       |
| ------------ | -------------------------------------------------------------------------------------------- |
| 1            | Create Rule: Name = `Emergency Alerts`, Type = `type`, Value = `EMERGENCY`, Target = **NOW** |
| 2            | In Simulator: Type = `EMERGENCY`, Source = `NEWSLETTER`, Title = `Weekly digest available`   |
| **Expected** | **NOW** — Rule forces priority regardless of content                                         |

### TC-8.3: Title Contains Rule

| Step         | Action                                                                                             |
| ------------ | -------------------------------------------------------------------------------------------------- |
| 1            | Create Rule: Name = `Outage Detector`, Type = `title_contains`, Value = `outage`, Target = **NOW** |
| 2            | Send event: Title = `Minor service outage in EU region`                                            |
| **Expected** | **NOW** — Title contains "outage" (case-insensitive match)                                         |

### TC-8.4: Metadata Match Rule

| Step          | Action                                                                                                          |
| ------------- | --------------------------------------------------------------------------------------------------------------- |
| 1             | Create Rule: Name = `Critical Severity`, Type = `metadata_match`, Value = `severity=critical`, Target = **NOW** |
| 2             | Send event with metadata: `{ "severity": "critical" }`                                                          |
| **Expected**  | **NOW** — Metadata key-value matched                                                                            |
| **Validates** | Dot-notation metadata matching, `condition_value.split('=')` logic                                              |

### TC-8.5: Rule Priority Order — Higher Wins

| Step          | Action                                                                   |
| ------------- | ------------------------------------------------------------------------ |
| 1             | Create Rule A: Source = `ALERTS`, Target = **LATER**, Priority Order = 1 |
| 2             | Create Rule B: Source = `ALERTS`, Target = **NOW**, Priority Order = 10  |
| 3             | Send event with Source = `ALERTS`                                        |
| **Expected**  | **NOW** — Rule B has higher `priority_order` and is evaluated first      |
| **Validates** | Rules ordered by `priority_order DESC`                                   |

### TC-8.6: Delete Rule — Soft Delete

| Step          | Action                                                        |
| ------------- | ------------------------------------------------------------- |
| 1             | Create a rule → note its ID                                   |
| 2             | Delete the rule from the UI                                   |
| 3             | In the database, check `rules` table                          |
| **Expected**  | Rule still exists with `is_active = false` — not hard-deleted |
| **Validates** | Soft-delete requirement: "Deleted data must be recoverable"   |

### TC-8.7: Deleted Rule — No Longer Matches

| Step         | Action                                                       |
| ------------ | ------------------------------------------------------------ |
| 1            | Create rule: Source = `DELETE_TEST`, Target = **NEVER**      |
| 2            | Send event with Source = `DELETE_TEST` → should be **NEVER** |
| 3            | Delete the rule                                              |
| 4            | Send same event again                                        |
| **Expected** | Now goes to AI classification (rule is inactive)             |

### TC-8.8: Edit Rule — Takes Effect Immediately

| Step         | Action                                                |
| ------------ | ----------------------------------------------------- |
| 1            | Create rule: Source = `EDIT_TEST`, Target = **NEVER** |
| 2            | Edit rule: Change target to **NOW**                   |
| 3            | Send event with Source = `EDIT_TEST`                  |
| **Expected** | **NOW** — Updated rule applies without restart        |

---

## 🔌 9. Fail-Safe Architecture & Circuit Breaker

### TC-9.1: AI Outage — Graceful Fallback to LATER

| Step                | Action                                                                                                |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| 1                   | Scramble `GROQ_API_KEY` in `.env` to simulate an invalid key                                          |
| 2                   | Restart backend                                                                                       |
| 3                   | Send an event via Simulator                                                                           |
| **Expected Result** |                                                                                                       |
| - Response          | `202 Accepted` — API responds immediately, event is not lost                                          |
| - Audit Log         | `decision: LATER`, `reason: "Safe Fallback: ..."`, `is_fallback: true`, `ai_model: "fallback-engine"` |
| - Deferred Queue    | Event appears with `status: WAITING`                                                                  |
| **Validates**       | Zero data loss on AI failure                                                                          |

### TC-9.2: Circuit Breaker — Opens After 5 Failures

| Step          | Action                                                    |
| ------------- | --------------------------------------------------------- |
| 1             | With invalid API key, send 5+ events rapidly              |
| 2             | Check `/health` endpoint                                  |
| **Expected**  | `ai_service.circuitBreaker: "OPEN"`, `failureCount >= 5`  |
| **Validates** | Circuit breaker threshold = 5, stops calling dead service |

### TC-9.3: Circuit Breaker — Auto-Recovery After 5 Minutes

| Step          | Action                                                     |
| ------------- | ---------------------------------------------------------- |
| 1             | Trip the circuit breaker (5 failures)                      |
| 2             | Restore valid `GROQ_API_KEY` and wait 5 minutes            |
| 3             | Send a new event                                           |
| **Expected**  | Circuit resets, AI processes event normally                |
| **Validates** | `CIRCUIT_OPEN_TIMEOUT = 5 minutes`, `resetCircuit()` logic |

### TC-9.4: Retry Before Fallback

| Step          | Action                                                                   |
| ------------- | ------------------------------------------------------------------------ |
| 1             | Simulate intermittent network failure                                    |
| **Expected**  | axiosRetry attempts 2 retries (500ms, 1000ms delays) before falling back |
| **Validates** | `axiosRetry` with `retries: 2`, increasing delay                         |

### TC-9.5: Health Endpoint — Accurate State Report

| Step          | Action                                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| 1             | `GET /health` when system is healthy                                                                   |
| **Expected**  | `{ status: "OK", database: "CONNECTED", ai_service: { status: "HEALTHY", circuitBreaker: "CLOSED" } }` |
| 2             | Trip the circuit breaker                                                                               |
| **Expected**  | `{ status: "OK", ai_service: { status: "CIRCUIT_OPEN", circuitBreaker: "OPEN" } }`                     |
| **Validates** | Health endpoint honestly reports system state                                                          |

### TC-9.6: Pipeline Error — Event NOT Lost

| Step          | Action                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------- |
| 1             | Send an event that causes an unexpected processing error                                                |
| **Expected**  | Caught by pipeline try/catch → `LATER`, reason: `Internal Error: Processing failed, defaulted to LATER` |
| **Validates** | Final catch block in `executeEnginePipeline` — no silent data loss                                      |

---

## 📬 10. LATER Queue & Scheduler

### TC-10.1: LATER Decision → Queue Entry

| Step          | Action                                                               |
| ------------- | -------------------------------------------------------------------- |
| 1             | Send an event that is classified as **LATER**                        |
| 2             | Go to LATER Queue page                                               |
| **Expected**  | Entry with `status: WAITING`, `process_after` = ~30 minutes from now |
| **Validates** | `deferred_queue.insert({ process_after: +30 min })`                  |

### TC-10.2: Scheduler Processes WAITING Items

| Step          | Action                                                                                  |
| ------------- | --------------------------------------------------------------------------------------- |
| 1             | Set `process_after` to a past timestamp in DB for a WAITING item                        |
| 2             | Wait for scheduler tick (runs every 1 minute)                                           |
| **Expected**  | Item status changes: `WAITING → PROCESSING → SENT`                                      |
| **Audit Log** | New entry: `decision: SENT`, `reason: "Deferred notification sent after LATER period."` |

### TC-10.3: Failed Item — Retry Up to 3 Times

| Step          | Action                                                             |
| ------------- | ------------------------------------------------------------------ |
| 1             | Observe a FAILED queue item with `retry_count < 3`                 |
| 2             | Wait for scheduler tick                                            |
| **Expected**  | Scheduler picks it up, retries processing                          |
| **Validates** | `SchedulerService` queries `status = 'FAILED' AND retry_count < 3` |

### TC-10.4: Dead Letter — After 3 Retries

| Step          | Action                                                                                   |
| ------------- | ---------------------------------------------------------------------------------------- |
| 1             | Item fails 3 times                                                                       |
| **Expected**  | `status: DEAD_LETTER`, `retry_count: 3`                                                  |
| **Audit Log** | `decision: FAILED`, `reason: "Deferred item exhausted 3 retries, moved to dead letter."` |
| **Validates** | Items never silently dropped                                                             |

### TC-10.5: Force Send — Admin Action

| Step          | Action                                                                                    |
| ------------- | ----------------------------------------------------------------------------------------- |
| 1             | Login as admin → go to LATER Queue page                                                   |
| 2             | Find a WAITING item → click **Force Send**                                                |
| **Expected**  | `status → SENT`, audit log created: `"Manually force-sent by admin from deferred queue."` |
| **Validates** | `POST /api/deferred-queue/:id/force-send`, optimistic concurrency check                   |

### TC-10.6: Force Send — Already Processed (409)

| Step          | Action                                                   |
| ------------- | -------------------------------------------------------- |
| 1             | Try to force-send an item that is already `SENT`         |
| **Expected**  | `409 Conflict` — `"Item already processed or not found"` |
| **Validates** | Status guard: `.in('status', ['WAITING', 'FAILED'])`     |

### TC-10.7: Scheduler — Concurrent Safety

| Step         | Action                                                                                  |
| ------------ | --------------------------------------------------------------------------------------- |
| 1            | Scheduler picks up item, sets status to `PROCESSING`                                    |
| 2            | Another request tries to process the same item                                          |
| **Expected** | Second request fails the optimistic concurrency check (status no longer WAITING/FAILED) |

### TC-10.8: Force Send — Operator Blocked

| Step         | Action                                                       |
| ------------ | ------------------------------------------------------------ |
| 1            | Login as operator → attempt force-send                       |
| **Expected** | `403 Forbidden` — force-send requires `adminOnly` middleware |

---

## 📊 11. Dashboard & Real-Time Metrics

### TC-11.1: Live Metrics — Auto Refresh

| Step         | Action                                                                                        |
| ------------ | --------------------------------------------------------------------------------------------- |
| 1            | Open Dashboard page                                                                           |
| 2            | Submit events from Simulator (in another tab)                                                 |
| **Expected** | Dashboard updates automatically (5-second polling interval) — totals, charts, recent activity |

### TC-11.2: Metrics Accuracy

| Step         | Action                                                                                                                        |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| 1            | `GET /api/metrics`                                                                                                            |
| **Expected** | Response includes: `total`, `now`, `later`, `never`, `sent`, `queue.waiting`, `queue.failed`, `queue.dead_letter`, `recent[]` |
| **Validate** | Counts match actual DB records                                                                                                |

### TC-11.3: Timeline — 24h Hourly Buckets

| Step         | Action                                                                                |
| ------------ | ------------------------------------------------------------------------------------- |
| 1            | `GET /api/metrics/timeline`                                                           |
| **Expected** | Array of `{ hour, now, later, never }` objects bucketed by hour for the last 24 hours |

### TC-11.4: Health Badges

| Step         | Action                                                                                    |
| ------------ | ----------------------------------------------------------------------------------------- |
| 1            | Check Dashboard header area                                                               |
| **Expected** | Three badges: System (OK/DEGRADED), Database (CONNECTED/ERROR), AI (HEALTHY/CIRCUIT_OPEN) |

### TC-11.5: Recent Activity Feed

| Step         | Action                                                                              |
| ------------ | ----------------------------------------------------------------------------------- |
| 1            | Submit 3 events                                                                     |
| 2            | Check Dashboard's recent activity section                                           |
| **Expected** | Shows last 10 decisions with event_id, decision, reason, source, user_id, timestamp |

---

## 📝 12. Audit Log Integrity

### TC-12.1: Every Decision Produces an Audit Entry

| Step         | Action                                                         |
| ------------ | -------------------------------------------------------------- |
| 1            | Submit any event                                               |
| 2            | Check Audit Log page                                           |
| **Expected** | New row with: `event_id`, `decision`, `reason`, `processed_at` |

### TC-12.2: AI Metadata — Stored on Every AI Decision

| Field           | Expected Value                                                          |
| --------------- | ----------------------------------------------------------------------- |
| `ai_used`       | `true`                                                                  |
| `ai_model`      | `llama-3.3-70b-versatile` (or `gemini-flash-latest` if Gemini fallback) |
| `ai_confidence` | Float between 0.0 and 1.0                                               |
| `is_fallback`   | `false` (normal) or `true` (AI failed)                                  |

### TC-12.3: Rule Decision — Rule ID Logged

| Step         | Action                                   |
| ------------ | ---------------------------------------- |
| 1            | Create a rule and trigger it             |
| 2            | Check audit log for that event           |
| **Expected** | `rule_id` is populated, `ai_used: false` |

### TC-12.4: Audit Log — Append Only (No Modification)

| Step         | Action                                                            |
| ------------ | ----------------------------------------------------------------- |
| 1            | Verify there is no `UPDATE` or `DELETE` endpoint for audit_logs   |
| 2            | Confirm frontend has no edit/delete buttons on Audit page         |
| **Expected** | Audit log entries can only be inserted, never modified or deleted |

### TC-12.5: Audit Log — Pagination

| Step         | Action                                                        |
| ------------ | ------------------------------------------------------------- |
| 1            | `GET /api/audit?page=1&limit=5`                               |
| **Expected** | Returns `{ data: [...5 items], total: N, page: 1, limit: 5 }` |
| 2            | `GET /api/audit?page=2&limit=5`                               |
| **Expected** | Next 5 items                                                  |

### TC-12.6: Audit Log — Expandable Detail in UI

| Step         | Action                                                     |
| ------------ | ---------------------------------------------------------- |
| 1            | Click on an audit log row in the UI                        |
| **Expected** | Expands to show full event details, AI metadata, rule info |

---

## 🌐 13. API Contract & Edge Cases

### TC-13.1: Submit Event — Returns 202 Async

| Field         | Value                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------ |
| **Endpoint**  | `POST /api/notifications`                                                                  |
| **Expected**  | `202 Accepted` with `{ event_id, status: "PENDING" }` — processing continues in background |
| **Validates** | Async processing: "AI processing must not block the user's request"                        |

### TC-13.2: Expired Event — Auto-NEVER

| Step          | Action                                                                   |
| ------------- | ------------------------------------------------------------------------ |
| 1             | Submit event with `expires_at` set to yesterday's date                   |
| **Expected**  | **NEVER** — `"Event expired before processing (expires_at in the past)"` |
| **Validates** | Expiry check runs before dedup and AI                                    |

### TC-13.3: Empty Metadata — No Crash

| Step         | Action                                                     |
| ------------ | ---------------------------------------------------------- |
| 1            | Submit event with `metadata: {}` or omit metadata entirely |
| **Expected** | Event processes normally, metadata defaults to `{}`        |

### TC-13.4: Missing Optional Fields

| Step         | Action                                                                              |
| ------------ | ----------------------------------------------------------------------------------- |
| 1            | Submit with only required fields: `user_id`, `event_type`, `title`, `source`        |
| 2            | Omit: `message`, `priority_hint`, `channel`, `metadata`, `dedupe_key`, `expires_at` |
| **Expected** | `202 Accepted` — optional fields default to null/empty                              |

### TC-13.5: Deferred Queue — Pagination & Status Filter

| Step         | Action                                                   |
| ------------ | -------------------------------------------------------- |
| 1            | `GET /api/deferred-queue?page=1&limit=10&status=WAITING` |
| **Expected** | Only WAITING items returned                              |
| 2            | `GET /api/deferred-queue?status=ALL`                     |
| **Expected** | All statuses returned                                    |

### TC-13.6: Deferred Queue — Search

| Step         | Action                                                                 |
| ------------ | ---------------------------------------------------------------------- |
| 1            | `GET /api/deferred-queue?search=security`                              |
| **Expected** | Items where joined event title/source/type/user_id contains "security" |

---

## 📱 14. UI Responsiveness & Mobile-First

### TC-14.1: Mobile Viewport (375px)

| Page        | Check                                                                 |
| ----------- | --------------------------------------------------------------------- |
| Login       | Form is centered, credentials visible, buttons full-width             |
| Dashboard   | Cards stack vertically, charts resize, sidebar collapses to hamburger |
| Simulator   | All 10 input fields stack vertically, submit button full-width        |
| Audit Log   | Table scrolls horizontally or cards replace table rows                |
| LATER Queue | Status tabs wrap or scroll, items are readable                        |
| Rules       | Cards layout, not a table                                             |

### TC-14.2: Tablet Viewport (768px)

| Check     | Expected                                     |
| --------- | -------------------------------------------- |
| Sidebar   | Either collapsed or compact with icons       |
| Dashboard | 2-column grid for metric cards               |
| Forms     | Reasonable width, not stretched edge-to-edge |

### TC-14.3: Desktop Viewport (1440px)

| Check     | Expected                                      |
| --------- | --------------------------------------------- |
| Sidebar   | Fully expanded with labels                    |
| Dashboard | Full grid layout with all charts side by side |
| Audit Log | Full table with all columns visible           |

---

## 🔄 15. End-to-End Happy Path

### TC-15.1: Full Journey — Submit → Classify → Audit → Dashboard

| Step | Action                                                                                                                                                                          | Expected                                                                             |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 1    | Login as admin                                                                                                                                                                  | Token stored, redirected to Dashboard                                                |
| 2    | Navigate to Simulator                                                                                                                                                           | All 10 input fields visible                                                          |
| 3    | Fill: user_id=`e2e_user`, type=`SECURITY`, title=`SSH Brute Force`, message=`50 failed SSH attempts from 203.0.113.42`, source=`FIREWALL`, channel=`push`, priority_hint=`high` | Fields populated                                                                     |
| 4    | Click **Launch Event**                                                                                                                                                          | Toast: "Event accepted", shows event_id                                              |
| 5    | Wait 2-3 seconds for async processing                                                                                                                                           | Classification result appears (likely **NOW**)                                       |
| 6    | Navigate to Dashboard                                                                                                                                                           | Total count incremented, NOW count +1, recent activity shows the event               |
| 7    | Navigate to Audit Log                                                                                                                                                           | New entry with `decision: NOW`, `ai_used: true`, `ai_model: llama-3.3-70b-versatile` |
| 8    | Check `/health`                                                                                                                                                                 | System: OK, DB: CONNECTED, AI: HEALTHY                                               |

### TC-15.2: Full Journey — Rule Override → Verify → Delete Rule

| Step | Action                                                          | Expected                                 |
| ---- | --------------------------------------------------------------- | ---------------------------------------- |
| 1    | Create rule: Source = `E2E_SRC`, Target = **NEVER**             | Rule appears in list                     |
| 2    | Send event: Source = `E2E_SRC`, Title = `Critical server down!` | **NEVER** (rule matched)                 |
| 3    | Check Audit: `ai_used: false`, `rule_id` populated              | Rule bypassed AI                         |
| 4    | Delete the rule                                                 | Rule disappears from list (soft-deleted) |
| 5    | Send same event again                                           | AI processes it → likely **NOW**         |

### TC-15.3: Full Journey — LATER Queue Lifecycle

| Step | Action                             | Expected                                         |
| ---- | ---------------------------------- | ------------------------------------------------ |
| 1    | Send a LATER-classified event      | Event appears in LATER Queue with WAITING status |
| 2    | Wait for scheduler (or force-send) | Status changes to SENT                           |
| 3    | Check Audit Log                    | Two entries: original LATER + subsequent SENT    |

---

## �️ 16. Simulator UI — Copy-Paste Test Cases

> **Ready-to-use test inputs for the frontend Simulator page.** Each test lists the **exact values** to type into each field. Fields not listed can be left as default.
>
> **Required fields for every test:** User ID, Event Type, Title, Source.
> All other fields are optional.

### SIM-1: NOW — Critical Security Alert

| Field             | Value                                                                                                                      |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **User ID**       | `user-sec-001`                                                                                                             |
| **Event Type**    | `security_alert`                                                                                                           |
| **Title**         | `CRITICAL: Unauthorized Root Login Detected`                                                                               |
| **Message**       | `Multiple failed SSH root login attempts from 185.22.41.99 on production database server. Brute force attack in progress.` |
| **Source**        | `siem`                                                                                                                     |
| **Channel**       | `PUSH`                                                                                                                     |
| **Priority Hint** | `critical`                                                                                                                 |
| **Metadata**      | `{"ip": "185.22.41.99", "server": "prod-db-01"}`                                                                           |
| **Expected**      | **NOW** — confidence ~0.95-0.99                                                                                            |

### SIM-2: NOW — Payment Failure

| Field             | Value                                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **User ID**       | `user-pay-001`                                                                                                           |
| **Event Type**    | `payment_failure`                                                                                                        |
| **Title**         | `Payment Gateway Timeout — $4,200 Transaction Failed`                                                                    |
| **Message**       | `Stripe webhook reports charge_failed for invoice INV-9821. Customer card declined. Retry window expires in 15 minutes.` |
| **Source**        | `stripe`                                                                                                                 |
| **Channel**       | `EMAIL`                                                                                                                  |
| **Priority Hint** | `high`                                                                                                                   |
| **Metadata**      | `{"amount": 4200, "currency": "USD", "invoice": "INV-9821"}`                                                             |
| **Expected**      | **NOW** — confidence ~0.95+                                                                                              |

### SIM-3: NOW — OTP / 2FA Verification Code

| Field             | Value                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------- |
| **User ID**       | `user-otp-001`                                                                           |
| **Event Type**    | `authentication`                                                                         |
| **Title**         | `Your One-Time Verification Code`                                                        |
| **Message**       | `Your OTP code is 847291. It expires in 60 seconds. Do not share this code with anyone.` |
| **Source**        | `auth-service`                                                                           |
| **Channel**       | `SMS`                                                                                    |
| **Priority Hint** | `critical`                                                                               |
| **Metadata**      | `{}`                                                                                     |
| **Expected**      | **NOW** — confidence ~0.95+                                                              |

### SIM-4: LATER — Disk Usage Warning

| Field             | Value                                                                                                |
| ----------------- | ---------------------------------------------------------------------------------------------------- |
| **User ID**       | `user-ops-001`                                                                                       |
| **Event Type**    | `infra_warning`                                                                                      |
| **Title**         | `Disk Usage Warning — 82% on web-server-03`                                                          |
| **Message**       | `Server disk usage has crossed 80% threshold. Consider scheduling cleanup within the next 48 hours.` |
| **Source**        | `monitoring`                                                                                         |
| **Channel**       | `PUSH`                                                                                               |
| **Priority Hint** | `medium`                                                                                             |
| **Metadata**      | `{"server": "web-server-03", "disk_pct": 82}`                                                        |
| **Expected**      | **LATER** — confidence ~0.75-0.85                                                                    |

### SIM-5: LATER — Low Balance Alert

| Field             | Value                                                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **User ID**       | `user-fin-001`                                                                                                                  |
| **Event Type**    | `balance_alert`                                                                                                                 |
| **Title**         | `Low Balance Alert — Account ending 4829`                                                                                       |
| **Message**       | `Your account balance has dropped below $50.00. Current balance: $38.47. Consider adding funds to avoid declined transactions.` |
| **Source**        | `banking-core`                                                                                                                  |
| **Channel**       | `IN_APP`                                                                                                                        |
| **Priority Hint** | `medium`                                                                                                                        |
| **Metadata**      | `{"balance": 38.47, "threshold": 50}`                                                                                           |
| **Expected**      | **LATER** — confidence ~0.75-0.85                                                                                               |

### SIM-6: LATER — Daily Pipeline Report

| Field             | Value                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------- |
| **User ID**       | `user-rpt-001`                                                                                    |
| **Event Type**    | `daily_report`                                                                                    |
| **Title**         | `Daily Pipeline Summary — March 7, 2026`                                                          |
| **Message**       | `12 builds succeeded, 2 failed, 1 pending. Average build time: 4m 32s. No critical issues found.` |
| **Source**        | `ci-cd`                                                                                           |
| **Channel**       | `EMAIL`                                                                                           |
| **Priority Hint** | _(leave empty)_                                                                                   |
| **Metadata**      | `{"builds_success": 12, "builds_failed": 2}`                                                      |
| **Expected**      | **LATER** — confidence ~0.80+                                                                     |

### SIM-7: NEVER — Marketing Promo

| Field             | Value                                                                                                       |
| ----------------- | ----------------------------------------------------------------------------------------------------------- |
| **User ID**       | `user-mkt-001`                                                                                              |
| **Event Type**    | `promotional`                                                                                               |
| **Title**         | `FLASH SALE: 70% OFF Everything Today Only!`                                                                |
| **Message**       | `Don't miss our biggest sale of the year! Use code SAVE70 at checkout. Limited time offer — ends midnight!` |
| **Source**        | `marketing`                                                                                                 |
| **Channel**       | `EMAIL`                                                                                                     |
| **Priority Hint** | _(leave empty)_                                                                                             |
| **Metadata**      | `{"campaign": "summer-sale-2026"}`                                                                          |
| **Expected**      | **NEVER** — confidence ~0.95+                                                                               |

### SIM-8: NEVER — Social Media Noise

| Field             | Value                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------- |
| **User ID**       | `user-soc-001`                                                                         |
| **Event Type**    | `social`                                                                               |
| **Title**         | `John liked your post`                                                                 |
| **Message**       | `John Smith liked your photo from yesterday. You also have 3 new followers this week.` |
| **Source**        | `social-platform`                                                                      |
| **Channel**       | `PUSH`                                                                                 |
| **Priority Hint** | _(leave empty)_                                                                        |
| **Metadata**      | `{}`                                                                                   |
| **Expected**      | **NEVER** — confidence ~0.90+                                                          |

### SIM-9: NEVER — Gamification Badge

| Field             | Value                                                                                                |
| ----------------- | ---------------------------------------------------------------------------------------------------- |
| **User ID**       | `user-game-001`                                                                                      |
| **Event Type**    | `gamification`                                                                                       |
| **Title**         | `Congratulations! You earned the Gold Star Badge`                                                    |
| **Message**       | `You've completed 50 tasks this month! Keep up the great work. Share your achievement with friends!` |
| **Source**        | `rewards-engine`                                                                                     |
| **Channel**       | `IN_APP`                                                                                             |
| **Priority Hint** | _(leave empty)_                                                                                      |
| **Metadata**      | `{"badge": "gold_star", "tasks": 50}`                                                                |
| **Expected**      | **NEVER** — confidence ~0.90+                                                                        |

### SIM-10: NEVER — Tricky Urgent-Sounding Spam

| Field             | Value                                                                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **User ID**       | `user-trk-001`                                                                                                                         |
| **Event Type**    | `promotional`                                                                                                                          |
| **Title**         | `URGENT: Your Account Will Be Closed — Act Now!`                                                                                       |
| **Message**       | `FINAL WARNING: Claim your exclusive $500 gift card before your account is deactivated. Click here immediately to verify your status!` |
| **Source**        | `email-blast`                                                                                                                          |
| **Channel**       | `EMAIL`                                                                                                                                |
| **Priority Hint** | _(leave empty)_                                                                                                                        |
| **Metadata**      | `{}`                                                                                                                                   |
| **Expected**      | **NEVER** — confidence ~0.90+ (AI should see through fake urgency)                                                                     |

### SIM-11: Deduplication — Submit Same Event Twice

| Field          | Value                                                                                        |
| -------------- | -------------------------------------------------------------------------------------------- |
| **User ID**    | `user-dup-001`                                                                               |
| **Event Type** | `security_alert`                                                                             |
| **Title**      | `Duplicate Test: Failed Login`                                                               |
| **Message**    | `Failed login attempt from unknown device.`                                                  |
| **Source**     | `auth`                                                                                       |
| **Channel**    | `PUSH`                                                                                       |
| **Dedupe Key** | `dedup-test-fixed-key-001`                                                                   |
| **Step 1**     | Submit once → should classify normally (likely NOW)                                          |
| **Step 2**     | Submit again **with the exact same dedupe key** → should be **NEVER** (duplicate suppressed) |

### SIM-12: Expired Event — Past Expiry Date

| Field          | Value                                                 |
| -------------- | ----------------------------------------------------- |
| **User ID**    | `user-exp-001`                                        |
| **Event Type** | `authentication`                                      |
| **Title**      | `OTP Code Expired Test`                               |
| **Message**    | `Your verification code was 123456.`                  |
| **Source**     | `auth-service`                                        |
| **Channel**    | `SMS`                                                 |
| **Expires At** | Set to **any past date** (e.g., yesterday)            |
| **Expected**   | **NEVER** — reason: "Event expired before processing" |

---

## �🚦 Verification Checklist

### Audit & Logging

- [ ] Audit Log shows `ai_used: true` and the correct provider model name
- [ ] `ai_confidence` is recorded as a float for every AI decision
- [ ] `is_fallback: true` is logged strictly when AI service fails
- [ ] `rule_id` is populated when a rule triggers the decision
- [ ] `ai_used: false` when a deterministic path (dedup/rule/fatigue) decides

### Deduplication

- [ ] `dedupe_key` exact match blocks second attempts
- [ ] Near-duplicate (pg_trgm > 0.8 similarity) blocks within 24h for same user
- [ ] Near-dup is scoped per `user_id` — different users are independent
- [ ] Missing `dedupe_key` skips exact check gracefully

### LATER Queue

- [ ] LATER decisions create `deferred_queue` entries with `process_after` ~30 min ahead
- [ ] Scheduler runs every 1 minute automatically
- [ ] Failed items retry up to 3 times before DEAD_LETTER
- [ ] Force-send works for WAITING and FAILED items
- [ ] Force-send returns 409 for already-processed items

### Rules Engine

- [ ] All 4 condition types work: `source`, `type`, `title_contains`, `metadata_match`
- [ ] Rules are evaluated before AI (deterministic first)
- [ ] `system_setting` rules excluded from event matching
- [ ] Soft-delete: `is_active = false`, not hard delete
- [ ] CRUD operations work from the UI without server restart

### Fail-Safe

- [ ] Circuit breaker opens after 5 failures
- [ ] Circuit breaker resets after 5-minute cooldown
- [ ] Retry logic: 2 retries with 500ms / 1000ms delays
- [ ] Fallback always produces `LATER` with `is_fallback: true`
- [ ] Health endpoint accurately reports circuit state

### UI Pages

- [ ] Login — shows both admin and operator credentials on the page
- [ ] Simulator — all 10 input fields present, async result display
- [ ] Dashboard — auto-refreshes, health badges, metric cards, charts
- [ ] Audit — searchable, filterable, paginated, expandable rows
- [ ] LATER Queue — status tabs, search, pagination, force-send
- [ ] Rules — CRUD, fatigue threshold editable, mobile cards

### Deployment

- [ ] Frontend live on Vercel, connected to Render backend (not localhost)
- [ ] Backend live on Render with public URL
- [ ] `/health` endpoint accessible publicly
- [ ] Database is managed Supabase (cloud), not local
- [ ] Seeded users (admin + operator) present in production DB

# Notification Engine Test Suite

This document provides a structured set of test cases to verify the **Notification Prioritization Engine**. These cases cover AI-based classification, deterministic rule matching, deduplication (exact and near), alert fatigue protection, and system resilience.

---

## 🚀 1. AI Contextual Intelligence (NOW/LATER/NEVER)
These tests verify that the **Groq Llama-3** model is correctly understanding the *meaning* of the notification rather than just looking at keywords.

### Test 1.1: High-Urgency Security
*   **Input**: `Unauthorized Access Attempt` | `We blocked a login attempt from a new IP in Russia.`
*   **Expected**: **NOW**

### Test 1.2: Informational/Non-Urgent
*   **Input**: `Team Meeting Minutes` | `The notes from today's sync have been uploaded.`
*   **Expected**: **LATER**

### Test 1.3: Promotional/Noise
*   **Input**: `You've Earned a Badge!` | `Congratulations! You've logged in 5 days in a row.`
*   **Expected**: **NEVER**

---

## 🏦 2. Fintech & High-Stakes Security
Test cases focused on financial transactions and account integrity.

| Scenario | User ID | Type | Source | Title | Message | Expected |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Fraud Alert** | `fin_01` | `FRAUD` | `BANK_CORE` | `Transaction Blocked` | `Your card ending in 9012 was used for $2,400 at 'Luxury Watches'.` | **NOW** |
| **Low Balance** | `fin_02` | `WALLET` | `STRIPE` | `Balance Warning` | `Your connected account balance has dropped below $50.00.` | **LATER** |
| **New Payee** | `fin_03` | `PROFILE` | `BANK_WEB` | `Payee Added` | `A new external payee 'John Doe' was added to your account.` | **NOW** |
| **Tax Docs** | `fin_04` | `DOCS` | `QUICKBOOKS` | `1099-K Available` | `Your tax documents for the current year are ready for download.` | **LATER** |

---

## 🛠️ 3. DevOps & Site Reliability (SRE)
Verifies the engine's ability to act as a First-Responder for technical infrastructure issues.

| Scenario | User ID | Type | Source | Title | Message | Expected |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Database Down** | `sre_lead` | `CRITICAL` | `POSTGRES` | `FATAL Error` | `Connection limit exceeded. Database is no longer accepting writes in Production.` | **NOW** |
| **Disk Space** | `sys_adm` | `WARN` | `AWS_EC2` | `EBS Volume 80% Full` | `Instance i-0abc1 is reaching 80% disk capacity.` | **LATER** |
| **CI/CD Success** | `dev_user` | `BUILD` | `GITHUB` | `Action Completed` | `Workflow 'Unit Tests' passed on branch 'feature/ui-fix'.` | **NEVER** |
| **DDoS Detected** | `net_eng` | `SECURITY` | `CLOUDFLARE` | `Increased Traffic` | `Unexpected spike (400% increase) in HTTP requests detected.` | **NOW** |

---

## 🔇 4. The "Noise" Filter (Psychological Test)
Tests if the AI can identify "Clickbait" urgency vs real urgency.

| Scenario | User ID | Type | Source | Title | Message | Expected |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **FOMO Promo** | `u_noise` | `SHOP` | `ZALANDO` | `URGENT: LAST CHANCE` | `Your 20% coupon expires in 59 minutes! Don't let your shoes walk away!` | **NEVER** |
| **System Poll** | `u_noise` | `SURVEY` | `INTERCOM` | `Feedback Request` | `URGENT! We need 2 minutes of your time to make our app better for you.` | **NEVER** |
| **SaaS Billing** | `u_admin` | `BILLING` | `SAAS_P` | `Payment Failed` | `Your subscription failed to renew. Access will be restricted in 24 hours.` | **NOW** |

---

## 🛡️ 5. Data Integrity & Deduplication
Verifies that the engine prevents redundant notifications. *(Test these using the UI Simulator)*

### Test 5.1: Exact Dedupe Key
*   **Action**: Enter `unique_test_key_123` into the new **Dedupe Key** field in the Simulator and launch the event. Then, immediately click "Launch Event" a second time without changing the text box.
*   **Result**: 2nd event becomes **NEVER** (Reason: `Duplicate event (Matched dedupe_key)`).

### Test 5.2: Near-Duplicate Detection (Postgres pg_trgm)
*   **Action**: Send an event with Title: `Database CPU at 95% on PRODUCTION`. Immediately afterward, clear the dedupe key and send Title: `Database CPU is at 96% on PRODUCTION`.
*   **Result**: 2nd event becomes **NEVER** (Reason: `Near-duplicate detected (Similarity: > 0.8)`).

---

## 🕒 6. Resilience (Alert Fatigue)
*   **Trigger**: Send **6 critical events** (Security/OTP) to the same user ID within a very short timespan.
*   **Result**: The 6th event is bypassed by the AI and safely downgraded to **LATER**.
*   **Reason**: `Alert Fatigue: User reached notification limit.`

---

## ⚙️ 7. Dynamic Rule Engine Override
Tests the system's ability to override AI decisions based on human-configured constraints dynamically.

### Test 7.1: Block an annoyant Source
*   **Action**: Go to the **Rules** tab in the UI. Create a new Rule: Field `source`, Operator `EQUALS`, Value `MARKETING_TEAM`, Target Priority `NEVER`.
*   **Action**: Go to the Simulator and send an event with Source set to `MARKETING_TEAM` and a highly urgent Title like `CRITICAL: BUY NOW!`.
*   **Result**: Engine completely bypasses AI and drops it as **NEVER** (Reason: `Rule matched: ...`).

---

## 🔌 8. Architecture Resilience (Fail-Safe & Circuit Breaker)
Verifies the system doesn't crash or lose data when the AI breaks.

### Test 8.1: AI Outage Simulation
*   **Action**: Intentionally scramble the `GROQ_API_KEY` in the backend `.env` file to simulate a blocked/deleted API account. Send an event through the Simulator.
*   **Result**: 
    1. The API call intercepts the authentication error.
    2. Event drops immediately into the **LATER** queue to ensure zero data loss.
    3. The Audit Log tracks it with Reason: `Safe Fallback: Authorization Error`.

---

## 🚦 Verification Checklist
- [ ] Audit Log shows `ai_used: true` and the correct provider model name.
- [ ] `ai_confidence` is recorded for every AI decision.
- [ ] `is_fallback: true` is strictly logged if the AI service fails.
- [ ] Deferred Queue correctly loads and visually displays deferred **LATER** items.
- [ ] `dedupe_key` exact matches successfully block second attempts.

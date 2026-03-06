# Notification Engine Test Suite

This document provides a structured set of test cases to verify the **Notification Prioritization Engine**. These cases cover AI-based classification, deterministic rule matching, deduplication (exact and near), and alert fatigue protection.

---

## 🚀 1. AI Contextual Intelligence (NOW/LATER/NEVER)
These tests verify that the **Groq Llama-3** (or Gemini) is correctly understanding the *meaning* of the notification rather than just looking at keywords.

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
Verifies that the engine prevents redundant notifications.

### Test 5.1: Exact Dedupe Key
*   Send two events with the same **Dedupe Key**: `unique_tx_777`.
*   **Result**: 2nd event becomes **NEVER** (Reason: `Matched dedupe_key`).

### Test 5.2: Near-Duplicate Detection
*   Send 1: `Database CPU at 95% on PRODUCTION`
*   Send 2: `Database CPU is at 96% on PRODUCTION` 
*   **Result**: 2nd event becomes **NEVER** (Reason: `Similarity > 0.8`).

---

## 🕒 6. Resilience (Alert Fatigue)
*   **Trigger**: Send **6 critical events** (Security/OTP) to the same user ID within 1 minute.
*   **Result**: The 6th event is downgraded to **LATER**.
*   **Reason**: `Alert Fatigue: User reached notification limit.`

---

## 🚦 Verification Checklist
- [ ] Audit Log shows `ai_used: true` and **Groq** model name.
- [ ] `ai_confidence` is recorded for every decision.
- [ ] `is_fallback: true` is logged if the AI service fails.
- [ ] Deferred Queue populates correctly for **LATER** decisions.

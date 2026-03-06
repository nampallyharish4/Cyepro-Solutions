# Cyepro AI Team Hiring — Round 2 Build Test

**Shortlisted Candidates Only | Confidential**

---

| | |
|---|---|
| **Company** | Cyepro Solutions |
| **Round** | Round 2 — Build & Ship |
| **Deadline** | 2 days from receipt of this document |
| **Stack 1** | MERN — MongoDB · Express · React (nextJS) with any UI library · Node.js + AI |
| **Stack 2** | Java · Spring Boot · Next.js + AI |
| **Objective** | Build the same Notification Prioritization Engine you designed in Round 1 — fully working, in both stacks |

---

## The Challenge

In Round 1 you designed a Notification Prioritization Engine on paper.

**Round 2: build it. Twice.**

The same system. The same features. The same architecture you already designed — now implemented in both the MERN stack and Spring Boot. Both must have a fully connected, mobile-first UI, real AI integration, and a backend that does not break under failure.

> **Your Round 1 architecture is your blueprint. You are expected to follow it. If it had gaps, fix them — but acknowledge what changed and why in your documentation.**

Candidates who perform best in both stacks will be called for the final interview.

---

## What You Are Building

The same Notification Prioritization Engine from Round 1. A complete, end-to-end system that:

- Accepts incoming notification events from multiple sources and services
- Classifies each event as **NOW**, **LATER**, or **NEVER**
- Prevents duplicate notifications — exact and near-duplicate
- Reduces alert fatigue by tracking per-user notification history and frequency
- Supports rules that a human can configure and change from the UI — without any code deployment or server restart
- Logs a clear, explainable reason for every single decision made
- Stays fully operational and fails safely when the AI service is slow or unavailable
- Shows a live dashboard of system metrics in real time

The input shape is the same as Round 1:
`user_id`, `event_type`, `message/title`, `source`, `priority_hint`, `timestamp`, `channel`, `metadata`, `dedupe_key`, `expires_at`

---

## What We Expect From Both Stacks

Both your MERN implementation and your Spring Boot implementation must demonstrate the following. **How** you implement them is entirely your design decision — that is what we are evaluating.

### System Behaviour

- The decision pipeline from Round 1 must be fully implemented — not described, not mocked
- Deduplication must work even when `dedupe_key` is missing or unreliable
- Near-duplicate detection must be implemented — not just exact matching
- Alert fatigue thresholds must be configurable from the UI by an admin at runtime
- The LATER queue must be processed by a background scheduled job — not on demand
- Every decision must produce an audit log entry with the reason and the rule that triggered it

### AI Integration

- You must make real calls to an actual LLM — mocked or hardcoded AI responses are an automatic disqualification
- AI processing must not block the user's request — the system must respond immediately and process AI asynchronously
- The system must remain fully functional when the AI service is unavailable — with a proper fallback that still produces a valid classification
- AI failures must be handled gracefully — with retry logic, a fallback mechanism, and clear logging of when fallback was used
- Every AI analysis result must be stored — including which model was used, confidence, and whether it was a fallback result

### Fail-Safe Architecture

This is a heavily weighted section. Your system must handle failure without going down and without silently losing data.

- If the AI service fails repeatedly, the system must stop calling it and route to a fallback — not keep hammering a dead service
- Retries must happen before giving up — with increasing delays between attempts
- Events that cannot be processed even after retries must be preserved somewhere — never silently dropped
- The system must have a health status endpoint that honestly reports the state of the AI service and the overall system
- The scheduled background job must handle its own failures gracefully — retrying failed items, not crashing the scheduler

### Database Design

Your database must be designed to handle high concurrency and large event volumes without downtime or data loss.

- Queries in the critical path must be fast — dedup lookup, fatigue check, rule evaluation
- Concurrent writes to the same record must be handled safely — not with last-write-wins
- Deleted data must be recoverable — hard deletes are not acceptable
- The audit log is append-only — it must never be modified after writing
- Schema changes (Spring Boot) must be managed with migrations — not auto-generated at startup

### UI — Mobile-First, Responsive

Both frontends must be designed mobile-first and work cleanly across mobile, tablet, and desktop.

Build these screens — how they look and how you structure them is your design:

1. **Login** — authenticated access for admins and operators. Display mock credentials directly on the login screen so any reviewer can sign in instantly without hunting through your README. Example: show the admin email and password as pre-filled or visibly listed on the page itself
2. **Event Simulator** — submit a test notification event and see the classification result
3. **Live Dashboard** — real-time view of system activity and key metrics, no manual refresh
4. **Audit Log** — searchable, filterable history of every decision the system made
5. **LATER Queue** — view of deferred events and their current status
6. **Rules Manager** — admin creates, edits, and deletes rules that the engine uses to classify events
7. **Metrics** — charts and trends showing system performance over time

---

## Documentation — Mandatory

Documentation is not a bonus. It is a core deliverable. A working system with poor documentation scores lower than a slightly incomplete system with excellent documentation. Missing any of the four documents below means an incomplete submission.

---

### 1. README.md — One Per Stack

Your README must enable a complete stranger to clone your repo and run your system on a fresh machine without asking you a single question. It must cover:

**Setup & Running**
- Exact prerequisites — language version, runtime version, database, any global tools
- Every environment variable in your `.env.example` — what it is, what it does, where to get the value
- Step-by-step commands to get the backend running locally
- Step-by-step commands to get the frontend running locally
- How to run both together

**Tech Stack**
- Full list of every major technology and library used, with versions
- One sentence per key technology explaining why you chose it over the alternatives

**Architecture Overview**
- Your architecture diagram — the same one from Round 1 or an updated version if your thinking evolved
- A short description of each layer in your system and what it is responsible for
- How the decision pipeline flows from an incoming event to a final classification and audit log entry

**AI Integration**
- Which LLM provider and model you used
- The actual prompt template you wrote — share it in full
- What the AI returns and how your system parses and uses that output
- What happens step by step when the AI service is unavailable

**Known Limitations**
- Features you did not complete and why
- Corners you cut under time pressure and what the production version would do differently
- Anything you would change if you had more time

---

### 2. SYSTEM_WORKFLOW.md

This document must describe exactly how your system works at runtime — not what it is supposed to do, but what it actually does. Write this for both stacks. Use diagrams, flowcharts, numbered steps, or prose — whatever communicates it most clearly.

You must cover all of the following flows:

**Happy Path — Event Submission**
From the operator clicking Submit in the UI to the audit log being written and the dashboard updating. Every step. Every layer. What happens synchronously and what happens asynchronously and why.

**Failure Path — AI Service Unavailable**
An event arrives. The AI call fails. Walk through exactly what your system does — retry logic, when the fallback kicks in, what the fallback produces, what gets logged, what the health endpoint reports, and what the UI shows.

**LATER Queue Processing**
How and when the background job runs. How it finds deferred events. What it does with them. What happens if processing fails. How retries work. What happens if an item keeps failing.

**Rule Change Flow**
An admin edits or creates a rule in the Rules Manager UI. Walk through what happens — from the UI interaction to the API call to the database update to the engine picking up the change. Explain how the engine uses the new rule without a restart.

**Deduplication Flow**
An event arrives that is a near-duplicate of a recent one. Walk through how your system detects it, what data it compares, what threshold it uses, and what decision and reason it logs.

---

### 3. PLAN_OF_ACTION.md — Architecture Execution Plan

Write this before you write your first line of application code. It is your thinking made visible — how you broke down the problem, what you prioritised, and why you built things in the order you did.

Structure it day by day. For each day include what you planned to build, what you actually built, and any decisions you made or changed along the way.

Your plan must cover — in whatever order makes sense to you:

- How you approached the database design first and why
- How you validated the core decision pipeline before connecting AI
- How you handled the fail-safe architecture — when you built it and why at that point
- How you sequenced frontend development against backend readiness
- How you managed building two stacks in parallel without losing coherence between them
- What you would do differently if you started again

This document shows us how you think as an engineer — not just whether the final output works.

---

### 4. ARCHITECTURE_DECISIONS.md

Answer each of the following questions in writing. Be specific. Generic answers do not count. These questions will be the basis of your Round 3 technical interview — your written answers and your verbal answers must match.

**Decision 1 — Near-Duplicate Detection**
Which approach did you use to detect near-duplicate notifications? Why did you choose it over other options? What are its failure cases and at what scale does it break down?

**Decision 2 — Asynchronous AI Processing**
Why does AI processing happen asynchronously in your design? What would break or degrade if it were synchronous? What tradeoff does async introduce and how does your system handle it?

**Decision 3 — Database Model Choices**
You built the same system on MongoDB and on a relational database. For this specific problem, where did MongoDB's document model help you? Where did the relational model help you? Where did each one make your life harder?

**Decision 4 — Failure Handling Thresholds**
Your system stops calling the AI service after a certain number of failures in a certain time window. What numbers did you choose and why? What happens to the system if those thresholds are too low? Too high?

**Decision 5 — LATER Queue Design**
Why did you use a scheduled background job to process deferred events instead of an event-driven approach? What does the time interval you chose trade off? Under what conditions would you switch to a different approach?

**Decision 6 — Two Stacks, One Architecture**
Both implementations are supposed to follow the same architecture. What was consistent across both? What diverged and why? Was any divergence forced by the framework or was it a choice?

---

## Evaluation

We do not share our internal rubric with candidates. What we can tell you is that we evaluate:

- Whether the system actually works end-to-end in both stacks
- How deeply you understand each framework — not just whether you used it
- Whether your AI integration is real and handles failure properly
- Whether your fail-safe architecture is real and demonstrable — not just described
- Whether your database design holds up under concurrency and scale
- Whether your documentation shows genuine thinking about tradeoffs

Candidates who build a working system in both stacks with honest, thoughtful documentation will be considered for the final interview regardless of minor missing features. Candidates who submit a polished system they cannot explain will not proceed.

---

## Deployment — Mandatory

Building it locally is not enough. Both stacks must be deployed and accessible via a live URL at the time of submission. We will not evaluate a system that only runs on your machine.

---

### Frontend — Vercel

Deploy both frontends on **Vercel**.

- The React (MERN) frontend and the Next.js (Spring Boot) frontend must each have their own live Vercel deployment
- Both must be connected to their respective live backends — not pointing at localhost
- Environment variables must be configured in Vercel's project settings — not hardcoded in the codebase
- The deployed URL must work without any local setup from our side
- Include both live URLs in your README
- Seed your deployed database with at least one admin account and one operator account — credentials must be shown directly on the login page of the deployed app so any reviewer can sign in without needing to contact you

---

### Backend — Your Choice, But It Must Be Live

Deploy your backend where it makes sense for your architecture. If you have built a monolithic backend, any cloud platform works — Railway, Render, Fly.io, or AWS. If you have built a microservices architecture, deploy on **AWS**.

**If deploying on AWS:**
- Each service must run independently — EC2, ECS, Lambda, or App Runner depending on your design
- Services must communicate over internal AWS networking — not via public internet calls between services
- Use RDS for your relational database (Spring Boot stack) and MongoDB Atlas or DocumentDB for your document database (MERN stack)
- Environment variables and secrets must be managed via AWS Secrets Manager or Parameter Store — not hardcoded
- Each service must have a health check configured
- Include your AWS architecture in your documentation — which services you used and why

**If deploying on Railway / Render / Fly.io:**
- Backend must be fully live with a public URL connected to your Vercel frontend
- Database must be a managed cloud instance — not a local or containerised database
- Include the live backend URL in your README

---

### Deployment Documentation

Add a **DEPLOYMENT.md** to your repository covering:

- Where each part of the system is deployed and the live URL
- How you configured environment variables for production
- Any differences between your local setup and your production deployment
- If AWS — a diagram or written description of your cloud architecture and which AWS services you used
- How to trigger a redeployment if we need to verify a fix

---

### What We Will Do With Your Live URLs

We will open your deployed frontend, submit test events through the Event Simulator, check the audit log, change a rule, and verify the dashboard updates. We will also hit your health endpoint directly to check the AI circuit status. Everything we test locally we will also test on your live deployment.

If the live deployment does not work but the local version does, it counts as a partial submission.

---

- AI responses are mocked or hardcoded
- Fail-safe mechanism is described in README but not actually implemented
- Only one stack submitted
- Frontend is not connected to a real backend
- No database — data lives only in memory
- Rules are hardcoded in the application and cannot be changed from the UI
- No demo video
- Documentation is missing
- No live deployment — submission without working live URLs is not accepted
- Frontend deployed on Vercel but pointing at localhost — not accepted
- Database running locally or in a container on your machine — not accepted

---

## Submission

**Repository structure:** two public GitHub repository for each stack with clearly defined folders for each stack. Each stack must have its own README and `.env.example`.

**Live URLs — include all of the following in your each repo README:**
- MERN frontend (Vercel)
- Spring Boot frontend (Vercel)
- MERN backend (live URL)
- Spring Boot backend (live URL)
- Health endpoint for both backends
- AWS architecture link or screenshot if microservices

**Demo video:** 5–10 minutes showing both stacks live on the deployed URLs — event submission, classification result, rules update taking effect, the system behaving correctly when the AI service is made unavailable, and a screenshot or screen recording of your deployment dashboard (Vercel + AWS/Railway).

**Submit the Google Form** and **Email** your GitHub link, all live URLs, and video walk through link ( **Turn on Your Camera and Record** ) to **varun@cyepro.com** and **hr-admin@cyepro.com** 

**Subject:** Round 2 Submission Cyepro Solutions — [Your Full Name]

---

## AI Tools Policy

AI coding tools are allowed. In Round 3 you will be asked to walk through your code live — justify your architecture decisions, explain your database design choices, and demonstrate how your failure handling works. If you cannot explain it, it does not count.
# Architecture Decisions

This document justifies the technical choices made during the development of the Notification Prioritization Engine.

## Decision 1 — Near-Duplicate Detection
**Approach**: I used PostgreSQL's `pg_trgm` (Trigram) extension combined with the `similarity()` function.
**Rationale**: Unlike simple Levenshtein distance which can be slow, Trigram similarity is indexable and performs remarkably well on shorter strings like notification titles.
**Failure Cases**: It may trigger false positives on very short, templated messages (e.g., "Alert 1", "Alert 2").
**Scale**: At high volumes (millions of events/hr), we would move this check to a dedicated Vector Database like Pinecone or use pgvector for better semantic overlap.

## Decision 2 — Asynchronous AI Processing
**Rationale**: AI calls (LLMs) are high-latency operations. By switching to **Groq (Llama-3.3-70b)**, we have reduced this latency to sub-second ranges (~400ms), but it remains asynchronous to ensure the primary ingress API (`POST /api/notifications`) remains non-blocking.
**Tradeoff**: The user gets an immediate acknowledgment, while the background thread completes the intelligent analysis.
**Handling**: The frontend implements a "Pending" state and high-frequency polling (800ms) to deliver results nearly instantly.

## Decision 3 — Database Model Choice (PostgreSQL vs MongoDB)
**Choice**: Supabase (PostgreSQL).
**Supabase/Relational Help**: PostgreSQL excels at maintaining the integrity of the `audit_logs` relationship with `events`. The ability to write custom SQL functions (RPC) for Trigram similarity was a decisive factor.
**MongoDB Help**: MongoDB's document model would have made storing unstructured `metadata` easier, but Postgres' `JSONB` column type handles this requirement with equal efficiency while offering relational safety.

## Decision 4 — Failure Handling Thresholds
**Thresholds**: 
- **Hard Timeout**: 3 seconds.
- **Quota Error**: Instant fallback.
- **Circuit Breaker**: 5 consecutive failures trips the circuit for 5 minutes.
**Rationale**: 
- **3s Timeout**: Prevents a single slow AI call from degrading overall system throughput.
- **Instant 429 Fallback**: Since quota errors are deterministic, the system instantly routes to fallback for maximum responsiveness.
- **Circuit Breaker**: Protects the system from hammering a degraded service and saves on API costs.

## Decision 5 — LATER Queue Design
**Approach**: A scheduled background job (Polling) every 1 minute.
**Rationale**: While an event-driven approach (using `pg_cron` or queues) is more reactive, a scheduled poller is easier to observe, rate-limit, and debug in a "Build Test" scenario.
**Tradeoff**: Up to 60 seconds of latency for deferred items.
**Scale Up**: For production, I would move to a robust message broker like Redis/BullMQ to handle concurrent queue processing.

## Decision 6 — Two Stacks, One Architecture
**Consistent Across Both**: The overarching Event-Driven pipeline (Receive -> Deduplicate -> Rule Engine -> AI Async -> Fallback/Logging) remains identical. The Next.js frontend is reused and simply points to a different backend API URL, proving the strict JSON contract is uniform across both implementations.
**Divergence**: 
1. **Migrations**: The MERN (Supabase) stack handles schema via direct PostgreSQL execution, leveraging `pg_trgm` natively. The Spring Boot application manages this strictly via Flyway/Hibernate auto-ddl configurations over a standard relational DB.
2. **Asynchrony**: While Node.js handles the AI offloading natively through Express' non-blocking event loop, the Spring Boot stack explicitly uses `@Async` methodology backed by a thread pool executor.
**Choice or Forced?**: The divergence in Asynchrony handling was forced by the runtime frameworks (Event Loop vs JVM Threading). However, reusing the Next.js frontend across both was a conscious architectural choice to prove the backends were truly decoupled and interchangeable.

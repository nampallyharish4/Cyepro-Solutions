# Cyepro AI — Backend Service

Built with **Node.js · Express · TypeScript · Supabase · Groq (Llama-3.3-70b-versatile)**

## API Endpoints

### Auth

| Method | Route         | Access | Description      |
| ------ | ------------- | ------ | ---------------- |
| POST   | `/api/login`  | Public | JWT login        |
| POST   | `/api/signup` | Public | Account creation |

### Notifications

| Method | Route                   | Access | Description                         |
| ------ | ----------------------- | ------ | ----------------------------------- |
| POST   | `/api/notifications`    | Auth   | Submit event — `202 Accepted` async |
| GET    | `/api/metrics`          | Auth   | Dashboard totals + recent activity  |
| GET    | `/api/metrics/timeline` | Auth   | 24h hourly NOW/LATER/NEVER buckets  |

### Audit

| Method | Route        | Access | Description                       |
| ------ | ------------ | ------ | --------------------------------- |
| GET    | `/api/audit` | Auth   | Paginated audit log (append-only) |

### Rules

| Method | Route            | Access | Description                             |
| ------ | ---------------- | ------ | --------------------------------------- |
| GET    | `/api/rules`     | Auth   | All active rules (always returns array) |
| POST   | `/api/rules`     | Admin  | Create rule                             |
| PUT    | `/api/rules/:id` | Admin  | Update rule                             |
| DELETE | `/api/rules/:id` | Admin  | Soft-delete (`is_active = false`)       |

### Deferred Queue

| Method | Route                                | Access | Description                         |
| ------ | ------------------------------------ | ------ | ----------------------------------- |
| GET    | `/api/deferred-queue`                | Auth   | Queue with filter/search/pagination |
| POST   | `/api/deferred-queue/:id/force-send` | Admin  | Force-send WAITING/FAILED item      |

### Health

| Method | Route     | Access | Description                    |
| ------ | --------- | ------ | ------------------------------ |
| GET    | `/health` | Public | DB + AI circuit breaker status |

## Decision Pipeline

```
POST /api/notifications
      │
      ├─ 1. Expiry check (expires_at in the past → NEVER)
      ├─ 2. Exact dedup (dedupe_key match → NEVER)
      ├─ 3. Near-dedup (pg_trgm similarity > 0.8 → NEVER)
      ├─ 4. Rule engine (priority_order DESC, first match wins)
      ├─ 5. Alert fatigue (per-user NOW count in 60-min window)
      ├─ 6. Groq AI  ──► fallback to Gemini ──► safe LATER
      └─ 7. Audit log + deferred queue (if LATER)
```

## Environment Variables

```bash
cp .env.example .env
```

| Variable                    | Required | Description                                |
| --------------------------- | -------- | ------------------------------------------ |
| `SUPABASE_URL`              | ✅       | Supabase project URL                       |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅       | Service role key (bypasses RLS)            |
| `GROQ_API_KEY`              | ✅       | Groq Cloud API key                         |
| `MODEL_NAME`                | ✅       | e.g. `llama-3.3-70b-versatile`             |
| `GEMINI_API_KEY`            | Optional | Fallback LLM key                           |
| `JWT_SECRET`                | ✅       | Token signing secret                       |
| `PORT`                      | Optional | Default `5000`                             |
| `FRONTEND_URL`              | Optional | Primary frontend origin for CORS allowlist |
| `CORS_ALLOWED_ORIGINS`      | Optional | Comma-separated additional CORS origins    |

## Scripts

```bash
npm run dev      # ts-node + nodemon (port 5000)
npm run build    # compile to dist/
npm start        # run dist/index.js
```

## Resilience

- **Circuit Breaker**: 5 AI failures → OPEN for 5 min → auto-reset
- **Hard Timeout**: 3s per LLM call
- **Retry**: 2 retries with 500ms / 1000ms backoff before fallback
- **Fallback**: Always produces `LATER` + `is_fallback: true` — zero data loss
- **Soft Deletes**: Rules set `is_active = false`, never hard-deleted
- **`getRules` null-safety**: Always returns `[]` on error (never `null`)

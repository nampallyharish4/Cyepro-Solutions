# Deployment Overview

This document describes the production deployment strategy for the Notification Prioritization Engine.

## Live Environment

| Service         | Provider | URL                                                     |
| --------------- | -------- | ------------------------------------------------------- |
| Frontend        | Vercel   | https://cyepro-solutions.vercel.app                     |
| Backend         | Render   | _(configured via Render dashboard — see render.yaml)_   |
| Database        | Supabase | Managed PostgreSQL (cloud)                              |
| Health Endpoint | Render   | `<BACKEND_URL>/health`                                  |
| Repository      | GitHub   | https://github.com/nampallyharish4/Cyepro-Solutions.git |

## Production Credentials

Reviewers can access the live dashboard using the pre-filled credentials on the Login page:

| Role     | Email                 | Password      |
| -------- | --------------------- | ------------- |
| Admin    | `admin@cyepro.com`    | `password123` |
| Operator | `operator@cyepro.com` | `operator123` |

## Environment Variables (Vercel / Render)

| Variable                        | Service  | Description                         |
| ------------------------------- | -------- | ----------------------------------- |
| `SUPABASE_URL`                  | Backend  | Supabase project API endpoint       |
| `SUPABASE_SERVICE_ROLE_KEY`     | Backend  | Elevated key (bypasses RLS)         |
| `GROQ_API_KEY`                  | Backend  | Groq Cloud LLM API key (Primary AI) |
| `MODEL_NAME`                    | Backend  | `llama-3.3-70b-versatile`           |
| `GEMINI_API_KEY`                | Backend  | Google Gemini API key (Fallback AI) |
| `JWT_SECRET`                    | Backend  | Token signing secret                |
| `NODE_ENV`                      | Backend  | `production`                        |
| `NEXT_PUBLIC_API_URL`           | Frontend | Points to Render backend API        |
| `NEXT_PUBLIC_SUPABASE_URL`      | Frontend | Supabase project URL                |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Frontend | Supabase public anon key            |

## Secrets Management

- All backend secrets are managed via **Render Environment Variables** (not committed to the repository).
- Frontend public keys are managed via **Vercel Environment Variables**.

## Local vs Production

| Aspect      | Local                                 | Production                   |
| ----------- | ------------------------------------- | ---------------------------- |
| Database    | Shared Supabase cloud (same instance) | Same Supabase cloud instance |
| Backend URL | `http://127.0.0.1:5000/api`           | Render URL                   |
| SSL         | Not required                          | Forced HTTPS on all calls    |
| AI Model    | `llama-3.3-70b-versatile` via Groq    | Same model, same provider    |

## CI/CD & Maintenance

- **Frontend**: Auto-deploys on every `git push` to `main` via Vercel GitHub integration.
- **Backend**: Rolling update triggered on `main` push via Render deploy hooks.
- **Database Migrations**: Apply SQL changes via Supabase Migration CLI or Dashboard SQL Editor **before** deploying new backend code.
- **Scheduler**: Background `SchedulerService` runs within the Render container — processes the LATER queue every 1 minute automatically.

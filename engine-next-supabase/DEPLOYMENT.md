# Deployment Overview

This document describes the production deployment strategy for the Notification Prioritization Engine.

## Live Environment
- **Frontend Architecture**: Deployed on **Vercel**.
- **Backend Architecture**: Scalable Node.js environment (e.g., **Railway** or **AWS App Runner**).
- **Database Architecture**: Managed **Supabase (PostgreSQL)** instance.

## Production Configuration

### Environment Variables (Vercel/Railway)
- `SUPABASE_URL`: The API endpoint for the production Supabase project.
- `SUPABASE_SERVICE_ROLE_KEY`: Elevated key for backend operations.
- `SUPABASE_ANON_KEY`: Client-side key for frontend real-time subscriptions.
- `GROQ_API_KEY`: Secret key for LLM classification (Primary).
- `GEMINI_API_KEY`: Secret key for LLM classification (Fallback).
- `JWT_SECRET`: Used for securing admin access.
- `NODE_ENV`: Set to `production`.

### Secrets Management
- Backend secrets are managed via **Railway Shared Variables** or **AWS Secrets Manager**.
- No credentials are committed to the repository.

## Difference Between Local and Production
- **Database**: Local uses the `localhost:54321` Supabase CLI (if applicable), while Production uses a managed Postgres instance.
- **SSL**: Production requires forced HTTPS for all API and frontend calls.
- **AI Model**: Local testing may use `gpt-4o-mini` for cost-efficiency, while Production uses `gpt-4o` for higher reasoning accuracy.

## Maintenance & Redeployment
- **Frontend**: Automatically redeploys on every `git push` to the `main` branch via Vercel's GitHub integration.
- **Backend**: Configured for CI/CD; pushes to `main` trigger a rolling update to the container service.
- **Database Migrations**: SQL changes should be applied via the Supabase Migration CLI or Dashboard SQL Editor before new backend code is deployed.

## Production Credentials
Reviewers can access the live dashboard using the pre-filled credentials on the **Login** page:
- **Email**: `admin@cyepro.com`
- **Password**: `password123`

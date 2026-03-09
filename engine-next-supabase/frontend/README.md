# Cyepro AI — Frontend

Built with **Next.js 15 (App Router)** · **TypeScript** · **Tailwind CSS** · **Framer Motion**

## Pages

| Route | Description |
|-------|-------------|
| `/login` | JWT login with success/error modals, "Stay" keeps credentials un-committed |
| `/signup` | Account creation with live password-strength meter, email validation, and modals |
| `/` | Live dashboard — metrics, 24h chart, health badges, recent activity |
| `/simulator` | Event submission UI with async polling for classification result |
| `/audit` | Filterable, searchable, paginated audit log with expandable rows |
| `/rules` | Rules Protocol CRUD + global fatigue threshold + API error banner with retry |
| `/later` | Deferred pipeline queue — status tabs, search, force-send |

## Key Components

| Component | Purpose |
|-----------|---------|
| `Sidebar.tsx` | Navigation + **logout confirmation modal** (credentials only cleared on confirm) |
| `LayoutContent.tsx` | Auth guard with full-screen **triple-ring loader** while verifying session |
| `PageLoader.tsx` | Shared `<PageLoader>`, `<SkeletonRow>`, `<SkeletonCard>` used on all data pages |

## Getting Started

```bash
npm install
cp .env.local.example .env.local  # fill NEXT_PUBLIC_API_URL
npm run dev                        # http://localhost:3000
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend base URL (e.g. `http://127.0.0.1:5000/api`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key |

## Auth Flow

1. User submits credentials → backend returns JWT
2. Token held in **modal state only** — not written to `localStorage` yet
3. User clicks **"Enter System"** → token committed → navigate to dashboard
4. User clicks **"Stay"** → token discarded → remains on login page
5. All API requests attach `Authorization: Bearer <token>` via axios interceptor
6. 401 responses auto-redirect to `/login` and clear localStorage

## Design System

- Dark theme (`zinc-950` base) with glassmorphism cards
- Purple / emerald accent palette
- Triple-ring spinners for all loading states
- Skeleton shimmer for table and card loaders
- Spring-in modal animations via CSS keyframes

# SmallBiz Cyber & AI Readiness Advisor

**Built by Champtron Systems LLC**

A full-stack SaaS platform that helps small business owners evaluate their cybersecurity readiness, AI adoption, and funding preparedness — and then guides them from idea to launch with an AI-powered Dream Builder.

---

## Features

### Assessment Engine
- Cyber Score, AI Score, and Funding Score (0–100)
- Overall readiness score with four tiers: Advanced, Growth-ready, Developing, High-priority
- AI-generated streaming advice per dimension (cybersecurity, AI readiness, funding)
- 30/60/90-day roadmap, action center, risk register, implementation tracker
- Document generator (Cyber Policy, AI Adoption Plan, BCP, Grant Readiness)
- Monthly assessment history and baseline compare

### Dream-to-Launch Builder
- 6-page guided quiz: skills → problems → business type → industry → capital → hours
- AI generates 3 personalized business idea suggestions with fit %, cost tier, difficulty
- Mission statement preview
- Launch roadmap, startup cost calculator, pricing builder (Pro tier)
- Full AI business plan PDF export (Pro Packet tier)

### Auth & Accounts
- Email/password signup and login (Supabase GoTrue)
- Forgot password / password reset via email link
- Account settings: business name update, change password
- Free tier (3 assessments/month) and Pro/Pro Annual tiers

### Admin Dashboard
- User management: view, edit tier, delete, search, sort, filter by tier
- Bulk tier change, CSV export of all users
- Assessment history per user
- Metrics: total users, free/pro/pro annual/admin counts, assessments today/this month
- NVIDIA Jetson GPU stats (utilization, memory, temperature) — live, 5s refresh

### AI Infrastructure (NVIDIA-first)
- **Hybrid routing**: NVIDIA NIM cloud → Ollama local (Jetson GPU) → graceful fallback
- NVIDIA NIM embeddings (`nv-embedqa-e5-v5`) for semantic advice retrieval
- NVIDIA NIM reranker (`nv-rerankqa-mistral-4b-v3`) to improve advice relevance
- Advice cache: identical requests skip the LLM and return instantly
- Provider-agnostic: swap between Anthropic, OpenAI, Groq, Ollama, NIM via env var

### Mobile (React Native / Expo SDK 50)
- iOS and Android via Expo Go (development) or EAS Build (production)
- Full assessment flow, Dream Builder, AI advisor
- Voice input: record audio → NVIDIA Parakeet ASR → transcribed text
- Document upload: PDF text extraction or image analysis via NIM Vila
- Onboarding gate (shows once per device)

### Billing (Stripe)
- Monthly and annual Pro subscriptions
- One-time purchases: Launch Builder ($19), Launch Packet Pro ($49), Advisor Review ($149)
- Stripe Customer Portal for self-service plan management
- Webhook-verified tier enforcement

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML/CSS/JS — no build step, no framework |
| Backend | FastAPI 0.115, Python 3.11, Pydantic v2 |
| Database | PostgreSQL 15 via Supabase |
| Auth | Supabase GoTrue v2 (JWT) |
| AI (cloud) | NVIDIA NIM — `meta/llama-3.1-8b-instruct` |
| AI (local) | Ollama on Jetson Orin Nano (CUDA 12.6) |
| Billing | Stripe |
| Mobile | React Native, Expo SDK 50 |
| State (mobile) | Zustand |
| Logging | structlog (JSON) |
| Infrastructure | Docker Compose (local), Railway (backend), Vercel (frontend) |

---

## Project Structure

```
/
├── index.html              # Main web app (assessment + auth + advisor)
├── dream-builder.html      # Dream-to-Launch Builder
├── admin.html              # Admin dashboard
├── app.js                  # Main app logic
├── auth.js                 # Auth module (login, signup, settings)
├── dream-builder.js        # Dream Builder logic
├── api-client.js           # Fetch wrapper with auto Bearer token
├── toast.js                # Toast notification system
├── styles.css              # Global styles
├── docker-compose.yml      # Local dev stack
├── Makefile                # Dev shortcuts
├── .env.docker             # Local env vars (gitignored)
│
├── backend/
│   ├── main.py             # FastAPI app factory
│   ├── config.py           # Settings (pydantic-settings)
│   ├── dependencies.py     # Auth + DB FastAPI deps
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── ai/
│   │   ├── base.py
│   │   ├── factory.py
│   │   ├── hybrid_provider.py      # NIM → Ollama → fallback
│   │   ├── nvidia_nim_provider.py
│   │   ├── nvidia_embeddings.py
│   │   ├── nvidia_reranker.py
│   │   ├── ollama_provider.py
│   │   ├── anthropic_provider.py
│   │   ├── openai_provider.py
│   │   └── groq_provider.py
│   ├── middleware/
│   │   ├── tier.py                 # Pro tier enforcement
│   │   └── request_id.py
│   ├── routers/
│   │   ├── auth.py
│   │   ├── assessments.py
│   │   ├── ai.py                   # SSE streaming advice
│   │   ├── baselines.py
│   │   ├── billing.py
│   │   ├── profiles.py
│   │   ├── admin.py
│   │   └── business.py             # Dream Builder endpoints
│   ├── schemas/
│   │   ├── auth.py
│   │   ├── assessments.py
│   │   ├── profiles.py
│   │   └── business.py
│   └── prompts_dream.py            # Dream Builder AI prompts
│
├── mobile/
│   ├── app.json
│   ├── package.json
│   ├── .env                        # EXPO_PUBLIC_API_URL (gitignored)
│   └── src/
│       ├── api/                    # REST client (no Supabase SDK)
│       ├── components/             # VoiceMicButton, etc.
│       ├── hooks/                  # useVoiceInput
│       ├── navigation/
│       ├── screens/
│       ├── store/                  # Zustand auth store
│       └── theme/
│
├── supabase/
│   └── migrations/                 # SQL migration files (applied on compose up)
│
└── docker/
    ├── nginx-frontend.conf         # Serves static files, proxies /api/ to backend
    └── nginx-gateway.conf          # Supabase internal API gateway
```

---

## Local Development

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for mobile only)
- Python 3.11+ (optional — for running backend tests outside Docker)

### First-time setup

1. **Clone the repo**
   ```bash
   git clone <repo-url>
   cd smallbiz-cyber-ai-readiness-advisor
   ```

2. **Configure environment**

   Edit `.env.docker` (already present, gitignored):
   ```env
   # Required — already set with local dev defaults
   POSTGRES_PASSWORD=localdevpassword123!
   JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters-long
   ANON_KEY=<supabase-anon-jwt>
   SERVICE_ROLE_KEY=<supabase-service-role-jwt>

   # NVIDIA NIM — get free key at build.nvidia.com
   NVIDIA_API_KEY=nvapi-...

   # Stripe (test mode)
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PRICE_ID_MONTHLY=price_...
   STRIPE_PRICE_ID_YEARLY=price_...

   # Email (Resend)
   RESEND_API_KEY=re_...
   ADMIN_NOTIFICATION_EMAIL=you@example.com
   ```

3. **Start the stack**
   ```bash
   make up
   ```
   Starts in order: PostgreSQL → GoTrue → PostgREST → gateway → migrations → backend → frontend

4. **Get the URLs**
   ```bash
   make ports
   ```

### Make commands

| Command | Description |
|---------|-------------|
| `make up` | Start all containers in background |
| `make down` | Stop all containers |
| `make logs` | Follow logs from all containers |
| `make reset` | Tear down volumes + rebuild from scratch |
| `make ports` | Print current auto-assigned URLs |
| `make open` | Open frontend in default browser |
| `make shell-db` | Open psql shell in the database container |
| `make shell-backend` | Open bash shell in the backend container |
| `make test` | Run backend pytest suite |
| `make build` | Rebuild backend Docker image |

---

## URLs (local Docker)

> Ports are **auto-assigned** by Docker on every `make up`. Run `make ports` to get current values.  
> The Jetson host IP is `192.168.1.154`.

| Page | URL |
|------|-----|
| **Main App (Assessment)** | `http://192.168.1.154:<FRONTEND_PORT>/` |
| **Dream Builder** | `http://192.168.1.154:<FRONTEND_PORT>/dream-builder.html` |
| **Admin Dashboard** | `http://192.168.1.154:<FRONTEND_PORT>/admin.html` |
| **API Health** | `http://192.168.1.154:<FRONTEND_PORT>/api/health` |
| **Swagger API Docs** | `http://192.168.1.154:<FRONTEND_PORT>/api/docs` |
| **ReDoc API Docs** | `http://192.168.1.154:<FRONTEND_PORT>/api/redoc` |
| **PostgreSQL** | `192.168.1.154:<DB_PORT>` — user: `postgres` |

The backend (8000), GoTrue, PostgREST, and gateway are internal to Docker and not exposed to the host.

---

## API Overview

All browser requests go through nginx at `/api/` → proxied to the FastAPI backend.

| Router | Prefix | Key Endpoints |
|--------|--------|--------------|
| Auth | `/api/auth` | `POST /signup`, `POST /login`, `POST /logout`, `POST /forgot-password`, `PATCH /change-password` |
| Profiles | `/api/profiles` | `GET /me`, `PATCH /me` |
| Assessments | `/api/assessments` | `POST /`, `GET /`, `GET /{id}` |
| AI Advisor | `/api/ai` | `GET /advice/{assessment_id}/{dimension}` (SSE streaming), `GET /health`, `POST /transcribe` |
| Baselines | `/api/baselines` | `GET /me`, `POST /`, `DELETE /me` |
| Billing | `/api/billing` | `POST /checkout`, `POST /one-time-checkout`, `POST /portal`, `GET /subscription`, `GET /purchases` |
| Business | `/api/business` | `POST /quiz`, `GET /ideas`, `POST /ideas/{id}/save`, `GET /ideas/{id}/plan`, `DELETE /ideas/{id}`, `POST /analyze-document` |
| Admin | `/api/admin` | `GET /metrics`, `GET /users`, `GET /users/export`, `GET /users/{id}/assessments`, `PATCH /users/{id}`, `DELETE /users/{id}`, `GET /gpu-stats` |

---

## AI Provider Configuration

Set `AI_PROVIDER` in `.env.docker`:

| Value | Provider | Notes |
|-------|----------|-------|
| `hybrid` | NIM → Ollama → fallback **(default)** | Best for production on Jetson |
| `nvidia` | NVIDIA NIM cloud only | Requires `NVIDIA_API_KEY` |
| `ollama` | Local Ollama only | Ollama must be running on host |
| `anthropic` | Anthropic Claude | Requires `ANTHROPIC_API_KEY` |
| `openai` | OpenAI GPT | Requires `OPENAI_API_KEY` |
| `groq` | Groq (fast inference) | Requires `GROQ_API_KEY` |

**NVIDIA NIM:** Get a free API key at [build.nvidia.com](https://build.nvidia.com). Default model: `meta/llama-3.1-8b-instruct`.

---

## User Tiers

| Tier | Assessments/month | Dream Builder | AI Advisor | Admin |
|------|-------------------|--------------|------------|-------|
| `free` | 3 | Basic (quiz + ideas) | ✅ | ❌ |
| `pro` | Unlimited | Full (roadmap + plan) | ✅ | ❌ |
| `pro_annual` | Unlimited | Full | ✅ | ❌ |
| `admin` | Unlimited | Full | ✅ | ✅ |

Change a user's tier from the Admin dashboard or directly in psql.

---

## Mobile (Expo Go)

```bash
cd mobile
cp .env.example .env
# Edit .env — set EXPO_PUBLIC_API_URL=http://192.168.1.154:<FRONTEND_PORT>/api
npm install
npx expo start --lan
```

Scan the QR code with Expo Go on your phone. Device must be on the same WiFi as the Jetson.

**Web:**
```bash
npx expo start --web
```

---

## Database Migrations

Migrations run automatically on `make up` via the `migrate` container. To add a new migration:

1. Create `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
2. Run `make reset` to apply from scratch, or manually apply:
   ```bash
   make shell-db
   # inside psql:
   \i /migrations/your_migration.sql
   ```

---

## Deployment (Production)

### Backend — Railway
- Root directory: `backend/`
- Start command: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
- Set all env vars from `.env.docker` in the Railway dashboard
- Point `SUPABASE_URL` at your hosted Supabase project (not local Docker)

### Frontend — Vercel / Cloudflare Pages
- Deploy repo root — `index.html` is served directly, no build step
- Set `window.ADVISOR_API_URL` to the Railway backend URL in `index.html`, or inject via nginx

### Mobile — EAS Build
```bash
cd mobile
npm install -g eas-cli
eas build --platform all
```

---

## Sprints Completed

| Sprint | Features |
|--------|---------|
| 001 | Supabase auth, FastAPI backend, assessments DB, cloud baseline, history dashboard |
| 002 | Provider-agnostic AI advice engine, SSE streaming, advice cache |
| 003 | Stripe billing, free/pro tier enforcement, admin dashboard |
| 005 | Mobile onboarding gate, Expo SDK 50 navigation |
| 006 | Dream-to-Launch Builder (quiz, AI ideas, mission, launch plan, PDF export) |
| 007 | UX polish: toast system, autosave drafts, skeleton loaders, empty states, tooltips, delete account, subscription status, idea management |
| 008 | NVIDIA integrations: hybrid AI routing, NIM embeddings + reranker, Jetson GPU stats in admin, voice input on mobile, document/image upload analysis |

---

## Built by Champtron Systems LLC

*SmallBiz Cyber & AI Readiness Advisor — helping small businesses become cyber-ready, AI-ready, and funding-ready.*

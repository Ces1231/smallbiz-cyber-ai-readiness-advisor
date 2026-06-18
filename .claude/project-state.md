# Project State
_Last updated: 2026-06-17 by jarvis_

## Meta
- **project:** smallbiz-cyber-ai-readiness-advisor
- **state_mode:** single
- **version:** 0.1.0
- **last_updated:** 2026-06-17
- **last_updated_by:** jarvis
- **language:** python (backend) + vanilla js (frontend)
- **python_version:** 3.11+
- **stack:** FastAPI + Supabase + Vercel (frontend) + Railway (backend)
- **framework:** FastAPI 0.115.0
- **database:** Supabase PostgreSQL (hosted)
- **orm:** supabase-py client (no ORM)
- **cache:** in-memory (Redis deferred to Sprint 3+)
- **queue:** none
- **package_manager:** pip (backend)
- **lock_file:** requirements.txt (backend/)
- **ci:** none
- **docker:** true (backend/Dockerfile for Railway)
- **monorepo:** false
- **compliance_mode:** not set
- **project_size:** 3 source files / ~1800 lines (static tool pre-SaaS)
- **project_stage:** pre-production
- **personality:**
  - taglines: true

## Project Overview

**SmallBiz Cyber & AI Readiness Advisor** is a static single-page assessment tool for small businesses, built by Champtron Systems LLC. It scores businesses across three dimensions:
- Cyber Score = (MFA + Backups + Training) / 6 × 100
- AI Score = (Digital Tools + Automation + AI Usage) / 6 × 100
- Funding Score = (Documents + Online Presence + Growth Plan) / 6 × 100
- Overall = (Cyber × 0.38) + (AI × 0.32) + (Funding × 0.30)
- Thresholds: ≥80 Advanced, 60–79 Growth-ready, 40–59 Developing, <40 High-priority

**SaaS conversion goal:** Add auth (Supabase), persistence (PostgreSQL), AI advice (provider-agnostic via FastAPI), and billing (Stripe) while preserving the existing static tool UX and anonymous mode.

## Architecture

**Current (static):**
- `index.html` + `app.js` + `styles.css` — single HTML file, no build step, deployed to Vercel or GitHub Pages

**Target (SaaS):**
- Frontend: existing HTML/JS/CSS + `auth.js` + `api-client.js` — still no framework or build step
- Backend: FastAPI on Railway (`backend/` directory)
- DB: Supabase PostgreSQL with RLS
- Auth: Supabase Auth (JWT tokens)
- AI: Provider-agnostic adapter (`AI_PROVIDER` env var switches Anthropic/OpenAI/Groq/Ollama)
- Billing: Stripe (Sprint 3)

**Key constraint:** Do NOT introduce a JS framework or build step to the frontend. The tool must remain deployable as plain static files.

## Packages

### Frontend (`/` root)
**Files:** `index.html`, `app.js`, `styles.css`, `auth.js` (Sprint 1), `api-client.js` (Sprint 1)
**Purpose:** Static SPA assessment tool
**Key globals in app.js:** `latestData`, `latestScores`, `chart`, `latestReport`, `currentGeneratedDocument`, `window._lastSavedAssessmentId`, `window._userProfile`
**Key functions:** `renderResults`, `renderActionCenter`, `renderFundingPrep`, `renderFinalBusinessTools`, `generateDocument`, `saveBaseline`, `compareBaseline`, `loadAssessmentHistory`, `requestAIAdvice`, `initiateCheckout`
**CSS variables:** `--bg:#07111f`, `--panel:#0e1b2d`, `--panel2:#12243b`, `--text:#eef7ff`, `--muted:#a8bdd4`, `--cyan:#22d3ee`, `--blue:#60a5fa`, `--green:#34d399`, `--yellow:#facc15`, `--red:#fb7185`, `--border:rgba(255,255,255,.12)`

### Backend (`/backend/`)
**Files:** `main.py`, `config.py`, `dependencies.py`, `requirements.txt`, `Dockerfile`
**Purpose:** FastAPI REST API — auth proxy to Supabase, assessment persistence, AI advice streaming
**Key patterns:** Pydantic v2 models, FastAPI `Depends()` for auth + DB, structlog JSON logging, SSE via `StreamingResponse`

### AI Layer (`/backend/ai/`)
**Files:** `base.py`, `anthropic_provider.py`, `openai_provider.py`, `groq_provider.py`, `ollama_provider.py`, `factory.py`
**Purpose:** Provider-agnostic AI adapter — `AIProvider` ABC with `stream_completion()` and `health_check()`
**Provider selection:** `AI_PROVIDER` env var (`anthropic` | `openai` | `groq` | `ollama`)

### Routers (`/backend/routers/`)
| Router | Prefix | Key Endpoints |
|--------|--------|---------------|
| auth.py | `/auth` | POST /signup, POST /login, POST /logout, GET /me |
| assessments.py | `/assessments` | POST /, GET /, GET /{id} |
| baselines.py | `/baselines` | GET /me, POST /, DELETE /me |
| ai.py | `/ai` | GET /advice/{id}/{dim}, GET /health |
| profiles.py | `/profiles` | GET /me |
| billing.py | `/billing` | POST /checkout, POST /portal, GET /subscription, POST /webhook |
| admin.py | `/admin` | GET /metrics, GET /users |

## Handler Map

| Handler File | Packages / Features |
|-------------|---------------------|
| `backend/routers/auth.py` | Supabase Auth, user signup/login/logout |
| `backend/routers/assessments.py` | Assessment CRUD, quota enforcement |
| `backend/routers/baselines.py` | Baseline save/compare/delete |
| `backend/routers/ai.py` | AI advice streaming, advice_cache |
| `backend/routers/billing.py` | Stripe checkout, webhooks, portal |
| `backend/routers/profiles.py` | User profile + tier reads |
| `backend/routers/admin.py` | Admin-only aggregate metrics |

## Database Schema

### assessments
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | gen_random_uuid() |
| user_id | UUID FK | → auth.users(id) ON DELETE CASCADE |
| business_name | TEXT | 1–120 chars |
| industry | TEXT | enum: 7 values |
| challenge | TEXT | nullable |
| mfa, backups, training | SMALLINT | 0–2 each |
| digital_tools, automation, ai_usage | SMALLINT | 0–2 each |
| documents, online_presence, growth_plan | SMALLINT | 0–2 each |
| cyber_score, ai_score, funding_score, overall_score | SMALLINT | 0–100 |
| created_at, updated_at | TIMESTAMPTZ | auto |

### baselines
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID | UNIQUE — one baseline per user |
| assessment_id | UUID FK | → assessments(id) |
| business_name, cyber_score, ai_score, funding_score, overall_score | denormalized | snapshot |
| saved_at, created_at | TIMESTAMPTZ | |

### advice_cache
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK | → auth.users |
| assessment_id | UUID FK | → assessments |
| dimension | TEXT | enum: cyber, ai, funding, executive_summary, roadmap |
| provider, model | TEXT | which AI generated it |
| content | TEXT | full generated text |
| prompt_hash | TEXT | SHA-256 for lookup |
| UNIQUE | (assessment_id, dimension) | |

### user_profiles
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | = auth.users.id |
| business_name | TEXT | nullable |
| tier | TEXT | free / pro / admin |
| stripe_customer_id | TEXT | UNIQUE, nullable |
| assessments_this_month | INTEGER | counter, auto-reset |
| month_reset_at | TIMESTAMPTZ | date to reset counter |

### subscriptions
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK | → auth.users |
| stripe_subscription_id | TEXT UNIQUE | |
| status | TEXT | active/canceled/past_due/trialing/unpaid/incomplete |
| current_period_start/end | TIMESTAMPTZ | |
| cancel_at_period_end | BOOLEAN | |

**Latest migration:** 20260617160000 (all 5 migrations planned but not yet run)
**Migration tool:** Supabase CLI (`supabase db push`)
**Migration directory:** `supabase/migrations/`

## External Dependencies

| Service | Purpose | Auth |
|---------|---------|------|
| Supabase | Auth + PostgreSQL | SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + SUPABASE_ANON_KEY |
| Anthropic | AI advice (default) | ANTHROPIC_API_KEY |
| OpenAI | AI advice (optional) | OPENAI_API_KEY |
| Groq | AI advice (optional, fast/cheap) | GROQ_API_KEY |
| Ollama | AI advice (local dev, no cost) | OLLAMA_BASE_URL |
| Stripe | Billing | STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET |
| Railway | Backend hosting | Deploy via Dockerfile |
| Vercel | Frontend hosting | Static deploy from repo root |

## Auth & Middleware

- **Provider:** Supabase Auth (email/password, JWT)
- **Token type:** Bearer JWT (access token in memory, NOT localStorage)
- **Token lifetime:** 1 hour (Supabase default)
- **Auth extraction:** `get_current_user()` via `HTTPBearer` Depends — validates JWT via Supabase client
- **Tier enforcement:** `require_pro_tier()` and `check_assessment_quota()` Depends
- **Admin tier:** Set manually via Supabase dashboard — no self-serve promotion
- **RLS:** Row Level Security enabled on ALL tables — defense in depth

## Tier Model

| Tier | Assessments/month | AI Advisor | Admin API |
|------|------------------|------------|-----------|
| free | 3 | No | No |
| pro | Unlimited | Yes | No |
| admin | Unlimited | Yes | Yes |

## Architectural Decisions

1. **No JS framework** — existing HTML/JS/CSS enhanced in place. No build step, no React/Vue.
2. **In-memory JWT storage** — tokens never stored in localStorage (XSS protection). Users re-login on page reload in Sprint 1; refresh tokens in Sprint 2+.
3. **Scoring stays client-side** — `pct()`, `level()`, `risk()` remain in `app.js`. Backend stores pre-computed scores + raw inputs.
4. **RLS + application-layer auth** — defense in depth. Both enforce user isolation.
5. **Provider-agnostic AI** — `AI_PROVIDER` env var; `AIProvider` ABC pattern.
6. **SSE for AI streaming** — Server-Sent Events over WebSockets (unidirectional, simpler).
7. **Tier stored in DB** — not in JWT; changes take effect immediately without re-login.
8. **One Stripe customer per user** — created on first checkout, reused for portal.
9. **Advice cache by dimension** — `(assessment_id, dimension)` unique; allows selective regeneration.
10. **Admin page is separate HTML** — `admin.html` not linked from `index.html`.

## SPEC COUNTERS

| Prefix | Last Used |
|--------|-----------|
| SPRINT | 003 |
| FEAT | 000 |
| TASK | 000 |
| BUG | 000 |
| INFRA | 000 |

## Task History

| Task ID | Date | Title | Packages | Status |
|---------|------|-------|----------|--------|
| SPRINT-001 | 2026-06-17 | SaaS MVP — Auth, Persistence & User Dashboard | backend/, auth.js, api-client.js, supabase/ | pending |
| SPRINT-002 | 2026-06-17 | AI Advisor — Provider-Agnostic Advice Engine with Streaming | backend/ai/, backend/prompts.py, backend/routers/ai.py | pending |
| SPRINT-003 | 2026-06-17 | Billing — Stripe Subscriptions, Free Tier Enforcement & Admin Dashboard | backend/routers/billing.py, backend/routers/admin.py, admin.html | pending |

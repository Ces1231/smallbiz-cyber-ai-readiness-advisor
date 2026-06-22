# SPRINT-006: Dream Builder

**Sprint ID:** SPRINT-006
**Sprint Type:** Feature build — new business path (Q2 product, web + mobile + backend)
**Builder:** Iron Man (parallel sub-agents — see Iron Legion plan below)
**Branch:** `feature/sprint-006-dream-to-launch-builder`
**Status:** Draft
**Spec Author:** J.A.R.V.I.S.
**Created:** 2026-06-21
**Project Stage:** pre-production

---

## Sprint Meta

| Field | Value |
|-------|-------|
| Sprint ID | SPRINT-006 |
| Sprint Type | Large feature build — multi-tier product (free + 3 paid tiers) |
| Total Estimated Hours | ~80 hrs |
| Features | 8 (grouped into 4 parallel agent tracks) |
| Branch | `feature/sprint-006-dream-to-launch-builder` |
| Recommended Builder | Iron Man (3 parallel agents) |
| Alternative Builder | Wasp (sequential, ~80h wall clock) |
| Spec Author | J.A.R.V.I.S. |
| Created | 2026-06-21 |
| Dependencies | SPRINT-005 complete (OnboardingGate routes new-business users here) |

---

## Sprint Overview

SPRINT-005 installed the onboarding gate that intercepts new-business users and routes them to a "startup path" — currently a stub. This sprint builds the actual destination: the **Dream Builder**, a guided, AI-powered product that takes a user from a vague business idea to a structured launch plan.

The product has four tiers:

| Tier | Price | Type | What the user gets |
|------|-------|------|-------------------|
| Dream Starter | $0 | Free | Quiz, AI idea suggestions, basic score, mission preview, 5-item checklist, 1 saved idea |
| Launch Builder | $19 | One-time | Full checklist, cost calculator, pricing builder, 30-day plan |
| Launch Packet Pro | $49 | One-time | Business plan PDF, full mission/vision, customer persona, funding checklist, 90-day roadmap, all exports |
| Advisor Review | $149 | One-time | Triggers admin email + scheduling confirmation |

One-time purchases (not subscriptions) use Stripe Payment Intents. A new `purchases` table tracks ownership. Access is checked at the endpoint level by querying `purchases` for the matching `product_key`.

### Routing Context from SPRINT-005

The `OnboardingGateScreen` (mobile) sets `pendingRoute: 'StartupStep1'` when Q2 is answered YES. `StartupStep1` is already in `AppStackParamList`. The existing `StartupStep1–9 / StartupScore / StartupLaunchPlan` screens handle the **existing startup assessment form** (formation, finance, digital readiness). The Dream-to-Launch Builder is a **separate, parallel path** that starts from the onboarding gate's Q2 YES answer.

**Resolution:** The Q2 YES path on web currently shows a "coming soon" placeholder. This sprint replaces that placeholder with a redirect to `dream-builder.html`. On mobile, a new `DreamBuilderQuiz` route is added to `AppStackParamList`. The `pendingRoute` store value for the Q2 YES path is changed from `'StartupStep1'` to `'DreamBuilderQuiz'`.

> **Note:** The existing `StartupStep1–9` screens remain intact. They represent the "readiness assessment for an existing idea." The Dream-to-Launch Builder is the "idea discovery + launch planning" path for users who don't yet have a business idea.

---

## Iron Legion Batching Plan

This sprint has four parallel tracks. Each track is safe to build independently because schema migrations are in Track A (which must land first).

### Round 1: Track A — Database + Backend Core (blocks all other tracks)

| Agent | Track | Tasks | Est Hours | Wall Clock |
|-------|-------|-------|-----------|------------|
| Agent 1 | Track A | DB migrations + backend router + billing one-time flow | 24 hrs | ~24h |

Track A must merge before Round 2 begins. All other tracks depend on the API endpoints Track A creates.

### Round 2: Three parallel tracks (after Track A merges)

| Agent | Track | Tasks | Est Hours | Wall Clock |
|-------|-------|-------|-----------|------------|
| Agent 2 | Track B | Web frontend — `dream-builder.html` + web JS/CSS | 20 hrs | ~20h |
| Agent 3 | Track C | Mobile screens — DreamBuilderQuiz → Results → Plan → Upgrade | 24 hrs | ~24h |
| Agent 4 | Track D | AI prompts + PDF generation + tests | 14 hrs | ~14h |

Total: ~82h of work, ~44h effective wall clock (24h Round 1 + 20h Round 2).

### Merge Order

1. **Track A first** — schema and API; everything else depends on it
2. **Track D second** — AI prompt module is additive, no conflicts
3. **Track B third** — static HTML/JS/CSS files, no conflicts with mobile
4. **Track C last** — mobile screens reference API client (from Track A); may need minor merge fix if Track B conflicts

### Ready-to-Run Command

```
Use autopilot-iron-legion. Skip to build. Specs: docs/specs/SPRINT-006-dream-to-launch-builder.md. Branch: feature/sprint-006-dream-to-launch-builder. 4 agents. Track A first, then Tracks B/C/D in parallel.
```

---

## Feature Sequence (for Wasp — sequential fallback)

If running with Wasp instead of Iron Man, execute in this order:

| # | Feature | Track | Est Hours | Migration? |
|---|---------|-------|-----------|------------|
| 1 | DB migrations (4 new tables) | A | 4 hrs | Yes |
| 2 | Backend: `/business` router + schemas | A | 10 hrs | No |
| 3 | Backend: one-time billing endpoints | A | 6 hrs | No |
| 4 | Backend: AI prompts for dream builder | D | 4 hrs | No |
| 5 | Backend: PDF generation | D | 4 hrs | No |
| 6 | Backend: tests | D | 6 hrs | No |
| 7 | Web: `dream-builder.html` + JS + CSS | B | 20 hrs | No |
| 8 | Mobile: 4 new screens + API client + nav | C | 24 hrs | No |

---

## Track A — Database & Backend

### Feature 1: Database Migrations

**Estimated Hours:** ~4 hrs

**Migration directory:** `supabase/migrations/`
**Latest existing migration:** `20260618140000_create_startup_assessments.sql`
**New migrations use timestamps starting at:** `20260621100000`

#### Migration 1: `20260621100000_create_business_ideas.sql`

```sql
create table if not exists public.business_ideas (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,

  -- Quiz answers (stored as-is for AI re-generation)
  skills              text[] not null default '{}',       -- multi-select from skills list
  problems            text[] not null default '{}',       -- multi-select from problems list
  business_type       text not null,                      -- 'service' | 'product' | 'online' | 'local'
  starting_capital    text not null,                      -- '<500' | '500-2k' | '2k-10k' | '10k+'
  weekly_hours        text not null,                      -- '<5' | '5-15' | '15-30' | '30+'

  -- AI-generated results (stored after quiz submission)
  ai_suggestions      jsonb,    -- array of up to 3 idea objects (see schema below)
  selected_idea_index integer,  -- 0, 1, or 2 — which suggestion the user saved

  -- Derived scores (from selected idea)
  business_fit_pct    integer,  -- 0–100
  startup_cost_tier   text,     -- 'Low' | 'Medium' | 'High'
  difficulty_tier     text,     -- 'Easy' | 'Medium' | 'Hard'
  revenue_potential   text,     -- 'Low' | 'Medium' | 'Medium to High' | 'High'

  -- Simple mission statement (AI-generated preview)
  mission_statement   text,

  -- Status
  status              text not null default 'draft',  -- 'draft' | 'saved' | 'archived'

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- One active saved idea per user (soft limit enforced at API layer, not DB constraint)
create index business_ideas_user_id_idx on public.business_ideas(user_id);
create index business_ideas_user_status_idx on public.business_ideas(user_id, status);

alter table public.business_ideas enable row level security;

create policy "Users manage own business_ideas"
  on public.business_ideas
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

**`ai_suggestions` JSONB element schema:**
```json
{
  "name": "Mobile Tech Setup Service for Small Businesses",
  "description": "Help local small businesses set up computers, printers, and WiFi networks.",
  "business_fit_pct": 82,
  "startup_cost_tier": "Low",
  "difficulty_tier": "Medium",
  "revenue_potential": "Medium to High"
}
```

#### Migration 2: `20260621110000_create_launch_plans.sql`

```sql
create table if not exists public.launch_plans (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  business_idea_id    uuid not null references public.business_ideas(id) on delete cascade,

  -- Tier this plan was generated for
  tier                text not null,  -- 'launch_builder' | 'launch_packet_pro'

  -- Generated plan content (JSONB — structure varies by tier)
  checklist           jsonb,    -- array of checklist items with categories
  cost_calculator     jsonb,    -- itemized cost breakdown
  pricing_packages    jsonb,    -- 3 sample packages
  thirty_day_plan     jsonb,    -- week-by-week milestones (launch_builder+)
  business_plan_text  text,     -- full AI-generated business plan (pro only)
  mission_vision      text,     -- full mission + vision statement (pro only)
  customer_persona    jsonb,    -- ideal customer profile (pro only)
  funding_checklist   jsonb,    -- funding readiness items (pro only)
  cyber_ai_checklist  jsonb,    -- cyber & AI starter items (pro only)
  ninety_day_roadmap  jsonb,    -- month-by-month milestones (pro only)

  -- PDF artifacts
  pdf_url             text,     -- Supabase Storage URL (pro only, nullable)
  pdf_generated_at    timestamptz,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- One plan per idea per tier
  unique (business_idea_id, tier)
);

create index launch_plans_user_id_idx on public.launch_plans(user_id);
create index launch_plans_idea_id_idx on public.launch_plans(business_idea_id);

alter table public.launch_plans enable row level security;

create policy "Users manage own launch_plans"
  on public.launch_plans
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

#### Migration 3: `20260621120000_create_purchases.sql`

```sql
create table if not exists public.purchases (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references auth.users(id) on delete cascade,

  -- Product identifier (maps to billing tier logic)
  product_key               text not null,  -- 'launch_builder' | 'launch_packet_pro' | 'advisor_review'

  -- Stripe Payment Intent fields
  stripe_payment_intent_id  text unique,    -- pi_xxxx — idempotency key
  stripe_customer_id        text,
  amount_cents              integer,        -- e.g. 1900, 4900, 14900
  currency                  text not null default 'usd',

  -- Status lifecycle
  status                    text not null default 'pending',
  -- 'pending'   → payment intent created, not yet paid
  -- 'completed' → webhook confirmed payment_intent.succeeded
  -- 'refunded'  → webhook confirmed charge.refunded
  -- 'failed'    → webhook confirmed payment_intent.payment_failed

  purchased_at              timestamptz,    -- set on webhook confirmation
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index purchases_user_id_idx on public.purchases(user_id);
create index purchases_user_product_idx on public.purchases(user_id, product_key, status);
create index purchases_payment_intent_idx on public.purchases(stripe_payment_intent_id);

alter table public.purchases enable row level security;

create policy "Users read own purchases"
  on public.purchases
  for select
  using (auth.uid() = user_id);

-- Service role only can insert/update (webhook handler uses service role key)
```

#### Migration 4: `20260621130000_create_advisor_requests.sql`

```sql
create table if not exists public.advisor_requests (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  business_idea_id    uuid references public.business_ideas(id) on delete set null,
  purchase_id         uuid references public.purchases(id) on delete set null,

  -- Contact info (copied from user profile at time of request)
  user_email          text not null,
  business_name       text,

  -- Status lifecycle
  status              text not null default 'pending',
  -- 'pending'    → request received, not yet scheduled
  -- 'scheduled'  → admin has booked a session
  -- 'completed'  → session held
  -- 'cancelled'  → user or admin cancelled

  -- Admin notes (only admin role can write)
  notes               text,
  scheduled_at        timestamptz,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index advisor_requests_user_id_idx on public.advisor_requests(user_id);
create index advisor_requests_status_idx on public.advisor_requests(status);

alter table public.advisor_requests enable row level security;

create policy "Users read own advisor_requests"
  on public.advisor_requests
  for select
  using (auth.uid() = user_id);

-- Service role only for insert/update
```

#### Migration Acceptance Criteria

- [ ] All 4 migrations apply cleanly with `supabase db push`
- [ ] All tables have RLS enabled
- [ ] `business_ideas` user policy enforces row-level isolation
- [ ] `launch_plans` unique constraint on `(business_idea_id, tier)` prevents duplicate plans
- [ ] `purchases` payment_intent uniqueness prevents duplicate webhook processing
- [ ] Rollback: `drop table if exists public.advisor_requests, public.purchases, public.launch_plans, public.business_ideas cascade;`

---

### Feature 2: Backend — `/business` Router

**New file:** `backend/routers/business.py`
**New file:** `backend/schemas/business.py`
**Modify:** `backend/main.py` — register router at prefix `/business`
**Estimated Hours:** ~10 hrs

#### Registration in `main.py`

```python
from backend.routers.business import router as business_router
app.include_router(business_router, prefix="/business", tags=["business"])
```

#### Pydantic Schemas — `backend/schemas/business.py`

```python
"""Pydantic schemas for the Dream-to-Launch Builder endpoints."""
from datetime import datetime
from typing import Any, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ── Quiz ──────────────────────────────────────────────────────────────────────

SKILLS_OPTIONS = [
    "computers_tech", "sales_marketing", "writing_content", "design_creative",
    "teaching_coaching", "cooking_food", "trades_repair", "healthcare_wellness",
    "finance_accounting", "management_leadership", "customer_service", "languages",
    "music_arts", "sports_fitness", "childcare_education",
]

PROBLEMS_OPTIONS = [
    "save_time", "save_money", "reduce_stress", "learn_something",
    "improve_health", "find_community", "get_entertainment", "solve_tech_problem",
    "improve_home", "grow_business", "get_professional_services", "get_local_services",
]

BUSINESS_TYPE_OPTIONS = Literal["service", "product", "online", "local"]
CAPITAL_OPTIONS = Literal["<500", "500-2k", "2k-10k", "10k+"]
HOURS_OPTIONS = Literal["<5", "5-15", "15-30", "30+"]


class QuizSubmitRequest(BaseModel):
    skills: list[str] = Field(..., min_length=1, max_length=15)
    problems: list[str] = Field(..., min_length=1, max_length=12)
    business_type: BUSINESS_TYPE_OPTIONS
    starting_capital: CAPITAL_OPTIONS
    weekly_hours: HOURS_OPTIONS


class IdeaSuggestion(BaseModel):
    name: str
    description: str
    business_fit_pct: int = Field(..., ge=0, le=100)
    startup_cost_tier: Literal["Low", "Medium", "High"]
    difficulty_tier: Literal["Easy", "Medium", "Hard"]
    revenue_potential: str


class QuizSubmitResponse(BaseModel):
    business_idea_id: UUID
    suggestions: list[IdeaSuggestion]  # 3 items
    mission_preview: str               # first 2 sentences of mission statement


# ── Ideas ─────────────────────────────────────────────────────────────────────

class BusinessIdeaListItem(BaseModel):
    id: UUID
    selected_idea_index: Optional[int]
    business_fit_pct: Optional[int]
    startup_cost_tier: Optional[str]
    difficulty_tier: Optional[str]
    revenue_potential: Optional[str]
    status: str
    created_at: datetime
    # Derived from ai_suggestions[selected_idea_index]
    idea_name: Optional[str] = None
    idea_description: Optional[str] = None


class BusinessIdeaListResponse(BaseModel):
    data: list[BusinessIdeaListItem]


class SaveIdeaRequest(BaseModel):
    idea_index: int = Field(..., ge=0, le=2)  # which of the 3 suggestions to save


class SaveIdeaResponse(BaseModel):
    business_idea_id: UUID
    idea_name: str
    idea_description: str
    business_fit_pct: int
    startup_cost_tier: str
    difficulty_tier: str
    revenue_potential: str
    mission_preview: str


# ── Plans ─────────────────────────────────────────────────────────────────────

class PlanTier(str):
    LAUNCH_BUILDER = "launch_builder"
    LAUNCH_PACKET_PRO = "launch_packet_pro"


class LaunchPlanResponse(BaseModel):
    business_idea_id: UUID
    tier: str
    # Launch Builder content
    checklist: Optional[list[dict[str, Any]]] = None
    cost_calculator: Optional[list[dict[str, Any]]] = None
    pricing_packages: Optional[list[dict[str, Any]]] = None
    thirty_day_plan: Optional[list[dict[str, Any]]] = None
    # Pro-only content
    business_plan_text: Optional[str] = None
    mission_vision: Optional[str] = None
    customer_persona: Optional[dict[str, Any]] = None
    funding_checklist: Optional[list[dict[str, Any]]] = None
    cyber_ai_checklist: Optional[list[dict[str, Any]]] = None
    ninety_day_roadmap: Optional[list[dict[str, Any]]] = None
    pdf_url: Optional[str] = None
    created_at: datetime


class GeneratePdfResponse(BaseModel):
    pdf_url: str
    generated_at: datetime


# ── Advisor Request ───────────────────────────────────────────────────────────

class AdvisorRequestResponse(BaseModel):
    advisor_request_id: UUID
    status: str
    message: str  # user-facing confirmation message
```

#### Endpoints — `backend/routers/business.py`

**POST `/business/quiz`**

```
Auth:     Bearer JWT (logged-in user)
Purpose:  Submit quiz answers → AI generates 3 idea suggestions → persist to business_ideas
Returns:  QuizSubmitResponse
```

Request body: `QuizSubmitRequest`

Response body:
```json
{
  "business_idea_id": "uuid",
  "suggestions": [
    {
      "name": "Mobile Tech Setup Service for Small Businesses",
      "description": "Help local businesses set up computers and WiFi.",
      "business_fit_pct": 82,
      "startup_cost_tier": "Low",
      "difficulty_tier": "Medium",
      "revenue_potential": "Medium to High"
    },
    { "..." },
    { "..." }
  ],
  "mission_preview": "First two sentences of the mission statement."
}
```

Errors:
| Status | Code | When |
|--------|------|------|
| 400 | `invalid_quiz_input` | Skills list empty or unknown value |
| 503 | `ai_unavailable` | AI provider returns error |
| 503 | `service_unavailable` | DB write fails |

Implementation logic:
1. Validate request — all skills/problems values must be in allowed lists
2. Call `generate_idea_suggestions(quiz_data)` from `backend/prompts_dream.py` (see Track D)
3. Call `generate_mission_preview(idea_suggestions[0])` — returns full mission; slice to 2 sentences for preview
4. Persist to `business_ideas`: store quiz fields, `ai_suggestions` JSONB, `mission_statement` (full text), `status='draft'`
5. Return `QuizSubmitResponse` with `mission_preview` = first 2 sentences

---

**GET `/business/ideas`**

```
Auth:     Bearer JWT
Purpose:  List all business ideas for the current user
Returns:  BusinessIdeaListResponse
```

Response: Array of `BusinessIdeaListItem` ordered by `created_at DESC`. Derives `idea_name` and `idea_description` from `ai_suggestions[selected_idea_index]` in Python before returning (do not push this logic to the client).

---

**POST `/business/ideas/{idea_id}/save`**

```
Auth:     Bearer JWT
Purpose:  Save a selected idea (set selected_idea_index, derive scores, update status to 'saved')
Path:     idea_id — UUID of the business_ideas row
Body:     SaveIdeaRequest
Returns:  SaveIdeaResponse
```

Errors:
| Status | Code | When |
|--------|------|------|
| 404 | `idea_not_found` | Row not found or not owned by user |
| 400 | `idea_index_out_of_range` | `idea_index` >= len(ai_suggestions) |
| 409 | `idea_already_saved` | This idea already has status='saved' |

Implementation logic:
1. Fetch `business_ideas` row — verify `user_id` matches, return 404 if not
2. Validate `idea_index` < len(ai_suggestions)
3. Extract the chosen suggestion's fields into the top-level columns (`business_fit_pct`, `startup_cost_tier`, `difficulty_tier`, `revenue_potential`)
4. Set `selected_idea_index = idea_index`, `status = 'saved'`
5. Update row in DB
6. Return `SaveIdeaResponse`

---

**GET `/business/ideas/{idea_id}/plan`**

```
Auth:     Bearer JWT + purchase check
Purpose:  Get the full launch plan for a saved idea at the requested tier
Query:    ?tier=launch_builder OR ?tier=launch_packet_pro
Returns:  LaunchPlanResponse
```

Purchase check logic:
- Query `purchases` for `(user_id, product_key=tier, status='completed')`
- `launch_packet_pro` purchase also satisfies `launch_builder` access (pro includes builder)
- Return 402 if no completed purchase found

If plan already exists in `launch_plans` for `(business_idea_id, tier)` → return cached plan.
If no cached plan → generate via AI (Track D prompts), persist, return.

Errors:
| Status | Code | When |
|--------|------|------|
| 402 | `purchase_required` | No completed purchase for this tier |
| 404 | `idea_not_found` | business_ideas row not found or not owned |
| 400 | `idea_not_saved` | Idea status is not 'saved' |
| 503 | `service_unavailable` | AI or DB failure |

---

**POST `/business/ideas/{idea_id}/generate-pdf`**

```
Auth:     Bearer JWT + launch_packet_pro purchase check
Purpose:  Generate a business plan PDF and store URL in launch_plans
Returns:  GeneratePdfResponse
```

Implementation notes:
- Requires `launch_packet_pro` purchase only
- Calls `generate_pdf(business_plan_text, idea_data)` from `backend/pdf_generator.py` (Track D)
- PDF is base64-encoded and stored in Supabase Storage bucket `business-plans` as `{user_id}/{idea_id}/business-plan.pdf`
- Updates `launch_plans.pdf_url` and `pdf_generated_at`
- Returns `{ "pdf_url": "https://...", "generated_at": "..." }`

Errors:
| Status | Code | When |
|--------|------|------|
| 402 | `purchase_required` | No launch_packet_pro purchase |
| 404 | `plan_not_found` | launch_plans row not found (must generate plan first) |
| 503 | `pdf_generation_failed` | PDF library or storage error |

---

**POST `/business/advisor-request`**

```
Auth:     Bearer JWT + advisor_review purchase check
Purpose:  Create advisor_request row + send admin notification email
Body:     { "business_idea_id": "uuid" } (optional — can be null)
Returns:  AdvisorRequestResponse
```

Implementation logic:
1. Verify `advisor_review` purchase exists (`status='completed'`)
2. Check for existing pending/scheduled request — return 409 if one already exists
3. Fetch user email from `current_user["email"]`
4. Insert `advisor_requests` row (`status='pending'`, `user_email`, `business_idea_id` if provided)
5. Send email to admin via `send_advisor_notification_email()` (see Track D — uses SMTP or Resend)
6. Return confirmation message

Errors:
| Status | Code | When |
|--------|------|------|
| 402 | `purchase_required` | No advisor_review purchase |
| 409 | `request_already_exists` | Open advisor request already on file |
| 503 | `service_unavailable` | DB or email failure |

Response:
```json
{
  "advisor_request_id": "uuid",
  "status": "pending",
  "message": "Your Advisor Review request has been received. You will receive a scheduling link at your email address within 1 business day."
}
```

---

### Feature 3: Backend — One-Time Billing Endpoints

**Modify:** `backend/routers/billing.py` — add two new endpoints
**Modify:** `backend/schemas/billing.py` — add one-time schemas
**Modify:** `backend/config.py` — add new env vars
**Estimated Hours:** ~6 hrs

#### New Env Vars (add to `backend/config.py`)

```python
# Dream-to-Launch one-time product price IDs
stripe_price_id_launch_builder: str = ""      # $19 — Stripe Price object ID
stripe_price_id_launch_packet_pro: str = ""   # $49 — Stripe Price object ID
stripe_price_id_advisor_review: str = ""      # $149 — Stripe Price object ID

# Admin notification email
admin_notification_email: str = "info@champtron-systems.com"

# Email sending (use one of: resend, smtp)
email_provider: str = "resend"
resend_api_key: str = ""
smtp_host: str = ""
smtp_port: int = 587
smtp_user: str = ""
smtp_password: str = ""
smtp_from_email: str = "noreply@champtron-systems.com"

# Dream Builder success/cancel URLs
dream_builder_success_url: str = "http://localhost:3000/dream-builder.html?checkout=success"
dream_builder_cancel_url: str = "http://localhost:3000/dream-builder.html?checkout=cancel"
```

#### One-Time Product Key Map

Add to `billing.py`:

```python
_ONE_TIME_PRICE_ALIASES = {
    "launch_builder":     settings.stripe_price_id_launch_builder,
    "launch_packet_pro":  settings.stripe_price_id_launch_packet_pro,
    "advisor_review":     settings.stripe_price_id_advisor_review,
}

_ONE_TIME_AMOUNTS = {
    "launch_builder":     1900,   # $19.00 USD
    "launch_packet_pro":  4900,   # $49.00 USD
    "advisor_review":     14900,  # $149.00 USD
}
```

#### New Schema additions to `backend/schemas/billing.py`

```python
class OneTimeCheckoutRequest(BaseModel):
    product_key: Literal["launch_builder", "launch_packet_pro", "advisor_review"]

class OneTimeCheckoutResponse(BaseModel):
    client_secret: str          # Stripe PaymentIntent client_secret for Stripe.js
    payment_intent_id: str      # pi_xxxx — store for idempotency
    amount_cents: int
    product_key: str
```

#### POST `/billing/one-time-checkout`

```
Auth:     Bearer JWT
Purpose:  Create a Stripe PaymentIntent for a one-time Dream Builder product
Body:     OneTimeCheckoutRequest
Returns:  OneTimeCheckoutResponse
```

Implementation logic:
1. Validate `product_key` is in `_ONE_TIME_PRICE_ALIASES`
2. Check if user already has a `completed` purchase for this `product_key` → return 409
3. Get or create Stripe customer (reuse `_get_or_create_stripe_customer()`)
4. Create Stripe PaymentIntent:
   ```python
   intent = client.payment_intents.create(params={
       "amount": _ONE_TIME_AMOUNTS[product_key],
       "currency": "usd",
       "customer": customer_id,
       "metadata": {
           "supabase_user_id": user_id,
           "product_key": product_key,
       },
       "automatic_payment_methods": {"enabled": True},
   })
   ```
5. Insert `purchases` row with `status='pending'`, `stripe_payment_intent_id=intent.id`, `amount_cents`, `product_key`
6. Return `client_secret` and `payment_intent_id`

Errors:
| Status | Code | When |
|--------|------|------|
| 400 | `invalid_product` | product_key not recognized |
| 409 | `already_purchased` | Completed purchase already exists |
| 502 | `billing_unavailable` | Stripe API error |

---

#### POST `/billing/one-time-webhook`

```
Auth:     Public (Stripe signature verification only)
Purpose:  Handle Stripe webhook for one-time payment events
Body:     Raw Stripe event payload
Header:   stripe-signature
```

**Note:** This is a separate webhook endpoint from the existing `/billing/webhook` (which handles subscription events). Stripe must be configured to send one-time payment events to this endpoint. Use a separate webhook secret env var: `stripe_one_time_webhook_secret`.

Add to `config.py`:
```python
stripe_one_time_webhook_secret: str = ""
```

Handled events:

| Event | Action |
|-------|--------|
| `payment_intent.succeeded` | Update `purchases.status = 'completed'`, set `purchased_at = now()` |
| `payment_intent.payment_failed` | Update `purchases.status = 'failed'` |
| `charge.refunded` | Update `purchases.status = 'refunded'` |

Idempotency: check `purchases` row by `stripe_payment_intent_id` before updating — skip if already in target state.

Implementation pattern (mirrors existing `/billing/webhook`):
```python
@router.post("/one-time-webhook", status_code=200)
async def handle_one_time_webhook(
    request: Request,
    stripe_signature: str = Header(alias="stripe-signature", default=""),
    supabase: Client = Depends(get_supabase_client),
) -> dict:
    ...
    if event_type == "payment_intent.succeeded":
        await _on_payment_intent_succeeded(data, supabase)
    elif event_type == "payment_intent.payment_failed":
        await _on_payment_intent_failed(data, supabase)
    elif event_type == "charge.refunded":
        await _on_charge_refunded(data, supabase)
    ...
```

---

#### Purchase Check Dependency

Add to `backend/dependencies.py`:

```python
async def require_purchase(
    product_key: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> dict:
    """
    Verifies the current user has a completed purchase for the given product_key.
    launch_packet_pro access also satisfies launch_builder.
    Raises HTTP 402 if no valid purchase found.
    """
    user_id = current_user["id"]
    keys_to_check = [product_key]
    if product_key == "launch_builder":
        keys_to_check.append("launch_packet_pro")  # pro includes builder

    result = (
        supabase.table("purchases")
        .select("id, product_key")
        .eq("user_id", user_id)
        .in_("product_key", keys_to_check)
        .eq("status", "completed")
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "error": "purchase_required",
                "message": "A purchase is required to access this content.",
                "details": {"product_key": product_key},
            },
        )
    return current_user
```

Usage in business router:
```python
from functools import partial

def require_launch_builder(current_user=Depends(get_current_user), supabase=Depends(get_supabase_client)):
    return require_purchase("launch_builder", current_user, supabase)
```

Because `require_purchase` needs `product_key` as a parameter, use a closure or inline async wrapper per endpoint rather than a bare `Depends()`.

---

## Track D — AI Prompts, PDF Generation & Tests

### Feature 4: AI Prompts for Dream Builder

**New file:** `backend/prompts_dream.py`
**Estimated Hours:** ~4 hrs

This module provides three async functions used by `business.py`.

#### `generate_idea_suggestions(quiz_data: dict) -> list[dict]`

```python
async def generate_idea_suggestions(quiz_data: dict) -> list[dict]:
    """
    Given quiz answers, generate 3 business idea suggestions via the AI provider.
    Returns a list of 3 dicts matching the IdeaSuggestion schema.
    Raises RuntimeError if the AI response cannot be parsed.
    """
```

System prompt template:
```
You are a business advisor helping small business owners discover their best business idea.
Given a person's skills, interests, budget, and time availability, suggest exactly 3 business ideas.

Return a JSON array of exactly 3 objects with these keys:
- name (string): short business name, max 60 chars
- description (string): one sentence, max 120 chars
- business_fit_pct (integer): 0-100, how well this matches their profile
- startup_cost_tier (string): exactly one of "Low", "Medium", "High"
- difficulty_tier (string): exactly one of "Easy", "Medium", "Hard"
- revenue_potential (string): exactly one of "Low", "Medium", "Medium to High", "High"

Skills: {skills}
Problems they want to solve: {problems}
Business type preference: {business_type}
Starting capital: {starting_capital}
Weekly hours available: {weekly_hours}

Return ONLY the JSON array. No explanation, no markdown, no extra text.
```

JSON parse the response. If parsing fails, retry once with a stricter prompt. After 2 failures, raise `RuntimeError("ai_parse_failed")`.

---

#### `generate_mission_preview(idea: dict) -> str`

```python
async def generate_mission_preview(idea: dict) -> str:
    """
    Generate a mission statement for the business idea.
    Returns the full statement (stored in DB). Caller slices to 2 sentences for preview.
    """
```

System prompt:
```
Write a professional mission statement for this small business idea. 
Be specific, motivating, and 3-4 sentences long.
Business: {name}
Description: {description}
Return ONLY the mission statement. No headers, no bullets.
```

---

#### `generate_launch_plan(idea: dict, tier: str) -> dict`

```python
async def generate_launch_plan(idea: dict, tier: str) -> dict:
    """
    Generate a full launch plan for the given tier.
    tier: 'launch_builder' | 'launch_packet_pro'
    Returns a dict with keys matching the launch_plans table columns.
    """
```

For `launch_builder` tier, generate:
- `checklist`: array of `{item, category, required}` objects (legal setup, licenses, registration — 15–20 items)
- `cost_calculator`: array of `{item, estimated_cost_low, estimated_cost_high, category}` objects
- `pricing_packages`: array of 3 `{name, description, price_suggestion, included_services}` objects
- `thirty_day_plan`: array of 4 `{week, title, milestones: []}` objects

For `launch_packet_pro` tier, generate all of the above, plus:
- `business_plan_text`: 8–12 paragraph business plan as a single text block
- `mission_vision`: mission + vision statement combined
- `customer_persona`: `{name, age_range, occupation, goals, pain_points, where_to_find}`
- `funding_checklist`: array of `{item, category, completed: false}`
- `cyber_ai_checklist`: array of `{item, category, completed: false}`
- `ninety_day_roadmap`: array of 3 `{month, title, goals: []}` objects

Each section is generated with a focused AI call. For `launch_packet_pro`, make 3 sequential AI calls (plan + persona + business plan text) to stay under token limits.

---

### Feature 5: PDF Generation

**New file:** `backend/pdf_generator.py`
**New dependency:** `weasyprint` or `reportlab` (add to `requirements.txt`)
**Estimated Hours:** ~4 hrs

**Recommendation:** Use `weasyprint` — it renders HTML to PDF, which maps naturally to the business plan structure. Add `weasyprint>=60.2` to `requirements.txt`.

```python
async def generate_pdf(
    business_plan_text: str,
    idea: dict,
    mission_vision: str,
    customer_persona: dict,
) -> bytes:
    """
    Render the business plan as a PDF and return raw bytes.
    Uses an HTML template rendered with basic string formatting (no Jinja2 dependency).
    """
```

PDF template structure (8–12 pages):
1. Cover page: business name, tagline, "Prepared by Dream Builder"
2. Executive summary (from mission_vision)
3. Business overview (from idea name + description)
4. Market analysis (customer persona)
5. Business plan sections (from business_plan_text, split by paragraph headers)
6. Appendix: Champtron Systems LLC contact block

PDF is returned as bytes from `generate_pdf()`. Caller uploads to Supabase Storage:

```python
# In business.py — generate-pdf endpoint
pdf_bytes = await generate_pdf(...)
bucket = supabase.storage.from_("business-plans")
path = f"{user_id}/{idea_id}/business-plan.pdf"
bucket.upload(path, pdf_bytes, {"content-type": "application/pdf", "upsert": "true"})
public_url = bucket.get_public_url(path)
```

**Supabase Storage prerequisite:** The `business-plans` bucket must exist and be set to private (signed URLs only). Document this in acceptance criteria — Eitri/manual setup required.

---

### Feature 6: Tests

**New file:** `backend/tests/test_business.py`
**New file:** `backend/tests/test_billing_onetime.py`
**Estimated Hours:** ~6 hrs

#### `test_business.py` test checklist

```
POST /business/quiz
[ ] Returns 201 with 3 suggestions for valid quiz input
[ ] Returns 400 for empty skills list
[ ] Returns 400 for unknown skill value
[ ] Persists business_ideas row to DB (mock Supabase insert)
[ ] Calls AI provider once (mock AI)
[ ] Returns mission_preview of 2 sentences

GET /business/ideas
[ ] Returns empty list for new user
[ ] Returns saved ideas with idea_name derived from ai_suggestions

POST /business/ideas/{id}/save
[ ] Returns 200 with idea details on valid save
[ ] Returns 404 for idea not owned by current user
[ ] Returns 400 for idea_index out of range
[ ] Sets status='saved' and writes selected_idea_index

GET /business/ideas/{id}/plan
[ ] Returns 402 when no purchase exists
[ ] Returns 200 with cached plan when launch_plans row exists
[ ] Calls AI and creates launch_plans row on first request
[ ] launch_packet_pro purchase satisfies launch_builder access check

POST /business/ideas/{id}/generate-pdf
[ ] Returns 402 without launch_packet_pro purchase
[ ] Returns 404 when launch_plans row not found
[ ] Calls generate_pdf() and uploads to Supabase Storage
[ ] Returns pdf_url in response

POST /business/advisor-request
[ ] Returns 402 without advisor_review purchase
[ ] Returns 409 if pending request already exists
[ ] Creates advisor_requests row with status='pending'
[ ] Calls send_advisor_notification_email() (mocked)
```

#### `test_billing_onetime.py` test checklist

```
POST /billing/one-time-checkout
[ ] Returns 200 with client_secret for valid product_key
[ ] Returns 400 for invalid product_key
[ ] Returns 409 if completed purchase already exists
[ ] Creates pending purchases row
[ ] Creates or reuses Stripe customer

POST /billing/one-time-webhook
[ ] Returns 400 for invalid Stripe signature
[ ] payment_intent.succeeded → updates purchase status to 'completed'
[ ] payment_intent.payment_failed → updates purchase status to 'failed'
[ ] charge.refunded → updates purchase status to 'refunded'
[ ] Idempotent: second identical event does not double-update
```

---

## Track B — Web Frontend

### Feature 7: `dream-builder.html` + JS + CSS

**New file:** `dream-builder.html`
**New file:** `dream-builder.js`
**Modify:** `styles.css` — add dream-builder component classes (or use a `<style>` block in `dream-builder.html` to avoid polluting the main stylesheet)
**Modify:** `app.js` — replace Q2 YES "coming soon" placeholder with redirect to `dream-builder.html`
**Modify:** `index.html` — add nav link to Dream Builder (only visible when logged in)
**Estimated Hours:** ~20 hrs

**Constraint:** No JS framework, no build step. Plain vanilla JS/HTML/CSS only. Same pattern as `index.html` + `app.js`.

#### Page Structure — `dream-builder.html`

The page has a two-column layout on desktop, single-column on mobile:
- **Left sidebar (desktop):** Progress tracker (locked/unlocked steps)
- **Main content area:** Active section content

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Dream-to-Launch Builder — Champ Compass</title>
  <link rel="stylesheet" href="styles.css" />
  <!-- Stripe.js for payment collection -->
  <script src="https://js.stripe.com/v3/" defer></script>
</head>
<body class="db-page">

  <!-- Auth guard: redirect to index.html if not logged in -->
  <script>
    // Inline guard — runs before body renders
    if (!sessionStorage.getItem('sb_access_token') && !window._authToken) {
      window.location.href = 'index.html?redirect=dream-builder';
    }
  </script>

  <nav class="db-nav">
    <a href="index.html" class="db-nav-logo">Champ Compass</a>
    <span class="db-nav-title">Dream-to-Launch Builder</span>
    <button id="dbNavLogout" class="button ghost small">Sign Out</button>
  </nav>

  <div class="db-layout">

    <!-- Sidebar: progress tracker -->
    <aside class="db-sidebar" id="dbSidebar">
      <h3 class="db-sidebar-title">Your Progress</h3>
      <ul class="db-steps-list" id="dbStepsList">
        <!-- Populated by JS -->
      </ul>
      <div class="db-upgrade-cta" id="dbUpgradeCta">
        <button class="button primary" onclick="showUpgradeModal('launch_packet_pro')">
          Unlock Full Launch Packet — $49
        </button>
        <button class="button secondary" style="margin-top:8px" onclick="showUpgradeModal('advisor_review')">
          Book Advisor Review — $149
        </button>
      </div>
    </aside>

    <!-- Main content -->
    <main class="db-main" id="dbMain">

      <!-- Section: Quiz -->
      <section id="dbSectionQuiz" class="db-section active">
        <!-- Quiz UI — 5 questions, step-through with JS -->
      </section>

      <!-- Section: Results -->
      <section id="dbSectionResults" class="db-section hidden">
        <!-- Idea cards + score + mission preview -->
      </section>

      <!-- Section: Locked Plan Preview -->
      <section id="dbSectionPlanPreview" class="db-section hidden">
        <!-- 5-item checklist (free) + blurred locked items -->
      </section>

      <!-- Section: Full Plan (Launch Builder, paid) -->
      <section id="dbSectionPlan" class="db-section hidden">
        <!-- Full checklist, cost calculator, pricing builder, 30-day plan -->
      </section>

      <!-- Section: Pro Plan (Launch Packet Pro, paid) -->
      <section id="dbSectionProPlan" class="db-section hidden">
        <!-- Business plan, persona, 90-day roadmap, PDF download -->
      </section>

    </main>
  </div>

  <!-- Upgrade Modal -->
  <div id="dbUpgradeModal" class="modal-overlay hidden" role="dialog">
    <div class="modal-box db-upgrade-modal">
      <h2 id="dbUpgradeTitle">Unlock Full Launch Packet</h2>
      <p id="dbUpgradeDesc"></p>
      <div id="dbPaymentElement"></div>
      <button class="button primary" id="dbPayBtn" style="margin-top:16px">Pay Now</button>
      <button class="button ghost" onclick="hideUpgradeModal()" style="margin-top:8px">Cancel</button>
    </div>
  </div>

  <script src="api-client.js"></script>
  <script src="auth.js"></script>
  <script src="dream-builder.js"></script>
</body>
</html>
```

#### `dream-builder.js` — Key Functions

The file is organized into clearly delimited sections. All functions are `function` declarations or `window.*` assignments — no ES module syntax.

```javascript
// ── State ─────────────────────────────────────────────────────────────────────
window._db = {
  step: 'quiz',          // 'quiz' | 'results' | 'plan_preview' | 'plan' | 'pro_plan'
  quizAnswers: {},       // accumulated quiz answers
  quizPage: 1,          // which of 5 quiz questions (1–5)
  suggestions: [],       // AI suggestions from POST /business/quiz
  businessIdeaId: null,
  selectedIdeaIndex: null,
  savedIdea: null,
  purchases: {},         // { launch_builder: bool, launch_packet_pro: bool, advisor_review: bool }
  stripe: null,
  paymentElement: null,
  activeProductKey: null,
};

// ── Init ──────────────────────────────────────────────────────────────────────
async function dbInit() {
  // 1. Check auth — redirect if not logged in
  // 2. Load purchases from GET /billing/subscription (check one-time purchases too)
  //    Note: need a new GET /billing/purchases endpoint OR embed in subscription response
  //    Workaround: call GET /business/ideas to infer state from saved ideas
  // 3. Check localStorage for in-progress quiz ('db_quiz_draft')
  // 4. Render sidebar
  // 5. Show appropriate section based on state
}

// ── Quiz ──────────────────────────────────────────────────────────────────────
function renderQuizPage(pageNum) { ... }
function handleQuizNext() { ... }
function handleQuizBack() { ... }
async function submitQuiz() {
  // POST /business/quiz
  // On success: store suggestions, render results section
}

// ── Results ───────────────────────────────────────────────────────────────────
function renderResults(suggestions, missionPreview) {
  // Render 3 idea cards
  // Show mission preview (first 2 sentences, rest blurred)
  // Show "Save This Idea" button on selected card
}
async function saveIdea(ideaIndex) {
  // POST /business/ideas/{id}/save
  // On success: render plan preview section
}

// ── Plan Preview (free) ───────────────────────────────────────────────────────
function renderPlanPreview(savedIdea) {
  // Show 5-item checklist (unlocked)
  // Show 3 locked items (grayed, lock icon)
  // Show roadmap phase 1 (unlocked), phases 2–4 locked with CTA
}

// ── Upgrade Modal ─────────────────────────────────────────────────────────────
async function showUpgradeModal(productKey) {
  // POST /billing/one-time-checkout
  // Mount Stripe Payment Element
}
async function handlePayment() {
  // stripe.confirmPayment()
  // On success: poll for purchase completion, unlock content
}
function hideUpgradeModal() { ... }

// ── Full Plan (Launch Builder) ────────────────────────────────────────────────
async function loadFullPlan() {
  // GET /business/ideas/{id}/plan?tier=launch_builder
  // Render checklist, cost calculator, pricing builder, 30-day plan
}

// ── Pro Plan (Launch Packet Pro) ──────────────────────────────────────────────
async function loadProPlan() {
  // GET /business/ideas/{id}/plan?tier=launch_packet_pro
  // Render full plan + PDF download button
}
async function downloadPdf() {
  // POST /business/ideas/{id}/generate-pdf
  // On success: open pdf_url in new tab
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function renderSidebar() {
  // Read window._db.step and purchases to render check/lock icons
}

// ── Stripe Payment Element integration ────────────────────────────────────────
async function initStripe(clientSecret) {
  window._db.stripe = Stripe(window.STRIPE_PUBLISHABLE_KEY);
  const elements = window._db.stripe.elements({ clientSecret });
  window._db.paymentElement = elements.create('payment');
  window._db.paymentElement.mount('#dbPaymentElement');
}
```

**Note on `STRIPE_PUBLISHABLE_KEY`:** This must be embedded in `dream-builder.html` as a `<script>` block or a `<meta>` tag. Since the frontend is static, the publishable key (which is safe to expose) is hard-coded or injected at build time. For now, hard-code it as `window.STRIPE_PUBLISHABLE_KEY = 'pk_test_...'` in a `<script>` block above `dream-builder.js`.

#### Purchases State Check

The `dbInit()` function needs to know which products the user has purchased. Add a new backend endpoint:

**GET `/billing/purchases`** (add to `billing.py`):
```
Auth:   Bearer JWT
Returns: { "launch_builder": bool, "launch_packet_pro": bool, "advisor_review": bool }
```

Implementation: query `purchases` for `(user_id, status='completed')`, return presence of each `product_key`.

```python
class PurchasesStatusResponse(BaseModel):
    launch_builder: bool = False
    launch_packet_pro: bool = False
    advisor_review: bool = False
```

#### App.js Change — Replace "Coming Soon" Placeholder

In `app.js`, find the `window.onboardingQ2Yes` handler and replace the "coming soon" notice with:

```javascript
window.onboardingQ2Yes = function() {
  markOnboardingComplete();
  hideOnboardingModal();
  // Redirect to Dream-to-Launch Builder
  window.location.href = 'dream-builder.html';
};
```

#### CSS Additions

Add to `styles.css` (or inline in `dream-builder.html`):

```css
/* ── Dream Builder Page Layout ────────────────────────────────── */
.db-page { min-height: 100vh; background: var(--bg); color: var(--text); }

.db-nav {
  display: flex; align-items: center; gap: 16px;
  padding: 12px 24px;
  background: var(--panel);
  border-bottom: 1px solid var(--border);
}
.db-nav-logo { color: var(--cyan); font-weight: 700; text-decoration: none; }
.db-nav-title { flex: 1; color: var(--muted); font-size: 0.875rem; }

.db-layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  min-height: calc(100vh - 57px);
}
@media (max-width: 768px) {
  .db-layout { grid-template-columns: 1fr; }
  .db-sidebar { display: none; } /* hide sidebar on mobile — progress is in-flow */
}

.db-sidebar {
  background: var(--panel2, #12243b);
  border-right: 1px solid var(--border);
  padding: 24px 16px;
  display: flex; flex-direction: column; gap: 16px;
}
.db-sidebar-title {
  color: var(--muted);
  font-size: 0.75rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.08em;
}
.db-steps-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
.db-step {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px; border-radius: 8px;
  font-size: 0.875rem; color: var(--muted);
}
.db-step.active { background: rgba(34,211,238,0.08); color: var(--text); }
.db-step.completed { color: var(--green); }
.db-step.locked { color: var(--muted); opacity: 0.6; }
.db-step-icon { width: 18px; text-align: center; }

.db-upgrade-cta { margin-top: auto; }

.db-main { padding: 32px 24px; max-width: 760px; }

/* Sections */
.db-section { display: none; }
.db-section.active { display: block; }

/* Quiz */
.db-quiz-card { background: var(--panel); border: 1px solid var(--border); border-radius: 16px; padding: 24px; }
.db-quiz-progress { display: flex; gap: 8px; margin-bottom: 20px; }
.db-quiz-dot { height: 4px; flex: 1; border-radius: 2px; background: var(--border); }
.db-quiz-dot.done { background: var(--cyan); }
.db-chip-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.db-chip {
  padding: 6px 12px; border-radius: 20px; cursor: pointer;
  border: 1px solid var(--border); background: transparent;
  color: var(--muted); font-size: 0.875rem;
  transition: all 0.15s;
}
.db-chip.selected {
  background: rgba(34,211,238,0.12);
  border-color: var(--cyan);
  color: var(--cyan);
}
.db-radio-group { display: flex; flex-direction: column; gap: 10px; margin-top: 8px; }
.db-radio-btn {
  padding: 10px 16px; border-radius: 10px; cursor: pointer;
  border: 1px solid var(--border); background: transparent;
  color: var(--text); font-size: 0.9rem; text-align: left;
  transition: all 0.15s;
}
.db-radio-btn.selected { border-color: var(--cyan); background: rgba(34,211,238,0.08); }

/* Idea Result Card */
.db-idea-card {
  border: 1px solid var(--border); border-radius: 12px;
  padding: 20px; margin-bottom: 12px; cursor: pointer;
  background: var(--panel);
  transition: border-color 0.15s;
}
.db-idea-card.selected { border-color: var(--cyan); }
.db-idea-name { font-size: 1.1rem; font-weight: 700; color: var(--text); margin-bottom: 6px; }
.db-idea-desc { color: var(--muted); font-size: 0.875rem; margin-bottom: 12px; }
.db-idea-meta { display: flex; flex-wrap: wrap; gap: 10px; }
.db-meta-badge {
  padding: 3px 10px; border-radius: 20px;
  font-size: 0.78rem; font-weight: 600;
  background: rgba(96,165,250,0.08); border: 1px solid rgba(96,165,250,0.2);
  color: var(--blue);
}
.db-fit-badge { background: rgba(52,211,153,0.08); border-color: rgba(52,211,153,0.2); color: var(--green); }

/* Locked content blur */
.db-locked-item {
  filter: blur(4px); user-select: none; pointer-events: none;
  opacity: 0.5;
}
.db-lock-overlay {
  display: flex; align-items: center; gap: 8px;
  color: var(--muted); font-size: 0.875rem; margin: 4px 0;
}

/* Upgrade modal */
.db-upgrade-modal { max-width: 500px; }
```

#### Web Feature Acceptance Criteria

- [ ] `dream-builder.html` loads without errors for logged-in users
- [ ] Unauthenticated users are redirected to `index.html?redirect=dream-builder`
- [ ] Quiz renders 5 questions in sequence (progress dots advance)
- [ ] Multi-select chips for skills and problems correctly toggle selection state
- [ ] Radio buttons for business_type, starting_capital, weekly_hours are mutually exclusive
- [ ] Quiz submission calls `POST /business/quiz` with correct payload
- [ ] 3 idea cards render with all metadata fields
- [ ] Mission preview shows first 2 sentences; remaining text is blurred
- [ ] "Save This Idea" calls `POST /business/ideas/{id}/save`
- [ ] Sidebar progress tracker updates as user advances through sections
- [ ] Free checklist (5 items) renders; locked items are blurred with lock icon
- [ ] "Unlock Full Launch Packet — $49" opens upgrade modal with payment element
- [ ] Stripe Payment Element mounts and accepts card input
- [ ] After successful payment, full plan loads without page reload
- [ ] `app.js` Q2 YES handler redirects to `dream-builder.html` (no more "coming soon")
- [ ] `GET /billing/purchases` is called on init to set purchase state
- [ ] No JS framework or build step introduced

---

## Track C — Mobile Screens

### Feature 8: Mobile Dream Builder Screens

**New files:**
- `mobile/src/screens/dream/DreamBuilderQuizScreen.tsx`
- `mobile/src/screens/dream/DreamBuilderResultsScreen.tsx`
- `mobile/src/screens/dream/DreamBuilderPlanScreen.tsx`
- `mobile/src/screens/dream/DreamBuilderUpgradeScreen.tsx`
**New file:** `mobile/src/api/business.ts`
**Modify:** `mobile/src/navigation/AppNavigator.tsx` — add 4 new routes
**Modify:** `mobile/src/store/authStore.ts` — change `pendingRoute` union type to include `'DreamBuilderQuiz'`
**Estimated Hours:** ~24 hrs

#### Route Registration — `AppNavigator.tsx`

Add to `AppStackParamList`:
```typescript
DreamBuilderQuiz: undefined;
DreamBuilderResults: {
  businessIdeaId: string;
  suggestions: IdeaSuggestion[];
  missionPreview: string;
};
DreamBuilderPlan: {
  businessIdeaId: string;
  savedIdea: SavedIdeaData;
  tier: 'launch_builder' | 'launch_packet_pro';
};
DreamBuilderUpgrade: {
  businessIdeaId: string;
  productKey: 'launch_builder' | 'launch_packet_pro' | 'advisor_review';
};
```

Add imports and `<Stack.Screen>` registrations for all 4 screens. Add section comment `{/* Dream Builder path */}` above the new screens.

#### Update `pendingRoute` in `authStore.ts`

```typescript
// Change the pendingRoute union type from:
pendingRoute: 'AssessmentForm' | 'StartupStep1' | 'ChampInfo' | null;
// To:
pendingRoute: 'AssessmentForm' | 'StartupStep1' | 'DreamBuilderQuiz' | 'ChampInfo' | null;
```

Also update `setPendingRoute` action signature to match.

#### API Client — `mobile/src/api/business.ts`

```typescript
import { apiClient } from './client';

export interface IdeaSuggestion {
  name: string;
  description: string;
  business_fit_pct: number;
  startup_cost_tier: 'Low' | 'Medium' | 'High';
  difficulty_tier: 'Easy' | 'Medium' | 'Hard';
  revenue_potential: string;
}

export interface QuizSubmitResponse {
  business_idea_id: string;
  suggestions: IdeaSuggestion[];
  mission_preview: string;
}

export interface SavedIdeaData {
  business_idea_id: string;
  idea_name: string;
  idea_description: string;
  business_fit_pct: number;
  startup_cost_tier: string;
  difficulty_tier: string;
  revenue_potential: string;
  mission_preview: string;
}

export interface LaunchPlan {
  business_idea_id: string;
  tier: string;
  checklist: Array<{ item: string; category: string; required: boolean }> | null;
  cost_calculator: Array<{ item: string; estimated_cost_low: number; estimated_cost_high: number; category: string }> | null;
  pricing_packages: Array<{ name: string; description: string; price_suggestion: string; included_services: string[] }> | null;
  thirty_day_plan: Array<{ week: number; title: string; milestones: string[] }> | null;
  business_plan_text: string | null;
  mission_vision: string | null;
  customer_persona: Record<string, string> | null;
  funding_checklist: Array<{ item: string; category: string; completed: boolean }> | null;
  cyber_ai_checklist: Array<{ item: string; category: string; completed: boolean }> | null;
  ninety_day_roadmap: Array<{ month: number; title: string; goals: string[] }> | null;
  pdf_url: string | null;
}

export interface PurchaseStatusResponse {
  launch_builder: boolean;
  launch_packet_pro: boolean;
  advisor_review: boolean;
}

export interface OneTimeCheckoutResponse {
  client_secret: string;
  payment_intent_id: string;
  amount_cents: number;
  product_key: string;
}

// Endpoints
export async function submitQuiz(token: string, payload: {
  skills: string[];
  problems: string[];
  business_type: string;
  starting_capital: string;
  weekly_hours: string;
}): Promise<QuizSubmitResponse> {
  return apiClient.post('/business/quiz', payload, token);
}

export async function saveIdea(token: string, ideaId: string, ideaIndex: number): Promise<SavedIdeaData> {
  return apiClient.post(`/business/ideas/${ideaId}/save`, { idea_index: ideaIndex }, token);
}

export async function getLaunchPlan(token: string, ideaId: string, tier: string): Promise<LaunchPlan> {
  return apiClient.get(`/business/ideas/${ideaId}/plan?tier=${tier}`, token);
}

export async function generatePdf(token: string, ideaId: string): Promise<{ pdf_url: string; generated_at: string }> {
  return apiClient.post(`/business/ideas/${ideaId}/generate-pdf`, {}, token);
}

export async function getPurchaseStatus(token: string): Promise<PurchaseStatusResponse> {
  return apiClient.get('/billing/purchases', token);
}

export async function createOneTimeCheckout(token: string, productKey: string): Promise<OneTimeCheckoutResponse> {
  return apiClient.post('/billing/one-time-checkout', { product_key: productKey }, token);
}

export async function submitAdvisorRequest(token: string, businessIdeaId: string | null): Promise<{ advisor_request_id: string; status: string; message: string }> {
  return apiClient.post('/business/advisor-request', { business_idea_id: businessIdeaId }, token);
}
```

#### Screen 1: `DreamBuilderQuizScreen.tsx`

**Read-ahead hints before writing:**
- `mobile/src/theme/colors.ts` — color palette
- `mobile/src/theme/typography.ts` — font tokens
- `mobile/src/components/Button.tsx` — component API
- `mobile/src/components/Card.tsx` — card wrapper
- `mobile/src/store/authStore.ts` — for token
- `mobile/src/api/business.ts` — submitQuiz

**Overview:** A step-through quiz with 5 pages. Each page is rendered based on a `page` local state (1–5). Progress bar at top shows current step.

**Quiz question definitions:**

```typescript
const SKILLS_OPTIONS = [
  { key: 'computers_tech', label: 'Computers & Tech' },
  { key: 'sales_marketing', label: 'Sales & Marketing' },
  { key: 'writing_content', label: 'Writing & Content' },
  { key: 'design_creative', label: 'Design & Creative' },
  { key: 'teaching_coaching', label: 'Teaching & Coaching' },
  { key: 'cooking_food', label: 'Cooking & Food' },
  { key: 'trades_repair', label: 'Trades & Repair' },
  { key: 'healthcare_wellness', label: 'Healthcare & Wellness' },
  { key: 'finance_accounting', label: 'Finance & Accounting' },
  { key: 'management_leadership', label: 'Management & Leadership' },
  { key: 'customer_service', label: 'Customer Service' },
  { key: 'languages', label: 'Languages' },
  { key: 'music_arts', label: 'Music & Arts' },
  { key: 'sports_fitness', label: 'Sports & Fitness' },
  { key: 'childcare_education', label: 'Childcare & Education' },
];

const PROBLEMS_OPTIONS = [
  { key: 'save_time', label: 'Help people save time' },
  { key: 'save_money', label: 'Help people save money' },
  { key: 'reduce_stress', label: 'Reduce stress for others' },
  { key: 'learn_something', label: 'Help people learn something new' },
  { key: 'improve_health', label: 'Improve health & wellbeing' },
  { key: 'find_community', label: 'Build community & connection' },
  { key: 'get_entertainment', label: 'Provide entertainment' },
  { key: 'solve_tech_problem', label: 'Solve a tech problem' },
  { key: 'improve_home', label: 'Improve home & living' },
  { key: 'grow_business', label: 'Help businesses grow' },
  { key: 'get_professional_services', label: 'Provide professional services' },
  { key: 'get_local_services', label: 'Provide local services' },
];

const BUSINESS_TYPE_OPTIONS = [
  { key: 'service', label: 'Service Business', sub: 'I provide a service (consulting, cleaning, repairs...)' },
  { key: 'product', label: 'Product Business', sub: 'I sell a physical or digital product' },
  { key: 'online', label: 'Online Business', sub: 'I operate entirely online' },
  { key: 'local', label: 'Local Business', sub: 'I serve my local community' },
];

const CAPITAL_OPTIONS = [
  { key: '<500', label: 'Less than $500' },
  { key: '500-2k', label: '$500 – $2,000' },
  { key: '2k-10k', label: '$2,000 – $10,000' },
  { key: '10k+', label: '$10,000 or more' },
];

const HOURS_OPTIONS = [
  { key: '<5', label: 'Less than 5 hours/week' },
  { key: '5-15', label: '5 – 15 hours/week' },
  { key: '15-30', label: '15 – 30 hours/week' },
  { key: '30+', label: '30+ hours/week' },
];
```

**Local state:**
```typescript
const [page, setPage] = useState(1);
const [skills, setSkills] = useState<string[]>([]);
const [problems, setProblems] = useState<string[]>([]);
const [businessType, setBusinessType] = useState<string | null>(null);
const [capital, setCapital] = useState<string | null>(null);
const [weeklyHours, setWeeklyHours] = useState<string | null>(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
```

**Chip component (inline):** A `TouchableOpacity` with `selected` prop styling — cyan border + background when selected. For multi-select, toggles the item in/out of the array.

**Page validation:** Next button is disabled if current page has no selection. Show inline error if user tries to advance with nothing selected.

**Submit (page 5 → Next):**
```typescript
async function handleSubmit() {
  setLoading(true);
  try {
    const result = await submitQuiz(token, {
      skills,
      problems,
      business_type: businessType!,
      starting_capital: capital!,
      weekly_hours: weeklyHours!,
    });
    navigation.navigate('DreamBuilderResults', {
      businessIdeaId: result.business_idea_id,
      suggestions: result.suggestions,
      missionPreview: result.mission_preview,
    });
  } catch (e: any) {
    setError(e?.message ?? 'Something went wrong. Please try again.');
  } finally {
    setLoading(false);
  }
}
```

Acceptance criteria:
- [ ] Page 1 shows skills multi-select chips (15 options)
- [ ] Page 2 shows problems multi-select chips (12 options)
- [ ] Page 3 shows business type single-select radio cards (4 options)
- [ ] Page 4 shows capital single-select (4 options)
- [ ] Page 5 shows weekly hours single-select (4 options)
- [ ] Progress bar advances correctly (1/5 through 5/5)
- [ ] Back button on pages 2–5 returns to previous page (does not navigate back)
- [ ] Next button disabled if current page has no selection
- [ ] On page 5, Next submits to `POST /business/quiz`
- [ ] Loading state shown during API call; error state shown on failure
- [ ] On success, navigates to `DreamBuilderResults` with route params

---

#### Screen 2: `DreamBuilderResultsScreen.tsx`

**Overview:** Receives `suggestions` and `missionPreview` from route params. Renders 3 idea cards, a mission statement preview (blurred after 2 sentences), and a "Save This Idea" button for the selected card.

**Route params:** `{ businessIdeaId: string; suggestions: IdeaSuggestion[]; missionPreview: string }`

**Local state:**
```typescript
const [selectedIndex, setSelectedIndex] = useState(0);
const [saving, setSaving] = useState(false);
const [error, setError] = useState<string | null>(null);
```

**Idea card layout:**
```
┌──────────────────────────────────────────┐
│ [Selected border: cyan]                  │
│ Mobile Tech Setup Service                │
│ Help local businesses set up computers.. │
│                                          │
│ Business Fit: 82%  │  Startup Cost: Low  │
│ Difficulty: Medium │  Revenue: Medium+   │
└──────────────────────────────────────────┘
```

**Mission preview:** Show `missionPreview` text in a card. Below it, show a blurred/opacity-reduced placeholder paragraph with a lock icon and "Unlock Full Mission Statement — $49" text.

**Save handler:**
```typescript
async function handleSaveIdea() {
  setSaving(true);
  try {
    const saved = await saveIdea(token, businessIdeaId, selectedIndex);
    navigation.navigate('DreamBuilderPlan', {
      businessIdeaId,
      savedIdea: saved,
      tier: 'preview', // starts on free preview
    });
  } catch (e: any) {
    setError(e?.message ?? 'Failed to save idea.');
  } finally {
    setSaving(false);
  }
}
```

Note: `DreamBuilderPlan` with `tier: 'preview'` renders the free preview state. This is handled inside `DreamBuilderPlanScreen` based on the `tier` param.

**Acceptance criteria:**
- [ ] 3 idea cards render with all fields from route params
- [ ] Tapping a card selects it (cyan border, no navigation)
- [ ] First card is selected by default
- [ ] Mission preview shows `missionPreview` text
- [ ] Blurred "more content" placeholder visible below preview
- [ ] "Save This Idea" button calls `POST /business/ideas/{id}/save` with selectedIndex
- [ ] On save success, navigates to `DreamBuilderPlan`
- [ ] Loading + error states handled

---

#### Screen 3: `DreamBuilderPlanScreen.tsx`

**Overview:** Displays plan content gated by purchase tier. Three display modes:
- `preview` — free: 5-item checklist, locked items, locked roadmap, upgrade CTAs
- `launch_builder` — $19: full checklist, cost calculator, pricing builder, 30-day plan
- `launch_packet_pro` — $49: everything in launch_builder + business plan, persona, 90-day roadmap, PDF download

**Route params:** `{ businessIdeaId: string; savedIdea: SavedIdeaData; tier: string }`

**On mount:**
```typescript
useEffect(() => {
  if (tier === 'preview') {
    renderPreview();
  } else {
    loadPlan(tier);
  }
}, []);

async function loadPlan(t: string) {
  setLoading(true);
  try {
    const plan = await getLaunchPlan(token, businessIdeaId, t);
    setPlanData(plan);
  } catch (e: any) {
    if (e?.status === 402) setShowUpgrade(true);
    else setError(e?.message ?? 'Failed to load plan.');
  } finally {
    setLoading(false);
  }
}
```

**Preview mode (free) renders:**
1. Business idea summary card (name, fit%, cost, difficulty, revenue)
2. Mission statement preview (first 2 sentences from `savedIdea.mission_preview`)
3. "Starter Checklist" — 5 hard-coded items:
   - Choose a business name
   - Register your domain
   - Open a business bank account
   - Set up a basic website or social media page
   - Tell your first 10 potential customers
4. 3 locked checklist items shown as blurred rows with lock icon
5. "Launch Roadmap — Phase 1: Foundation" (one visible phase)
6. 3 locked roadmap phases (blurred + lock icon)
7. Two upgrade CTAs: "Unlock Full Launch Builder — $19" and "Unlock Launch Packet Pro — $49"

**Paid modes:** Render the appropriate sections from `planData`. Use a `<SectionHeader>` pattern with `<Accordion>` or simple expand/collapse for each major section.

**PDF download button (Pro only):**
```typescript
async function handleDownloadPdf() {
  setPdfLoading(true);
  try {
    const result = await generatePdf(token, businessIdeaId);
    Linking.openURL(result.pdf_url);
  } catch (e: any) {
    setError('PDF generation failed. Please try again.');
  } finally {
    setPdfLoading(false);
  }
}
```

**Upgrade navigation:**
```typescript
function navigateToUpgrade(productKey: string) {
  navigation.navigate('DreamBuilderUpgrade', {
    businessIdeaId,
    productKey,
  });
}
```

**Acceptance criteria:**
- [ ] Preview mode renders 5 free checklist items
- [ ] Preview mode shows 3 blurred locked items with lock icon
- [ ] Preview mode shows Phase 1 roadmap; phases 2–4 locked
- [ ] "Unlock Full Launch Builder — $19" navigates to DreamBuilderUpgrade
- [ ] Launch Builder mode renders checklist, cost calculator, pricing packages, 30-day plan
- [ ] Launch Packet Pro mode renders all launch_builder content plus business plan, persona, roadmap
- [ ] PDF download button calls `POST .../generate-pdf` and opens `pdf_url` via Linking
- [ ] 402 response from API surfaces upgrade CTA instead of error
- [ ] Loading state during plan fetch

---

#### Screen 4: `DreamBuilderUpgradeScreen.tsx`

**Overview:** Shows the product description and price for the selected product. Handles Stripe Payment Intent flow using `@stripe/stripe-react-native`.

**Read-ahead hints:**
- Check if `@stripe/stripe-react-native` is already in `mobile/package.json`
- If not, add to `mobile/package.json` and `expo install @stripe/stripe-react-native`

**Route params:** `{ businessIdeaId: string; productKey: 'launch_builder' | 'launch_packet_pro' | 'advisor_review' }`

**Product descriptions:**
```typescript
const PRODUCT_INFO = {
  launch_builder: {
    title: 'Launch Builder',
    price: '$19',
    description: 'Full startup checklist, startup cost calculator, pricing builder, and 30-day launch plan.',
    features: ['Full legal & setup checklist', 'Itemized startup cost calculator', '3 pricing packages', '30-day week-by-week plan'],
  },
  launch_packet_pro: {
    title: 'Launch Packet Pro',
    price: '$49',
    description: 'Everything in Launch Builder plus a full AI-generated business plan, customer persona, 90-day roadmap, and PDF export.',
    features: ['Everything in Launch Builder', 'AI business plan (8–12 pages)', 'Customer persona builder', '90-day roadmap', 'Funding readiness checklist', 'Cyber & AI starter kit', 'PDF export'],
  },
  advisor_review: {
    title: 'Advisor Review',
    price: '$149',
    description: 'A 1-on-1 review session with a Champtron Systems advisor. You\'ll receive a scheduling link within 1 business day.',
    features: ['Personal advisor session', 'Custom recommendations', 'Scheduling link via email'],
  },
};
```

**Payment flow:**

If `@stripe/stripe-react-native` is available:
1. On mount, call `createOneTimeCheckout(token, productKey)` → get `client_secret`
2. Use `useStripe().initPaymentSheet()` with the `client_secret`
3. Call `stripe.presentPaymentSheet()` on "Pay Now" tap
4. On success: show confirmation, navigate back to `DreamBuilderPlan` with updated tier

If Stripe React Native is not yet installed — fall back to a "web checkout" approach:
1. Call `createOneTimeCheckout(token, productKey)` — but use `checkout.sessions.create` flow instead (modify backend to optionally return a `checkout_url`)
2. Open `checkout_url` in `Linking.openURL()`
3. User completes payment in browser, returns to app
4. App polls `GET /billing/purchases` every 3 seconds (up to 30s) to confirm purchase

**Document which approach is used in implementation.** The web checkout fallback is simpler and avoids a new native dependency.

**Acceptance criteria:**
- [ ] Product title, price, and feature list render correctly for all 3 product keys
- [ ] "Pay Now" initiates Stripe payment flow
- [ ] After successful payment, user returns to `DreamBuilderPlan` with correct tier
- [ ] Advisor Review shows confirmation message after payment (no plan to load)
- [ ] Loading state during payment init and processing
- [ ] Cancel / back button exits without charging

---

## Environment Variables Required

Add these to Railway backend env and local `.env`:

```
# Dream Builder one-time products
STRIPE_PRICE_ID_LAUNCH_BUILDER=price_xxxx
STRIPE_PRICE_ID_LAUNCH_PACKET_PRO=price_xxxx
STRIPE_PRICE_ID_ADVISOR_REVIEW=price_xxxx
STRIPE_ONE_TIME_WEBHOOK_SECRET=whsec_xxxx
DREAM_BUILDER_SUCCESS_URL=https://yourapp.com/dream-builder.html?checkout=success
DREAM_BUILDER_CANCEL_URL=https://yourapp.com/dream-builder.html?checkout=cancel

# Admin notification
ADMIN_NOTIFICATION_EMAIL=info@champtron-systems.com
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxx
```

**Stripe Dashboard setup required (not automated):**
1. Create 3 one-time Payment Link products (or Price objects) in Stripe Dashboard
2. Record Price IDs → set env vars above
3. Create a new Stripe webhook endpoint pointing to `/billing/one-time-webhook`
4. Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`
5. Record webhook signing secret → `STRIPE_ONE_TIME_WEBHOOK_SECRET`

**Supabase setup required:**
- Create `business-plans` storage bucket (private, signed URLs)

---

## New Backend Endpoints — Complete List

| Method | Path | Auth | Purchase Required | Description |
|--------|------|------|-------------------|-------------|
| POST | `/business/quiz` | JWT | None | Submit quiz, get AI suggestions |
| GET | `/business/ideas` | JWT | None | List user's saved ideas |
| POST | `/business/ideas/{id}/save` | JWT | None | Save selected idea |
| GET | `/business/ideas/{id}/plan` | JWT | launch_builder or launch_packet_pro | Get plan (cached or AI-generated) |
| POST | `/business/ideas/{id}/generate-pdf` | JWT | launch_packet_pro | Generate + store PDF |
| POST | `/business/advisor-request` | JWT | advisor_review | Create advisor request + email admin |
| POST | `/billing/one-time-checkout` | JWT | None | Create Stripe PaymentIntent |
| POST | `/billing/one-time-webhook` | Public (Stripe sig) | N/A | Handle payment events |
| GET | `/billing/purchases` | JWT | None | Get purchase status for current user |

---

## New DB Tables — Summary

| Table | Purpose | RLS |
|-------|---------|-----|
| `business_ideas` | Quiz answers + AI suggestions + saved idea | User-owned |
| `launch_plans` | Generated plan content per idea per tier | User-owned |
| `purchases` | One-time Stripe payment records | User reads own |
| `advisor_requests` | Advisor Review requests + scheduling status | User reads own |

---

## Progress Tracking

| # | Item | Track | Est | Done |
|---|------|-------|-----|------|
| 1 | Migration: `business_ideas` table | A | 1 hr | [ ] |
| 2 | Migration: `launch_plans` table | A | 1 hr | [ ] |
| 3 | Migration: `purchases` table | A | 1 hr | [ ] |
| 4 | Migration: `advisor_requests` table | A | 30 min | [ ] |
| 5 | `backend/schemas/business.py` — all Pydantic models | A | 1.5 hrs | [ ] |
| 6 | `POST /business/quiz` endpoint + AI call | A | 2.5 hrs | [ ] |
| 7 | `GET /business/ideas` endpoint | A | 30 min | [ ] |
| 8 | `POST /business/ideas/{id}/save` endpoint | A | 1 hr | [ ] |
| 9 | `GET /business/ideas/{id}/plan` endpoint + purchase check + AI + cache | A | 2.5 hrs | [ ] |
| 10 | `POST /business/ideas/{id}/generate-pdf` endpoint | A | 1 hr | [ ] |
| 11 | `POST /business/advisor-request` endpoint | A | 1 hr | [ ] |
| 12 | `require_purchase()` dependency in `dependencies.py` | A | 30 min | [ ] |
| 13 | `POST /billing/one-time-checkout` endpoint | A | 1.5 hrs | [ ] |
| 14 | `POST /billing/one-time-webhook` endpoint | A | 1.5 hrs | [ ] |
| 15 | `GET /billing/purchases` endpoint | A | 30 min | [ ] |
| 16 | Config env vars for new Stripe prices + email | A | 30 min | [ ] |
| 17 | Register `/business` router in `main.py` | A | 15 min | [ ] |
| 18 | `backend/prompts_dream.py` — `generate_idea_suggestions()` | D | 1.5 hrs | [ ] |
| 19 | `backend/prompts_dream.py` — `generate_mission_preview()` | D | 45 min | [ ] |
| 20 | `backend/prompts_dream.py` — `generate_launch_plan()` (both tiers) | D | 2 hrs | [ ] |
| 21 | `backend/pdf_generator.py` — HTML-to-PDF with weasyprint | D | 2.5 hrs | [ ] |
| 22 | Email notification helper `send_advisor_notification_email()` | D | 1 hr | [ ] |
| 23 | `backend/tests/test_business.py` — all endpoint tests (mocked AI + DB) | D | 3.5 hrs | [ ] |
| 24 | `backend/tests/test_billing_onetime.py` — one-time billing tests | D | 2.5 hrs | [ ] |
| 25 | `dream-builder.html` — page structure + nav + sidebar + sections | B | 3 hrs | [ ] |
| 26 | `dream-builder.js` — quiz rendering + multi-select chip logic | B | 4 hrs | [ ] |
| 27 | `dream-builder.js` — results rendering + idea card selection | B | 2 hrs | [ ] |
| 28 | `dream-builder.js` — plan preview (free, locked content) | B | 2 hrs | [ ] |
| 29 | `dream-builder.js` — Stripe Payment Element + upgrade modal | B | 3 hrs | [ ] |
| 30 | `dream-builder.js` — full plan rendering (Launch Builder tier) | B | 2 hrs | [ ] |
| 31 | `dream-builder.js` — pro plan rendering + PDF download button | B | 2 hrs | [ ] |
| 32 | CSS — dream builder layout, quiz chips, idea cards, locked blur | B | 2 hrs | [ ] |
| 33 | `app.js` — replace Q2 YES placeholder with redirect | B | 15 min | [ ] |
| 34 | `mobile/src/api/business.ts` — all API client functions | C | 2 hrs | [ ] |
| 35 | `DreamBuilderQuizScreen.tsx` — 5-page step quiz + chip multi-select | C | 5 hrs | [ ] |
| 36 | `DreamBuilderResultsScreen.tsx` — idea cards + mission preview + save | C | 4 hrs | [ ] |
| 37 | `DreamBuilderPlanScreen.tsx` — preview + paid plan + PDF download | C | 6 hrs | [ ] |
| 38 | `DreamBuilderUpgradeScreen.tsx` — product info + Stripe payment | C | 4 hrs | [ ] |
| 39 | `AppNavigator.tsx` — register 4 new routes + update types | C | 1 hr | [ ] |
| 40 | `authStore.ts` — update `pendingRoute` union type | C | 15 min | [ ] |
| 41 | Supabase: create `business-plans` storage bucket | — | 15 min | [ ] |
| 42 | Stripe Dashboard: create 3 products + webhook endpoint | — | 30 min | [ ] |

**Total estimated: ~82 hrs**

---

## Assumptions & Open Questions

| # | Assumption | If Wrong |
|---|-----------|----------|
| A1 | The existing `StartupStep1–9` path remains intact — Dream Builder is a separate parallel path | If consolidation is wanted, needs a separate architectural decision |
| A2 | `@stripe/stripe-react-native` is not yet in the mobile project — web checkout (Linking to Stripe Checkout URL) is used as the mobile payment fallback | Install `@stripe/stripe-react-native` and use Payment Sheet instead |
| A3 | `weasyprint` is acceptable as a PDF library on Railway (requires system packages: `libpango`, `libcairo`) | Use `reportlab` as a pure-Python fallback if Railway's build environment cannot install weasyprint system deps |
| A4 | `resend` is the email provider of choice for admin notifications | Use SMTP fallback if Resend account is not available |
| A5 | Supabase Storage `business-plans` bucket must be manually created (no migration for storage) | Document as a manual setup step in deployment checklist |
| A6 | `launch_packet_pro` purchase grants access to all `launch_builder` features (strict superset) — enforced in `require_purchase()` | If they are sold independently with no overlap, remove the superset check |
| A7 | The onboarding gate Q2 YES path on mobile currently routes to `StartupStep1` — this sprint changes `pendingRoute` to `DreamBuilderQuiz` | If both paths should coexist (quiz AND existing startup assessment), a path-choice screen is needed |
| A8 | PDF signed URL from Supabase Storage is valid for 24h — users must re-request after expiry | If permanent links are wanted, set bucket to public (security tradeoff) |
| A9 | AI calls in `generate_launch_plan()` for `launch_packet_pro` are split into 3 sequential calls to stay under token limits | If provider supports longer context, combine into fewer calls |
| A10 | The `GET /billing/purchases` endpoint returns simple boolean flags — no purchase history or amount data | If users need receipts, add a separate `GET /billing/purchases/history` endpoint |

---

## Deferred to SPRINT-007

| Deferred Item | Reason |
|--------------|--------|
| Admin dashboard for `advisor_requests` (view/update status, add notes) | Admin UI is a separate sprint |
| Calendly or scheduling link integration | Requires third-party account setup + webhook |
| `StageGateScreen.tsx` deletion (stubbed in SPRINT-005) | Deferred cleanup |
| Existing business assessment path mobile refactor (original SPRINT-005 deferred scope) | Separate sprint |
| Signed PDF URL auto-refresh | Not needed for pre-production |
| Assessment count quota enforcement for Dream Builder (AI calls) | Rate limiting deferred |

---

## Notes for AI Agents (Iron Man / Wasp)

- **Track A must complete and merge before Tracks B, C, D begin.** The `/business` and `/billing/one-time-*` endpoints are load-bearing for all frontend work.
- **Track D (AI prompts + PDF)** can be built in parallel with Track A only if `prompts_dream.py` is a new standalone file. The `business.py` router imports it, so the import must resolve before the router can run.
- **Track B (web):** Do NOT introduce `import` or ES module syntax to `app.js` or `dream-builder.js`. All functions are `function` declarations or `window.*` assignments. `dream-builder.js` is a standalone script included via `<script src="...">`.
- **Track C (mobile):** Check `mobile/package.json` for `@stripe/stripe-react-native` before writing `DreamBuilderUpgradeScreen`. If absent, implement the Linking/web-checkout fallback and document it.
- **`require_purchase()` in `dependencies.py`:** Because FastAPI `Depends()` does not support parameterized dependencies natively, use a closure pattern:
  ```python
  def purchase_required(product_key: str):
      async def _check(current_user=Depends(get_current_user), supabase=Depends(get_supabase_client)):
          return await require_purchase(product_key, current_user, supabase)
      return _check
  # Usage:
  @router.get("/{id}/plan")
  async def get_plan(..., _=Depends(purchase_required("launch_builder"))):
  ```
- **PDF generation on Railway:** Test `weasyprint` in the Docker image. If system deps are missing, add to `Dockerfile`:
  ```dockerfile
  RUN apt-get update && apt-get install -y libpango-1.0-0 libpangocairo-1.0-0 libcairo2 libgdk-pixbuf2.0-0
  ```
  If Railway's build fails, fall back to `reportlab` immediately.
- **AI response parsing in `generate_idea_suggestions()`:** The AI must return a JSON array. Wrap the AI call in a try/except and retry once with a stricter prompt before raising. Log `ai_parse_failed` with the raw response for debugging.
- **Idempotency everywhere:** The one-time webhook must be idempotent. Check `purchases` row by `stripe_payment_intent_id` before updating status. Skip if already in the target state.
- **`pendingRoute: 'DreamBuilderQuiz'`** — update the union type in `authStore.ts` and the `setPendingRoute` action. Also update `HomeScreen.tsx`'s `useEffect` to handle this new route value.

---

## Agent Hints

| Signal | Value | Agents |
|--------|-------|--------|
| Builder | iron-man (3–4 parallel agents) | Route to Iron Man; Wasp acceptable as sequential fallback (~80h wall clock) |
| Auth-critical | yes — purchase check on 4 endpoints | Hawkeye: verify 402 enforcement, no bypass via quiz ID manipulation |
| External dependencies | Stripe (PaymentIntent + webhook), AI provider, Resend/SMTP email, Supabase Storage | Vision: health checks for all 4. Hulk: simulate Stripe webhook failure |
| High-traffic endpoints | POST /business/quiz (AI call per submit) | Black Panther: benchmark AI latency. Vision: log AI response times |
| Database writes | business_ideas, launch_plans, purchases, advisor_requests | Hulk: deadlock testing on concurrent quiz submissions |
| Financial/PII data | yes — Stripe PaymentIntent, user email in advisor_requests | Hawkeye: PII audit in logs. Vision: verify email not logged at INFO level |
| State machine | purchases (pending → completed → refunded/failed) | Hulk: invalid webhook transition testing |
| Migration | yes — 4 new tables, non-destructive | Falcon: verify rollback. Hulk: test under concurrent load |
| PDF generation | yes — weasyprint on Railway | Eitri: verify system deps in Dockerfile. Thanos: simulate storage failure |
| Infrastructure needed | Supabase Storage bucket (business-plans), Stripe webhook endpoint, Resend account | Eitri: document manual setup checklist |

---

## Wasp Invocation (sequential fallback)

```
Use wasp. Build from sprint spec docs/specs/SPRINT-006-dream-to-launch-builder.md
```

## Iron Man / Iron Legion Invocation (recommended)

```
Use autopilot-iron-legion. Skip to build. Specs: docs/specs/SPRINT-006-dream-to-launch-builder.md. Branch: feature/sprint-006-dream-to-launch-builder. 4 agents. Track A first (DB + backend), then Tracks B/C/D in parallel.
```

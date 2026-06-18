# SPRINT-003: Billing — Stripe Subscriptions, Free Tier Enforcement & Admin Dashboard

## Sprint Meta

| Field | Value |
|-------|-------|
| Sprint ID | SPRINT-003 |
| Sprint Type | New features — Stripe integration, tier enforcement, admin dashboard |
| Total Estimated Hours | 40 hrs |
| Features | 5 |
| Branch | feature/sprint-003-billing-stripe |
| Depends On | SPRINT-001 (auth, assessments), SPRINT-002 (AI advisor) |
| Builder | Wasp |
| Autopilot | autopilot-wasp |
| Spec Author | J.A.R.V.I.S. |
| Created | 2026-06-17 |
| Status | Draft |
| Project Stage | pre-production |

---

## HQ Context Applied

> HQ DB not available or project not registered — proceeding without prior context.

---

## Established Patterns (builder must follow)

Inherits all patterns from SPRINT-001 and SPRINT-002. Additional patterns for billing:

### Stripe Integration Pattern
- **Library:** `stripe` Python SDK — never raw HTTP calls
- **Webhook verification:** Always verify `Stripe-Signature` header using `stripe.Webhook.construct_event()` — reject unverified webhooks with HTTP 400
- **Idempotency:** All subscription state changes are idempotent — webhook handler checks current DB state before applying update
- **Test mode first:** All Sprint 3 development uses Stripe test keys. Production keys are set via Railway env var swap — no code change required.
- **Price IDs:** Stored in env vars (`STRIPE_PRICE_ID_MONTHLY`, `STRIPE_PRICE_ID_YEARLY`), never hardcoded
- **Customer creation:** Create Stripe customer on first subscription attempt, store `stripe_customer_id` in `user_profiles` table

### Tier Model
| Tier | Assessments/month | AI Advisor | Admin Access |
|------|------------------|------------|--------------|
| `free` | 3 | No | No |
| `pro` | Unlimited | Yes | No |
| `admin` | Unlimited | Yes | Yes |

---

## Sprint Overview

This sprint adds Stripe-based subscription billing to enforce the free/paid tier split and adds an admin dashboard for Champtron Systems LLC to monitor usage.

**Free tier (3 assessments/month):** Limited at `POST /assessments`. Anonymous users are unaffected — the limit only applies to logged-in users' saved assessments.

**Pro tier ($9–19/mo — exact pricing set via Stripe dashboard, not hardcoded):** Unlimited saved assessments + AI advisor access.

**What does NOT change in Sprint 3:**
- Anonymous users are completely unaffected
- Scoring logic unchanged
- Existing Sprint 1 and Sprint 2 features remain for Pro users
- The static tool remains accessible without login

---

## Feature Sequence

| # | Feature | Source | Est Hours | Packages | Migration? |
|---|---------|--------|-----------|----------|------------|
| 1 | User profiles table + tier field | New | 4 hrs | `backend/routers/profiles.py` | Yes |
| 2 | Stripe checkout + webhook handler | New | 12 hrs | `backend/routers/billing.py` | Yes (subscriptions) |
| 3 | Tier enforcement middleware | New | 8 hrs | `backend/middleware/tier.py` | No |
| 4 | Billing UI — upgrade prompt + subscription management | New | 10 hrs | `index.html`, `app.js`, `styles.css` | No |
| 5 | Admin dashboard | New | 6 hrs | `backend/routers/admin.py`, `admin.html` | No |

---

## Feature Specs

---

### Feature 1: User Profiles Table + Tier Field

**Estimated hours:** 4 hrs

**Migration:** Yes

#### Database Schema

**Table: `user_profiles`**

```sql
CREATE TABLE public.user_profiles (
    id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    business_name       TEXT,
    tier                TEXT NOT NULL DEFAULT 'free'
                            CHECK (tier IN ('free', 'pro', 'admin')),
    stripe_customer_id  TEXT UNIQUE,
    assessments_this_month INTEGER NOT NULL DEFAULT 0,
    month_reset_at      TIMESTAMPTZ NOT NULL DEFAULT DATE_TRUNC('month', NOW()) + INTERVAL '1 month',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users read own profile"
    ON public.user_profiles FOR SELECT
    USING (auth.uid() = id);

-- Users can update limited fields (not tier, not stripe_customer_id)
CREATE POLICY "Users update own profile display fields"
    ON public.user_profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id AND tier = (SELECT tier FROM user_profiles WHERE id = auth.uid()));

-- Service role bypasses RLS for tier updates (webhook handler uses service role key)

CREATE INDEX idx_user_profiles_stripe ON public.user_profiles(stripe_customer_id);
CREATE INDEX idx_user_profiles_tier ON public.user_profiles(tier);

CREATE TRIGGER user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

**Create profile on signup trigger:**

```sql
-- Automatically create a free-tier profile when a new user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, business_name, tier)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'business_name', 'free')
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_user_profile();
```

**Migration file:** `supabase/migrations/20260617150000_create_user_profiles.sql`

#### API Endpoint

**GET `/profiles/me`** (Bearer required)

Response (200):
```json
{
  "tier": "free",
  "business_name": "Bright Path Café",
  "assessments_this_month": 2,
  "assessments_limit": 3,
  "month_reset_at": "2026-07-01T00:00:00Z",
  "has_active_subscription": false
}
```

`assessments_limit` = 3 for free, null for pro/admin.

#### Acceptance Criteria — Feature 1

- [ ] Profile row is created automatically when a new user signs up (trigger)
- [ ] `GET /profiles/me` returns correct tier and assessment count
- [ ] Users cannot update their own `tier` field via API
- [ ] `assessments_this_month` is correct (cross-check with `assessments` table count)
- [ ] Migration runs cleanly after SPRINT-001 migrations

---

### Feature 2: Stripe Checkout + Webhook Handler

**Estimated hours:** 12 hrs

**Migration:** Yes

#### Environment Variables (additions)

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_MONTHLY=price_...
STRIPE_PRICE_ID_YEARLY=price_...
STRIPE_SUCCESS_URL=https://your-domain.vercel.app?checkout=success
STRIPE_CANCEL_URL=https://your-domain.vercel.app?checkout=cancel
```

#### Database Schema

**Table: `subscriptions`**

```sql
CREATE TABLE public.subscriptions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_subscription_id  TEXT UNIQUE NOT NULL,
    stripe_customer_id      TEXT NOT NULL,
    stripe_price_id         TEXT NOT NULL,
    status                  TEXT NOT NULL CHECK (status IN (
                                'active', 'canceled', 'past_due',
                                'trialing', 'unpaid', 'incomplete'
                            )),
    current_period_start    TIMESTAMPTZ NOT NULL,
    current_period_end      TIMESTAMPTZ NOT NULL,
    cancel_at_period_end    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscriptions
CREATE POLICY "Users read own subscriptions"
    ON public.subscriptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_id ON public.subscriptions(stripe_subscription_id);

CREATE TRIGGER subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

**Migration file:** `supabase/migrations/20260617160000_create_subscriptions.sql`

#### API Endpoints

| Method | Path | Auth Required | Description |
|--------|------|--------------|-------------|
| POST | `/billing/checkout` | Yes | Create Stripe Checkout session |
| POST | `/billing/portal` | Yes | Create Stripe Customer Portal session |
| GET | `/billing/subscription` | Yes | Get current subscription status |
| POST | `/billing/webhook` | No (Stripe signs) | Handle Stripe webhook events |

**POST `/billing/checkout`** (Bearer required)

Request:
```json
{ "price_id": "price_monthly" }
```

`price_id` must be `"price_monthly"` or `"price_yearly"` — the backend resolves to the Stripe Price ID from env vars.

Response (200):
```json
{
  "checkout_url": "https://checkout.stripe.com/pay/cs_test_..."
}
```

The frontend redirects to this URL. On success, Stripe redirects to `STRIPE_SUCCESS_URL`.

Errors:
- `409` — user already has an active subscription

**POST `/billing/portal`** (Bearer required)

Creates a Stripe Customer Portal session for managing payment method and canceling.

Response (200):
```json
{ "portal_url": "https://billing.stripe.com/session/..." }
```

Errors:
- `404` — no Stripe customer record for this user (never subscribed)

**GET `/billing/subscription`** (Bearer required)

Response (200):
```json
{
  "has_active_subscription": true,
  "tier": "pro",
  "status": "active",
  "current_period_end": "2026-07-17T00:00:00Z",
  "cancel_at_period_end": false,
  "price_id": "price_monthly"
}
```

Response (200 — no subscription):
```json
{ "has_active_subscription": false, "tier": "free" }
```

**POST `/billing/webhook`** (No auth — Stripe signature verified)

Handles these Stripe events:
| Event | Action |
|-------|--------|
| `checkout.session.completed` | Create subscription row, set `user_profiles.tier = 'pro'`, store `stripe_customer_id` |
| `customer.subscription.updated` | Update subscription row status |
| `customer.subscription.deleted` | Set subscription status = canceled, set `user_profiles.tier = 'free'` |
| `invoice.payment_failed` | Set subscription status = past_due, send no email (Sprint 3 MVP) |

Response: Always HTTP 200 (Stripe retries on non-200). The body is `{"received": true}`.

Errors:
- `400` — invalid Stripe signature (malformed webhook)

#### Function Signatures

```python
# backend/routers/billing.py

async def create_checkout_session(
    request: CheckoutRequest,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> dict:
    """
    Creates or reuses a Stripe customer for this user.
    Creates a Checkout session for the requested price.
    Stores stripe_customer_id in user_profiles if new.
    Raises 409 if user already has an active subscription.
    Returns {"checkout_url": "https://..."}
    """
    ...

async def handle_webhook(
    request: Request,
    stripe_signature: str = Header(alias="stripe-signature"),
    supabase: Client = Depends(get_supabase_client),
) -> dict:
    """
    Verifies Stripe webhook signature.
    Dispatches to per-event handlers.
    All operations are idempotent — checks current state before writing.
    Always returns {"received": True} with HTTP 200.
    """
    ...

async def _on_checkout_completed(event: dict, supabase: Client) -> None:
    """Handles checkout.session.completed — creates subscription row, upgrades tier."""
    ...

async def _on_subscription_updated(event: dict, supabase: Client) -> None:
    """Handles customer.subscription.updated — syncs status and period dates."""
    ...

async def _on_subscription_deleted(event: dict, supabase: Client) -> None:
    """Handles customer.subscription.deleted — sets tier=free, status=canceled."""
    ...
```

#### Acceptance Criteria — Feature 2

- [ ] `POST /billing/checkout` returns a Stripe Checkout URL
- [ ] Completing test checkout creates subscription row + sets tier = 'pro' in profiles
- [ ] Canceling from Stripe Portal → webhook fires → tier reverts to 'free'
- [ ] Webhook rejects invalid signatures with HTTP 400
- [ ] Webhook handler is idempotent (calling it twice for same event produces same state)
- [ ] `POST /billing/checkout` returns 409 for active subscribers
- [ ] `GET /billing/subscription` returns correct status after subscribe and after cancel
- [ ] Stripe customer ID is stored and reused (user subscribes, cancels, re-subscribes — one customer)

---

### Feature 3: Tier Enforcement Middleware

**Estimated hours:** 8 hrs

**Migration:** No

#### Enforcement Points

| Endpoint | Free Limit | Enforcement |
|----------|-----------|-------------|
| `POST /assessments` | 3/month | Check `assessments_this_month` in `user_profiles` before insert |
| `GET /ai/advice/{id}/{dimension}` | Not allowed | Check `tier == 'pro'` or `'admin'` |

#### Function Signatures

```python
# backend/middleware/tier.py

async def require_pro_tier(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> dict:
    """
    FastAPI Depends — raises HTTP 403 if user tier is not 'pro' or 'admin'.
    Returns the user profile dict on success.
    Used as: Depends(require_pro_tier)
    Error: {"error": "tier_required", "message": "This feature requires a Pro subscription.",
            "upgrade_url": "/billing/checkout"}
    """
    ...

async def check_assessment_quota(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> dict:
    """
    FastAPI Depends — raises HTTP 403 if free-tier user has reached 3 assessments this month.
    Auto-resets counter if month_reset_at has passed.
    Returns the user profile dict on success.
    Error: {"error": "quota_exceeded", "message": "Free tier limit: 3 assessments per month.",
            "resets_at": "2026-07-01T00:00:00Z", "upgrade_url": "/billing/checkout"}
    """
    ...

async def increment_assessment_count(
    profile: dict,
    supabase: Client,
) -> None:
    """
    Called after a successful assessment save.
    Increments assessments_this_month in user_profiles.
    NOT called for pro/admin tier users (no counter needed).
    """
    ...
```

#### Quota Reset Logic

```python
# In check_assessment_quota:
# If NOW() > profile.month_reset_at:
#   UPDATE user_profiles SET assessments_this_month = 0, month_reset_at = DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
#   WHERE id = user_id
# Then re-check quota with reset count
```

#### Wire Into Existing Endpoints

Modify `backend/routers/assessments.py` to add `Depends(check_assessment_quota)`:

```python
@router.post("/assessments", status_code=201)
async def create_assessment(
    body: AssessmentCreate,
    current_user: dict = Depends(get_current_user),
    profile: dict = Depends(check_assessment_quota),  # ← add this
    supabase: Client = Depends(get_supabase_client),
) -> AssessmentResponse:
    ...
    # After successful save, increment counter for free users:
    if profile['tier'] == 'free':
        await increment_assessment_count(profile, supabase)
```

Modify `backend/routers/ai.py` to add `Depends(require_pro_tier)`:

```python
@router.get("/advice/{assessment_id}/{dimension}")
async def stream_advice(
    ...
    profile: dict = Depends(require_pro_tier),  # ← add this
    ...
)
```

#### Acceptance Criteria — Feature 3

- [ ] Free user can save exactly 3 assessments in a month — 4th returns 403
- [ ] Pro user has no assessment save limit
- [ ] Free user gets 403 on `/ai/advice` endpoints
- [ ] Pro user accesses `/ai/advice` without restriction
- [ ] Monthly counter resets automatically when `month_reset_at` passes
- [ ] Admin tier is treated as pro (no limits)
- [ ] 403 response includes `upgrade_url` in JSON body
- [ ] Counter increment is atomic (no race condition on concurrent saves)

---

### Feature 4: Billing UI — Upgrade Prompt + Subscription Management

**Estimated hours:** 10 hrs

**Migration:** No

#### File Map

**Modified files:**
- `index.html` — upgrade prompt banner, subscription status section in profile area
- `app.js` — `checkTierAndShowUpgrade()`, `initiateCheckout()`, `openBillingPortal()`
- `styles.css` — upgrade banner, tier badge, paywall overlay styles

#### Upgrade Trigger Points (UI)

1. **After 2nd assessment save:** Show a soft banner: "You've used 2 of 3 free assessments this month. Upgrade for unlimited."
2. **After 3rd assessment save (limit reached):** Show a hard banner that stays visible: "Free limit reached. Upgrade to Pro for unlimited assessments + AI Advisor."
3. **When clicking "Get AI-Powered Advice" (free user):** Show an inline paywall overlay instead of the AI advisor panel.
4. **In nav (when logged in):** Show tier badge next to user email: "Free" badge or "Pro" badge.

#### New HTML (add after `#aiAdvisorTrigger` in results section)

```html
<!-- Upgrade banner — shown dynamically by app.js -->
<div id="upgradeBanner" class="upgrade-banner hidden" role="alert">
  <div>
    <strong id="upgradeBannerTitle">Upgrade to Pro</strong>
    <span id="upgradeBannerMessage">Unlock unlimited assessments and AI-powered advice.</span>
  </div>
  <button class="button primary small" onclick="initiateCheckout('monthly')">Upgrade — $9/mo</button>
  <button class="button secondary small" onclick="initiateCheckout('yearly')">Best Value — $99/yr</button>
</div>

<!-- AI Advisor paywall overlay -->
<div id="aiAdvisorPaywall" class="paywall-overlay hidden">
  <div class="paywall-card">
    <h3>AI Advisor — Pro Feature</h3>
    <p>Get personalized, AI-generated action plans for your cybersecurity, AI readiness, and funding scores.</p>
    <ul class="feature-list">
      <li>Personalized advice per dimension</li>
      <li>AI-generated 30/60/90-day roadmap</li>
      <li>Custom executive summary</li>
      <li>Unlimited assessments per month</li>
    </ul>
    <div class="pricing-row">
      <button class="button primary" onclick="initiateCheckout('monthly')">Start Pro — $9/mo</button>
      <button class="button secondary" onclick="initiateCheckout('yearly')">Annual — $99/yr (save 8%)</button>
    </div>
    <p class="muted" style="font-size:13px;margin-top:12px">Cancel anytime from your billing settings.</p>
  </div>
</div>
```

**Subscription management section** (add after auth controls in nav):

```html
<div id="subscriptionStatus" style="display:none">
  <span id="tierBadge" class="tier-badge"></span>
  <button class="button secondary small" onclick="openBillingPortal()" id="manageBillingBtn" style="display:none">
    Manage Billing
  </button>
</div>
```

#### New Functions in `app.js`

```javascript
async function checkTierAndShowUpgrade() {
    if (!Auth?.isLoggedIn()) return;
    try {
        const profile = await ApiClient.get('/profiles/me');
        window._userProfile = profile;
        updateTierUI(profile);
    } catch (err) {
        console.warn('Could not load profile:', err);
    }
}

function updateTierUI(profile) {
    const badge = document.getElementById('tierBadge');
    if (badge) {
        badge.textContent = profile.tier === 'pro' ? 'Pro' : 'Free';
        badge.className = `tier-badge ${profile.tier}`;
    }
    // Show manage billing for pro users
    const manageBtn = document.getElementById('manageBillingBtn');
    if (manageBtn) manageBtn.style.display = profile.tier === 'pro' ? 'inline-flex' : 'none';

    // Show upgrade banner based on usage
    if (profile.tier === 'free') {
        if (profile.assessments_this_month >= 3) {
            showUpgradeBanner('limit_reached');
        } else if (profile.assessments_this_month >= 2) {
            showUpgradeBanner('approaching_limit');
        }
    }
}

function showUpgradeBanner(reason) {
    const banner = document.getElementById('upgradeBanner');
    const title = document.getElementById('upgradeBannerTitle');
    const msg = document.getElementById('upgradeBannerMessage');
    if (reason === 'limit_reached') {
        title.textContent = 'Monthly Limit Reached';
        msg.textContent = 'Upgrade to Pro for unlimited assessments + AI Advisor.';
    } else {
        title.textContent = 'Almost at your free limit';
        msg.textContent = `${3 - (window._userProfile?.assessments_this_month || 0)} assessment${3 - (window._userProfile?.assessments_this_month || 0) === 1 ? '' : 's'} remaining this month.`;
    }
    banner.classList.remove('hidden');
}

async function initiateCheckout(plan) {
    if (!Auth?.isLoggedIn()) { showAuthModal('signup'); return; }
    try {
        const { checkout_url } = await ApiClient.post('/billing/checkout', {
            price_id: `price_${plan}`
        });
        window.location.href = checkout_url;
    } catch (err) {
        if (err.status === 409) {
            alert('You already have an active subscription.');
        } else {
            alert('Unable to start checkout. Please try again.');
        }
    }
}

async function openBillingPortal() {
    try {
        const { portal_url } = await ApiClient.post('/billing/portal');
        window.open(portal_url, '_blank');
    } catch (err) {
        alert('Unable to open billing portal. Please try again.');
    }
}
```

**In `showAIAdvisor()` (from SPRINT-002):** Check tier before showing panel:

```javascript
function showAIAdvisor() {
    const profile = window._userProfile;
    if (!profile || profile.tier === 'free') {
        document.getElementById('aiAdvisorPaywall').classList.remove('hidden');
        document.getElementById('aiAdvisorPaywall').scrollIntoView({ behavior: 'smooth' });
        return;
    }
    document.getElementById('aiAdvisorPanel').style.display = 'block';
    document.getElementById('aiAdvisorPanel').scrollIntoView({ behavior: 'smooth' });
}
```

#### CSS additions for billing UI (append to `styles.css`)

```css
.upgrade-banner { background: linear-gradient(135deg, rgba(34,211,238,.15), rgba(96,165,250,.12)); border: 1px solid rgba(34,211,238,.4); border-radius: 18px; padding: 18px 22px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 18px; }
.paywall-overlay { background: rgba(7,17,31,.95); border: 1px solid var(--border); border-radius: 24px; padding: 40px; text-align: center; margin-top: 18px; }
.paywall-card { max-width: 520px; margin: 0 auto; }
.feature-list { text-align: left; margin: 18px auto; max-width: 280px; }
.feature-list li { margin: 10px 0; color: var(--text); }
.feature-list li::before { content: "✓ "; color: var(--green); }
.pricing-row { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-top: 20px; }
.tier-badge { padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 800; }
.tier-badge.free { background: rgba(255,255,255,.1); color: var(--muted); }
.tier-badge.pro { background: linear-gradient(135deg, rgba(34,211,238,.2), rgba(96,165,250,.2)); color: var(--cyan); border: 1px solid rgba(34,211,238,.3); }
```

#### Acceptance Criteria — Feature 4

- [ ] Free user sees tier badge "Free" in nav
- [ ] Pro user sees tier badge "Pro" and "Manage Billing" button in nav
- [ ] Upgrade banner appears after 2nd assessment save for free users
- [ ] Hard banner (limit reached) appears after 3rd assessment save
- [ ] Clicking "Get AI-Powered Advice" as free user shows paywall, not AI panel
- [ ] Clicking upgrade button redirects to Stripe Checkout
- [ ] After successful checkout, user sees Pro badge on page return
- [ ] "Manage Billing" opens Stripe Customer Portal in new tab
- [ ] Checkout error (409) shows "already subscribed" message, not generic error

---

### Feature 5: Admin Dashboard

**Estimated hours:** 6 hrs

**Migration:** No (reads from existing tables)

#### New File: `admin.html`

A separate, standalone HTML page (not part of `index.html`) that:
- Requires admin login (checks `tier == 'admin'` via `/profiles/me`)
- Shows platform-wide metrics readable only via the service role key
- Is NOT linked from `index.html` — admin navigates directly to the URL

#### API Endpoints

| Method | Path | Auth Required | Description |
|--------|------|--------------|-------------|
| GET | `/admin/metrics` | Yes + admin tier | Aggregate platform stats |
| GET | `/admin/users` | Yes + admin tier | Paginated user list with tier and assessment count |

**GET `/admin/metrics`** — admin only

Response (200):
```json
{
  "total_users": 142,
  "free_users": 128,
  "pro_users": 14,
  "total_assessments": 487,
  "assessments_this_month": 63,
  "most_common_industry": "restaurant",
  "average_overall_score": 54,
  "ai_advice_requests_this_month": 210
}
```

**GET `/admin/users`** — admin only, paginated

Query params: `limit` (max 100), `offset`, `tier` (filter)

Response matches `/assessments` list pattern with `data` + `meta`.

#### Admin Auth Dependency

```python
# backend/middleware/tier.py (addition)

async def require_admin_tier(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> dict:
    """Raises HTTP 403 if user is not admin tier."""
    ...
```

#### Admin Dashboard HTML

`admin.html` — self-contained page with same CSS variables, inline minimal styles:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Admin Dashboard — Champtron Systems LLC</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <header class="hero" style="padding:20px 6vw">
    <nav>
      <div class="brand">
        <strong>Champtron Systems LLC</strong>
        <span>Admin Dashboard</span>
      </div>
      <span id="adminUserEmail" class="muted"></span>
    </nav>
  </header>
  <main style="padding:32px 6vw">
    <div id="adminGate">
      <p class="muted">Checking admin access...</p>
    </div>
    <div id="adminContent" style="display:none">
      <h2>Platform Overview</h2>
      <div class="dashboard-grid" id="metricsGrid"></div>
      <h2>Users</h2>
      <table class="risk-table" id="usersTable">
        <thead><tr><th>Email</th><th>Tier</th><th>Assessments</th><th>Joined</th></tr></thead>
        <tbody id="usersTableBody"></tbody>
      </table>
    </div>
  </main>
  <script src="auth.js"></script>
  <script src="api-client.js"></script>
  <script>
    // Admin dashboard logic — inline for simplicity
    async function loadAdminDashboard() { ... }
    document.addEventListener('DOMContentLoaded', () => {
      Auth.onAuthChange(user => {
        if (user) loadAdminDashboard();
        else document.getElementById('adminGate').innerHTML =
          '<p class="muted">Admin access required. <a href="/">Go to main tool</a>.</p>';
      });
    });
  </script>
</body>
</html>
```

#### Acceptance Criteria — Feature 5

- [ ] `/admin/metrics` returns accurate counts (cross-check with Supabase dashboard)
- [ ] `/admin/metrics` returns 403 for non-admin users
- [ ] `/admin/users` is paginated, filterable by tier
- [ ] `admin.html` redirects (shows error message) if user is not admin tier
- [ ] All admin metrics are read-only — no mutations from admin dashboard in Sprint 3
- [ ] Setting a user to `tier = 'admin'` requires direct Supabase dashboard edit (no self-serve admin promotion)

---

## Error Catalog (Sprint 3 additions)

| Scenario | HTTP Status | Error Code | User Message | Log Level |
|----------|-------------|-----------|--------------|-----------|
| Free tier quota exceeded | 403 | `quota_exceeded` | "Free limit: 3 assessments/month. Upgrade for unlimited." | INFO |
| Pro feature on free tier | 403 | `tier_required` | "This feature requires a Pro subscription." | INFO |
| Already subscribed | 409 | `already_subscribed` | "You already have an active subscription." | INFO |
| Stripe API error | 502 | `billing_unavailable` | "Billing service temporarily unavailable. Please try again." | ERROR |
| Invalid webhook signature | 400 | `webhook_invalid` | (no user-facing message — webhook endpoint) | WARN |
| Admin route non-admin | 403 | `admin_required` | "Admin access required." | INFO |
| No Stripe customer | 404 | `no_billing_account` | "No billing account found. Start a subscription first." | INFO |

---

## Test Requirements — Sprint 3

### Backend Unit Tests

**Feature 1 — Profiles**
- [ ] `test_profile_created_on_signup` — trigger creates free-tier profile
- [ ] `test_get_own_profile` — returns tier, count, limit
- [ ] `test_cannot_update_own_tier` — UPDATE rejected by RLS

**Feature 2 — Billing**
- [ ] `test_checkout_session_created` (mocked Stripe SDK)
- [ ] `test_checkout_409_for_active_sub`
- [ ] `test_webhook_checkout_completed_upgrades_tier` (mock event)
- [ ] `test_webhook_subscription_deleted_downgrades_tier` (mock event)
- [ ] `test_webhook_invalid_signature_400`
- [ ] `test_webhook_idempotent` — calling twice produces same state
- [ ] `test_billing_portal_404_no_customer`

**Feature 3 — Tier Enforcement**
- [ ] `test_free_user_blocked_at_3rd_assessment`
- [ ] `test_free_user_allowed_first_3_assessments`
- [ ] `test_pro_user_unlimited_assessments`
- [ ] `test_free_user_blocked_from_ai_advice`
- [ ] `test_pro_user_accesses_ai_advice`
- [ ] `test_quota_resets_after_month_end`
- [ ] `test_counter_increment_only_for_free_users`

**Feature 4 — Billing UI (manual QA)**
- [ ] Free tier badge shows in nav after login
- [ ] Upgrade banner appears after 2nd assessment save
- [ ] Paywall overlay shows when free user clicks "Get AI-Powered Advice"
- [ ] Test checkout redirects to Stripe test checkout page
- [ ] Post-checkout URL `?checkout=success` causes tier refresh
- [ ] Manage Billing opens Stripe portal in new tab
- [ ] Pro badge shown after successful subscription

**Feature 5 — Admin**
- [ ] Admin metrics return correct counts
- [ ] Non-admin gets 403 on admin endpoints
- [ ] Admin HTML gate blocks non-admin users

---

## Rollback & Safety

- **Stripe test mode:** All development uses test keys. Production keys are separate Railway env vars.
- **Tier downgrade is automatic:** Stripe webhook sets tier = 'free' on subscription cancel. No manual intervention needed.
- **Quota reset is time-based:** `month_reset_at` column means resets are automatic even without a cron job.
- **Webhook security:** Always verify `Stripe-Signature`. Log and discard unverified events.
- **Migration rollback:** Each migration has a `-- ROLLBACK:` comment block with `DROP TABLE` and `DROP POLICY` statements.
- **No billing data in logs:** Never log `stripe_customer_id`, subscription IDs, or price IDs at DEBUG level — only at WARN/ERROR when there's a problem.

---

## Key Decisions

- **one-stripe-customer-per-user**: Each Champtron user maps 1:1 to a Stripe customer. Customer is created on first checkout attempt and the ID is stored in `user_profiles.stripe_customer_id`. — **Why**: Allows the Customer Portal to manage payment methods and billing history without re-authentication. Prevents duplicate customer creation. — **Alternatives considered**: Create customer at signup (creates many Stripe customers who never subscribe — noise in Stripe dashboard); create per-subscription (breaks Customer Portal — portal needs a stable customer ID).
- **tier-stored-in-db-not-jwt**: User tier is stored in `user_profiles.tier` and fetched via API, not embedded in the Supabase JWT. — **Why**: Tier changes (subscribe, cancel) take effect immediately without requiring the user to re-login to get a new JWT. If we put tier in the JWT, a canceled subscription still looks active until token expiry. — **Alternatives considered**: Custom claims in Supabase JWT (rejected — tier changes lag by up to 1 hour; requires JWT refresh logic).
- **assessment-counter-in-profiles**: `assessments_this_month` counter lives in `user_profiles`, not computed from the `assessments` table on every request. — **Why**: Counting rows on every POST /assessments adds latency and DB load. The denormalized counter + `month_reset_at` auto-reset pattern is fast and self-healing. — **Alternatives considered**: COUNT query on assessments table (rejected — slow at scale); Redis counter (deferred — infrastructure complexity for pre-production).
- **admin-html-separate-page**: Admin dashboard is a separate `admin.html`, not a route in `index.html`. — **Why**: Reduces the surface area of admin functionality exposed to regular users. Admin page is not linked from the main tool — security by obscurity as a secondary layer on top of the 403 API enforcement. — **Alternatives considered**: Admin section within index.html (rejected — all admin JS would be loaded for every user).
- **no-trial-period-in-mvp**: Sprint 3 does not implement a Stripe trial period. — **Why**: Simplifies the subscription state machine. Free tier effectively IS the trial — users get 3 assessments/month free indefinitely. A time-limited trial adds complexity (trial_end field, expiry emails) not needed for launch. — **Alternatives considered**: 14-day trial (deferred — can be added in Stripe dashboard without code changes once there are paying customers).

---

## How to Build

**Standalone** (build only, no review or merge):
```
Use wasp. Build from sprint spec docs/specs/SPRINT-003-billing-stripe-tiers.md
```

**Full autopilot** (build + review + fix loop + merge):
```
Use autopilot-wasp. Build from sprint spec docs/specs/SPRINT-003-billing-stripe-tiers.md
```

---

## Agent Hints

| Signal | Value | Agents |
|--------|-------|--------|
| Auth-critical | Yes | Hawkeye: Stripe webhook signature verification, tier enforcement bypass attempts, admin route protection |
| External dependencies | Stripe API | Vision: health check for Stripe connectivity. Hulk: Stripe API failure simulation |
| Database writes | user_profiles, subscriptions | Hulk: concurrent subscription create + tier update, counter increment race condition |
| Financial/PII data | Yes (Stripe customer data, subscription IDs) | Hawkeye: never log Stripe customer IDs in info/debug. Vision: log audit on billing endpoints |
| State machine | subscriptions.status (active → past_due → canceled) | Hulk: invalid transition testing (e.g., deleted before active) |
| Migration | Yes — user_profiles + subscriptions | Falcon: rollback SQL present, run after SPRINT-001 migrations |
| Builder | Wasp | Standalone builder — build only |
| Autopilot | autopilot-wasp | Full pipeline — build + review + fix + merge |
| Tools needed | Read, Write, Edit, Bash (pytest), Bash (supabase db push), Bash (stripe listen for webhook testing) | Pre-approve before starting |
| Files to read first | backend/dependencies.py, backend/routers/assessments.py, backend/routers/ai.py, app.js (Auth.isLoggedIn and profile check patterns), supabase/migrations/ (latest migration number) | Parallel-read these first |

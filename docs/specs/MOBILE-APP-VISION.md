# Mobile Application Vision — SmallBiz Cyber & AI Readiness Advisor
# Champtron Systems LLC — Product Spec (Not Yet Scheduled)
# Captured: 2026-06-18

---

## Overview

A native mobile application that mirrors and extends the web platform. The app branches
at the very first screen based on the user's business stage — existing business or
starting a business. Each path has a distinct pricing model and assessment scope.

---

## Entry Point — Screen 1: Business Stage Gate

```
"Are you an existing business owner or planning to start a business?"

  [ I Have an Existing Business ]     [ I'm Starting a Business ]
        ↓ (FREE to start)                    ↓ (PAID service)
   Existing Business Path               New Business Path
```

Both paths require account creation (email + password) so data is retained in the
database for future assessments, progress tracking, and history.

---

## Path A — Existing Business (Free Tier Entry → Paid Action Plan)

### Business Model
| Tier     | What's Included                          | Price       |
|----------|------------------------------------------|-------------|
| Free     | Single-screen score report, DB retained  | $0          |
| Paid     | Full action plan, roadmap, documents     | Subscription |

### Screen Flow

```
Screen 1: Business Stage Gate
    ↓ "I Have an Existing Business"

Screen 2: Enter Business Information
  - Business Name
  - Industry (dropdown: Restaurant, Barber/Beauty, Nonprofit,
               Contractor, Online Store, Consultant, Retail)
  - Primary Challenge (short text)
  - 9 assessment inputs (MFA, Backups, Training, Digital Tools,
    Automation, AI Usage, Documents, Online Presence, Growth Plan)
  - [ Run My Free Assessment ] button
  - NOTE: First assessment is always FREE. All data saved to DB.

Screen 3: Free Score Report (ONE screen — the "show the pain")
  - Overall readiness score (large, prominent)
  - Three category scores: Cyber / AI / Funding
  - Risk level badge: High / Moderate / Low
  - X priority items identified (count only, no details)
  - Risk category names (e.g. "High Risk: Cybersecurity")
  - Executive summary paragraph (2–3 sentences)
  - [ Unlock Your Action Plan ] CTA button (paid)
  - [ Save & Exit ] secondary button
  - Scores and all inputs saved to database automatically

Screen 4 (PAID): Action Plan — Full Report
  - Unlock gate / subscription paywall
  - After payment: full action plan unlocked
  - Sections:
      Priority Steps      — Do This First / Next / Later
      30/60/90 Roadmap    — Auto-generated from free report scores
      Risk Register       — Specific risks + recommended fix for each
      Tool Recommendations— With cost-level guidance (Free / Low / Medium / Pro)
      Document Templates  — Cybersecurity Policy, AI Policy, BCP, Grant Checklist
      Funding Prep        — Readiness checklist, gap alerts, opportunity score
      Progress Tracker    — Check off tasks, see % complete
      Baseline Compare    — Save score today, recheck in 30 days
  - [ Print / Export PDF ] button — full report printable
  - [ Download Report ] button
```

### Data Retention Rules
- Assessment inputs + scores always saved to DB on submission (free or paid)
- History panel shows all past assessments (free users see list; paid see detail)
- Baseline saved per user — one active baseline at a time (overwrite on new save)

---

## Path B — Starting a Business (All Paid)

### Business Model
All features in this path are paid. No free tier. The assessment itself,
the report, and the action plan are all part of the paid subscription.

### Assessment Scope
The "Starting a Business" assessment covers everything a new founder needs
to think through before launching — legal, financial, operational, and digital.

| Section               | User Inputs                                                         |
|-----------------------|---------------------------------------------------------------------|
| Business Purpose      | Mission/purpose statement, industry, target customer                |
| Budget & Funding      | Estimated startup budget, funding sources, monthly burn estimate    |
| Business Formation    | Entity type (LLC, Corp, Sole Prop, Partnership), state of formation |
| Documentation         | Business plan status, EIN, operating agreement, registered agent    |
| Licenses & Permits    | Industry-specific license needs, local permits, zoning              |
| Digital Presence      | Domain, website, social media, email setup                          |
| Cybersecurity Baseline| Starting MFA, cloud tools, backup plan, data handling               |
| AI & Automation       | Interest in AI tools, automation readiness, software stack          |
| Growth Plan           | 30/60/90-day launch milestones, customer acquisition plan           |

### Screen Flow

```
Screen 1: Business Stage Gate
    ↓ "I'm Starting a Business"

Screen 2: Paywall / Subscription Gate
  - "Starting a Business Assessment — Paid Service"
  - What's included (bullet list)
  - [ Subscribe & Start ] CTA
  - Price display

Screen 3–11: Multi-Step Starting Assessment
  - One section per screen (tab-style progress bar at top)
  - Business Purpose → Budget → Formation → Documentation →
    Licenses → Digital Presence → Cyber Baseline → AI & Automation → Growth Plan
  - Progress saved between sessions (resume where left off)
  - [ Back ] / [ Next ] navigation
  - [ Save & Continue Later ] option

Screen 12: Starting Business Score Report
  - Formation Readiness score
  - Financial Readiness score
  - Digital & Cyber Readiness score
  - Compliance Readiness score
  - Overall Launch Readiness score
  - Gaps identified with counts (personalized)

Screen 13: Launch Action Plan (auto-generated from report)
  - Prioritized steps to get formation-ready
  - Filing checklist: EIN, LLC/Corp filing, registered agent, operating agreement
  - License & permit roadmap (by priority)
  - Digital setup checklist: domain, email, website, socials
  - 30/60/90-day launch roadmap
  - Budget allocation guidance (where to spend first)
  - Document templates: Business Plan outline, Operating Agreement starter,
                         Startup Cybersecurity Policy, AI Usage Policy
  - [ Print / Export PDF ] — full plan printable
  - [ Download Report ]
```

---

## Shared Mobile UX Principles

| Principle            | Detail                                                              |
|----------------------|---------------------------------------------------------------------|
| Single-screen free report | Existing business free report fits on ONE scrollable screen   |
| DB retention always  | Every assessment saved — free or paid — for history and future use  |
| Auto-generate        | Action plan and roadmap generated from assessment inputs — no manual entry |
| Printable paid report| Full paid report renders as a clean, printable/exportable PDF       |
| Resume capability    | Long assessments (Starting a Business) save progress between sessions |
| Offline-friendly     | Assessment inputs collected offline, synced on reconnect            |
| Auth required        | Both paths require sign-up so data is tied to an account            |

---

## Mobile Tech Stack (Recommended — Not Yet Decided)

| Layer         | Option A (Recommended)  | Option B                |
|---------------|-------------------------|-------------------------|
| Framework     | React Native (Expo)     | Flutter                 |
| API           | Same FastAPI backend     | Same FastAPI backend    |
| Auth          | Supabase Auth (same)    | Supabase Auth (same)    |
| DB            | Same Supabase/Postgres  | Same Supabase/Postgres  |
| PDF Export    | react-native-pdf / expo-print | flutter_pdf      |
| State         | Zustand                 | Riverpod                |
| Reason        | Shares JS codebase logic | Better performance      |

Recommendation: React Native + Expo — allows code sharing with the existing JS
scoring functions (pct, level, risk) and re-uses the same Supabase backend and schema.

---

## New Backend Endpoints Needed (Future Sprint)

| Endpoint                        | Description                                    |
|---------------------------------|------------------------------------------------|
| POST /assessments/startup        | Save starting-business assessment inputs+scores |
| GET  /assessments/startup/:id    | Get startup assessment detail                   |
| GET  /assessments/startup        | List user's startup assessments                 |
| POST /reports/action-plan        | Generate action plan from assessment data       |
| GET  /reports/:id/pdf            | Export report as PDF                            |
| GET  /assessments/history        | Unified history (existing + startup)            |

---

## New Database Tables Needed (Future Sprint)

```sql
-- Starting-business assessments
CREATE TABLE startup_assessments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  purpose         TEXT,
  industry        TEXT,
  target_customer TEXT,
  budget_estimate NUMERIC,
  funding_sources TEXT[],
  entity_type     TEXT,   -- LLC, Corp, Sole Prop, Partnership
  state_of_formation TEXT,
  has_ein         BOOLEAN,
  has_biz_plan    BOOLEAN,
  licenses_needed TEXT[],
  domain_ready    BOOLEAN,
  website_ready   BOOLEAN,
  -- scores
  formation_score   INTEGER,
  financial_score   INTEGER,
  digital_score     INTEGER,
  compliance_score  INTEGER,
  overall_score     INTEGER,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE startup_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_startup_assessments"
  ON startup_assessments FOR ALL USING (auth.uid() = user_id);
```

---

## Sprint Placement (Suggested)

| Sprint | Description                                           | Depends On  |
|--------|-------------------------------------------------------|-------------|
| SPRINT-004 | Mobile app shell: Expo + Supabase auth + navigation | SPRINT-001 |
| SPRINT-005 | Existing Business path: assessment → free score screen | SPRINT-004 |
| SPRINT-006 | Starting a Business path: multi-step assessment + paid gate | SPRINT-003 + SPRINT-005 |
| SPRINT-007 | PDF export, printable reports, offline support        | SPRINT-005 + SPRINT-006 |

---

*Spec authored by Champtron Systems LLC — 2026-06-18. Not yet scheduled for build.*

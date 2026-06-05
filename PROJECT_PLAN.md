# SmallBiz Cyber & AI Readiness Advisor
## Product Project Plan — Modern Small Business Enhancement Initiative
**Owner:** Champtron Systems LLC  
**Start Date:** June 2026  
**Horizon:** 90 Days  
**Audience:** Entrepreneurs, small business owners, grant applicants, SBDCs, CDFIs

---

## Why This Matters

Modern small businesses face three compounding pressures simultaneously:

1. **Cyber threats** are no longer an enterprise problem — 43% of cyberattacks target small businesses and 60% close within 6 months of a breach.
2. **AI adoption pressure** — competitors who automate customer follow-up, scheduling, and reporting are pulling ahead. Most small business owners don't know where to start.
3. **Funding complexity** — billions in SBA, MBDA, and state grants go unclaimed every year because small businesses can't demonstrate readiness or articulate their needs in funder language.

This tool sits at the intersection of all three. The project plan below converts the roadmap into executable steps any developer, designer, or product owner can pick up and run.

---

## Phase 1 — Foundation & Conversion (Days 1–30)

**Goal:** Make the tool fundable, shareable, and worth returning to.

---

### EPIC 1.1 — PDF Report Export

**Why:** Funders, mentors, and advisors expect a document. A .txt file signals a prototype. A branded PDF signals a product.

| # | Task | Owner | Notes |
|---|---|---|---|
| 1.1.1 | Install and configure `jsPDF` + `html2canvas` via CDN | Dev | No build step needed — CDN only |
| 1.1.2 | Design PDF layout: cover page (logo, business name, date), score summary, roadmap, checklist | Design | Match existing dark-navy brand |
| 1.1.3 | Build `generatePDF()` function that captures `#results` section | Dev | Use html2canvas for chart, jsPDF for text sections |
| 1.1.4 | Replace existing "Download Report" .txt button with PDF button | Dev | Keep .txt as secondary option |
| 1.1.5 | Test PDF output across Chrome, Edge, Firefox, and mobile Safari | QA | Verify chart renders, fonts embed correctly |
| 1.1.6 | Add business name and date to PDF filename | Dev | `BrightPathCafe_ReadinessReport_2026-06-15.pdf` |

---

### EPIC 1.2 — Score History & Progress Tracking

**Why:** Small business owners need to see improvement over time to stay motivated. Returning users = organic retention with zero marketing spend.

| # | Task | Owner | Notes |
|---|---|---|---|
| 1.2.1 | Design localStorage schema: `{ date, businessName, overall, cyber, ai, funding }` | Dev | Array of up to 12 entries |
| 1.2.2 | Save score to localStorage on every assessment submit | Dev | Auto-save, no user action needed |
| 1.2.3 | Build "Your Progress" section below results showing last 3 scores as a mini line chart | Dev | Use Chart.js (already loaded) |
| 1.2.4 | Add delta indicator: "+12 points since last assessment" in green | Dev | Simple arithmetic on last two entries |
| 1.2.5 | Add "Clear history" link for privacy-conscious users | Dev | Confirm dialog before clearing |

---

### EPIC 1.3 — Email Report Delivery

**Why:** Mobile users won't download files. Email delivery means they get the report in their inbox and come back to it.

| # | Task | Owner | Notes |
|---|---|---|---|
| 1.3.1 | Sign up for EmailJS free tier (200 emails/month) | Product | Free, no backend needed |
| 1.3.2 | Create email template in EmailJS dashboard with report content | Product | Plain text body with scores + roadmap |
| 1.3.3 | Add optional email field below "Download Report" button | Dev | Placeholder: "Send report to my email (optional)" |
| 1.3.4 | Wire EmailJS `send()` call on form submit when email field is filled | Dev | Do not block submission if field is empty |
| 1.3.5 | Add privacy note: "We don't store your email or data." | Design | One line, small text below the field |

---

### EPIC 1.4 — Social Share Card

**Why:** LinkedIn is where small business owners seek credibility. A shareable score card drives organic discovery from the exact audience this tool serves.

| # | Task | Owner | Notes |
|---|---|---|---|
| 1.4.1 | Design a shareable score card template (1200×630px): score, maturity level, logo, CTA URL | Design | Use canvas or a static template with text overlay |
| 1.4.2 | Build `generateShareCard()` using html2canvas to capture a styled share-card div | Dev | Hidden div rendered off-screen, captured on click |
| 1.4.3 | Add "Share Your Score" button that downloads the card as a PNG | Dev | Users upload manually to LinkedIn/Twitter |
| 1.4.4 | Add pre-written LinkedIn caption to a copy-to-clipboard button | Dev | "I just assessed my business readiness with @ChamptronSystems — here's where I stand and my 30-day plan." |

---

### EPIC 1.5 — New Industry Profiles

**Why:** Every new industry = a new audience segment that sees itself in the tool. Consultant, Retail, and Healthcare together represent 3.2M US small businesses.

| # | Task | Owner | Notes |
|---|---|---|---|
| 1.5.1 | Research top 3 pain points for Consultant/Freelancer, Retail Store, Healthcare/Clinic | Product | Use SBA.gov industry data |
| 1.5.2 | Write sample profile data for each (businessName, challenge, all form values) | Content | Match format of existing 5 samples |
| 1.5.3 | Write 3 industry-specific tips per new industry for `industryTips` object | Content | Focus on practical, actionable language |
| 1.5.4 | Add 3 new buttons to the sample profile selector row | Dev | Consultant, Retail Store, Healthcare |
| 1.5.5 | Test all 3 new profiles through full assessment and results flow | QA | Verify tips render, scores calculate correctly |

---

### EPIC 1.6 — Real Grant Program Links

**Why:** The Funding Prep section tells businesses they're "63% ready" but doesn't tell them where to apply. Adding real links converts insight into action.

| # | Task | Owner | Notes |
|---|---|---|---|
| 1.6.1 | Research and curate 8–10 active grant programs: SBA, MBDA, IFundWomen, Hello Alice, state-level | Product | Verify links are current and accepting applications |
| 1.6.2 | Build a "Matched Grant Programs" section in the Funding Prep panel | Dev | Show 3–5 grants filtered by industry |
| 1.6.3 | Display: grant name, funder, award range, deadline (or "rolling"), and direct link | Dev | Static data object, update quarterly |
| 1.6.4 | Add disclaimer: "Links are for reference. Verify deadlines and eligibility directly with the funder." | Content | Below grant list |

---

## Phase 2 — Intelligence & Personalization (Days 31–60)

**Goal:** Replace static template output with AI-generated, business-specific content.

---

### EPIC 2.1 — Claude API Integration

**Why:** The #1 feedback on AI tools from small business owners is "it feels generic." Claude-generated narratives that reference the actual business name, industry, and scores feel like a custom consultant report.

| # | Task | Owner | Notes |
|---|---|---|---|
| 2.1.1 | Create Anthropic API account and generate API key | Product | Store key server-side — never in client JS |
| 2.1.2 | Build a minimal Node.js/Express backend endpoint: `POST /api/generate-report` | Dev | Accepts scores + business data, returns Claude text |
| 2.1.3 | Write system prompt: role = "small business readiness advisor", output = executive summary, 3 priorities, roadmap narrative | Dev | Use claude-sonnet-4-6 model |
| 2.1.4 | Enable prompt caching for the system prompt (saves ~70% token cost on repeat calls) | Dev | Add `cache_control: { type: "ephemeral" }` to system block |
| 2.1.5 | Replace static `executiveSummary` text with Claude API response | Dev | Show loading spinner during generation |
| 2.1.6 | Replace static document generator templates with Claude-drafted versions personalized per business | Dev | Pass industry, scores, and challenge description to prompt |
| 2.1.7 | Add error fallback: if API call fails, use existing static template | Dev | Never show a blank report |
| 2.1.8 | Test API latency — target under 4 seconds for first token | QA | Use streaming if needed |

---

### EPIC 2.2 — Dynamic Scoring by Industry

**Why:** A nonprofit's funding readiness matters more than its AI score. An online store's AI readiness matters more than its cyber score. One-size scoring misleads businesses about their actual priorities.

| # | Task | Owner | Notes |
|---|---|---|---|
| 2.2.1 | Define scoring weight matrix per industry (cyber %, ai %, funding %) | Product | E.g. nonprofit: 30/25/45; online: 28/40/32 |
| 2.2.2 | Refactor `overall` score calculation to use industry-specific weights | Dev | Replace hardcoded 0.38/0.32/0.30 with `weights[industry]` |
| 2.2.3 | Add a small "Scoring weighted for [industry]" note below the overall score | Design | One line, low visual weight |
| 2.2.4 | Validate that score changes are meaningful across all 8 industries | QA | Run all sample profiles, compare before/after |

---

### EPIC 2.3 — Industry Benchmark Comparisons

**Why:** A score of 47% means nothing without context. "47% vs. 52% restaurant average" creates urgency and a competitive frame that motivates action.

| # | Task | Owner | Notes |
|---|---|---|---|
| 2.3.1 | Define benchmark averages per industry per score dimension (research or estimate conservatively) | Product | E.g. restaurant cyber avg: 48%, AI avg: 31% |
| 2.3.2 | Build `getBenchmark(industry, dimension)` helper function | Dev | Returns avg score and label |
| 2.3.3 | Add benchmark bar below each score bar in the Dashboard Results section | Dev | "Industry avg: 48%" shown in muted color |
| 2.3.4 | Add contextual label: "Above average", "At average", "Below average" | Dev | Color-coded: green / yellow / red |

---

### EPIC 2.4 — Multi-Step Wizard UI

**Why:** A single long form intimidates small business owners who are already busy. Research shows multi-step forms reduce abandonment by up to 86%.

| # | Task | Owner | Notes |
|---|---|---|---|
| 2.4.1 | Design 3-step flow: Step 1 = Business Info, Step 2 = Security & Technology, Step 3 = Growth & Funding | Design | Progress bar at top showing current step |
| 2.4.2 | Restructure `index.html` form into 3 `<fieldset>` sections, show/hide with JS | Dev | No page reload — all client-side |
| 2.4.3 | Add "Next" / "Back" navigation buttons between steps | Dev | Validate required fields before advancing |
| 2.4.4 | Persist entered values across steps so Back doesn't clear data | Dev | Use JS object to hold state |
| 2.4.5 | Add step completion indicators (checkmarks on completed steps) | Design | Visual confidence builder |
| 2.4.6 | Test full flow on mobile (375px width) | QA | Most small business owners assess on phone |

---

### EPIC 2.5 — Embed Mode for Partner Distribution

**Why:** SBDCs, CDFIs, and chambers of commerce have direct relationships with thousands of small businesses. An embeddable version they can drop into their websites is a force-multiplier distribution channel that costs nothing.

| # | Task | Owner | Notes |
|---|---|---|---|
| 2.5.1 | Create `embed.html` — stripped version without nav/hero, just the assessment + results | Dev | Same JS/CSS, different layout |
| 2.5.2 | Add `?embed=true` URL param that triggers compact layout mode | Dev | Single parameter, no separate deploy needed |
| 2.5.3 | Write partner embed snippet (2-line iframe code) | Content | Target height: 900px, width: 100% |
| 2.5.4 | Create a "Partner with Us" one-pager explaining embed program | Content | PDF, 1 page, include embed code snippet |
| 2.5.5 | Identify 10 target SBDC/CDFI/incubator partners to outreach | Product | Start with local + national orgs serving target industries |

---

## Phase 3 — Platform & Revenue (Days 61–90)

**Goal:** Build recurring revenue, distribution scale, and impact metrics for funders.

---

### EPIC 3.1 — User Accounts & Score History Dashboard

**Why:** Without accounts, every visit is a fresh start. With accounts, the tool becomes a business's long-term readiness tracker — dramatically increasing retention and perceived value.

| # | Task | Owner | Notes |
|---|---|---|---|
| 3.1.1 | Set up Supabase free tier project (auth + postgres) | Dev | No server needed — JS client library |
| 3.1.2 | Add email/password sign-up and login UI (modal, minimal friction) | Dev | "Save your progress" CTA after first assessment |
| 3.1.3 | Store each completed assessment to `assessments` table (user_id, date, scores, data) | Dev | Encrypt or anonymize PII fields |
| 3.1.4 | Build "My Dashboard" view: list of past assessments with scores and dates | Dev | Accessible from nav when logged in |
| 3.1.5 | Add score trend line chart across all past assessments | Dev | Chart.js — same library already in use |
| 3.1.6 | Add "Share report" button that generates a read-only URL for the latest assessment | Dev | UUID-based public link, no login required to view |

---

### EPIC 3.2 — Freemium Monetization Tier

**Why:** The tool delivers real, quantifiable value. Charging for the premium layer funds continued development and signals product seriousness to funders and partners.

| # | Task | Owner | Notes |
|---|---|---|---|
| 3.2.1 | Define free vs. paid feature split | Product | Free: assessment + basic report. Paid: PDF, history, Claude docs, grant matching |
| 3.2.2 | Set up Stripe Checkout (no-code payment page, no backend needed) | Dev | $9/mo individual, $19/mo business |
| 3.2.3 | Gate paid features behind `isPro` flag stored in Supabase user profile | Dev | Show upgrade prompt when free user clicks gated feature |
| 3.2.4 | Build upgrade modal: clear value prop, pricing, one-click checkout | Design | "Unlock your full report + grant matching" |
| 3.2.5 | Add free trial: 7-day full access, no credit card required | Product | Lowers conversion friction for grant-deadline urgency |
| 3.2.6 | Set up Stripe webhook to update `isPro` flag on payment confirmation | Dev | Use Supabase edge function or Zapier |

---

### EPIC 3.3 — White-Label Licensing for Organizations

**Why:** One SBDC license = access to hundreds of small businesses they serve. White-label is the highest-leverage revenue and distribution channel available.

| # | Task | Owner | Notes |
|---|---|---|---|
| 3.3.1 | Define white-label package: custom logo, custom color scheme, custom domain subdomain | Product | Delivered as config object, not a new codebase |
| 3.3.2 | Build `config.json` driven theming: logo URL, primary color, org name, contact link | Dev | Replace hardcoded Champtron branding with config values |
| 3.3.3 | Create partner onboarding form (Typeform or Google Form): org name, logo, contact, use case | Product | Triggers manual setup for now; automate in v2 |
| 3.3.4 | Write white-label pricing one-pager: $99/mo starter, $299/mo growth, $499/mo enterprise | Product | Include: # of users, custom domain, analytics dashboard, co-branding |
| 3.3.5 | Build internal analytics view: assessments per org, score distribution, top industries | Dev | Supabase query + simple chart, admin-only view |
| 3.3.6 | Identify 5 pilot white-label partners for outreach (SBDC, CDFI, chamber, incubator, nonprofit) | Product | Offer 90-day free pilot in exchange for testimonial |

---

### EPIC 3.4 — Live Grant Matching Engine

**Why:** Connecting a business's score, industry, and location to real open grant opportunities is the highest-value feature possible for a funding-focused product.

| # | Task | Owner | Notes |
|---|---|---|---|
| 3.4.1 | Build a curated grant database (JSON file): 20–30 grants with industry tags, award range, eligibility, deadline, URL | Product | Update monthly; start with SBA, MBDA, Hello Alice, IFundWomen, Verizon Small Biz |
| 3.4.2 | Build `matchGrants(industry, scores, state)` filter function | Dev | Returns top 5 grants sorted by eligibility match |
| 3.4.3 | Add optional "State" field to assessment form for location-based matching | Dev | Dropdown, not required |
| 3.4.4 | Render matched grants in Funding Prep section: name, funder, award range, deadline, apply link | Dev | Replace static grant links from Phase 1 |
| 3.4.5 | Add "Improve your match score" tip if funding readiness < 60% | Dev | One-line contextual nudge below grant list |
| 3.4.6 | Gate detailed grant matching (state filter + full list) behind paid tier | Dev | Free: top 3 national grants. Paid: full matched list |

---

### EPIC 3.5 — Pitch Deck Generator

**Why:** Small business owners applying for grants or investment need a deck. Building one from scratch takes days. Auto-generating a 5-slide starter deck from their report data saves hours and drives paid conversions.

| # | Task | Owner | Notes |
|---|---|---|---|
| 3.5.1 | Define 5-slide structure: (1) Business Overview, (2) Problem & Market, (3) Readiness Scores, (4) 30/60/90 Roadmap, (5) Funding Ask | Product | Generic enough to work for any industry |
| 3.5.2 | Build HTML slide templates using report data variables | Dev | CSS-styled divs, one per slide |
| 3.5.3 | Use html2canvas + jsPDF to export slides as a multi-page PDF | Dev | Same library used for report PDF |
| 3.5.4 | Pre-fill slides with business name, scores, roadmap text, and industry tips from assessment | Dev | No user editing needed — download and customize in PowerPoint |
| 3.5.5 | Gate behind paid tier with preview of slide 1 visible to free users | Dev | "Unlock full 5-slide pitch deck" upgrade prompt |

---

### EPIC 3.6 — Impact Metrics Dashboard (Public)

**Why:** Funders want proof of scale before they invest. A public counter showing "1,247 businesses assessed, average readiness improved 22 points" is the most powerful grant application asset the product can have.

| # | Task | Owner | Notes |
|---|---|---|---|
| 3.6.1 | Aggregate anonymized stats from Supabase: total assessments, avg scores by industry, score improvement distribution | Dev | No PII — counts and averages only |
| 3.6.2 | Build a public `/impact` page or section on the landing hero | Dev | 3 counters: businesses served, avg readiness score, industries covered |
| 3.6.3 | Add animated counter on hero load (0 → current count) | Dev | requestAnimationFrame counter animation |
| 3.6.4 | Add to grant applications and pitch deck as proof of traction | Product | "Tool has served X businesses across Y industries since launch" |

---

## Dependency Map

```
Phase 1 (PDF export) ──────────────────────────► Phase 3 (Pitch Deck Generator uses same library)
Phase 1 (Score History localStorage) ──────────► Phase 3 (User Accounts replaces localStorage)
Phase 2 (Claude API) ──────────────────────────► Phase 3 (Claude docs gated behind paid tier)
Phase 2 (Multi-step Wizard) ───────────────────► Phase 3 (Freemium gates step 3 for free users)
Phase 2 (Embed Mode) ──────────────────────────► Phase 3 (White-label builds on embed foundation)
Phase 1 (Grant Links) ─────────────────────────► Phase 3 (Grant Matching Engine replaces static links)
```

---

## Resource Requirements

| Role | Phase 1 | Phase 2 | Phase 3 |
|---|---|---|---|
| Frontend Developer | 40 hrs | 60 hrs | 80 hrs |
| Product / Content | 10 hrs | 15 hrs | 20 hrs |
| Design | 8 hrs | 12 hrs | 10 hrs |
| QA | 6 hrs | 10 hrs | 12 hrs |
| **Total** | **~64 hrs** | **~97 hrs** | **~122 hrs** |

---

## Success Metrics

| Metric | 30 Days | 60 Days | 90 Days |
|---|---|---|---|
| Total assessments completed | 100 | 500 | 1,000+ |
| PDF reports downloaded | 50 | 200 | 500+ |
| Partner embeds / shares | 2 | 10 | 25+ |
| Paying customers | 0 | 5 | 20+ |
| White-label pilots | 0 | 1 | 3+ |
| Grant applications using the tool | 5 | 25 | 100+ |

---

*Built by Champtron Systems LLC — closing the readiness gap for America's small businesses.*

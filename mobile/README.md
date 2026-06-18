# SmallBiz Advisor — Mobile App

Expo + TypeScript mobile application for the SmallBiz Cyber & AI Readiness Advisor.
Built by Champtron Systems LLC.

---

## Prerequisites

- Node.js 18 or later
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- Expo Go app on your iOS or Android device (for physical device testing)
- An Android emulator or iOS simulator (optional)

---

## Environment Setup

Create a `.env` file in the `mobile/` directory:

```
EXPO_PUBLIC_API_URL=https://your-backend.railway.app/api
```

For local development, point to your backend running locally:

```
EXPO_PUBLIC_API_URL=http://localhost:8000/api
```

---

## Running the App

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with Expo Go on your device, or press `a` for Android emulator / `i` for iOS simulator.

---

## Feature Overview

### Two Paths

**Existing Business — Free Score, Paid Action Plan**

1. User signs up / logs in via StageGate
2. Fills out a 4-step assessment (business info, cybersecurity, AI/digital, funding)
3. Receives free Cyber, AI, and Funding readiness scores
4. Upgrades to unlock the full Action Plan (prioritized, dimension-specific action items)
5. Paid users can export the Action Plan as a PDF

**Starting a Business — 9-Step Paid Assessment**

1. User taps "I'm Starting a Business" on StageGate
2. Completes a 9-step wizard covering: Business Idea, Budget & Finance, Business Formation, Licenses & Permits, Documentation, Online Presence, Tech & AI Readiness, Cybersecurity Basics, Growth Plan
3. Receives a Launch Readiness Score (0-100) with Formation, Finance, and Digital sub-scores
4. Paid users unlock the full Launch Plan with step-by-step action items across three sections
5. Paid users can export the Launch Plan as a PDF

---

## Scoring Formulas

All scoring functions live in `src/utils/scoring.ts`.

### Existing Business

```typescript
pct(vals: number[]): number
// Average of 0-2 inputs, scaled to 0-100
// e.g. pct([2, 1, 0]) === 50

level(score: number): string
// >= 80: "Advanced readiness"
// >= 60: "Growth-ready foundation"
// >= 40: "Developing readiness"
// < 40:  "High-priority improvement needed"

risk(score: number): 'Low' | 'Moderate' | 'High'
// >= 75: Low | >= 50: Moderate | < 50: High
```

Overall score: `cyberScore * 0.38 + aiScore * 0.32 + fundingScore * 0.30`

### Startup (computed server-side)

- **formation_score**: (has_ein + has_business_plan + has_bank_account + formation_type set + state_of_formation set) / 5 * 100
- **finance_score**: (startup_budget set + has_funding_source) / 2 * 100
- **digital_score**: avg(digital_tools_planned, automation_planned, ai_usage_planned) / 2 * 100
- **launch_readiness**: formation_score * 0.40 + finance_score * 0.30 + digital_score * 0.30

---

## State Management

Two Zustand stores:

### `authStore` — `src/store/authStore.ts`

Manages authentication state: JWT token (persisted in `expo-secure-store`), user object, `isPaid` flag, `isLoading`, `error`, and `pendingStartupRedirect` for post-login routing to the startup flow.

Key actions: `initialize()`, `login()`, `signup()`, `logout()`, `setIsPaid()`, `setPendingStartupRedirect()`

### `draftStore` — `src/store/draftStore.ts`

Persisted via `zustand/middleware` `persist` + `AsyncStorage` under the key `smallbiz-draft`. Survives app restarts.

Contains two draft objects:
- `assessmentDraft` — mirrors the existing business assessment form fields
- `startupDraft` — mirrors all 9 startup wizard steps

Key actions: `setAssessmentDraftField()`, `clearAssessmentDraft()`, `setStartupDraftField()`, `clearStartupDraft()`

---

## Navigation Structure

```
RootNavigator
├── Auth (not logged in)
│   ├── StageGate         — path selection (existing vs startup)
│   ├── Login             — email + password, passes isStartup flag
│   └── Signup            — new account creation
│
└── App (logged in)
    ├── Tabs
    │   ├── Home           — last assessment, quick actions, pull-to-refresh
    │   ├── History        — past assessments list
    │   └── Profile        — account info, logout
    │
    ├── AssessmentForm     — 4-step existing business assessment
    ├── FreeScore          — score display + upgrade CTA
    ├── Upgrade            — paywall screen
    ├── ActionPlan         — paid: prioritized action items + PDF export
    ├── AssessmentDetail   — historical assessment detail
    │
    ├── StartupStep1-9     — 9-step startup wizard
    ├── StartupScore       — launch readiness score + sub-score bars
    └── StartupLaunchPlan  — paid: formation/finance/digital action plan + PDF export
```

---

## PDF Export

Available on `ActionPlanScreen` (existing business) and `StartupLaunchPlanScreen` (startup path).

Uses `expo-print` to render an HTML string to a PDF file, then `expo-sharing` to open the system share sheet. The HTML is fully inline-styled with no external dependencies for maximum portability.

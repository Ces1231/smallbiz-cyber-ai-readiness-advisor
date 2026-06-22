# SPRINT-005: Existing Business Assessment Path — Mobile

**Sprint ID:** SPRINT-005
**Sprint Type:** Feature build — mobile existing-business path
**Builder:** Wasp
**Branch:** `feature/sprint-005-existing-business`
**Status:** Draft
**Spec Author:** J.A.R.V.I.S.
**Created:** 2026-06-19
**Project Stage:** pre-production

---

## Sprint Meta

| Field | Value |
|-------|-------|
| Sprint ID | SPRINT-005 |
| Sprint Type | Feature build — mobile existing-business path |
| Total Estimated Hours | 34 hrs |
| Features | 6 |
| Branch | `feature/sprint-005-existing-business` |
| Builder | Wasp |
| Spec Author | J.A.R.V.I.S. |
| Created | 2026-06-19 |
| Dependencies | SPRINT-004 (mobile shell complete) |

---

## Sprint Overview

This sprint completes the **Existing Business assessment path** in the Expo mobile app. The path was partially built during earlier mobile work — the screens `AssessmentFormScreen`, `FreeScoreScreen`, `ActionPlanScreen`, `AssessmentDetailScreen`, `HistoryScreen`, and `UpgradeScreen` all exist and are registered in `AppNavigator`. However, several gaps prevent the path from being fully functional end-to-end:

1. The `createAssessment` API client sends the wrong payload shape to the backend — it sends flat fields instead of the nested `inputs` + `scores` structure the backend expects.
2. The backend response for `GET /assessments` and `GET /assessments/{id}` does not include computed level/risk labels — those must be computed client-side using `computeAssessmentScores` from `utils/scoring.ts`, but the current `Assessment` type and API call do not do this.
3. The `primary_challenge` field (optional text input) is missing from the form and the `AssessmentInput` type.
4. The assessment form collects all fields across 4 grouped steps, but the product vision specifies one question per screen (step-by-step), matching the startup path pattern. This sprint refactors the form into an `existing/` screen folder with per-domain step screens.
5. There is no 30/60/90 roadmap screen — the `ActionPlanScreen` shows action items but not the roadmap content that was specified in the product vision.
6. The `draftStore` already has `assessmentDraft` with the correct field shape but `AssessmentFormScreen` uses its own local `AsyncStorage` instead of the shared Zustand draft store.

This sprint fixes all six gaps. The existing screens in the root `screens/` folder are refactored into `screens/existing/` to match the startup path's folder structure, and `AppNavigator` is updated to point to the new locations.

---

## Established Patterns

All code in this sprint must follow these patterns, derived from existing mobile source:

| Pattern | Implementation |
|---------|---------------|
| Screen component | Named export, `function FooScreen({ navigation, route }: any)` |
| Navigation type | `AppStackParamList` in `AppNavigator.tsx` — add new routes there |
| API calls | `api.get<T>()` / `api.post<T>()` from `mobile/src/api/client.ts` |
| Auth token | `const { token } = useAuthStore()` — passed as third arg to `api.*` |
| Paid status | `const { isPaid } = useAuthStore()` |
| Draft persistence | Zustand `useDraftStore` + `setAssessmentDraftField` + `clearAssessmentDraft` — stored in AsyncStorage via `zustand/middleware/persist` |
| Scoring | `computeAssessmentScores(inputs)` from `mobile/src/utils/scoring.ts` — NEVER recompute inline |
| Styling | `StyleSheet.create()` — colors from `theme/colors.ts`, sizes from `theme/typography.ts` |
| Progress bar | `<ProgressBar current={n} total={N} />` component already exists |
| Step picker | `<StepPicker label value onChange options />` component already exists |
| Card wrapper | `<Card style={...}>` component already exists |
| Loading state | `<ActivityIndicator color={colors.cyan} />` centered in `SafeAreaView` |
| Error state | Inline `error` string state, red banner or centered error with Back button |
| Back button | `TouchableOpacity` with `‹ Back` text, `color: colors.cyan` |
| Header layout | Three-column row: back side (minWidth 64) / centered title / empty side (minWidth 64) |
| `EXPO_PUBLIC_API_URL` | Already consumed in `api/client.ts` — never hardcode base URL in screens |
| No `any` on API responses | All responses typed — no `any` allowed on fetched data |

### Industry Options (exact list from AssessmentFormScreen)

```typescript
const INDUSTRY_OPTIONS = ['Retail', 'Healthcare', 'Finance', 'Technology', 'Education', 'Construction', 'Other'];
```

### Score Options (exact shape from AssessmentFormScreen)

```typescript
const SCORE_OPTIONS = [
  { label: 'None (0)', value: 0 },
  { label: 'Partial (1)', value: 1 },
  { label: 'Yes (2)', value: 2 },
];
```

### Scoring Formulas (must match `app.js` exactly — already in `scoring.ts`)

```
cyberScore  = pct([mfa, backups, training])
aiScore     = pct([digital_tools, automation, ai_usage])
fundingScore= pct([documents, online_presence, growth_plan])
overallScore= round(cyberScore * 0.38 + aiScore * 0.32 + fundingScore * 0.30)
pct(vals)   = round((sum(vals) / (length * 2)) * 100)
```

---

## Feature Sequence

Wasp executes features in this exact order. Dependencies are pre-resolved.

| # | Feature | Est Hours | Files Affected | Backend Call? |
|---|---------|-----------|----------------|---------------|
| 1 | Fix `assessments.ts` API client — payload shape + response types | 2 hrs | `mobile/src/api/assessments.ts` | Yes — POST shape |
| 2 | Refactor assessment form into per-domain step screens (`screens/existing/`) | 10 hrs | New files in `screens/existing/`, `AppNavigator.tsx`, `draftStore.ts` | No |
| 3 | Wire draft store to the new form screens | 2 hrs | `screens/existing/` (modify during Feature 2 build) | No |
| 4 | Fix `FreeScoreScreen` — client-side score/level/risk enrichment | 3 hrs | `screens/FreeScoreScreen.tsx` or `screens/existing/ExistingFreeScoreScreen.tsx` | No |
| 5 | Add 30/60/90 Roadmap screen | 8 hrs | `screens/existing/ExistingRoadmapScreen.tsx`, `AppNavigator.tsx` | No |
| 6 | Polish: `AssessmentDetailScreen` — "View Roadmap" CTA for paid users | 2 hrs | `screens/AssessmentDetailScreen.tsx` | No |

**Total: 27 hrs feature + 7 hrs tests = 34 hrs**

---

## Feature Specs

---

### Feature 1: Fix `assessments.ts` API Client

**Est: 2 hrs**

**Read-ahead hints for Wasp:**
Before writing Feature 1, pre-load in parallel:
- `mobile/src/api/assessments.ts` — current payload shape
- `backend/routers/assessments.py` — exact POST body the backend expects
- `backend/schemas/assessments.py` — Pydantic schema (if accessible)
- `mobile/src/utils/scoring.ts` — `AssessmentScoreResult` type
- `mobile/src/api/client.ts` — `api.post` signature

**Problem:**
The current `createAssessment` function in `mobile/src/api/assessments.ts` sends a flat payload. The backend's `POST /assessments` endpoint expects the body to match `AssessmentCreate`, which nests inputs under an `inputs` object and scores under a `scores` object:

```python
# backend/routers/assessments.py — what the backend reads:
"mfa": body.inputs.mfa,
"backups": body.inputs.backups,
"training": body.inputs.training,
"digital_tools": body.inputs.digital_tools,
"automation": body.inputs.automation,
"ai_usage": body.inputs.ai_usage,
"documents": body.inputs.documents,
"online_presence": body.inputs.online_presence,
"growth_plan": body.inputs.growth_plan,
"cyber_score": body.scores.cyber_score,
"ai_score": body.scores.ai_score,
"funding_score": body.scores.funding_score,
"overall_score": body.scores.overall_score,
```

**Problem 2:**
The backend's GET responses return flat integer scores (`cyber_score`, `ai_score`, etc.) but do NOT return `cyber_level`, `ai_level`, `funding_level`, `overall_level`, `cyber_risk`, `ai_risk`, `funding_risk`. The current `Assessment` type declares these fields but they are never populated from the API response. Screens that use them (`FreeScoreScreen`, `AssessmentDetailScreen`) will render empty strings.

**Fix:**

1. Update `AssessmentCreatePayload` type to use nested `inputs` + `scores` structure matching the backend.
2. Add `enrichAssessment(raw: AssessmentRaw): Assessment` — calls `computeAssessmentScores` to append level/risk labels to the raw API response.
3. Update `createAssessment`, `listAssessments`, `getAssessment` to call `enrichAssessment` before returning.

**Types to define:**

```typescript
// mobile/src/api/assessments.ts

export interface AssessmentInputs {
  mfa: number;           // 0 | 1 | 2
  backups: number;       // 0 | 1 | 2
  training: number;      // 0 | 1 | 2
  digital_tools: number; // 0 | 1 | 2
  automation: number;    // 0 | 1 | 2
  ai_usage: number;      // 0 | 1 | 2
  documents: number;     // 0 | 1 | 2
  online_presence: number; // 0 | 1 | 2
  growth_plan: number;   // 0 | 1 | 2
}

export interface AssessmentScores {
  cyber_score: number;   // 0–100
  ai_score: number;
  funding_score: number;
  overall_score: number;
}

export interface AssessmentCreatePayload {
  business_name: string;
  industry: string;
  challenge?: string | null;    // maps to backend's "challenge" field
  inputs: AssessmentInputs;
  scores: AssessmentScores;
}

// Raw shape returned by the backend (no level/risk labels)
export interface AssessmentRaw {
  id: string;
  user_id: string;
  business_name: string;
  industry: string;
  challenge: string | null;
  mfa: number;
  backups: number;
  training: number;
  digital_tools: number;
  automation: number;
  ai_usage: number;
  documents: number;
  online_presence: number;
  growth_plan: number;
  cyber_score: number;
  ai_score: number;
  funding_score: number;
  overall_score: number;
  created_at: string;
  updated_at: string;
}

// Enriched type used by all screens (includes level/risk labels)
export interface Assessment extends AssessmentRaw {
  cyber_level: string;
  ai_level: string;
  funding_level: string;
  overall_level: string;
  cyber_risk: 'Low' | 'Moderate' | 'High';
  ai_risk: 'Low' | 'Moderate' | 'High';
  funding_risk: 'Low' | 'Moderate' | 'High';
}

export interface AssessmentListItem {
  id: string;
  business_name: string;
  industry: string;
  cyber_score: number;
  ai_score: number;
  funding_score: number;
  overall_score: number;
  created_at: string;
}

// Enriched list item (adds overall_level for HistoryScreen display)
export interface AssessmentSummary extends AssessmentListItem {
  overall_level: string;
  overall_risk: 'Low' | 'Moderate' | 'High';
}

// POST /assessments response — only returns id, created_at, overall_score
export interface AssessmentCreateResponse {
  id: string;
  created_at: string;
  overall_score: number;
  message: string;
}
```

**Functions:**

```typescript
function enrichAssessment(raw: AssessmentRaw): Assessment
// Calls computeAssessmentScores(raw) and merges level/risk labels into raw.
// Maps: cyberScore→cyber_level, cyberRisk→cyber_risk, etc.

function enrichListItem(raw: AssessmentListItem): AssessmentSummary
// Same enrichment but for list items (only overall_level and overall_risk needed).

async function createAssessment(payload: AssessmentCreatePayload, token: string): Promise<AssessmentCreateResponse>
// POST /assessments — note: returns AssessmentCreateResponse (id + message), NOT full Assessment.
// The caller must then call getAssessment(id, token) if it needs the full enriched object,
// or build a local Assessment from the payload + response id. See Feature 2 for pattern.

async function getAssessment(id: string, token: string): Promise<Assessment>
// GET /assessments/{id} → enrichAssessment(raw)

async function listAssessments(token: string, limit?: number, offset?: number): Promise<{ data: AssessmentSummary[]; meta: ListMeta }>
// GET /assessments?limit=N&offset=N
// Returns paginated response matching backend's AssessmentListResponse shape.
```

**List response type:**

```typescript
export interface ListMeta {
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}
```

**Acceptance Criteria:**
- [ ] `createAssessment` sends `{ business_name, industry, challenge, inputs: {...}, scores: {...} }` — verified against backend schema
- [ ] `getAssessment` returns an `Assessment` with all level/risk fields populated (not empty strings)
- [ ] `listAssessments` returns `AssessmentSummary[]` with `overall_level` and `overall_risk` populated
- [ ] No field named `primary_challenge` in the payload — use `challenge` to match backend column name
- [ ] TypeScript compiles with zero `any` on API response types

---

### Feature 2: Refactor Assessment Form into Per-Domain Step Screens

**Est: 10 hrs (includes Feature 3 — draft store wiring)**

**Read-ahead hints for Wasp:**
Before writing Feature 2, pre-load in parallel:
- `mobile/src/screens/AssessmentFormScreen.tsx` — existing form to refactor
- `mobile/src/screens/startup/StartupStep1Screen.tsx` — step screen pattern to mirror
- `mobile/src/store/draftStore.ts` — `assessmentDraft` shape and `setAssessmentDraftField`
- `mobile/src/navigation/AppNavigator.tsx` — current route registrations
- `mobile/src/components/StepPicker.tsx` and `ProgressBar.tsx` — reusable components

**Goal:**
Replace `AssessmentFormScreen` (4-grouped-step form) with a proper per-screen step flow under `mobile/src/screens/existing/`. The new flow has 5 steps:

```
ExistingStep1Screen  — Business info (name, industry, optional challenge text)
ExistingStep2Screen  — Cybersecurity (mfa, backups, training)
ExistingStep3Screen  — AI & Digital Tools (digital_tools, automation, ai_usage)
ExistingStep4Screen  — Funding Readiness (documents, online_presence, growth_plan)
ExistingStep5Screen  — Review & Submit (shows summary of all answers, submit button)
```

Each step screen:
- Reads its fields from `useDraftStore().assessmentDraft`
- Writes changes via `setAssessmentDraftField(field, value)`
- Shows `<ProgressBar current={stepNumber} total={5} />` at top
- Shows "Step N of 5" label
- Has Back / Next or Submit buttons
- Does NOT hold its own local state for field values — all state is in the draft store

**New files to create:**

```
mobile/src/screens/existing/ExistingStep1Screen.tsx
mobile/src/screens/existing/ExistingStep2Screen.tsx
mobile/src/screens/existing/ExistingStep3Screen.tsx
mobile/src/screens/existing/ExistingStep4Screen.tsx
mobile/src/screens/existing/ExistingStep5Screen.tsx
```

**Do NOT delete** `AssessmentFormScreen.tsx` — keep it in place but the AppNavigator route `AssessmentForm` will be updated to point to `ExistingStep1Screen` instead. This preserves any deep links or other references.

**ExistingStep1Screen — Business Information:**

Fields:
- `business_name` (required, TextInput, `autoCapitalize="words"`, validate non-empty before Next)
- `industry` (required, Picker — same `INDUSTRY_OPTIONS` list as before)
- `challenge` (optional, TextInput multiline, max 500 chars, placeholder "Describe your primary challenge (optional)")

Validation: Alert if `business_name.trim().length === 0`.

**ExistingStep2Screen — Cybersecurity Readiness:**

Fields via `<StepPicker>`:
- `mfa` — label: "Multi-Factor Authentication (MFA)", description: "Do you require MFA on email, banking, and cloud accounts?"
- `backups` — label: "Data Backups", description: "Do you have automated, tested backups of critical business data?"
- `training` — label: "Security Awareness Training", description: "Do staff receive regular cybersecurity training?"

All use `SCORE_OPTIONS` (`None / Partial / Yes`, values `0 / 1 / 2`).

**ExistingStep3Screen — AI & Digital Tools:**

Fields:
- `digital_tools` — label: "Digital Tools Usage", description: "How well does your business use digital tools (CRM, accounting, scheduling)?"
- `automation` — label: "Process Automation", description: "Are repetitive tasks automated (follow-ups, invoicing, reminders)?"
- `ai_usage` — label: "AI Adoption", description: "Is your team actively using AI tools for business tasks?"

**ExistingStep4Screen — Funding Readiness:**

Fields:
- `documents` — label: "Financial Documents", description: "Are your financial records, tax filings, and business docs organized and accessible?"
- `online_presence` — label: "Online Presence", description: "Does your business have a professional website, reviews, and social proof?"
- `growth_plan` — label: "Growth Plan", description: "Do you have a documented growth plan, projections, or pitch materials?"

**ExistingStep5Screen — Review & Submit:**

This screen:
1. Reads full `assessmentDraft` from `useDraftStore()`
2. Calls `computeAssessmentScores(draft)` to show a preview of scores
3. Displays a summary card showing: business name, industry, challenge (if any), and three score previews (Cyber / AI / Funding) as `<ScoreBadge size="sm" />`
4. Shows a "Submit Assessment" button
5. On submit:
   a. Call `computeAssessmentScores(draft)` for final scores
   b. Call `createAssessment({ business_name, industry, challenge, inputs: draft, scores }, token)`
   c. On success: call `clearAssessmentDraft()`, then navigate to `ExistingFreeScore` with `{ assessmentId: result.id, inputs: draft, scores: computedScores }`
   d. On error: show Alert with the error message

**Why pass inputs + scores in nav params:**
The backend's `POST /assessments` only returns `{ id, created_at, overall_score, message }`. To show all three domain scores on `FreeScoreScreen` immediately without a second API call, pass the locally-computed scores through navigation params.

**AppNavigator changes:**

Add to `AppStackParamList`:
```typescript
ExistingStep1: undefined;
ExistingStep2: undefined;
ExistingStep3: undefined;
ExistingStep4: undefined;
ExistingStep5: undefined;
ExistingFreeScore: { assessmentId: string; inputs: AssessmentInputs; scores: AssessmentScores };
ExistingRoadmap: { assessmentId: string; scores: AssessmentScores };  // Feature 5
```

Update `AssessmentForm` route to navigate to `ExistingStep1` (or update the `AssessmentForm` screen name to `ExistingStep1` — either approach is acceptable; just be consistent).

Register all new screens in the `Stack.Navigator`.

**draftStore changes:**

The `assessmentDraft` already has all 9 input fields plus `business_name` and `industry`. Add `challenge` field:

```typescript
// In AssessmentDraftState:
challenge: string;  // optional text, default ''
```

Add corresponding `setAssessmentDraftField` support (already generic — just adding the field to the interface is sufficient).

**Acceptance Criteria:**
- [ ] All 5 step screens exist under `mobile/src/screens/existing/`
- [ ] Each screen reads from and writes to `useDraftStore().assessmentDraft`
- [ ] `challenge` field added to `AssessmentDraftState` and `draftStore` default
- [ ] `ProgressBar` shows correct current/total on each step screen
- [ ] Back navigation works on all steps (Step 1 back → `navigation.goBack()`)
- [ ] Step 5 calls `computeAssessmentScores` before building payload
- [ ] Step 5 calls `clearAssessmentDraft()` on successful submit
- [ ] Step 5 navigates to `ExistingFreeScore` (not `FreeScore`) with correct params
- [ ] `AppNavigator` updated: new routes registered, old `AssessmentForm` route redirects to `ExistingStep1`
- [ ] TypeScript: no `any` on draft store reads or navigation params (use typed `NativeStackScreenProps` where possible)

---

### Feature 3: Wire Draft Store (included in Feature 2 estimate)

This feature is folded into Feature 2 — the step screens use the draft store directly. No separate work item.

The key implementation note is that draft auto-save happens automatically through Zustand's `persist` middleware — screens only call `setAssessmentDraftField`. There is no need for manual `AsyncStorage.setItem` calls in step screens.

---

### Feature 4: Fix FreeScoreScreen — Client-Side Enrichment

**Est: 3 hrs**

**Read-ahead hints for Wasp:**
Before writing Feature 4, pre-load in parallel:
- `mobile/src/screens/FreeScoreScreen.tsx` — current implementation
- `mobile/src/api/assessments.ts` — updated types from Feature 1
- `mobile/src/utils/scoring.ts` — `computeAssessmentScores`, `level`, `risk` functions

**Context:**
After Feature 2's refactor, `ExistingStep5Screen` navigates to `ExistingFreeScore` with `{ assessmentId, inputs, scores }` params instead of a full `Assessment` object. This means `FreeScoreScreen` must be updated (or a new `ExistingFreeScoreScreen` created) to accept this param shape and build the full enriched data from local computation rather than from the API response.

**Decision:** Create `mobile/src/screens/existing/ExistingFreeScoreScreen.tsx` as the canonical screen for the new path. Keep the original `FreeScoreScreen.tsx` in place (it may be referenced from `AssessmentDetailScreen` or other entry points). Both share the same visual structure.

**ExistingFreeScoreScreen behavior:**

Route params: `{ assessmentId: string; inputs: AssessmentInputs; scores: AssessmentScores }`

On mount:
- Call `computeAssessmentScores(inputs)` to get all level/risk labels
- Display all three dimension cards immediately — no loading state needed (data is local)
- Do NOT make an API call on mount

Display:

```
[ Overall Readiness Card ]
  - overall_score (large ScoreBadge, size="lg")
  - overall_level text
  - overall risk badge (derived from worst of the three risks)

[ Cybersecurity Card ]
  - cyber_score, cyber_level, cyber_risk
  - Action items preview (locked if !isPaid)

[ AI Readiness Card ]
  - ai_score, ai_level, ai_risk
  - Action items preview (locked if !isPaid)

[ Funding Readiness Card ]
  - funding_score, funding_level, funding_risk
  - Action items preview (locked if !isPaid)

[ CTA Section ]
  - If isPaid: "View Full Action Plan" → navigate('ActionPlan', { assessmentId })
  - If !isPaid: upgrade headline + "Upgrade for Full Action Plan" → navigate('Upgrade')
  - Secondary: "Start New Assessment" → navigate('ExistingStep1')
```

`LOCKED_ITEMS` preview text (keep same 3 items as `FreeScoreScreen`):
```
'Detailed security hardening checklist'
'Step-by-step implementation guide'
'Priority action timeline with milestones'
```

**Overall risk derivation:**
```typescript
const overallRisk: 'Low' | 'Moderate' | 'High' =
  [cyberRisk, aiRisk, fundingRisk].includes('High')
    ? 'High'
    : [cyberRisk, aiRisk, fundingRisk].includes('Moderate')
    ? 'Moderate'
    : 'Low';
```

**Acceptance Criteria:**
- [ ] `ExistingFreeScoreScreen.tsx` created under `mobile/src/screens/existing/`
- [ ] Screen receives `{ assessmentId, inputs, scores }` from nav params — no API call on mount
- [ ] All scores, levels, and risk badges display correctly
- [ ] `isPaid` gate controls action item visibility and CTA button
- [ ] "Start New Assessment" navigates to `ExistingStep1`
- [ ] "View Full Action Plan" navigates to `ActionPlan` with correct `assessmentId`
- [ ] No TypeScript errors

---

### Feature 5: 30/60/90 Roadmap Screen

**Est: 8 hrs**

**Read-ahead hints for Wasp:**
Before writing Feature 5, pre-load in parallel:
- `mobile/src/screens/ActionPlanScreen.tsx` — paid-gate pattern, `getActionItems` function
- `mobile/src/api/assessments.ts` — `AssessmentScores` type (Feature 1 output)
- `mobile/src/utils/scoring.ts` — `level`, `risk` functions
- `mobile/src/theme/colors.ts` and `typography.ts` — styling constants
- `app.js` lines 119–143 — roadmap content generation logic to replicate

**Purpose:**
The action plan (`ActionPlanScreen`) shows action items by dimension. This screen adds the **30/60/90-day roadmap** view — a paid feature that gives users a timeline of what to do in the next 30, 60, and 90 days based on their scores.

**Route:** `ExistingRoadmap` with params `{ assessmentId: string; scores: AssessmentScores }`

The screen is accessible from `ActionPlanScreen` (add a "View 30/60/90 Roadmap" button there as part of Feature 6).

**Roadmap content generation:**

Derive all roadmap content locally from `scores`. No API call needed. The logic mirrors `app.js`:

```typescript
// mobile/src/utils/roadmap.ts — NEW FILE

export interface RoadmapPhase {
  label: '30 Days' | '60 Days' | '90 Days';
  headline: string;
  items: string[];
}

export function buildRoadmap(scores: { cyber_score: number; ai_score: number; funding_score: number; overall_score: number }): RoadmapPhase[]
```

**Roadmap logic (replicated from `app.js`):**

```
30 Days:
  Always include:
    "Enable MFA on email, banking, and cloud accounts."
    "Verify that business backups run automatically and test restoring a file."
  If cyber_score < 70: add "Document your top 3 critical workflows."
  If ai_score < 70: add "Choose one repetitive task and automate it this month."
  If funding_score < 70: add "Organize financial documents, licenses, and service descriptions."
  Always include: "Run a baseline assessment and save your score."

60 Days:
  Always include:
    "Automate one high-value workflow (invoicing, follow-up, scheduling)."
    "Standardize cybersecurity practices across all staff accounts."
  If ai_score < 70: add "Create a simple internal AI usage guideline."
  If funding_score < 70: add "Build a reusable grant/funding readiness folder."
  Always include: "Review progress against 30-day actions."

90 Days:
  Always include:
    "Measure results — reassess your readiness score."
    "Expand AI usage into analytics, customer support, or reporting."
  If cyber_score >= 70: add "Schedule a quarterly cybersecurity review."
  If funding_score >= 70: add "Prepare stronger proposals for funding or partnership opportunities."
  If overall_score < 60: add "Engage an SBDC advisor to review your progress plan."
  Always include: "Convert the roadmap into monthly operating goals with assigned owners."
```

**Screen layout:**

```
[ Header with Back button — "30/60/90 Roadmap" ]

[ Business summary card (optional — assessmentId for display only) ]
  - "Based on your assessment" + overall score badge

[ Phase card — 30 Days ]
  - Section header with color accent (cyan)
  - Bulleted action items

[ Phase card — 60 Days ]
  - Section header with color accent (blue)
  - Bulleted action items

[ Phase card — 90 Days ]
  - Section header with color accent (green)
  - Bulleted action items

[ "Download as PDF" button (calls expo-print, same pattern as ActionPlanScreen) ]
```

**PDF HTML template for roadmap:**

The PDF button generates a clean HTML document using `expo-print` (already a project dependency from Sprint 007 work). Mirror the `buildPdfHtml` pattern in `ActionPlanScreen.tsx`:

```typescript
function buildRoadmapPdfHtml(businessName: string, scores: AssessmentScores, phases: RoadmapPhase[]): string
```

**Paid gate:** This screen should only be reachable if `isPaid`. The `ActionPlanScreen` link to this screen is already behind the paid gate. However, add a redundant check in `ExistingRoadmapScreen`:
```typescript
useEffect(() => {
  if (!isPaid) navigation.replace('Upgrade');
}, [isPaid]);
```

**New file:** `mobile/src/utils/roadmap.ts`
**New screen:** `mobile/src/screens/existing/ExistingRoadmapScreen.tsx`

**Acceptance Criteria:**
- [ ] `mobile/src/utils/roadmap.ts` exports `buildRoadmap(scores)` returning `RoadmapPhase[]`
- [ ] Roadmap items match the logic specified above exactly
- [ ] `ExistingRoadmapScreen` renders all 3 phases with correct items for given scores
- [ ] Paid gate redirects unpaid users to `Upgrade` screen
- [ ] PDF export button generates and shares a roadmap PDF using `expo-print` + `expo-sharing`
- [ ] `ExistingRoadmap` route added to `AppStackParamList` and `AppNavigator`
- [ ] Screen is accessible via a button added to `ActionPlanScreen` (Feature 6)

---

### Feature 6: ActionPlanScreen — "View Roadmap" CTA and Polish

**Est: 2 hrs**

**Read-ahead hints for Wasp:**
Before writing Feature 6, pre-load in parallel:
- `mobile/src/screens/ActionPlanScreen.tsx` — full current file
- `mobile/src/navigation/AppNavigator.tsx` — current route list (to confirm `ExistingRoadmap` is registered)

**Changes to `ActionPlanScreen.tsx`:**

1. Add a "View 30/60/90 Roadmap" `Button` (variant `secondary`) below the PDF export button in the scroll view.
   - `onPress`: `navigation.navigate('ExistingRoadmap', { assessmentId, scores: { cyber_score: assessment.cyber_score, ai_score: assessment.ai_score, funding_score: assessment.funding_score, overall_score: assessment.overall_score } })`

2. Update `AssessmentDetailScreen.tsx`: add a "View Roadmap" button alongside the "View Action Plan" button for paid users, navigating to `ExistingRoadmap` with the assessment's scores.

**Acceptance Criteria:**
- [ ] "View 30/60/90 Roadmap" button appears in `ActionPlanScreen` (paid users only — already behind gate)
- [ ] Button correctly passes scores to `ExistingRoadmapScreen` via nav params
- [ ] `AssessmentDetailScreen` shows "View Roadmap" alongside "View Action Plan" for paid users
- [ ] No regressions in `ActionPlanScreen` existing functionality

---

## File Map

### New Files

| File | Purpose |
|------|---------|
| `mobile/src/screens/existing/ExistingStep1Screen.tsx` | Business info step (name, industry, challenge) |
| `mobile/src/screens/existing/ExistingStep2Screen.tsx` | Cybersecurity step (mfa, backups, training) |
| `mobile/src/screens/existing/ExistingStep3Screen.tsx` | AI & digital tools step |
| `mobile/src/screens/existing/ExistingStep4Screen.tsx` | Funding readiness step |
| `mobile/src/screens/existing/ExistingStep5Screen.tsx` | Review & submit step |
| `mobile/src/screens/existing/ExistingFreeScoreScreen.tsx` | Free score results (params-based, no API call) |
| `mobile/src/screens/existing/ExistingRoadmapScreen.tsx` | 30/60/90 roadmap (paid, PDF export) |
| `mobile/src/utils/roadmap.ts` | `buildRoadmap()` utility |

### Modified Files

| File | What Changes |
|------|-------------|
| `mobile/src/api/assessments.ts` | Fully rewritten — new types, nested payload, enrichment functions |
| `mobile/src/store/draftStore.ts` | Add `challenge` field to `AssessmentDraftState` |
| `mobile/src/navigation/AppNavigator.tsx` | Add 7 new routes; update `AssessmentForm` to point to `ExistingStep1` |
| `mobile/src/screens/ActionPlanScreen.tsx` | Add "View Roadmap" button |
| `mobile/src/screens/AssessmentDetailScreen.tsx` | Add "View Roadmap" button for paid users |

### Do Not Touch

| File | Reason |
|------|--------|
| `mobile/src/utils/scoring.ts` | Scoring logic is correct and complete — do not modify |
| `mobile/src/screens/AssessmentFormScreen.tsx` | Keep as-is; just redirect its nav route |
| `mobile/src/screens/FreeScoreScreen.tsx` | Keep as-is; may be used from other entry points |
| `mobile/src/screens/startup/` | Startup path not in scope |
| Backend files | No backend changes needed for this sprint |
| `mobile/src/components/` | Existing components are used as-is |

---

## API Endpoints Used

This sprint is mobile-only. All endpoints already exist in the backend.

| Method | Path | Auth | Used By | Notes |
|--------|------|------|---------|-------|
| `POST` | `/assessments` | Bearer JWT | ExistingStep5Screen | Body: `{ business_name, industry, challenge, inputs: {…}, scores: {…} }`. Returns `{ id, created_at, overall_score, message }` |
| `GET` | `/assessments` | Bearer JWT | HistoryScreen | Returns paginated list with `{ data, meta }`. `meta.has_more` controls pagination |
| `GET` | `/assessments/{id}` | Bearer JWT | ActionPlanScreen, AssessmentDetailScreen | Returns full assessment row (flat) — enriched client-side |

**Backend rate limit:** 10 POSTs per user per hour (in-memory). The form submission may hit this during testing — use distinct test accounts.

**Quota enforcement:** Free users are limited to 3 assessments per month. The backend returns HTTP 429 with `{ error: "quota_exceeded" }` when the limit is hit. `ExistingStep5Screen` must handle this case:

```typescript
} catch (err: any) {
  if (err?.status === 429) {
    Alert.alert(
      'Monthly Limit Reached',
      'You have used your 3 free assessments this month. Upgrade to Pro for unlimited assessments.',
      [{ text: 'Upgrade', onPress: () => navigation.navigate('Upgrade') }, { text: 'Cancel' }]
    );
  } else {
    Alert.alert('Submission Failed', err?.message ?? 'Please try again.');
  }
}
```

---

## Validation Rules

### ExistingStep1Screen

| Field | Rule |
|-------|------|
| `business_name` | Required. Must not be empty after trim. Alert on Next if empty. Max 120 chars (soft — no hard block, just trim). |
| `industry` | Required. Must be one of `INDUSTRY_OPTIONS`. Picker enforces this. |
| `challenge` | Optional. Max 500 chars. No minimum. |

### ExistingStep2–4 Screens

| Field | Rule |
|-------|------|
| `mfa`, `backups`, `training`, `digital_tools`, `automation`, `ai_usage`, `documents`, `online_presence`, `growth_plan` | Integer, values 0, 1, or 2 only. `StepPicker` enforces valid selection. Default is 0. |

### ExistingStep5Screen (submit)

| Check | Action |
|-------|--------|
| `business_name.trim().length === 0` | Alert: "Business name is required. Go back to Step 1." |
| `!token` | Alert: "You must be logged in to submit." Navigate to login if null. |
| Network error | Alert with message from API error |
| HTTP 429 | Alert with upgrade prompt (see above) |
| HTTP 422 | Alert: "Invalid data. Please check your answers and try again." |
| HTTP 503 | Alert: "Service temporarily unavailable. Please try again shortly." |

---

## Offline Draft Behavior

The `useDraftStore` persists to AsyncStorage via `zustand/middleware/persist`. This means:

- Draft survives app close and reopen
- User can close the app mid-assessment and resume exactly where they left off
- On fresh install or after `clearAssessmentDraft()`, all fields reset to defaults
- The draft key in AsyncStorage is `smallbiz-draft` (set in `draftStore.ts`)

**ExistingStep1Screen** should show a "Resume draft?" banner if `assessmentDraft.business_name` is non-empty on mount. This is a "nice to have" — implement if time allows, skip otherwise. The draft is always available even without the banner.

---

## State Machine

No explicit state machine. The step flow is linear:

```
Step1 → Step2 → Step3 → Step4 → Step5 → (submit) → ExistingFreeScore
                                                   ↘ (error) → stays on Step5
```

Back navigation reverses the flow. There is no branching.

---

## Error Catalog

| Scenario | Screen | User Message | Action |
|----------|--------|-------------|--------|
| Empty business name on Next | Step 1 | "Please enter your business name before continuing." | `Alert.alert` — stay on screen |
| No token on submit | Step 5 | "You must be logged in to submit your assessment." | Alert — navigate to login |
| Network error (status 0) | Step 5 | "Network error — check your connection and try again." | Alert — stay on screen |
| HTTP 422 (validation) | Step 5 | "Invalid submission. Please check your answers and try again." | Alert — stay on screen |
| HTTP 429 (rate limit or quota) | Step 5 | "Monthly limit reached. Upgrade to Pro for unlimited assessments." | Alert with Upgrade CTA |
| HTTP 503 (backend down) | Step 5 | "Service temporarily unavailable. Please try again shortly." | Alert — stay on screen |
| `getAssessment` 404 | ActionPlanScreen / AssessmentDetailScreen | "Assessment not found." | Error state with Back button |
| `getAssessment` 503 | Same | "Could not load assessment. Please try again." | Error state with retry |

---

## Auth & Middleware Context

- `token` comes from `useAuthStore().token` — passed as the third argument to every `api.*` call
- `isPaid` comes from `useAuthStore().isPaid` — gates the `ActionPlanScreen` and `ExistingRoadmapScreen`
- `isPaid` is set by the `ProfileScreen` or other billing UI — not set by this sprint
- If `token` is null, `ExistingStep5Screen` should show an error and not attempt the API call
- No changes to auth or billing in this sprint

---

## Functions & Implementation Notes

### `mobile/src/utils/roadmap.ts`

```typescript
export interface RoadmapPhase {
  label: '30 Days' | '60 Days' | '90 Days';
  color: string;         // colors.cyan | colors.blue | colors.green
  headline: string;
  items: string[];
}

export function buildRoadmap(scores: {
  cyber_score: number;
  ai_score: number;
  funding_score: number;
  overall_score: number;
}): RoadmapPhase[]
```

Implementation mirrors `app.js` `road30.textContent`, `road60.textContent`, `road90.textContent` assignments. Return an array of exactly 3 `RoadmapPhase` objects in order: 30, 60, 90.

### `enrichAssessment` in `mobile/src/api/assessments.ts`

```typescript
function enrichAssessment(raw: AssessmentRaw): Assessment {
  const scored = computeAssessmentScores({
    mfa: raw.mfa,
    backups: raw.backups,
    training: raw.training,
    digital_tools: raw.digital_tools,
    automation: raw.automation,
    ai_usage: raw.ai_usage,
    documents: raw.documents,
    online_presence: raw.online_presence,
    growth_plan: raw.growth_plan,
  });
  return {
    ...raw,
    cyber_level: scored.cyberLevel,
    ai_level: scored.aiLevel,
    funding_level: scored.fundingLevel,
    overall_level: scored.overallLevel,
    cyber_risk: scored.cyberRisk,
    ai_risk: scored.aiRisk,
    funding_risk: scored.fundingRisk,
  };
}
```

### `ExistingStep5Screen` submit flow

```typescript
const handleSubmit = async () => {
  if (draft.business_name.trim().length === 0) {
    Alert.alert('Required', 'Business name is required. Go back to Step 1.');
    return;
  }
  if (!token) {
    Alert.alert('Not logged in', 'Please log in to submit your assessment.');
    return;
  }
  setSubmitting(true);
  try {
    const inputs = {
      mfa: draft.mfa, backups: draft.backups, training: draft.training,
      digital_tools: draft.digital_tools, automation: draft.automation, ai_usage: draft.ai_usage,
      documents: draft.documents, online_presence: draft.online_presence, growth_plan: draft.growth_plan,
    };
    const computed = computeAssessmentScores(inputs);
    const scores = {
      cyber_score: computed.cyberScore,
      ai_score: computed.aiScore,
      funding_score: computed.fundingScore,
      overall_score: computed.overallScore,
    };
    const result = await createAssessment({
      business_name: draft.business_name.trim(),
      industry: draft.industry,
      challenge: draft.challenge.trim() || null,
      inputs,
      scores,
    }, token);
    clearAssessmentDraft();
    navigation.navigate('ExistingFreeScore', {
      assessmentId: result.id,
      inputs,
      scores,
    });
  } catch (err: any) {
    if (err?.status === 429) {
      Alert.alert('Monthly Limit Reached', 'Upgrade to Pro for unlimited assessments.',
        [{ text: 'Upgrade', onPress: () => navigation.navigate('Upgrade') }, { text: 'Cancel' }]);
    } else {
      Alert.alert('Submission Failed', err?.message ?? 'Please try again.');
    }
  } finally {
    setSubmitting(false);
  }
};
```

---

## Logging & Observability

This is mobile-only — no backend changes. Logging is out of scope for the mobile client.

For debugging during development:
- `console.warn` on non-fatal API errors (not `console.error` unless it's unexpected)
- Do not log JWT tokens or user PII to console in any scenario

---

## Performance Expectations

| Scenario | Target |
|----------|--------|
| Step screen render | Instant — all data from local draft store |
| Form submission (Step 5) | < 3 seconds on 4G — single POST call |
| `ExistingFreeScoreScreen` render | Instant — all data from nav params |
| `ExistingRoadmapScreen` render | Instant — all data computed from nav params |
| History screen load | < 2 seconds — single GET call |
| PDF generation | < 5 seconds — `expo-print` is synchronous |

---

## Test Requirements

Project stage is `pre-production`. Coverage gates are not enforced. Write tests where they provide high confidence — focus on scoring utilities and API client shape.

### Unit Tests

All tests in `mobile/src/__tests__/` (create directory if needed) or alongside the files.

**`roadmap.test.ts`**
- [ ] `buildRoadmap` with all-zero scores returns correct 30-day items (MFA, backups always present)
- [ ] `buildRoadmap` with `cyber_score >= 70` does NOT include "Document your top 3 workflows" in 30 Days
- [ ] `buildRoadmap` with `ai_score < 70` includes AI quickwin item in 30 Days
- [ ] `buildRoadmap` with `funding_score < 70` includes funding org item in 30 Days
- [ ] `buildRoadmap` with `overall_score < 60` includes SBDC advisor item in 90 Days
- [ ] `buildRoadmap` always returns exactly 3 phases
- [ ] Phase labels are exactly `'30 Days'`, `'60 Days'`, `'90 Days'`

**`assessments.test.ts`**
- [ ] `enrichAssessment` with all-zero inputs returns scores matching `computeAssessmentScores` exactly
- [ ] `enrichAssessment` with mid-range inputs returns correct level/risk labels (spot check: cyber=67 → "Growth-ready foundation", risk "Moderate")
- [ ] `enrichAssessment` with all-max inputs (all 2s) returns `cyber_score: 100`, `cyber_risk: 'Low'`
- [ ] `enrichListItem` returns `overall_level` and `overall_risk` correctly

**`scoring.test.ts`** (verify existing utility — add if not already tested)
- [ ] `pct([0,0,0])` returns 0
- [ ] `pct([2,2,2])` returns 100
- [ ] `pct([1,1,1])` returns 50
- [ ] `computeAssessmentScores` with all 1s: `cyber=50`, `ai=50`, `funding=50`, `overall=50`
- [ ] `computeAssessmentScores` overall formula: `round(cyber*0.38 + ai*0.32 + funding*0.30)`

### Integration / Manual QA Checklist

These are verified by running the app in Expo Go against the staging backend.

- [ ] Complete the 5-step assessment form from scratch — all fields saved after each step
- [ ] Kill the app mid-step, reopen — draft is restored correctly
- [ ] Submit a complete assessment — backend returns 201 and `ExistingFreeScoreScreen` shows all three scores
- [ ] All three domain scores on `ExistingFreeScoreScreen` match what `computeAssessmentScores` would produce from the submitted inputs
- [ ] Tap "Upgrade for Full Action Plan" → navigates to `UpgradeScreen`
- [ ] Log in as a Pro user, submit assessment, tap "View Full Action Plan" → `ActionPlanScreen` loads with correct action items
- [ ] `ActionPlanScreen`: "View 30/60/90 Roadmap" button appears and navigates to `ExistingRoadmapScreen`
- [ ] `ExistingRoadmapScreen` shows all 3 phases with items appropriate to the submitted scores
- [ ] PDF export on `ExistingRoadmapScreen` generates a shareable PDF
- [ ] History tab shows submitted assessment in list
- [ ] Tap history item → `AssessmentDetailScreen` shows correct scores, levels, and risk badges
- [ ] Free user submits 3 assessments — 4th attempt shows quota alert with Upgrade CTA
- [ ] Backend offline during submit → alert shown, user stays on Step 5

---

## Acceptance Criteria

Sprint is complete when all of the following are true:

- [ ] `mobile/src/api/assessments.ts` sends the correct nested `inputs` + `scores` payload to `POST /assessments`
- [ ] All level/risk fields on `Assessment` and `AssessmentSummary` are populated via client-side enrichment (never empty strings in UI)
- [ ] The 5-step existing business form exists in `mobile/src/screens/existing/` with correct draft store wiring
- [ ] `challenge` optional text field is present on Step 1 and included in submission payload
- [ ] `ExistingFreeScoreScreen` renders correctly from nav params (no extra API call on load)
- [ ] `ExistingRoadmapScreen` exists, is gated behind `isPaid`, and renders correct roadmap items
- [ ] PDF export works on `ExistingRoadmapScreen`
- [ ] "View 30/60/90 Roadmap" button added to `ActionPlanScreen`
- [ ] `AppNavigator` updated with all new routes; no unregistered screens
- [ ] TypeScript: `npx tsc --noEmit` passes with no errors in `mobile/`
- [ ] Unit tests for `roadmap.ts` and `assessments.ts` enrichment pass

---

## Assumptions & Open Questions

| # | Assumption / Question | Status |
|---|-----------------------|--------|
| 1 | The backend's `POST /assessments` does NOT return computed `cyber_level` / `ai_level` / `funding_level` / risk labels — client must derive them. | Confirmed by reading `assessments.py` — backend stores flat scores only. |
| 2 | `expo-print` and `expo-sharing` are already project dependencies (used in `ActionPlanScreen`). | Confirmed by reading `ActionPlanScreen.tsx` imports. |
| 3 | The `isPaid` flag in `authStore` is set elsewhere (billing/profile flow) and does not need to be set by this sprint. | Assumed. If `isPaid` is never set to `true` in the current codebase, Wasp should add a temporary dev override (e.g., long-press on ProfileScreen) for testing. |
| 4 | Industry options in the mobile form should match the web tool exactly. The web uses: `restaurant, barber, nonprofit, contractor, online, consultant, retail`. The mobile currently uses: `Retail, Healthcare, Finance, Technology, Education, Construction, Other`. | **Open question for product.** This sprint will keep the existing mobile list and not change it — aligning the two lists is a follow-up task. |
| 5 | The `listAssessments` backend response wraps data in `{ data: [], meta: {} }` — confirmed by reading `assessments.py`. The current mobile API client does not handle this wrapping. Feature 1 must fix `listAssessments` to unwrap the paginated response. | Confirmed — must fix. |
| 6 | `ExistingRoadmapScreen` nav params include `scores` as a plain object (not a full `Assessment`). This is intentional — the screen derives all content from scores alone. | Assumed — see feature spec. |

---

## Notes for AI Agents (Wasp)

- Execute features in the order listed: Feature 1 → Feature 2 (includes 3) → Feature 4 → Feature 5 → Feature 6
- Feature 1 must be complete before Feature 2 — the new `AssessmentCreatePayload` and `AssessmentInputs` types are imported by the step screens
- Feature 5 must be complete before Feature 6 — the `ExistingRoadmap` route must exist in `AppNavigator` before `ActionPlanScreen` can navigate to it
- When building step screens (`ExistingStep1–5`), mirror the structure of `StartupStep1Screen.tsx` — same header layout, same ProgressBar usage, same Back/Next button row at bottom
- Use `computeAssessmentScores` from `mobile/src/utils/scoring.ts` — never recompute scores inline
- Use `useDraftStore` — never local `useState` for form field values in step screens
- The `challenge` field maps to `challenge` in the backend payload (not `primary_challenge`)
- The `listAssessments` fix: the backend returns `{ data: AssessmentListItem[], meta: { total, limit, offset, has_more } }` — the mobile client must unwrap this; `HistoryScreen` currently expects a flat `AssessmentSummary[]` and will need updating to handle pagination or be simplified to just read `result.data`
- When modifying `AppNavigator.tsx`, do not remove any existing routes — only add new ones and update the `AssessmentForm` route target
- After completing each feature, run `npx tsc --noEmit` in the `mobile/` directory and fix any type errors before moving to the next feature
- Do not modify any file under `mobile/src/screens/startup/` — that path is out of scope

### Read-Ahead Dispatch (before starting the sprint)

Dispatch these reads in parallel before writing any code:

1. `mobile/src/api/assessments.ts` — current types and function signatures
2. `mobile/src/store/draftStore.ts` — `AssessmentDraftState` interface
3. `mobile/src/navigation/AppNavigator.tsx` — `AppStackParamList` type and registered routes
4. `mobile/src/screens/AssessmentFormScreen.tsx` — current form to understand what's being refactored
5. `mobile/src/utils/scoring.ts` — `computeAssessmentScores` signature and return type
6. `mobile/src/screens/startup/StartupStep1Screen.tsx` — step screen pattern to mirror

---

## Agent Hints

| Signal | Value | Agents |
|--------|-------|--------|
| Builder | Wasp | Route to Wasp sprint builder |
| External dependencies | FastAPI backend (`POST /assessments`, `GET /assessments`, `GET /assessments/{id}`) | Test against staging backend |
| Auth-critical | Yes — all API calls require Bearer JWT | Wasp: verify token is always passed |
| No backend changes | True — mobile-only sprint | No backend files should be modified |
| Draft persistence | AsyncStorage via Zustand persist | Wasp: use `useDraftStore`, not local `AsyncStorage.setItem` |
| Scoring parity | Must match `app.js` formulas exactly | `computeAssessmentScores` already implements this — do not inline |
| TypeScript strict | `npx tsc --noEmit` must pass | Fix all type errors before moving to next feature |
| Test focus | `roadmap.ts` utility + `assessments.ts` enrichment | Unit tests only — no UI test framework needed |

---

## Wasp Invocation

```
Use wasp. Build from sprint spec docs/specs/SPRINT-005-existing-business.md
```

## Post-Sprint Reviews

After Wasp completes, run:

```
Use friday. Full review of feature/sprint-005-existing-business.
Use hawkeye. Security scan of feature/sprint-005-existing-business.
```

# SPRINT-002: AI Advisor — Provider-Agnostic Advice Engine with Streaming

## Sprint Meta

| Field | Value |
|-------|-------|
| Sprint ID | SPRINT-002 |
| Sprint Type | New features — AI backend layer + streaming frontend integration |
| Total Estimated Hours | 37 hrs |
| Features | 4 |
| Branch | feature/sprint-002-ai-advisor |
| Depends On | SPRINT-001 (backend scaffold, auth, assessments table must exist) |
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

Inherits all patterns from SPRINT-001. Additional patterns for AI/streaming:

### AI Provider Abstraction
- **Pattern:** Strategy pattern via Python ABC (`AIProvider` base class) — each provider implements `stream_completion(prompt, context) -> AsyncIterator[str]`
- **Provider selection:** `AI_PROVIDER` env var (`anthropic` | `openai` | `groq` | `ollama`) — default `anthropic`
- **Model selection:** Per-provider env var (`ANTHROPIC_MODEL`, `OPENAI_MODEL`, etc.) — never hardcode model names
- **Prompt construction:** Centralized in `backend/prompts.py` — never inline prompts in route handlers
- **Streaming:** All AI endpoints use Server-Sent Events (SSE) — `text/event-stream` content type. Never buffer full response before sending.
- **Fallback:** If AI provider is unavailable or returns an error, the endpoint returns the static template text from `app.js` as a non-streaming fallback

### Frontend Streaming Pattern
- **SSE reader:** `EventSource` API for GET endpoints; `fetch` with `ReadableStream` for POST endpoints that require a request body (SSE + POST requires fetch-based reader)
- **Render pattern:** Append chunks to a DOM element's `textContent` as they arrive — do not rebuild the entire DOM on each chunk
- **Loading state:** Show a "typing indicator" (animated dots) while stream is open; remove when `[DONE]` sentinel is received

---

## Sprint Overview

This sprint adds a provider-agnostic AI advice engine to the backend and integrates streaming responses into the frontend. A logged-in user who completes an assessment can request personalized AI-generated advice for each dimension (Cyber, AI readiness, Funding) and a full personalized executive summary.

**What does NOT change in Sprint 2:**
- The static recommendations (`recommendations` array in `app.js`) remain as the default for anonymous users and as fallback for logged-in users when AI is unavailable
- Scoring logic is unchanged
- Billing/tier enforcement is NOT implemented yet — all logged-in users get unlimited AI advisor access in Sprint 2

**What gets unlocked by Sprint 2:**
- Logged-in users see an "AI Advisor" button after generating results
- Clicking it streams a personalized action plan for each score dimension
- The 30/60/90-day roadmap section can be regenerated with AI narrative
- A "Generate AI Executive Summary" button replaces the static summary for logged-in users

---

## Feature Sequence

| # | Feature | Source | Est Hours | Packages | Migration? |
|---|---------|--------|-----------|----------|------------|
| 1 | AI provider adapter + prompts layer | New | 8 hrs | `backend/ai/`, `backend/prompts.py` | No |
| 2 | AI advice API endpoint (streaming SSE) | New | 10 hrs | `backend/routers/ai.py` | Yes (advice_cache) |
| 3 | Frontend streaming integration | New | 10 hrs | `app.js`, `index.html`, `styles.css` | No |
| 4 | Personalized roadmap + executive summary | New | 9 hrs | `backend/routers/ai.py`, `app.js` | No |

---

## Feature Specs

---

### Feature 1: AI Provider Adapter + Prompts Layer

**Read-ahead hints for Wasp:**
Before writing Feature 1, pre-load in parallel:
- `backend/config.py` — add AI provider env vars to `Settings`
- SPRINT-001 assessments schema — prompts reference score field names

**Estimated hours:** 8 hrs

**Migration:** No

#### File Map

**New files:**
- `backend/ai/__init__.py`
- `backend/ai/base.py` — `AIProvider` ABC
- `backend/ai/anthropic_provider.py` — Anthropic Claude adapter
- `backend/ai/openai_provider.py` — OpenAI adapter
- `backend/ai/groq_provider.py` — Groq adapter
- `backend/ai/ollama_provider.py` — Ollama (local) adapter
- `backend/ai/factory.py` — `get_ai_provider()` factory function
- `backend/prompts.py` — all prompt templates, no business logic

**Modified files:**
- `backend/config.py` — add AI provider settings
- `backend/requirements.txt` — add `anthropic`, `openai`, `groq`

#### Environment Variables (additions to `.env.example`)

```
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-haiku-20241022
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.1-8b-instant
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
AI_MAX_TOKENS=1024
AI_TEMPERATURE=0.7
```

#### Function Signatures

```python
# backend/ai/base.py
from abc import ABC, abstractmethod
from typing import AsyncIterator

class AIProvider(ABC):
    @abstractmethod
    async def stream_completion(
        self,
        system_prompt: str,
        user_message: str,
        max_tokens: int = 1024,
        temperature: float = 0.7,
    ) -> AsyncIterator[str]:
        """
        Streams text chunks from the AI provider.
        Each yielded string is a raw text delta (not JSON-wrapped).
        Yields an empty string at end of stream.
        Never raises — returns error text as a final chunk if provider fails.
        """
        ...

    @abstractmethod
    async def health_check(self) -> bool:
        """Returns True if the provider API is reachable."""
        ...

# backend/ai/factory.py
from backend.ai.base import AIProvider

def get_ai_provider() -> AIProvider:
    """
    Reads AI_PROVIDER env var and returns the appropriate provider instance.
    Valid values: 'anthropic', 'openai', 'groq', 'ollama'
    Defaults to 'anthropic' if not set.
    Raises ValueError for unknown provider names.
    """
    ...

# backend/prompts.py
from dataclasses import dataclass

@dataclass
class AssessmentContext:
    business_name: str
    industry: str
    challenge: str
    cyber_score: int
    ai_score: int
    funding_score: int
    overall_score: int
    maturity_level: str  # "Advanced readiness" | "Growth-ready foundation" | etc.

def build_cyber_advice_prompt(ctx: AssessmentContext) -> tuple[str, str]:
    """Returns (system_prompt, user_message) for cybersecurity dimension advice."""
    ...

def build_ai_readiness_advice_prompt(ctx: AssessmentContext) -> tuple[str, str]:
    """Returns (system_prompt, user_message) for AI readiness dimension advice."""
    ...

def build_funding_advice_prompt(ctx: AssessmentContext) -> tuple[str, str]:
    """Returns (system_prompt, user_message) for funding readiness dimension advice."""
    ...

def build_executive_summary_prompt(ctx: AssessmentContext) -> tuple[str, str]:
    """Returns (system_prompt, user_message) for full executive summary."""
    ...

def build_roadmap_prompt(ctx: AssessmentContext) -> tuple[str, str]:
    """Returns (system_prompt, user_message) for 30/60/90-day personalized roadmap."""
    ...
```

#### Prompt Design Guidelines

All prompts in `backend/prompts.py` MUST follow these constraints:

1. **System prompt** establishes the AI as a practical small business advisor — NOT a cybersecurity consultant or tech vendor. Tone: direct, actionable, jargon-free.
2. **User message** includes all score values and the business's primary challenge verbatim.
3. **Output format:** Plain text with short paragraphs and 3–5 numbered action items per dimension. No markdown headers in output (the frontend will render as plain text).
4. **Length target:** 200–350 words per dimension. Executive summary: 150–250 words.
5. **Industry sensitivity:** Every prompt includes the industry type — advice for a nonprofit should reference grant cycles; advice for a restaurant should reference POS security.

Example system prompt skeleton:
```
You are a practical small business readiness advisor helping entrepreneurs in the {industry} industry.
Your advice is direct, non-technical, and focused on what the business owner can do this week.
Do not recommend paid enterprise tools. Focus on low-cost or free first steps.
Format: 2–3 sentence context paragraph, then a numbered list of 3–5 specific actions.
Maximum length: 300 words.
```

#### `requirements.txt` additions

```
anthropic==0.34.2
openai==1.40.0
groq==0.9.0
```

#### Acceptance Criteria — Feature 1

- [ ] `get_ai_provider()` returns correct provider for each `AI_PROVIDER` value
- [ ] `get_ai_provider()` raises `ValueError` for unknown provider
- [ ] Each provider's `health_check()` returns True when API key is valid
- [ ] `stream_completion()` yields text chunks for a simple test prompt (live API call in integration test)
- [ ] Anthropic provider handles rate limit (429) by yielding an error message, not raising
- [ ] OpenAI provider handles rate limit the same way
- [ ] All 5 prompt builders return non-empty (system_prompt, user_message) tuples
- [ ] Prompts include business name, industry, and scores

---

### Feature 2: AI Advice API Endpoint (Streaming SSE)

**Read-ahead hints for Wasp:**
Before writing Feature 2, pre-load in parallel:
- Feature 1 output: `backend/ai/factory.py`, `backend/prompts.py`
- `backend/dependencies.py` — `get_current_user` pattern
- Assessments table schema from SPRINT-001

**Estimated hours:** 10 hrs

**Migration:** Yes — `advice_cache` table

#### Database Schema

**Table: `advice_cache`**

Caches AI-generated advice to avoid re-generating identical inputs (reduces API costs). Cache key = hash of assessment_id + dimension.

```sql
CREATE TABLE public.advice_cache (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assessment_id   UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
    dimension       TEXT NOT NULL CHECK (dimension IN ('cyber', 'ai', 'funding', 'executive_summary', 'roadmap')),
    provider        TEXT NOT NULL,   -- which AI provider generated this
    model           TEXT NOT NULL,   -- which model was used
    content         TEXT NOT NULL,   -- full generated text
    prompt_hash     TEXT NOT NULL,   -- SHA-256 of (assessment_id || dimension) for cache lookup
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (assessment_id, dimension)
);

ALTER TABLE public.advice_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their advice cache"
    ON public.advice_cache FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_advice_cache_lookup ON public.advice_cache(assessment_id, dimension);
```

**Migration file:** `supabase/migrations/20260617140000_create_advice_cache.sql`

#### API Endpoints

| Method | Path | Auth Required | Description |
|--------|------|--------------|-------------|
| GET | `/ai/advice/{assessment_id}/{dimension}` | Yes | Stream AI advice for a specific dimension |
| GET | `/ai/advice/{assessment_id}/executive_summary` | Yes | Stream full executive summary |
| GET | `/ai/advice/{assessment_id}/roadmap` | Yes | Stream personalized 30/60/90-day roadmap |
| GET | `/ai/health` | No | Check AI provider availability |

**GET `/ai/advice/{assessment_id}/{dimension}`**

Path params:
- `assessment_id` — UUID of a saved assessment (must belong to current user)
- `dimension` — one of: `cyber` | `ai` | `funding` | `executive_summary` | `roadmap`

Response: `Content-Type: text/event-stream`

SSE format:
```
data: This is the first chunk of advice text\n\n
data: This is the second chunk\n\n
data: [DONE]\n\n
```

On cache hit (assessment already has advice for this dimension): streams the cached content immediately (not from AI), appending `[CACHED]` after `[DONE]` so the frontend can optionally display "Cached result".

Errors (returned as SSE error events, not HTTP error codes):
```
event: error
data: {"code": "assessment_not_found", "message": "Assessment not found."}\n\n
```

HTTP-level errors (before streaming begins):
- `401` — unauthenticated
- `404` — assessment not found or cross-user

**GET `/ai/health`**

Response (200):
```json
{
  "provider": "anthropic",
  "model": "claude-3-5-haiku-20241022",
  "available": true,
  "latency_ms": 245
}
```

#### Function Signatures

```python
# backend/routers/ai.py

from fastapi import APIRouter, Depends, HTTPException, Path
from fastapi.responses import StreamingResponse
from uuid import UUID

router = APIRouter(prefix="/ai", tags=["ai"])

Dimension = Literal['cyber', 'ai', 'funding', 'executive_summary', 'roadmap']

@router.get("/advice/{assessment_id}/{dimension}")
async def stream_advice(
    assessment_id: UUID = Path(...),
    dimension: Dimension = Path(...),
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
    ai: AIProvider = Depends(get_ai_provider),
) -> StreamingResponse:
    """
    Streams AI-generated advice for the given assessment and dimension.
    Checks advice_cache first. If cache hit, streams cached content.
    If cache miss, streams from AI provider and stores result in cache.
    Returns StreamingResponse with content_type="text/event-stream".
    """
    ...

async def _fetch_and_validate_assessment(
    assessment_id: UUID,
    user_id: str,
    supabase: Client
) -> dict:
    """
    Loads assessment from DB. Raises HTTP 404 if not found or user mismatch.
    Returns assessment dict.
    """
    ...

async def _generate_and_cache_advice(
    assessment: dict,
    dimension: str,
    user_id: str,
    supabase: Client,
    ai: AIProvider,
) -> AsyncIterator[str]:
    """
    Builds prompt, streams from AI, stores full result in advice_cache.
    Yields SSE-formatted chunks.
    Final yield: 'data: [DONE]\n\n'
    """
    ...

async def _stream_cached_advice(cached_content: str) -> AsyncIterator[str]:
    """
    Splits cached content into ~50-char chunks for streaming simulation.
    Yields SSE-formatted chunks.
    Final yield: 'data: [DONE]\n\ndata: [CACHED]\n\n'
    """
    ...

@router.get("/health")
async def ai_health(ai: AIProvider = Depends(get_ai_provider)) -> dict:
    """Returns AI provider health status and latency."""
    ...
```

#### Rate Limiting (AI Endpoints)

AI endpoints have stricter rate limits than assessment save:
- **Free tier (Sprint 2):** 20 AI advice requests per user per 24 hours
- **Enforcement:** In-memory counter keyed by user_id (Redis in Sprint 3)
- **Response on limit:** HTTP 429 BEFORE streaming begins (not mid-stream)

#### Acceptance Criteria — Feature 2

- [ ] Streaming SSE works end-to-end for all 5 dimensions
- [ ] Cache hit streams cached content (test: call endpoint twice for same assessment)
- [ ] Cache miss stores result in `advice_cache` table
- [ ] Cross-user assessment returns 404 (before stream starts)
- [ ] `[DONE]` sentinel is always the final SSE event
- [ ] `[CACHED]` appears after `[DONE]` when serving cached content
- [ ] Rate limit returns 429 before streaming begins (not mid-stream)
- [ ] `/ai/health` returns provider name, model, and available status
- [ ] AI provider unreachable → error SSE event sent, not 500
- [ ] Ollama provider works with local instance (integration test skipped in CI if OLLAMA not available)

---

### Feature 3: Frontend Streaming Integration

**Read-ahead hints for Wasp:**
Before writing Feature 3, pre-load in parallel:
- `index.html` — results section structure (lines 134–360) — identify where AI advisor panels insert
- `app.js` — `renderResults()` function — understand hook point for triggering AI advisor
- `styles.css` — existing panel and mini-card patterns to extend for AI advisor UI

**Estimated hours:** 10 hrs

**Migration:** No

#### File Map

**Modified files:**
- `index.html` — add "AI Advisor" button + streaming output panels to results section
- `app.js` — add `requestAIAdvice()`, `streamToElement()`, `showTypingIndicator()`, `hideTypingIndicator()`
- `styles.css` — add streaming UI styles (typing indicator, AI advice panel, cached badge)

**New files:** None (all additions go into existing files)

#### New HTML in `index.html` (insert into `<section id="results">` after the `<div class="panel action-center">` block)

```html
<div class="panel ai-advisor-panel" id="aiAdvisorPanel" style="display:none">
  <div class="ai-advisor-header">
    <h3>AI Advisor — Personalized Action Plan</h3>
    <p class="muted">Powered by <span id="aiProviderLabel">AI</span>. Personalized to your business and scores.</p>
  </div>

  <div class="ai-dimensions">
    <div class="ai-dimension-card" id="aiCyberCard">
      <div class="ai-dimension-header">
        <h4>Cybersecurity Advice</h4>
        <button class="button secondary small" onclick="requestAIAdvice('cyber')">Generate</button>
      </div>
      <div id="aiCyberOutput" class="ai-output"></div>
    </div>

    <div class="ai-dimension-card" id="aiReadinessCard">
      <div class="ai-dimension-header">
        <h4>AI Readiness Advice</h4>
        <button class="button secondary small" onclick="requestAIAdvice('ai')">Generate</button>
      </div>
      <div id="aiReadinessOutput" class="ai-output"></div>
    </div>

    <div class="ai-dimension-card" id="aiFundingCard">
      <div class="ai-dimension-header">
        <h4>Funding Readiness Advice</h4>
        <button class="button secondary small" onclick="requestAIAdvice('funding')">Generate</button>
      </div>
      <div id="aiFundingOutput" class="ai-output"></div>
    </div>
  </div>

  <div class="ai-full-row">
    <button class="button primary" onclick="requestAIAdvice('roadmap')">Generate AI Roadmap</button>
    <button class="button secondary" onclick="requestAIAdvice('executive_summary')">AI Executive Summary</button>
  </div>
  <div id="aiRoadmapOutput" class="ai-output full-width"></div>
  <div id="aiSummaryOutput" class="ai-output full-width"></div>
</div>
```

**AI Advisor button in results section header** (add after `<h2>Dashboard Results</h2>`):
```html
<div id="aiAdvisorTrigger" style="display:none">
  <button class="button primary" onclick="showAIAdvisor()">
    Get AI-Powered Advice
  </button>
  <p class="muted" style="margin-top:8px">Personalized recommendations for your specific scores and business.</p>
</div>
```

#### New Functions in `app.js`

```javascript
// Show AI advisor panel — only when logged in and assessment is saved
function showAIAdvisor() {
    const panel = document.getElementById('aiAdvisorPanel');
    panel.style.display = 'block';
    panel.scrollIntoView({ behavior: 'smooth' });
}

// Core streaming function — reads SSE chunks and writes to a DOM element
async function streamToElement(url, elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = '';
    showTypingIndicator(elementId);

    try {
        const token = Auth?.getToken();
        const response = await fetch(url, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (!response.ok) {
            el.textContent = 'Unable to generate advice. Please try again.';
            hideTypingIndicator(elementId);
            return;
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop(); // keep incomplete line in buffer
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const chunk = line.slice(6);
                    if (chunk === '[DONE]' || chunk === '[CACHED]') continue;
                    if (line.startsWith('event: error')) continue;
                    el.textContent += chunk;
                }
            }
        }
    } catch (err) {
        el.textContent = 'Connection error. Please check your connection and try again.';
        console.error('Stream error:', err);
    }
    hideTypingIndicator(elementId);
}

// Requests AI advice for a given dimension using the saved assessment ID
async function requestAIAdvice(dimension) {
    const assessmentId = window._lastSavedAssessmentId;
    if (!assessmentId) {
        alert('Save the assessment first by logging in, then request AI advice.');
        return;
    }
    const outputIds = {
        cyber: 'aiCyberOutput',
        ai: 'aiReadinessOutput',
        funding: 'aiFundingOutput',
        roadmap: 'aiRoadmapOutput',
        executive_summary: 'aiSummaryOutput'
    };
    const outputId = outputIds[dimension];
    if (!outputId) return;
    const apiBase = window.ADVISOR_API_URL || 'http://localhost:8000';
    await streamToElement(`${apiBase}/ai/advice/${assessmentId}/${dimension}`, outputId);
}

function showTypingIndicator(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.innerHTML = '<span class="typing-indicator"><span></span><span></span><span></span></span>';
}

function hideTypingIndicator(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const indicator = el.querySelector('.typing-indicator');
    if (indicator) indicator.remove();
}
```

**In `renderResults()` — add after `saveAssessmentToCloud()` call:**
```javascript
// Show AI advisor trigger button for logged-in users with a saved assessment
if (Auth?.isLoggedIn()) {
    document.getElementById('aiAdvisorTrigger').style.display = 'block';
}
```

#### New CSS (append to `styles.css`)

```css
/* AI Advisor Panel */
.ai-advisor-panel { margin-top: 18px; }
.ai-advisor-header { margin-bottom: 18px; }
.ai-dimensions { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; margin-bottom: 18px; }
.ai-dimension-card { background: var(--panel2); border: 1px solid var(--border); border-radius: 18px; padding: 18px; }
.ai-dimension-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.ai-dimension-header h4 { margin: 0; }
.button.small { padding: 8px 14px; font-size: 13px; }
.ai-output { color: var(--text); line-height: 1.65; font-size: 14px; white-space: pre-wrap; min-height: 48px; }
.ai-output.full-width { margin-top: 12px; }
.ai-full-row { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 8px; }

/* Typing indicator */
.typing-indicator { display: inline-flex; gap: 4px; align-items: center; padding: 4px 0; }
.typing-indicator span { width: 6px; height: 6px; border-radius: 50%; background: var(--cyan); animation: typing-bounce 1s infinite; }
.typing-indicator span:nth-child(2) { animation-delay: 0.15s; }
.typing-indicator span:nth-child(3) { animation-delay: 0.3s; }
@keyframes typing-bounce { 0%, 80%, 100% { transform: scale(0); opacity: .5; } 40% { transform: scale(1); opacity: 1; } }
```

#### Acceptance Criteria — Feature 3

- [ ] "Get AI-Powered Advice" button appears in results section only when user is logged in AND assessment was saved
- [ ] AI Advisor panel is hidden by default, shown on button click
- [ ] Clicking "Generate" for a dimension streams text into the correct output element
- [ ] Typing indicator (animated dots) shows while stream is open, disappears on [DONE]
- [ ] Text accumulates correctly — no duplicate chunks or missing characters
- [ ] Anonymous users do not see the AI advisor trigger button or panel
- [ ] SSE error event shows "Unable to generate advice" message, not a blank panel
- [ ] Connection error shows "Connection error" message, not a blank panel
- [ ] Generate buttons can be clicked multiple times (re-generates, clears previous output)

---

### Feature 4: Personalized Roadmap + Executive Summary

**Read-ahead hints for Wasp:**
Before writing Feature 4, pre-load in parallel:
- Feature 2 output: `backend/routers/ai.py` — `_generate_and_cache_advice` and `_fetch_and_validate_assessment` helpers are already built; reuse them
- `app.js` lines 128–135 — existing static roadmap (`road30`, `road60`, `road90`) and executiveSummary elements
- `backend/prompts.py` — `build_roadmap_prompt` and `build_executive_summary_prompt` are already built in Feature 1

**Estimated hours:** 9 hrs

**Migration:** No (reuses `advice_cache` with `dimension = 'roadmap'` and `dimension = 'executive_summary'`)

#### Behavior

**Roadmap:** When a logged-in user clicks "Generate AI Roadmap", the streaming content replaces the static text in the existing `<p id="road30">`, `<p id="road60">`, `<p id="road90">` elements AND streams into `#aiRoadmapOutput`. The roadmap prompt asks the AI to return content clearly labeled "30 Days:", "60 Days:", "90 Days:" — the frontend parser splits on these labels.

**Executive Summary:** When a logged-in user clicks "AI Executive Summary", the content streams into `#aiSummaryOutput` AND replaces `executiveSummary.textContent`. The static summary is preserved as `data-static-summary` attribute on the element for fallback.

#### Roadmap SSE Parser (in `app.js`)

```javascript
async function streamRoadmapToElements(assessmentId) {
    const apiBase = window.ADVISOR_API_URL || 'http://localhost:8000';
    const url = `${apiBase}/ai/advice/${assessmentId}/roadmap`;
    const token = Auth?.getToken();
    const response = await fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    // Show typing indicators on all three roadmap sections
    ['road30','road60','road90'].forEach(id => showTypingIndicator(id));

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
            if (line.startsWith('data: ') && line.slice(6) !== '[DONE]' && line.slice(6) !== '[CACHED]') {
                fullText += line.slice(6);
            }
        }
    }

    // Parse labeled sections
    const sections = { '30 Days': 'road30', '60 Days': 'road60', '90 Days': 'road90' };
    for (const [label, id] of Object.entries(sections)) {
        const regex = new RegExp(`${label}:([^]*?)(?=30 Days:|60 Days:|90 Days:|$)`);
        const match = fullText.match(regex);
        hideTypingIndicator(id);
        if (match) document.getElementById(id).textContent = match[1].trim();
    }
}
```

#### Prompt Design for Roadmap (`backend/prompts.py`)

The roadmap prompt MUST ask the AI to return content in this exact format to support the parser above:

```
System: You are a practical small business advisor. Return a 30/60/90-day action plan.
Format your response EXACTLY as:
30 Days: [2-3 specific actions for this business]
60 Days: [2-3 specific actions building on 30-day results]
90 Days: [2-3 specific actions for longer-term growth]
Keep each section to 1-2 sentences. Focus on the business's lowest scores first.

User: Business: {business_name}, Industry: {industry}
Challenge: {challenge}
Scores — Cyber: {cyber_score}%, AI Readiness: {ai_score}%, Funding: {funding_score}%, Overall: {overall_score}%
Maturity: {maturity_level}
```

#### Acceptance Criteria — Feature 4

- [ ] "Generate AI Roadmap" button streams content into `#aiRoadmapOutput`
- [ ] Roadmap content also populates `#road30`, `#road60`, `#road90` elements
- [ ] Static roadmap text is preserved as fallback (shown until AI roadmap is generated)
- [ ] "AI Executive Summary" button streams into `#aiSummaryOutput`
- [ ] Executive summary also replaces `executiveSummary.textContent`
- [ ] Anonymous users see static roadmap and summary (no regression)
- [ ] Cached roadmap/summary loads instantly (streaming simulation from cache)
- [ ] Roadmap parser handles missing sections gracefully (falls back to static)

---

## Error Catalog (Sprint 2 additions)

| Scenario | HTTP Status | Error Code | User Message | Log Level |
|----------|-------------|-----------|--------------|-----------|
| AI provider unavailable | SSE error event | `ai_provider_unavailable` | "AI advice is temporarily unavailable. Showing standard recommendations." | WARN |
| AI rate limit exceeded | 429 (before stream) | `ai_rate_limit` | "Daily AI advice limit reached. Resets at midnight." | INFO |
| Assessment has no saved scores | 422 | `assessment_incomplete` | "This assessment does not have complete scores." | WARN |
| Cache write failure | — (silent) | — | No user message — advice still streams; cache miss is logged | ERROR |
| Prompt build failure | SSE error event | `prompt_build_failed` | "Unable to generate advice for this assessment." | ERROR |

---

## Test Requirements — Sprint 2

### Backend Unit Tests

**Feature 1 — AI Provider Adapter**
- [ ] `test_factory_returns_anthropic_provider` — AI_PROVIDER=anthropic
- [ ] `test_factory_returns_openai_provider` — AI_PROVIDER=openai
- [ ] `test_factory_returns_groq_provider` — AI_PROVIDER=groq
- [ ] `test_factory_returns_ollama_provider` — AI_PROVIDER=ollama
- [ ] `test_factory_raises_for_unknown_provider`
- [ ] `test_anthropic_provider_health_check_success` (mocked API call)
- [ ] `test_anthropic_provider_handles_rate_limit` (mock 429 → error chunk yielded)
- [ ] `test_prompt_builder_cyber_includes_scores`
- [ ] `test_prompt_builder_includes_industry`
- [ ] `test_prompt_builder_all_five_dimensions_return_nonempty`

**Feature 2 — AI Endpoint**
- [ ] `test_stream_advice_cyber_new_assessment` — verifies SSE format, [DONE] sentinel
- [ ] `test_stream_advice_cache_hit` — second call returns [CACHED]
- [ ] `test_stream_advice_cross_user_assessment` — 404 before stream
- [ ] `test_stream_advice_rate_limited` — 429 after 20 requests/24h
- [ ] `test_ai_health_returns_provider_info`
- [ ] `test_cache_write_on_stream_completion` — advice_cache row created
- [ ] `test_cache_hit_skips_ai_provider_call` (mock AI provider — confirm it's not called on cache hit)

**Feature 3 & 4 — Frontend (manual QA)**
- [ ] Typing indicator appears and disappears correctly per dimension
- [ ] Text streams smoothly without visible gaps
- [ ] Generate button can be clicked twice — second call replaces first output
- [ ] Roadmap AI output fills correct HTML elements (road30, road60, road90)
- [ ] AI executive summary replaces static summary text
- [ ] Anonymous user: no AI advisor panel visible, no JS errors

---

## Rollback & Safety

- **AI provider switch:** Change `AI_PROVIDER` env var to switch providers without code changes. No deployment needed.
- **AI advisor disable:** Remove the `#aiAdvisorTrigger` display line from `renderResults()` to disable the feature without removing code.
- **Cache bypass:** Delete rows from `advice_cache` to force re-generation.
- **Rate limit reset:** In-memory counter — restart backend service to reset. Acceptable for pre-production.

---

## Key Decisions

- **sse-over-websocket**: Server-Sent Events (SSE) chosen over WebSockets for AI streaming. — **Why**: SSE is unidirectional server-to-client, matches the use case perfectly, works over standard HTTP with no upgrade handshake, and is supported by plain `fetch` with `ReadableStream`. WebSockets would add complexity (connection management, reconnection logic) for no benefit here. — **Alternatives considered**: WebSockets (rejected — bidirectional not needed); long-polling (rejected — poor UX for streaming).
- **provider-agnostic-by-env-var**: AI provider selection via `AI_PROVIDER` env var, not config file or database. — **Why**: Allows instant provider switch on Railway without code deployment; supports local development with Ollama (no API costs); enables A/B testing by deploying two Railway instances with different providers. — **Alternatives considered**: Config file (less flexible for cloud deployment); database-driven (overkill — provider is infrastructure, not user data).
- **advice-cache-by-dimension**: Cache AI advice at the `(assessment_id, dimension)` level, not at the full assessment level. — **Why**: Users may want to regenerate one dimension (e.g., cyber) after making changes, without re-generating all five. Fine-grained cache allows selective regeneration. — **Alternatives considered**: Cache full assessment advice as one blob (cheaper storage, but cannot regenerate selectively); no cache (API cost concern for pre-production scaling).
- **prompts-in-separate-module**: All prompts centralized in `backend/prompts.py`, never inline in route handlers. — **Why**: Prompts will be iterated frequently based on output quality. Centralizing them makes iteration fast (change one file, no handler changes needed). Also simplifies A/B testing of prompt variants. — **Alternatives considered**: Inline in handlers (easier to start, harder to maintain); in a database (over-engineered for pre-production).

---

## How to Build

**Standalone** (build only, no review or merge):
```
Use wasp. Build from sprint spec docs/specs/SPRINT-002-ai-advisor-streaming.md
```

**Full autopilot** (build + review + fix loop + merge):
```
Use autopilot-wasp. Build from sprint spec docs/specs/SPRINT-002-ai-advisor-streaming.md
```

---

## Agent Hints

| Signal | Value | Agents |
|--------|-------|--------|
| External dependencies | Anthropic API, OpenAI API, Groq API, Ollama (optional) | Vision: health checks. Hulk: API failure simulation |
| High-traffic endpoints | GET /ai/advice/{id}/{dimension} | Black Panther: benchmark streaming latency |
| Database writes | advice_cache | Hulk: concurrent cache write test |
| Auth-critical | Yes | Hawkeye: verify assessment cross-user isolation before stream begins |
| Financial/PII data | PII (business data sent to AI providers) | Hawkeye: confirm challenge text is sanitized before sending to external AI APIs |
| Builder | Wasp | Standalone builder — build only |
| Autopilot | autopilot-wasp | Full pipeline — build + review + fix + merge |
| Tools needed | Read, Write, Edit, Bash (pytest), Bash (supabase db push) | Pre-approve before starting |
| Files to read first | app.js (lines 88-137 renderResults), index.html (lines 134-360), backend/ai/factory.py (after F1), backend/prompts.py (after F1), backend/routers/assessments.py | Parallel-read these first |

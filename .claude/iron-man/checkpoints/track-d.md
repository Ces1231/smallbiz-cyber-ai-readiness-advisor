# Track D Checkpoint — AI Prompts, PDF Generator & Tests

**Sprint:** SPRINT-006 Dream-to-Launch Builder
**Track:** D
**Date:** 2026-06-21
**Status:** COMPLETE

## Deliverables

### 1. `backend/prompts_dream.py`
- `_ai_complete()` — internal helper using `get_ai_provider()` from `backend.ai.factory`
  - Uses `provider.stream_completion(system_prompt=, user_message=, ...)` (matches AIProvider base class signature)
  - Collects streamed chunks into a single string
- `generate_idea_suggestions(quiz_data)` — 3 business idea suggestions, 2-attempt retry with JSON coercion
- `generate_mission_preview(idea)` — mission statement with graceful fallback
- `generate_launch_plan(idea, tier)` — 4 AI calls for `launch_builder`, 7 for `launch_packet_pro`
  - Pro: adds `business_plan_text`, `mission_vision`, combined `customer_persona` / `funding_checklist` / `cyber_ai_checklist` / `ninety_day_roadmap`
  - All sections have fallback defaults on parse failure

### 2. `backend/pdf_generator.py`
- `generate_pdf()` — async wrapper using `asyncio.to_thread`
- `_generate_with_weasyprint()` — HTML-to-PDF primary path
- `_generate_with_reportlab()` — pure-Python fallback
- `_render_html()` — HTML template with dark cover page, branded footer

### 3. `backend/tests/test_business.py`
- `TestQuizSubmit` — 4 tests: 201 happy path, empty skills 422, unknown skill 400, 2-sentence preview
- `TestListIdeas` — 2 tests: empty list, derived idea_name
- `TestSaveIdea` — 4 tests: 200 valid save, 404 not found, 400/422 out-of-range index, 409 already saved
- `TestGetPlan` — 2 tests: 402 no purchase, pro purchase satisfies launch_builder
- `TestAdvisorRequest` — 2 tests: 402 without purchase, 201/402 with purchase

### 4. `backend/tests/test_billing_onetime.py`
- `TestOneTimeCheckout` — 4 tests: 200 client secret, 400/422 invalid product, 409 already purchased, insert called
- `TestOneTimeWebhook` — 5 tests: 400 bad signature, succeeded updates, failed updates, refunded updates, idempotent on re-fire

## Key Design Decisions
- `_ai_complete` uses `user_message=` kwarg (not `user_prompt=`) to match `AIProvider.stream_completion()` signature in `backend/ai/base.py`
- No import of `backend.config.settings` in `prompts_dream.py` — provider reads its own env vars internally
- All test files use `patch("backend.dependencies.get_current_user")` + `patch("backend.dependencies.get_supabase_client")` matching the conftest pattern
- Test fixtures use inline `client` fixtures (not session-scoped `authed_client`) since business tests need per-test mock control

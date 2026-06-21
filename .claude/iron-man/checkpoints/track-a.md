# Sprint-006 Track A Checkpoint

**Status:** COMPLETE
**Date:** 2026-06-21
**Branch:** feature/sprint-006-dream-to-launch-builder

## Deliverables

### DB Migrations (4 files)
- `supabase/migrations/20260621100000_create_business_ideas.sql` — business_ideas table with RLS
- `supabase/migrations/20260621110000_create_launch_plans.sql` — launch_plans table with RLS
- `supabase/migrations/20260621120000_create_purchases.sql` — purchases table with RLS (read-only policy)
- `supabase/migrations/20260621130000_create_advisor_requests.sql` — advisor_requests table with RLS (read-only policy)

### Backend Config
- `backend/config.py` — added 14 new env vars: stripe one-time price IDs, one-time webhook secret, email config (resend/smtp), admin notification email, dream builder success/cancel URLs

### Schemas
- `backend/schemas/business.py` — NEW: full Pydantic v2 schemas for quiz, ideas, plans, advisor request
- `backend/schemas/billing.py` — UPDATED: added OneTimeCheckoutRequest, OneTimeCheckoutResponse, PurchasesStatusResponse

### Routers
- `backend/routers/business.py` — NEW: 6 endpoints (POST /quiz, GET /ideas, POST /ideas/{id}/save, GET /ideas/{id}/plan, POST /ideas/{id}/generate-pdf, POST /advisor-request). Imports from backend.prompts_dream guarded with try/except ImportError.
- `backend/routers/billing.py` — UPDATED: added _ONE_TIME_PRICE_ALIASES, _ONE_TIME_AMOUNTS constants; 3 new endpoints (GET /purchases, POST /one-time-checkout, POST /one-time-webhook); 3 new webhook handlers (_on_payment_intent_succeeded, _on_payment_intent_failed, _on_charge_refunded)

### Dependencies
- `backend/dependencies.py` — UPDATED: added require_purchase() function (HTTP 402 gate, pro superset logic)

### Email
- `backend/email_helper.py` — NEW: send_advisor_notification_email() with Resend primary / SMTP fallback

### App Registration
- `backend/main.py` — UPDATED: registered business_router at /business

### Requirements
- `backend/requirements.txt` — added weasyprint>=60.2, reportlab>=4.2.0 (PDF generation deps; Track D uses these)

## Notes
- `backend/prompts_dream.py` — depended on by business router, created by Track D. Import wrapped in try/except so server starts without it.
- `backend/pdf_generator.py` — depended on by generate-pdf endpoint, created by Track D. Import wrapped in try/except.
- weasyprint/reportlab IDE hints (not installed locally) are expected — production deps only.

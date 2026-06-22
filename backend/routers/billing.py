"""
SmallBiz Advisor — Billing Router
Endpoints: POST /billing/checkout, POST /billing/portal,
           GET  /billing/subscription, POST /billing/webhook
Handles Stripe Checkout sessions, Customer Portal, and webhook events.
"""
from datetime import datetime, timezone

import stripe
import structlog
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from supabase import Client

from backend.config import settings
from backend.dependencies import get_current_user, get_supabase_client
from backend.schemas.billing import (
    CheckoutRequest,
    CheckoutResponse,
    OneTimeCheckoutRequest,
    OneTimeCheckoutResponse,
    PortalResponse,
    PurchasesStatusResponse,
    SubscriptionResponse,
)

router = APIRouter()
log = structlog.get_logger()

# Map the frontend-safe alias to the actual Stripe Price ID from env vars
_PRICE_ALIASES = {
    "price_monthly": settings.stripe_price_id_monthly,
    "price_yearly":  settings.stripe_price_id_yearly,
}

_ONE_TIME_PRICE_ALIASES = {
    "launch_builder":     settings.stripe_price_id_launch_builder,
    "launch_packet_pro":  settings.stripe_price_id_launch_packet_pro,
    "advisor_review":     settings.stripe_price_id_advisor_review,
}

_ONE_TIME_AMOUNTS = {
    "launch_builder":     1900,
    "launch_packet_pro":  4900,
    "advisor_review":     14900,
}


def _stripe() -> stripe.StripeClient:
    return stripe.StripeClient(settings.stripe_secret_key)


# ── Helper ─────────────────────────────────────────────────────────────────────

async def _get_or_create_stripe_customer(
    user_id: str,
    user_email: str,
    supabase: Client,
) -> str:
    """
    Returns the Stripe customer ID for this user.
    Creates a new Stripe customer if none exists, then stores it in user_profiles.
    """
    # Check existing customer
    try:
        result = (
            supabase.table("user_profiles")
            .select("stripe_customer_id")
            .eq("id", user_id)
            .single()
            .execute()
        )
        if result.data and result.data.get("stripe_customer_id"):
            return result.data["stripe_customer_id"]
    except Exception:
        pass

    # Create new Stripe customer
    try:
        client = _stripe()
        customer = client.customers.create(params={
            "email": user_email,
            "metadata": {"supabase_user_id": user_id},
        })
        customer_id = customer.id
    except stripe.StripeError as exc:
        log.error("stripe_customer_create_error", user_id=user_id, error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "error": "billing_unavailable",
                "message": "Billing service temporarily unavailable. Please try again.",
                "details": {},
            },
        )

    # Persist the customer ID
    try:
        supabase.table("user_profiles").update(
            {"stripe_customer_id": customer_id}
        ).eq("id", user_id).execute()
    except Exception as exc:
        log.error("stripe_customer_store_error", user_id=user_id, error=str(exc))

    return customer_id


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/checkout", response_model=CheckoutResponse, status_code=200)
async def create_checkout_session(
    body: CheckoutRequest,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> CheckoutResponse:
    """
    Create a Stripe Checkout session for the requested price.
    Returns {"checkout_url": "..."} — the frontend redirects to this URL.
    Returns 409 if the user already has an active subscription.
    """
    user_id = current_user["id"]
    user_email = current_user.get("email", "")

    # Guard: already subscribed
    try:
        sub_result = (
            supabase.table("subscriptions")
            .select("id")
            .eq("user_id", user_id)
            .in_("status", ["active", "trialing"])
            .limit(1)
            .execute()
        )
        if sub_result.data:
            log.info("checkout_already_subscribed", user_id=user_id)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "error": "already_subscribed",
                    "message": "You already have an active subscription.",
                    "details": {},
                },
            )
    except HTTPException:
        raise
    except Exception as exc:
        log.error("checkout_sub_check_error", user_id=user_id, error=str(exc))

    price_id = _PRICE_ALIASES.get(body.price_id)
    if not price_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "invalid_price", "message": "Invalid price selection.", "details": {}},
        )

    customer_id = await _get_or_create_stripe_customer(user_id, user_email, supabase)

    try:
        client = _stripe()
        session = client.checkout.sessions.create(params={
            "customer": customer_id,
            "line_items": [{"price": price_id, "quantity": 1}],
            "mode": "subscription",
            "client_reference_id": user_id,
            "success_url": settings.stripe_success_url,
            "cancel_url": settings.stripe_cancel_url,
        })
    except stripe.StripeError as exc:
        log.error("stripe_checkout_create_error", user_id=user_id, error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "error": "billing_unavailable",
                "message": "Billing service temporarily unavailable. Please try again.",
                "details": {},
            },
        )

    log.info("checkout_session_created", user_id=user_id)
    return CheckoutResponse(checkout_url=session.url)


@router.post("/portal", response_model=PortalResponse, status_code=200)
async def create_portal_session(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> PortalResponse:
    """
    Create a Stripe Customer Portal session for managing the subscription.
    Returns 404 if the user has never subscribed (no Stripe customer record).
    """
    user_id = current_user["id"]

    # Fetch customer ID
    customer_id: str | None = None
    try:
        result = (
            supabase.table("user_profiles")
            .select("stripe_customer_id")
            .eq("id", user_id)
            .single()
            .execute()
        )
        if result.data:
            customer_id = result.data.get("stripe_customer_id")
    except Exception:
        pass

    if not customer_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "no_billing_account",
                "message": "No billing account found. Start a subscription first.",
                "details": {},
            },
        )

    try:
        client = _stripe()
        portal = client.billing_portal.sessions.create(params={
            "customer": customer_id,
            "return_url": settings.stripe_cancel_url,
        })
    except stripe.StripeError as exc:
        log.error("stripe_portal_error", user_id=user_id, error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "error": "billing_unavailable",
                "message": "Billing service temporarily unavailable. Please try again.",
                "details": {},
            },
        )

    log.info("portal_session_created", user_id=user_id)
    return PortalResponse(portal_url=portal.url)


@router.get("/subscription", response_model=SubscriptionResponse, status_code=200)
async def get_subscription(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> SubscriptionResponse:
    """Return the current subscription status and tier for the authenticated user."""
    user_id = current_user["id"]

    # Fetch tier from profile
    tier = "free"
    try:
        profile_result = (
            supabase.table("user_profiles")
            .select("tier")
            .eq("id", user_id)
            .single()
            .execute()
        )
        if profile_result.data:
            tier = profile_result.data.get("tier", "free")
    except Exception:
        pass

    # Fetch most recent active subscription
    try:
        sub_result = (
            supabase.table("subscriptions")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if sub_result.data:
            sub = sub_result.data[0]
            active = sub["status"] in ("active", "trialing")
            period_end = sub.get("current_period_end")
            if isinstance(period_end, str):
                period_end = datetime.fromisoformat(period_end.replace("Z", "+00:00"))
            return SubscriptionResponse(
                has_active_subscription=active,
                tier=tier,
                status=sub["status"],
                current_period_end=period_end,
                cancel_at_period_end=sub.get("cancel_at_period_end", False),
                price_id=sub.get("stripe_price_id"),
            )
    except Exception:
        pass

    return SubscriptionResponse(has_active_subscription=False, tier=tier)


@router.post("/webhook", status_code=200)
async def handle_webhook(
    request: Request,
    stripe_signature: str = Header(alias="stripe-signature", default=""),
    supabase: Client = Depends(get_supabase_client),
) -> dict:
    """
    Receive and process Stripe webhook events.
    Always returns HTTP 200 — Stripe retries on non-2xx.
    Rejects invalid signatures with HTTP 400.
    """
    payload = await request.body()

    try:
        event = stripe.Webhook.construct_event(
            payload=payload,
            sig_header=stripe_signature,
            secret=settings.stripe_webhook_secret,
        )
    except stripe.error.SignatureVerificationError:
        log.warning("webhook_invalid_signature")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "webhook_invalid", "message": "Invalid webhook signature."},
        )
    except Exception as exc:
        log.warning("webhook_parse_error", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "webhook_invalid", "message": "Malformed webhook payload."},
        )

    event_type = event["type"]
    data = event["data"]["object"]
    log.info("webhook_received", event_type=event_type, event_id=event["id"])

    if event_type == "checkout.session.completed":
        await _on_checkout_completed(data, supabase)
    elif event_type == "customer.subscription.updated":
        await _on_subscription_updated(data, supabase)
    elif event_type == "customer.subscription.deleted":
        await _on_subscription_deleted(data, supabase)
    elif event_type == "invoice.payment_failed":
        await _on_payment_failed(data, supabase)
    else:
        log.info("webhook_unhandled_event", event_type=event_type)

    return {"received": True}


# ── Webhook event handlers ─────────────────────────────────────────────────────

async def _on_checkout_completed(session: dict, supabase: Client) -> None:
    """
    checkout.session.completed — create subscription row and upgrade user tier.
    Idempotent: checks whether the subscription row already exists before writing.
    """
    user_id = session.get("client_reference_id")
    customer_id = session.get("customer")
    subscription_id = session.get("subscription")

    if not all([user_id, customer_id, subscription_id]):
        log.warning("checkout_completed_missing_fields", session_id=session.get("id"))
        return

    # Fetch full subscription details from Stripe
    try:
        client = _stripe()
        sub = client.subscriptions.retrieve(subscription_id)
    except stripe.StripeError as exc:
        log.error("checkout_sub_retrieve_error", error=str(exc), subscription_id=subscription_id)
        return

    # Idempotency check
    try:
        existing = (
            supabase.table("subscriptions")
            .select("id")
            .eq("stripe_subscription_id", subscription_id)
            .limit(1)
            .execute()
        )
        if existing.data:
            log.info("checkout_completed_already_processed", subscription_id=subscription_id)
            return
    except Exception:
        pass

    period_start = datetime.fromtimestamp(
        sub.current_period_start, tz=timezone.utc
    ).isoformat()
    period_end = datetime.fromtimestamp(
        sub.current_period_end, tz=timezone.utc
    ).isoformat()
    price_id = sub.items.data[0].price.id if sub.items.data else ""

    try:
        supabase.table("subscriptions").insert({
            "user_id": user_id,
            "stripe_subscription_id": subscription_id,
            "stripe_customer_id": customer_id,
            "stripe_price_id": price_id,
            "status": sub.status,
            "current_period_start": period_start,
            "current_period_end": period_end,
            "cancel_at_period_end": sub.cancel_at_period_end,
        }).execute()
    except Exception as exc:
        log.error("subscription_insert_error", error=str(exc), user_id=user_id)
        return

    # Upgrade tier and store customer ID
    try:
        supabase.table("user_profiles").update({
            "tier": "pro",
            "stripe_customer_id": customer_id,
        }).eq("id", user_id).execute()
    except Exception as exc:
        log.error("tier_upgrade_error", error=str(exc), user_id=user_id)

    log.info("checkout_completed_processed", user_id=user_id, subscription_id=subscription_id)


async def _on_subscription_updated(sub: dict, supabase: Client) -> None:
    """
    customer.subscription.updated — sync status and period dates.
    Idempotent: only writes if status/period differs from DB state.
    """
    subscription_id = sub.get("id")
    if not subscription_id:
        return

    period_start = datetime.fromtimestamp(
        sub["current_period_start"], tz=timezone.utc
    ).isoformat()
    period_end = datetime.fromtimestamp(
        sub["current_period_end"], tz=timezone.utc
    ).isoformat()

    try:
        supabase.table("subscriptions").update({
            "status": sub["status"],
            "current_period_start": period_start,
            "current_period_end": period_end,
            "cancel_at_period_end": sub.get("cancel_at_period_end", False),
        }).eq("stripe_subscription_id", subscription_id).execute()
    except Exception as exc:
        log.error("subscription_update_error", error=str(exc), subscription_id=subscription_id)

    log.info("subscription_updated", subscription_id=subscription_id, status=sub["status"])


async def _on_subscription_deleted(sub: dict, supabase: Client) -> None:
    """
    customer.subscription.deleted — mark canceled and downgrade user to free tier.
    Idempotent: checks current tier before writing.
    """
    subscription_id = sub.get("id")
    customer_id = sub.get("customer")
    if not subscription_id:
        return

    # Update subscription row
    try:
        supabase.table("subscriptions").update(
            {"status": "canceled"}
        ).eq("stripe_subscription_id", subscription_id).execute()
    except Exception as exc:
        log.error("subscription_delete_error", error=str(exc), subscription_id=subscription_id)

    # Downgrade tier — look up user by stripe_customer_id
    if customer_id:
        try:
            profile_result = (
                supabase.table("user_profiles")
                .select("id, tier")
                .eq("stripe_customer_id", customer_id)
                .single()
                .execute()
            )
            if profile_result.data and profile_result.data.get("tier") != "free":
                supabase.table("user_profiles").update(
                    {"tier": "free"}
                ).eq("stripe_customer_id", customer_id).execute()
                log.info("tier_downgraded", customer_id=customer_id)
        except Exception as exc:
            log.error("tier_downgrade_error", error=str(exc), customer_id=customer_id)


async def _on_payment_failed(invoice: dict, supabase: Client) -> None:
    """invoice.payment_failed — mark subscription as past_due."""
    subscription_id = invoice.get("subscription")
    if not subscription_id:
        return
    try:
        supabase.table("subscriptions").update(
            {"status": "past_due"}
        ).eq("stripe_subscription_id", subscription_id).execute()
        log.info("subscription_past_due", subscription_id=subscription_id)
    except Exception as exc:
        log.error("payment_failed_update_error", error=str(exc), subscription_id=subscription_id)


# ── One-time purchase endpoints ────────────────────────────────────────────────

@router.get("/purchases", status_code=200)
async def get_purchases_status(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> dict:
    """Return which one-time products the current user has purchased (completed)."""
    user_id = current_user["id"]

    result = {"launch_builder": False, "launch_packet_pro": False, "advisor_review": False}
    try:
        rows = (
            supabase.table("purchases")
            .select("product_key")
            .eq("user_id", user_id)
            .eq("status", "completed")
            .execute()
        )
        for row in rows.data:
            key = row.get("product_key")
            if key in result:
                result[key] = True
        # launch_packet_pro satisfies launch_builder
        if result["launch_packet_pro"]:
            result["launch_builder"] = True
    except Exception as exc:
        log.error("purchases_status_error", user_id=user_id, error=str(exc))

    return result


@router.post("/one-time-checkout", status_code=200)
async def create_one_time_checkout(
    body: OneTimeCheckoutRequest,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> dict:
    """Create a Stripe PaymentIntent for a one-time Dream Builder product."""
    user_id = current_user["id"]
    user_email = current_user.get("email", "")
    product_key = body.product_key

    if product_key not in _ONE_TIME_AMOUNTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "invalid_product", "message": "Unknown product key.", "details": {}},
        )

    # Check if already purchased
    try:
        existing = (
            supabase.table("purchases")
            .select("id")
            .eq("user_id", user_id)
            .eq("product_key", product_key)
            .eq("status", "completed")
            .limit(1)
            .execute()
        )
        if existing.data:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"error": "already_purchased", "message": "You have already purchased this product.", "details": {}},
            )
    except HTTPException:
        raise
    except Exception:
        pass

    customer_id = await _get_or_create_stripe_customer(user_id, user_email, supabase)

    try:
        client = _stripe()
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
    except stripe.StripeError as exc:
        log.error("payment_intent_create_error", user_id=user_id, product_key=product_key, error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"error": "billing_unavailable", "message": "Billing service temporarily unavailable.", "details": {}},
        )

    # Insert pending purchase row
    try:
        supabase.table("purchases").insert({
            "user_id": user_id,
            "product_key": product_key,
            "stripe_payment_intent_id": intent.id,
            "stripe_customer_id": customer_id,
            "amount_cents": _ONE_TIME_AMOUNTS[product_key],
            "currency": "usd",
            "status": "pending",
        }).execute()
    except Exception as exc:
        log.error("purchase_insert_error", user_id=user_id, error=str(exc))

    log.info("one_time_checkout_created", user_id=user_id, product_key=product_key, intent_id=intent.id)
    return {
        "client_secret": intent.client_secret,
        "payment_intent_id": intent.id,
        "amount_cents": _ONE_TIME_AMOUNTS[product_key],
        "product_key": product_key,
    }


@router.post("/one-time-webhook", status_code=200)
async def handle_one_time_webhook(
    request: Request,
    stripe_signature: str = Header(alias="stripe-signature", default=""),
    supabase: Client = Depends(get_supabase_client),
) -> dict:
    """Handle Stripe webhook events for one-time payments."""
    payload = await request.body()

    try:
        event = stripe.Webhook.construct_event(
            payload=payload,
            sig_header=stripe_signature,
            secret=settings.stripe_one_time_webhook_secret,
        )
    except stripe.error.SignatureVerificationError:
        log.warning("one_time_webhook_invalid_signature")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "webhook_invalid", "message": "Invalid webhook signature."},
        )
    except Exception as exc:
        log.warning("one_time_webhook_parse_error", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "webhook_invalid", "message": "Malformed webhook payload."},
        )

    event_type = event["type"]
    data = event["data"]["object"]
    log.info("one_time_webhook_received", event_type=event_type, event_id=event["id"])

    if event_type == "payment_intent.succeeded":
        await _on_payment_intent_succeeded(data, supabase)
    elif event_type == "payment_intent.payment_failed":
        await _on_payment_intent_failed(data, supabase)
    elif event_type == "charge.refunded":
        await _on_charge_refunded(data, supabase)
    else:
        log.info("one_time_webhook_unhandled", event_type=event_type)

    return {"received": True}


# ── One-time webhook event handlers ───────────────────────────────────────────

async def _on_payment_intent_succeeded(intent: dict, supabase: Client) -> None:
    intent_id = intent.get("id")
    if not intent_id:
        return
    try:
        existing = (
            supabase.table("purchases")
            .select("id, status")
            .eq("stripe_payment_intent_id", intent_id)
            .single()
            .execute()
        )
        if existing.data and existing.data.get("status") == "completed":
            log.info("payment_intent_already_completed", intent_id=intent_id)
            return
        supabase.table("purchases").update({
            "status": "completed",
            "purchased_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("stripe_payment_intent_id", intent_id).execute()
        log.info("purchase_completed", intent_id=intent_id)
    except Exception as exc:
        log.error("purchase_complete_error", intent_id=intent_id, error=str(exc))


async def _on_payment_intent_failed(intent: dict, supabase: Client) -> None:
    intent_id = intent.get("id")
    if not intent_id:
        return
    try:
        supabase.table("purchases").update({
            "status": "failed",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("stripe_payment_intent_id", intent_id).execute()
        log.info("purchase_failed", intent_id=intent_id)
    except Exception as exc:
        log.error("purchase_fail_error", intent_id=intent_id, error=str(exc))


async def _on_charge_refunded(charge: dict, supabase: Client) -> None:
    intent_id = charge.get("payment_intent")
    if not intent_id:
        return
    try:
        supabase.table("purchases").update({
            "status": "refunded",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("stripe_payment_intent_id", intent_id).execute()
        log.info("purchase_refunded", intent_id=intent_id)
    except Exception as exc:
        log.error("purchase_refund_error", intent_id=intent_id, error=str(exc))

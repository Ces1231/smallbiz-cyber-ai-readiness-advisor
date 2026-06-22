"""Tests for billing endpoints (Feature 2 — Stripe checkout, webhook, subscription)."""
import json
from unittest.mock import MagicMock, patch

import pytest

USER_ID = "00000000-0000-0000-0000-000000000001"
STRIPE_SUB_ID = "sub_test123"
STRIPE_CUSTOMER_ID = "cus_test123"

FREE_PROFILE = {
    "id": USER_ID,
    "tier": "free",
    "stripe_customer_id": None,
    "assessments_this_month": 0,
}

PRO_PROFILE = {**FREE_PROFILE, "tier": "pro", "stripe_customer_id": STRIPE_CUSTOMER_ID}


def _no_sub(mock_supabase):
    """Make subscriptions query return empty (no active sub)."""
    no_sub = MagicMock()
    no_sub.data = []
    mock_supabase.table.return_value.select.return_value.eq.return_value.in_.return_value.limit.return_value.execute.return_value = no_sub


def _profile_result(mock_supabase, profile_data):
    result = MagicMock()
    result.data = profile_data
    mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = result


class TestCheckout:
    def test_checkout_returns_url(self, authed_client, mock_supabase):
        _no_sub(mock_supabase)
        _profile_result(mock_supabase, FREE_PROFILE)

        mock_customer = MagicMock()
        mock_customer.id = STRIPE_CUSTOMER_ID
        mock_session = MagicMock()
        mock_session.url = "https://checkout.stripe.com/pay/cs_test_abc"

        with patch("backend.routers.billing._stripe") as mock_stripe_fn, \
             patch("backend.routers.billing._PRICE_ALIASES", {"price_monthly": "price_real_monthly", "price_yearly": "price_real_yearly"}):
            client = MagicMock()
            mock_stripe_fn.return_value = client
            client.customers.create.return_value = mock_customer
            client.checkout.sessions.create.return_value = mock_session

            # Ensure update (storing customer id) doesn't crash
            mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock()

            resp = authed_client.post("/billing/checkout", json={"price_id": "price_monthly"})

        assert resp.status_code == 200
        assert "checkout_url" in resp.json()
        assert "checkout.stripe.com" in resp.json()["checkout_url"]

    def test_checkout_409_for_active_subscriber(self, authed_client, mock_supabase):
        active_sub = MagicMock()
        active_sub.data = [{"id": "sub_existing"}]
        mock_supabase.table.return_value.select.return_value.eq.return_value.in_.return_value.limit.return_value.execute.return_value = active_sub

        resp = authed_client.post("/billing/checkout", json={"price_id": "price_monthly"})
        assert resp.status_code == 409
        assert resp.json()["detail"]["error"] == "already_subscribed"

    def test_checkout_invalid_price_id(self, authed_client, mock_supabase):
        _no_sub(mock_supabase)
        resp = authed_client.post("/billing/checkout", json={"price_id": "price_invalid"})
        assert resp.status_code == 422  # Pydantic validation rejects non-literal


class TestPortal:
    def test_portal_404_no_customer(self, authed_client, mock_supabase):
        profile_result = MagicMock()
        profile_result.data = {"stripe_customer_id": None}
        mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = profile_result

        resp = authed_client.post("/billing/portal")
        assert resp.status_code == 404
        assert resp.json()["detail"]["error"] == "no_billing_account"

    def test_portal_returns_url(self, authed_client, mock_supabase):
        profile_result = MagicMock()
        profile_result.data = {"stripe_customer_id": STRIPE_CUSTOMER_ID}
        mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = profile_result

        mock_portal = MagicMock()
        mock_portal.url = "https://billing.stripe.com/session/bps_test"

        with patch("backend.routers.billing._stripe") as mock_stripe_fn:
            client = MagicMock()
            mock_stripe_fn.return_value = client
            client.billing_portal.sessions.create.return_value = mock_portal

            resp = authed_client.post("/billing/portal")

        assert resp.status_code == 200
        assert "billing.stripe.com" in resp.json()["portal_url"]


class TestSubscriptionStatus:
    def test_no_subscription_returns_free(self, authed_client, mock_supabase):
        profile_result = MagicMock()
        profile_result.data = {"tier": "free"}
        sub_result = MagicMock()
        sub_result.data = []

        chain = mock_supabase.table.return_value.select.return_value
        chain.eq.return_value.single.return_value.execute.return_value = profile_result
        chain.eq.return_value.order.return_value.limit.return_value.execute.return_value = sub_result

        resp = authed_client.get("/billing/subscription")
        assert resp.status_code == 200
        data = resp.json()
        assert data["has_active_subscription"] is False
        assert data["tier"] == "free"

    def test_active_subscription_returned(self, authed_client, mock_supabase):
        profile_result = MagicMock()
        profile_result.data = {"tier": "pro"}
        sub_result = MagicMock()
        sub_result.data = [{
            "status": "active",
            "current_period_end": "2026-07-17T00:00:00+00:00",
            "cancel_at_period_end": False,
            "stripe_price_id": "price_monthly_actual",
        }]

        chain = mock_supabase.table.return_value.select.return_value
        chain.eq.return_value.single.return_value.execute.return_value = profile_result
        chain.eq.return_value.order.return_value.limit.return_value.execute.return_value = sub_result

        resp = authed_client.get("/billing/subscription")
        assert resp.status_code == 200
        data = resp.json()
        assert data["has_active_subscription"] is True
        assert data["tier"] == "pro"
        assert data["status"] == "active"


class TestWebhook:
    def _make_webhook_request(self, authed_client, event_type, event_data, signature="valid"):
        payload = json.dumps({"type": event_type, "id": "evt_test", "data": {"object": event_data}})
        return authed_client.post(
            "/billing/webhook",
            content=payload.encode(),
            headers={"content-type": "application/json", "stripe-signature": signature},
        )

    def test_invalid_signature_rejected(self, authed_client, mock_supabase):
        with patch("stripe.Webhook.construct_event") as mock_construct:
            import stripe as _stripe
            mock_construct.side_effect = _stripe.error.SignatureVerificationError(
                "Invalid signature", "sig_header"
            )
            resp = self._make_webhook_request(authed_client, "checkout.session.completed", {})
        assert resp.status_code == 400
        assert resp.json()["detail"]["error"] == "webhook_invalid"

    def test_checkout_completed_upgrades_tier(self, authed_client, mock_supabase):
        session_obj = {
            "client_reference_id": USER_ID,
            "customer": STRIPE_CUSTOMER_ID,
            "subscription": STRIPE_SUB_ID,
        }
        mock_event = {
            "type": "checkout.session.completed",
            "id": "evt_test",
            "data": {"object": session_obj},
        }

        existing_check = MagicMock()
        existing_check.data = []  # no existing row → idempotency check passes
        mock_supabase.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value = existing_check
        mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock()
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock()

        mock_sub = MagicMock()
        mock_sub.status = "active"
        mock_sub.current_period_start = 1718582400
        mock_sub.current_period_end = 1721260800
        mock_sub.cancel_at_period_end = False
        mock_sub.items.data = [MagicMock()]
        mock_sub.items.data[0].price.id = "price_real_monthly"

        with patch("stripe.Webhook.construct_event", return_value=mock_event), \
             patch("backend.routers.billing._stripe") as mock_stripe_fn:
            stripe_client = MagicMock()
            mock_stripe_fn.return_value = stripe_client
            stripe_client.subscriptions.retrieve.return_value = mock_sub

            resp = authed_client.post(
                "/billing/webhook",
                content=b'{"test": true}',
                headers={"stripe-signature": "valid"},
            )

        assert resp.status_code == 200
        assert resp.json() == {"received": True}
        # Verify tier upgrade was called
        mock_supabase.table.return_value.update.assert_called()

    def test_subscription_deleted_downgrades_tier(self, authed_client, mock_supabase):
        sub_obj = {"id": STRIPE_SUB_ID, "customer": STRIPE_CUSTOMER_ID}
        mock_event = {
            "type": "customer.subscription.deleted",
            "id": "evt_test2",
            "data": {"object": sub_obj},
        }

        profile_result = MagicMock()
        profile_result.data = {"id": USER_ID, "tier": "pro"}
        mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = profile_result
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock()

        with patch("stripe.Webhook.construct_event", return_value=mock_event):
            resp = authed_client.post(
                "/billing/webhook",
                content=b'{"test": true}',
                headers={"stripe-signature": "valid"},
            )

        assert resp.status_code == 200
        mock_supabase.table.return_value.update.assert_called()

    def test_webhook_idempotent_on_duplicate_checkout(self, authed_client, mock_supabase):
        session_obj = {
            "client_reference_id": USER_ID,
            "customer": STRIPE_CUSTOMER_ID,
            "subscription": STRIPE_SUB_ID,
        }
        mock_event = {
            "type": "checkout.session.completed",
            "id": "evt_dup",
            "data": {"object": session_obj},
        }

        # Simulate the subscription row already exists
        existing_check = MagicMock()
        existing_check.data = [{"id": "some-existing-uuid"}]
        mock_supabase.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value = existing_check

        mock_sub = MagicMock()
        mock_sub.status = "active"
        mock_sub.current_period_start = 1718582400
        mock_sub.current_period_end = 1721260800
        mock_sub.cancel_at_period_end = False
        mock_sub.items.data = []

        # Reset insert call history — session-scoped mock accumulates calls across tests
        mock_supabase.table.return_value.insert.reset_mock()

        with patch("stripe.Webhook.construct_event", return_value=mock_event), \
             patch("backend.routers.billing._stripe") as mock_stripe_fn:
            stripe_client = MagicMock()
            mock_stripe_fn.return_value = stripe_client
            stripe_client.subscriptions.retrieve.return_value = mock_sub

            resp = authed_client.post(
                "/billing/webhook",
                content=b'{"test": true}',
                headers={"stripe-signature": "valid"},
            )

        assert resp.status_code == 200
        # Insert should NOT have been called (idempotent: already processed)
        mock_supabase.table.return_value.insert.assert_not_called()

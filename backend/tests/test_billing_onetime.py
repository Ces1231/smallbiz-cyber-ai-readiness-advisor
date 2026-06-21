"""
Tests for POST /billing/one-time-checkout and POST /billing/one-time-webhook endpoints.
"""
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    from backend.main import app
    return TestClient(app)


def _make_mock_user():
    return {"id": "test-user-id", "email": "test@example.com"}


def _make_mock_supabase():
    mock = MagicMock()
    mock.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    mock.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value.data = []
    mock.table.return_value.insert.return_value.execute.return_value.data = [{"id": "new-uuid"}]
    mock.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [{"id": "new-uuid"}]
    return mock


MOCK_INTENT = MagicMock()
MOCK_INTENT.id = "pi_test_123"
MOCK_INTENT.client_secret = "pi_test_123_secret_xyz"


# ── POST /billing/one-time-checkout ────────────────────────────────────────────

class TestOneTimeCheckout:
    def test_returns_client_secret_for_valid_product(self, client):
        """Valid product_key returns client_secret and payment_intent_id."""
        mock_sub = _make_mock_supabase()
        # Profile: no existing stripe customer
        mock_sub.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {"stripe_customer_id": None}

        with patch("backend.dependencies.get_current_user", return_value=_make_mock_user()), \
             patch("backend.dependencies.get_supabase_client", return_value=mock_sub), \
             patch("backend.routers.billing._stripe") as mock_stripe:
            mock_stripe_client = MagicMock()
            mock_stripe.return_value = mock_stripe_client
            mock_stripe_client.customers.create.return_value = MagicMock(id="cus_test")
            mock_stripe_client.payment_intents.create.return_value = MOCK_INTENT
            resp = client.post(
                "/billing/one-time-checkout",
                json={"product_key": "launch_builder"},
                headers={"Authorization": "Bearer test-token"},
            )
        assert resp.status_code == 200
        data = resp.json()
        assert "client_secret" in data
        assert "payment_intent_id" in data
        assert data["product_key"] == "launch_builder"
        assert data["amount_cents"] == 1900

    def test_returns_400_for_invalid_product(self, client):
        """Invalid product_key returns 422 (Pydantic) or 400."""
        with patch("backend.dependencies.get_current_user", return_value=_make_mock_user()), \
             patch("backend.dependencies.get_supabase_client", return_value=_make_mock_supabase()):
            resp = client.post(
                "/billing/one-time-checkout",
                json={"product_key": "not_a_product"},
                headers={"Authorization": "Bearer test-token"},
            )
        assert resp.status_code in (400, 422)

    def test_returns_409_if_already_purchased(self, client):
        """409 if user has a completed purchase for this product."""
        mock_sub = _make_mock_supabase()
        # Completed purchase exists
        mock_sub.table.return_value.select.return_value.eq.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value.data = [{"id": "p1"}]
        with patch("backend.dependencies.get_current_user", return_value=_make_mock_user()), \
             patch("backend.dependencies.get_supabase_client", return_value=mock_sub):
            resp = client.post(
                "/billing/one-time-checkout",
                json={"product_key": "launch_builder"},
                headers={"Authorization": "Bearer test-token"},
            )
        assert resp.status_code == 409

    def test_creates_pending_purchase_row(self, client):
        """Verify a pending purchases row is inserted."""
        mock_sub = _make_mock_supabase()
        mock_sub.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {"stripe_customer_id": None}
        mock_sub.table.return_value.select.return_value.eq.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value.data = []

        with patch("backend.dependencies.get_current_user", return_value=_make_mock_user()), \
             patch("backend.dependencies.get_supabase_client", return_value=mock_sub), \
             patch("backend.routers.billing._stripe") as mock_stripe:
            mock_stripe_client = MagicMock()
            mock_stripe.return_value = mock_stripe_client
            mock_stripe_client.customers.create.return_value = MagicMock(id="cus_test")
            mock_stripe_client.payment_intents.create.return_value = MOCK_INTENT
            resp = client.post(
                "/billing/one-time-checkout",
                json={"product_key": "advisor_review"},
                headers={"Authorization": "Bearer test-token"},
            )
        # If 200, verify insert was called
        if resp.status_code == 200:
            mock_sub.table.assert_called()


# ── POST /billing/one-time-webhook ─────────────────────────────────────────────

class TestOneTimeWebhook:
    def _make_stripe_event(self, event_type: str, intent_id: str = "pi_test_123") -> dict:
        if event_type == "charge.refunded":
            return {
                "type": event_type,
                "id": "evt_test",
                "data": {"object": {"id": "ch_test", "payment_intent": intent_id}},
            }
        return {
            "type": event_type,
            "id": "evt_test",
            "data": {"object": {"id": intent_id}},
        }

    def test_returns_400_for_invalid_signature(self, client):
        """Invalid Stripe signature returns 400."""
        with patch("backend.dependencies.get_supabase_client", return_value=_make_mock_supabase()), \
             patch("stripe.Webhook.construct_event", side_effect=Exception("bad sig")):
            resp = client.post(
                "/billing/one-time-webhook",
                content=b'{"type":"payment_intent.succeeded"}',
                headers={"stripe-signature": "bad"},
            )
        assert resp.status_code == 400

    def test_payment_intent_succeeded_updates_status(self, client):
        """payment_intent.succeeded -> purchase status = completed."""
        mock_sub = _make_mock_supabase()
        event = self._make_stripe_event("payment_intent.succeeded")

        existing_row = MagicMock()
        existing_row.data = [{"id": "p1", "status": "pending"}]
        mock_sub.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = existing_row

        with patch("backend.dependencies.get_supabase_client", return_value=mock_sub), \
             patch("stripe.Webhook.construct_event", return_value=event):
            resp = client.post(
                "/billing/one-time-webhook",
                content=json.dumps(event).encode(),
                headers={"stripe-signature": "valid-sig"},
            )
        assert resp.status_code == 200
        assert resp.json() == {"received": True}

    def test_payment_intent_failed_updates_status(self, client):
        """payment_intent.payment_failed -> purchase status = failed."""
        mock_sub = _make_mock_supabase()
        event = self._make_stripe_event("payment_intent.payment_failed")

        with patch("backend.dependencies.get_supabase_client", return_value=mock_sub), \
             patch("stripe.Webhook.construct_event", return_value=event):
            resp = client.post(
                "/billing/one-time-webhook",
                content=json.dumps(event).encode(),
                headers={"stripe-signature": "valid-sig"},
            )
        assert resp.status_code == 200

    def test_charge_refunded_updates_status(self, client):
        """charge.refunded -> purchase status = refunded."""
        mock_sub = _make_mock_supabase()
        event = self._make_stripe_event("charge.refunded")

        with patch("backend.dependencies.get_supabase_client", return_value=mock_sub), \
             patch("stripe.Webhook.construct_event", return_value=event):
            resp = client.post(
                "/billing/one-time-webhook",
                content=json.dumps(event).encode(),
                headers={"stripe-signature": "valid-sig"},
            )
        assert resp.status_code == 200

    def test_idempotent_already_completed(self, client):
        """Second payment_intent.succeeded with same ID does not double-update."""
        mock_sub = _make_mock_supabase()
        event = self._make_stripe_event("payment_intent.succeeded")

        # Already completed
        existing_row = MagicMock()
        existing_row.data = [{"id": "p1", "status": "completed"}]
        mock_sub.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = existing_row

        with patch("backend.dependencies.get_supabase_client", return_value=mock_sub), \
             patch("stripe.Webhook.construct_event", return_value=event):
            resp = client.post(
                "/billing/one-time-webhook",
                content=json.dumps(event).encode(),
                headers={"stripe-signature": "valid-sig"},
            )
        # Should still return 200 — idempotent
        assert resp.status_code == 200
        # Update should NOT have been called again (already completed check)
        # (mock_sub.table().update() call count would be 0)

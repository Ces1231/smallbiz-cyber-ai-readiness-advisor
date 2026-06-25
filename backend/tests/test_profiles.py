"""Tests for GET /profiles/me."""
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest


FREE_PROFILE = {
    "id": "00000000-0000-0000-0000-000000000001",
    "tier": "free",
    "business_name": "Test Café",
    "assessments_this_month": 1,
    "month_reset_at": "2026-07-01T00:00:00+00:00",
    "stripe_customer_id": None,
    "created_at": "2026-06-01T00:00:00Z",
    "updated_at": "2026-06-01T00:00:00Z",
}

PRO_PROFILE = {**FREE_PROFILE, "tier": "pro", "stripe_customer_id": "cus_test123"}


def _mock_profile(mock_supabase, profile_data):
    profile_result = MagicMock()
    profile_result.data = profile_data
    (
        mock_supabase.table.return_value
        .select.return_value
        .eq.return_value
        .single.return_value
        .execute.return_value
    ) = profile_result


def _mock_count(mock_supabase, count):
    count_result = MagicMock()
    count_result.count = count
    count_result.data = []
    return count_result


class TestGetProfile:
    def test_free_profile_returned(self, authed_client, mock_supabase):
        profile_result = MagicMock()
        profile_result.data = FREE_PROFILE
        sub_result = MagicMock()
        sub_result.data = []
        count_result = MagicMock()
        count_result.count = 1

        chain = mock_supabase.table.return_value.select.return_value
        chain.eq.return_value.single.return_value.execute.return_value = profile_result
        chain.eq.return_value.gte.return_value.execute.return_value = count_result
        chain.eq.return_value.in_.return_value.limit.return_value.execute.return_value = sub_result

        resp = authed_client.get("/profiles/me")
        assert resp.status_code == 200
        data = resp.json()
        assert data["tier"] == "free"
        assert data["assessments_limit"] == 3
        assert data["has_active_subscription"] is False

    def test_pro_profile_has_no_limit(self, authed_client, mock_supabase):
        profile_result = MagicMock()
        profile_result.data = PRO_PROFILE
        sub_result = MagicMock()
        sub_result.data = [{"status": "active"}]
        count_result = MagicMock()
        count_result.count = 5

        chain = mock_supabase.table.return_value.select.return_value
        chain.eq.return_value.single.return_value.execute.return_value = profile_result
        chain.eq.return_value.gte.return_value.execute.return_value = count_result
        chain.eq.return_value.in_.return_value.limit.return_value.execute.return_value = sub_result

        resp = authed_client.get("/profiles/me")
        assert resp.status_code == 200
        data = resp.json()
        assert data["tier"] == "pro"
        assert data["assessments_limit"] is None
        assert data["has_active_subscription"] is True

    def test_requires_auth(self, client):
        resp = client.get("/profiles/me")
        assert resp.status_code == 403  # no bearer token

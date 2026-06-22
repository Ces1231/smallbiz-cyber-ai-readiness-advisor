"""Tests for admin endpoints (Feature 5)."""
from unittest.mock import MagicMock

import pytest

USER_ID = "00000000-0000-0000-0000-000000000001"
ADMIN_PROFILE = {"id": USER_ID, "tier": "admin"}
PRO_PROFILE = {"id": USER_ID, "tier": "pro"}


def _mock_admin_profile(mock_supabase, profile):
    result = MagicMock()
    result.data = profile
    (
        mock_supabase.table.return_value
        .select.return_value
        .eq.return_value
        .single.return_value
        .execute.return_value
    ) = result


def _mock_count(count):
    r = MagicMock()
    r.count = count
    r.data = []
    return r


class TestAdminMetrics:
    def test_admin_gets_metrics(self, authed_client, mock_supabase):
        _mock_admin_profile(mock_supabase, ADMIN_PROFILE)

        count_r = _mock_count(10)
        agg_r = MagicMock()
        agg_r.data = [
            {"industry": "restaurant", "overall_score": 60},
            {"industry": "restaurant", "overall_score": 40},
        ]

        chain = mock_supabase.table.return_value.select.return_value
        chain.execute.return_value = count_r
        chain.eq.return_value.execute.return_value = count_r
        chain.gte.return_value.execute.return_value = count_r
        chain.order.return_value.limit.return_value.execute.return_value = agg_r

        resp = authed_client.get("/admin/metrics")
        assert resp.status_code == 200
        data = resp.json()
        assert "total_users" in data
        assert "pro_users" in data
        assert "total_assessments" in data
        assert "ai_advice_requests_this_month" in data

    def test_non_admin_gets_403(self, authed_client, mock_supabase):
        _mock_admin_profile(mock_supabase, PRO_PROFILE)
        resp = authed_client.get("/admin/metrics")
        assert resp.status_code == 403
        assert resp.json()["detail"]["error"] == "admin_required"


class TestAdminUsers:
    def test_admin_gets_user_list(self, authed_client, mock_supabase):
        _mock_admin_profile(mock_supabase, ADMIN_PROFILE)

        count_r = MagicMock()
        count_r.count = 2
        users_r = MagicMock()
        users_r.data = [
            {"id": "aaa", "tier": "free", "business_name": "Café", "assessments_this_month": 1, "created_at": "2026-06-01T00:00:00Z"},
            {"id": "bbb", "tier": "pro",  "business_name": "Shop", "assessments_this_month": 5, "created_at": "2026-06-01T00:00:00Z"},
        ]

        chain = mock_supabase.table.return_value.select.return_value
        chain.execute.return_value = count_r
        chain.order.return_value.range.return_value.execute.return_value = users_r

        resp = authed_client.get("/admin/users")
        assert resp.status_code == 200
        data = resp.json()
        assert "data" in data
        assert "meta" in data

    def test_non_admin_gets_403(self, authed_client, mock_supabase):
        _mock_admin_profile(mock_supabase, PRO_PROFILE)
        resp = authed_client.get("/admin/users")
        assert resp.status_code == 403

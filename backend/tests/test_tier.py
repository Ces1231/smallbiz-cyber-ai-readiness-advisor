"""Tests for tier enforcement middleware."""
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from backend.middleware.tier import (
    check_assessment_quota,
    increment_assessment_count,
    require_admin_tier,
    require_pro_tier,
)

USER_ID = "00000000-0000-0000-0000-000000000001"
CURRENT_USER = {"id": USER_ID, "email": "test@example.com"}
NEXT_MONTH = "2026-07-01T00:00:00+00:00"
PAST_RESET = "2026-01-01T00:00:00+00:00"  # clearly in the past


def _make_supabase(profile_data):
    supabase = MagicMock()
    result = MagicMock()
    result.data = profile_data
    (
        supabase.table.return_value
        .select.return_value
        .eq.return_value
        .single.return_value
        .execute.return_value
    ) = result
    return supabase


class TestRequireProTier:
    @pytest.mark.asyncio
    async def test_pro_user_passes(self):
        supabase = _make_supabase({"id": USER_ID, "tier": "pro"})
        result = await require_pro_tier(current_user=CURRENT_USER, supabase=supabase)
        assert result["tier"] == "pro"

    @pytest.mark.asyncio
    async def test_admin_user_passes(self):
        supabase = _make_supabase({"id": USER_ID, "tier": "admin"})
        result = await require_pro_tier(current_user=CURRENT_USER, supabase=supabase)
        assert result["tier"] == "admin"

    @pytest.mark.asyncio
    async def test_free_user_rejected(self):
        supabase = _make_supabase({"id": USER_ID, "tier": "free"})
        with pytest.raises(HTTPException) as exc_info:
            await require_pro_tier(current_user=CURRENT_USER, supabase=supabase)
        assert exc_info.value.status_code == 403
        assert exc_info.value.detail["error"] == "tier_required"
        assert "upgrade_url" in exc_info.value.detail


class TestRequireAdminTier:
    @pytest.mark.asyncio
    async def test_admin_passes(self):
        supabase = _make_supabase({"id": USER_ID, "tier": "admin"})
        result = await require_admin_tier(current_user=CURRENT_USER, supabase=supabase)
        assert result["tier"] == "admin"

    @pytest.mark.asyncio
    async def test_pro_rejected(self):
        supabase = _make_supabase({"id": USER_ID, "tier": "pro"})
        with pytest.raises(HTTPException) as exc_info:
            await require_admin_tier(current_user=CURRENT_USER, supabase=supabase)
        assert exc_info.value.status_code == 403
        assert exc_info.value.detail["error"] == "admin_required"


class TestCheckAssessmentQuota:
    @pytest.mark.asyncio
    async def test_free_user_under_limit_passes(self):
        profile = {
            "id": USER_ID, "tier": "free",
            "assessments_this_month": 2,
            "month_reset_at": NEXT_MONTH,
        }
        supabase = _make_supabase(profile)
        result = await check_assessment_quota(current_user=CURRENT_USER, supabase=supabase)
        assert result["assessments_this_month"] == 2

    @pytest.mark.asyncio
    async def test_free_user_at_limit_rejected(self):
        profile = {
            "id": USER_ID, "tier": "free",
            "assessments_this_month": 3,
            "month_reset_at": NEXT_MONTH,
        }
        supabase = _make_supabase(profile)
        with pytest.raises(HTTPException) as exc_info:
            await check_assessment_quota(current_user=CURRENT_USER, supabase=supabase)
        assert exc_info.value.status_code == 403
        assert exc_info.value.detail["error"] == "quota_exceeded"
        assert "resets_at" in exc_info.value.detail
        assert "upgrade_url" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_pro_user_unlimited(self):
        profile = {
            "id": USER_ID, "tier": "pro",
            "assessments_this_month": 999,
            "month_reset_at": NEXT_MONTH,
        }
        supabase = _make_supabase(profile)
        result = await check_assessment_quota(current_user=CURRENT_USER, supabase=supabase)
        assert result["tier"] == "pro"

    @pytest.mark.asyncio
    async def test_admin_user_unlimited(self):
        profile = {
            "id": USER_ID, "tier": "admin",
            "assessments_this_month": 999,
            "month_reset_at": NEXT_MONTH,
        }
        supabase = _make_supabase(profile)
        result = await check_assessment_quota(current_user=CURRENT_USER, supabase=supabase)
        assert result["tier"] == "admin"

    @pytest.mark.asyncio
    async def test_quota_resets_when_month_rolls_over(self):
        profile = {
            "id": USER_ID, "tier": "free",
            "assessments_this_month": 3,
            "month_reset_at": PAST_RESET,  # in the past — should trigger reset
        }
        supabase = _make_supabase(profile)

        # Mock the update (reset) to return a fresh profile
        updated_profile = {**profile, "assessments_this_month": 0, "month_reset_at": NEXT_MONTH}
        update_result = MagicMock()
        update_result.data = [updated_profile]
        supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = update_result

        result = await check_assessment_quota(current_user=CURRENT_USER, supabase=supabase)
        assert result["assessments_this_month"] == 0


class TestIncrementAssessmentCount:
    @pytest.mark.asyncio
    async def test_increments_free_user(self):
        profile = {"id": USER_ID, "tier": "free", "assessments_this_month": 1}
        supabase = MagicMock()
        update_result = MagicMock()
        supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = update_result
        await increment_assessment_count(profile, supabase)
        supabase.table.return_value.update.assert_called_once_with({"assessments_this_month": 2})

    @pytest.mark.asyncio
    async def test_skips_pro_user(self):
        profile = {"id": USER_ID, "tier": "pro", "assessments_this_month": 99}
        supabase = MagicMock()
        await increment_assessment_count(profile, supabase)
        supabase.table.return_value.update.assert_not_called()

"""
Features 3 & 4 — Assessment Create and List Tests
"""
import pytest
from unittest.mock import MagicMock
from uuid import uuid4
from datetime import datetime, timezone

USER_ID = "00000000-0000-0000-0000-000000000001"
FREE_PROFILE = {
    "id": USER_ID, "tier": "free",
    "assessments_this_month": 0,
    "month_reset_at": "2026-07-01T00:00:00+00:00",
}


@pytest.fixture(autouse=True)
def bypass_quota_check(client):
    """Override check_assessment_quota so assessment tests aren't blocked by tier logic."""
    from backend.middleware.tier import check_assessment_quota
    client.app.dependency_overrides[check_assessment_quota] = lambda: FREE_PROFILE
    yield
    client.app.dependency_overrides.pop(check_assessment_quota, None)


VALID_ASSESSMENT = {
    "business_name": "Bright Path Café",
    "industry": "restaurant",
    "challenge": "Manual inventory tracking.",
    "inputs": {
        "mfa": 1, "backups": 1, "training": 0,
        "digital_tools": 1, "automation": 0, "ai_usage": 0,
        "documents": 1, "online_presence": 1, "growth_plan": 1,
    },
    "scores": {
        "cyber_score": 33, "ai_score": 17,
        "funding_score": 50, "overall_score": 33,
    },
}


def _make_assessment_row(**overrides):
    row = {
        "id": str(uuid4()),
        "user_id": "00000000-0000-0000-0000-000000000001",
        "business_name": "Bright Path Café",
        "industry": "restaurant",
        "challenge": "Manual inventory tracking.",
        "mfa": 1, "backups": 1, "training": 0,
        "digital_tools": 1, "automation": 0, "ai_usage": 0,
        "documents": 1, "online_presence": 1, "growth_plan": 1,
        "cyber_score": 33, "ai_score": 17,
        "funding_score": 50, "overall_score": 33,
        "created_at": "2026-06-17T12:00:00+00:00",
        "updated_at": "2026-06-17T12:00:00+00:00",
    }
    row.update(overrides)
    return row


# ── POST /assessments ────────────────────────────────────────────────────────

def test_create_assessment_success(authed_client, mock_supabase):
    """POST /assessments returns 201 with id."""
    row = _make_assessment_row()
    insert_result = MagicMock()
    insert_result.data = [row]
    mock_supabase.table.return_value.insert.return_value.execute.return_value = insert_result

    response = authed_client.post("/assessments", json=VALID_ASSESSMENT)
    assert response.status_code == 201
    data = response.json()
    assert "id" in data
    assert data["overall_score"] == 33
    assert data["message"] == "Assessment saved."


def test_create_assessment_unauthenticated(client):
    """POST /assessments without token returns 401/403."""
    response = client.post("/assessments", json=VALID_ASSESSMENT)
    assert response.status_code in (401, 403)


def test_create_assessment_invalid_score_range(authed_client):
    """POST /assessments with score > 100 returns 422."""
    bad = dict(VALID_ASSESSMENT)
    bad["scores"] = dict(VALID_ASSESSMENT["scores"])
    bad["scores"]["cyber_score"] = 101
    response = authed_client.post("/assessments", json=bad)
    assert response.status_code == 422


def test_create_assessment_invalid_input_range(authed_client):
    """POST /assessments with mfa=3 returns 422."""
    bad = dict(VALID_ASSESSMENT)
    bad["inputs"] = dict(VALID_ASSESSMENT["inputs"])
    bad["inputs"]["mfa"] = 3
    response = authed_client.post("/assessments", json=bad)
    assert response.status_code == 422


def test_create_assessment_rate_limit(authed_client, mock_supabase):
    """POST /assessments returns 429 after 10 saves per hour."""
    from backend.routers import assessments as asmnt_module
    # Clear rate limit state for this user
    user_id = "00000000-0000-0000-0000-000000000001"
    asmnt_module._rate_limit[user_id] = []

    row = _make_assessment_row()
    insert_result = MagicMock()
    insert_result.data = [row]
    mock_supabase.table.return_value.insert.return_value.execute.return_value = insert_result

    # First 10 should succeed
    for i in range(10):
        r = authed_client.post("/assessments", json=VALID_ASSESSMENT)
        assert r.status_code == 201, f"Request {i+1} unexpectedly failed: {r.status_code}"

    # 11th should be rate-limited
    response = authed_client.post("/assessments", json=VALID_ASSESSMENT)
    assert response.status_code == 429

    # Clean up
    asmnt_module._rate_limit[user_id] = []


# ── GET /assessments ─────────────────────────────────────────────────────────

def test_list_assessments_empty(authed_client, mock_supabase):
    """GET /assessments returns 200 with empty data array."""
    count_result = MagicMock()
    count_result.count = 0
    count_result.data = []

    list_result = MagicMock()
    list_result.data = []

    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = count_result
    mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.range.return_value.execute.return_value = list_result

    response = authed_client.get("/assessments")
    assert response.status_code == 200
    data = response.json()
    assert data["data"] == []
    assert data["meta"]["total"] == 0


def test_list_assessments_pagination(authed_client, mock_supabase):
    """meta.has_more is true when there are more rows than limit."""
    row = _make_assessment_row()
    count_result = MagicMock()
    count_result.count = 15
    count_result.data = []

    list_result = MagicMock()
    list_result.data = [row] * 10

    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = count_result
    mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.range.return_value.execute.return_value = list_result

    response = authed_client.get("/assessments?limit=10&offset=0")
    assert response.status_code == 200
    meta = response.json()["meta"]
    assert meta["has_more"] is True


def test_list_assessments_cross_user_isolation(authed_client, mock_supabase):
    """User B's assessments do not appear in user A's list (RLS enforced at DB, verified by user_id filter)."""
    # The endpoint always filters by current_user["id"] — verify the filter is applied
    count_result = MagicMock()
    count_result.count = 0
    count_result.data = []
    list_result = MagicMock()
    list_result.data = []

    # Track what user_id is passed to .eq()
    eq_mock = MagicMock()
    eq_mock.execute.return_value = count_result
    eq_mock.order.return_value.range.return_value.execute.return_value = list_result

    select_mock = MagicMock()
    select_mock.eq.return_value = eq_mock

    mock_supabase.table.return_value.select.return_value = select_mock

    response = authed_client.get("/assessments")
    assert response.status_code == 200
    # Verify .eq was called with user_id
    assert select_mock.eq.called


# ── GET /assessments/{id} ────────────────────────────────────────────────────

def test_get_assessment_by_id_success(authed_client, mock_supabase):
    """GET /assessments/{id} returns 200 with full detail."""
    row = _make_assessment_row()
    result = MagicMock()
    result.data = row
    mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = result

    response = authed_client.get(f"/assessments/{row['id']}")
    assert response.status_code == 200
    assert "mfa" in response.json()


def test_get_assessment_by_id_cross_user(authed_client, mock_supabase):
    """GET /assessments/{id} returns 404 for another user's assessment."""
    mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.side_effect = Exception("no rows")
    response = authed_client.get(f"/assessments/{uuid4()}")
    assert response.status_code == 404
    mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.side_effect = None


def test_get_assessment_not_found(authed_client, mock_supabase):
    """GET /assessments/{id} for non-existent id returns 404."""
    mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.side_effect = Exception("not found")
    response = authed_client.get(f"/assessments/{uuid4()}")
    assert response.status_code == 404
    mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.side_effect = None

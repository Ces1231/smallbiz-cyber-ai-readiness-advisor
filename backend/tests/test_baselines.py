"""
Feature 5 — Baseline Tests
"""
import pytest
from unittest.mock import MagicMock
from uuid import uuid4


ASSESSMENT_ID = str(uuid4())


def _make_baseline_row(**overrides):
    row = {
        "id": str(uuid4()),
        "user_id": "00000000-0000-0000-0000-000000000001",
        "assessment_id": ASSESSMENT_ID,
        "business_name": "Bright Path Café",
        "cyber_score": 33,
        "ai_score": 17,
        "funding_score": 50,
        "overall_score": 33,
        "saved_at": "2026-06-17T12:00:00+00:00",
        "created_at": "2026-06-17T12:00:00+00:00",
    }
    row.update(overrides)
    return row


def _make_assessment_row():
    return {
        "id": ASSESSMENT_ID,
        "business_name": "Bright Path Café",
        "cyber_score": 33,
        "ai_score": 17,
        "funding_score": 50,
        "overall_score": 33,
    }


def test_get_baseline_not_set(authed_client, mock_supabase):
    """GET /baselines/me returns 404 when no baseline is set."""
    mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.side_effect = Exception("no rows")
    response = authed_client.get("/baselines/me")
    assert response.status_code == 404
    mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.side_effect = None


def test_save_baseline_success(authed_client, mock_supabase):
    """POST /baselines returns 200 with saved baseline data."""
    # Assessment lookup
    asmnt_result = MagicMock()
    asmnt_result.data = _make_assessment_row()

    # Upsert result
    baseline_row = _make_baseline_row()
    upsert_result = MagicMock()
    upsert_result.data = [baseline_row]

    # Wire mocks: first call (assessments lookup), second call (baselines upsert)
    call_count = [0]
    def table_side_effect(name):
        m = MagicMock()
        if name == "assessments":
            m.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = asmnt_result
        elif name == "baselines":
            m.upsert.return_value.execute.return_value = upsert_result
        return m

    mock_supabase.table.side_effect = table_side_effect

    response = authed_client.post("/baselines", json={"assessment_id": ASSESSMENT_ID})
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert data["message"] == "Baseline saved."

    mock_supabase.table.side_effect = None


def test_save_baseline_overwrites_previous(authed_client, mock_supabase):
    """POST /baselines twice uses upsert — does not create a duplicate."""
    asmnt_result = MagicMock()
    asmnt_result.data = _make_assessment_row()
    baseline_row = _make_baseline_row()
    upsert_result = MagicMock()
    upsert_result.data = [baseline_row]

    def table_side_effect(name):
        m = MagicMock()
        if name == "assessments":
            m.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = asmnt_result
        elif name == "baselines":
            m.upsert.return_value.execute.return_value = upsert_result
        return m

    mock_supabase.table.side_effect = table_side_effect

    # First save
    r1 = authed_client.post("/baselines", json={"assessment_id": ASSESSMENT_ID})
    assert r1.status_code == 200

    # Second save (same user, same assessment) — upsert should not raise
    r2 = authed_client.post("/baselines", json={"assessment_id": ASSESSMENT_ID})
    assert r2.status_code == 200

    mock_supabase.table.side_effect = None


def test_save_baseline_cross_user_assessment(authed_client, mock_supabase):
    """POST /baselines with an assessment_id from another user returns 404."""
    def table_side_effect(name):
        m = MagicMock()
        if name == "assessments":
            m.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.side_effect = Exception("no rows")
        return m

    mock_supabase.table.side_effect = table_side_effect
    response = authed_client.post("/baselines", json={"assessment_id": str(uuid4())})
    assert response.status_code == 404
    mock_supabase.table.side_effect = None


def test_delete_baseline(authed_client, mock_supabase):
    """DELETE /baselines/me returns 200; subsequent GET returns 404."""
    # Delete
    delete_result = MagicMock()
    delete_result.data = []

    def table_side_effect_delete(name):
        m = MagicMock()
        m.delete.return_value.eq.return_value.execute.return_value = delete_result
        return m

    mock_supabase.table.side_effect = table_side_effect_delete
    r = authed_client.delete("/baselines/me")
    assert r.status_code == 200
    assert "Baseline removed" in r.json()["message"]
    mock_supabase.table.side_effect = None

    # GET after delete should return 404
    mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.side_effect = Exception("no rows")
    r2 = authed_client.get("/baselines/me")
    assert r2.status_code == 404
    mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.side_effect = None

"""
Feature 2 — AI Advice SSE Endpoint Tests
Tests for GET /ai/advice/{assessment_id}/{dimension} and GET /ai/health.
"""
import pytest
import time
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

# ---------------------------------------------------------------------------
# Test data
# ---------------------------------------------------------------------------

TEST_USER_ID = "00000000-0000-0000-0000-000000000001"
OTHER_USER_ID = "00000000-0000-0000-0000-000000000099"


def _make_assessment_row(user_id: str = TEST_USER_ID, **overrides):
    row = {
        "id": str(uuid4()),
        "user_id": user_id,
        "business_name": "Test Bakery",
        "industry": "restaurant",
        "challenge": "Too much manual work.",
        "cyber_score": 40,
        "ai_score": 30,
        "funding_score": 50,
        "overall_score": 40,
        "mfa": 1, "backups": 0, "training": 0,
        "digital_tools": 1, "automation": 0, "ai_usage": 0,
        "documents": 1, "online_presence": 1, "growth_plan": 1,
        "created_at": "2026-06-17T12:00:00+00:00",
        "updated_at": "2026-06-17T12:00:00+00:00",
    }
    row.update(overrides)
    return row


def _mock_assessment_supabase(mock_supabase, row):
    """Configures mock_supabase so .table("assessments").select(...).eq(...).eq(...).single().execute() returns the row."""
    single_mock = MagicMock()
    single_mock.execute.return_value = MagicMock(data=row)
    eq2_mock = MagicMock()
    eq2_mock.single.return_value = single_mock
    eq1_mock = MagicMock()
    eq1_mock.eq.return_value = eq2_mock
    select_mock = MagicMock()
    select_mock.eq.return_value = eq1_mock
    mock_supabase.table.return_value.select.return_value = select_mock


def _mock_cache_miss(mock_supabase):
    """Configures mock_supabase advice_cache lookup (3 .eq() filters) to return no rows."""
    limit_mock = MagicMock()
    limit_mock.execute.return_value = MagicMock(data=[])
    # Chain: .select().eq(assessment_id).eq(user_id).eq(dimension).limit(1)
    eq3_mock = MagicMock()
    eq3_mock.limit.return_value = limit_mock
    eq2_mock = MagicMock()
    eq2_mock.eq.return_value = eq3_mock
    eq1_mock = MagicMock()
    eq1_mock.eq.return_value = eq2_mock
    select_mock = MagicMock()
    select_mock.eq.return_value = eq1_mock
    return select_mock


def _mock_cache_hit(mock_supabase, content: str):
    """Configures mock_supabase advice_cache lookup (3 .eq() filters) to return cached content."""
    limit_mock = MagicMock()
    limit_mock.execute.return_value = MagicMock(data=[{"content": content}])
    # Chain: .select().eq(assessment_id).eq(user_id).eq(dimension).limit(1)
    eq3_mock = MagicMock()
    eq3_mock.limit.return_value = limit_mock
    eq2_mock = MagicMock()
    eq2_mock.eq.return_value = eq3_mock
    eq1_mock = MagicMock()
    eq1_mock.eq.return_value = eq2_mock
    select_mock = MagicMock()
    select_mock.eq.return_value = eq1_mock
    return select_mock


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def reset_rate_limit(mock_supabase):
    """Reset in-memory AI rate limit AND Supabase mock side_effects between tests."""
    from backend.routers.ai import _ai_rate_limit
    _ai_rate_limit.clear()
    yield
    _ai_rate_limit.clear()
    # Remove any table side_effect set by individual tests so other test modules
    # continue to see the clean MagicMock behaviour.
    mock_supabase.table.side_effect = None
    mock_supabase.table.reset_mock(side_effect=False, return_value=False)


@pytest.fixture
def mock_ai():
    """Mock AIProvider that yields a short text stream."""
    async def _stream(system_prompt, user_message, max_tokens=1024, temperature=0.7):
        for chunk in ["Here is ", "your advice."]:
            yield chunk

    provider = MagicMock()
    provider.stream_completion = _stream
    provider.health_check = AsyncMock(return_value=True)
    return provider


# ---------------------------------------------------------------------------
# Helper: build an authed test client with specific supabase/ai mocks
# ---------------------------------------------------------------------------

def _make_authed_client(mock_supabase, mock_ai_provider=None):
    """Creates a FastAPI TestClient with auth mocked and optionally overrides the AI provider."""
    from fastapi.testclient import TestClient
    from backend.main import create_app

    test_user = MagicMock()
    test_user.id = TEST_USER_ID
    test_user.email = "test@example.com"
    test_user.created_at = "2026-06-17T00:00:00Z"

    auth_response = MagicMock()
    auth_response.user = test_user
    mock_supabase.auth.get_user.return_value = auth_response

    app = create_app()

    if mock_ai_provider is not None:
        from backend.ai.factory import get_ai_provider
        app.dependency_overrides[get_ai_provider] = lambda: mock_ai_provider

    return TestClient(app, raise_server_exceptions=False)


# ---------------------------------------------------------------------------
# Test: stream new advice — verifies SSE format and [DONE] sentinel
# ---------------------------------------------------------------------------

def test_stream_advice_cyber_new_assessment(mock_supabase, mock_ai):
    """GET /ai/advice/{id}/cyber streams SSE chunks and ends with [DONE]."""
    assessment_id = str(uuid4())
    row = _make_assessment_row(id=assessment_id)

    # Assessment lookup
    _mock_assessment_supabase(mock_supabase, row)

    # Cache miss
    cache_select = _mock_cache_miss(mock_supabase)

    # Cache insert (write after stream)
    insert_mock = MagicMock()
    insert_mock.execute.return_value = MagicMock(data=[{"id": str(uuid4())}])

    # Route table calls in order: first "assessments", then "advice_cache" select, then "advice_cache" insert
    call_count = {"n": 0}
    def table_router(name):
        call_count["n"] += 1
        if name == "assessments":
            tbl = MagicMock()
            single_mock = MagicMock()
            single_mock.execute.return_value = MagicMock(data=row)
            eq2 = MagicMock(); eq2.single.return_value = single_mock
            eq1 = MagicMock(); eq1.eq.return_value = eq2
            sel = MagicMock(); sel.eq.return_value = eq1
            tbl.select.return_value = sel
            return tbl
        if name == "advice_cache":
            tbl = MagicMock()
            # select (cache lookup)
            tbl.select.return_value = cache_select
            # insert (cache write)
            tbl.insert.return_value = insert_mock
            return tbl
        return MagicMock()

    mock_supabase.table.side_effect = table_router

    client = _make_authed_client(mock_supabase, mock_ai)
    response = client.get(
        f"/ai/advice/{assessment_id}/cyber",
        headers={"Authorization": "Bearer valid-test-token"},
    )

    assert response.status_code == 200
    assert "text/event-stream" in response.headers.get("content-type", "")
    body = response.text
    assert "data: " in body
    assert "data: [DONE]\n\n" in body
    # Should NOT contain [CACHED] sentinel for a fresh generation
    assert "data: [CACHED]\n\n" not in body


# ---------------------------------------------------------------------------
# Test: cache hit — second call returns [CACHED] sentinel
# ---------------------------------------------------------------------------

def test_stream_advice_cache_hit(mock_supabase, mock_ai):
    """When advice_cache has an entry, response includes [CACHED] sentinel."""
    assessment_id = str(uuid4())
    row = _make_assessment_row(id=assessment_id)
    cached_content = "This is cached advice text."

    def table_router(name):
        if name == "assessments":
            tbl = MagicMock()
            single_mock = MagicMock()
            single_mock.execute.return_value = MagicMock(data=row)
            eq2 = MagicMock(); eq2.single.return_value = single_mock
            eq1 = MagicMock(); eq1.eq.return_value = eq2
            sel = MagicMock(); sel.eq.return_value = eq1
            tbl.select.return_value = sel
            return tbl
        if name == "advice_cache":
            tbl = MagicMock()
            cache_select = _mock_cache_hit(mock_supabase, cached_content)
            tbl.select.return_value = cache_select
            return tbl
        return MagicMock()

    mock_supabase.table.side_effect = table_router

    client = _make_authed_client(mock_supabase, mock_ai)
    response = client.get(
        f"/ai/advice/{assessment_id}/cyber",
        headers={"Authorization": "Bearer valid-test-token"},
    )

    assert response.status_code == 200
    body = response.text
    assert "data: [DONE]\n\n" in body
    assert "data: [CACHED]\n\n" in body
    # Cached content should appear in the stream body (not AI-generated mock chunks)
    assert "This is cached advice text." in body
    # The AI mock stream chunks must NOT appear (cache hit skips AI generation)
    assert "Here is " not in body
    assert "your advice." not in body


# ---------------------------------------------------------------------------
# Test: cache hit skips AI provider call
# ---------------------------------------------------------------------------

def test_cache_hit_skips_ai_provider_call(mock_supabase):
    """When cache hit, AI provider stream_completion is never called."""
    assessment_id = str(uuid4())
    row = _make_assessment_row(id=assessment_id)
    cached_content = "Some cached content here."

    # Track whether stream_completion was invoked
    stream_called = False

    async def _stream_spy(system_prompt, user_message, **kwargs):
        nonlocal stream_called
        stream_called = True
        yield "should not appear"

    spy_ai = MagicMock()
    spy_ai.stream_completion = _stream_spy

    def table_router(name):
        if name == "assessments":
            tbl = MagicMock()
            single_mock = MagicMock()
            single_mock.execute.return_value = MagicMock(data=row)
            eq2 = MagicMock(); eq2.single.return_value = single_mock
            eq1 = MagicMock(); eq1.eq.return_value = eq2
            sel = MagicMock(); sel.eq.return_value = eq1
            tbl.select.return_value = sel
            return tbl
        if name == "advice_cache":
            tbl = MagicMock()
            cache_select = _mock_cache_hit(mock_supabase, cached_content)
            tbl.select.return_value = cache_select
            return tbl
        return MagicMock()

    mock_supabase.table.side_effect = table_router

    client = _make_authed_client(mock_supabase, spy_ai)
    response = client.get(
        f"/ai/advice/{assessment_id}/cyber",
        headers={"Authorization": "Bearer valid-test-token"},
    )

    assert response.status_code == 200
    assert "data: [CACHED]\n\n" in response.text
    assert stream_called is False


# ---------------------------------------------------------------------------
# Test: cross-user assessment returns 404 before streaming
# ---------------------------------------------------------------------------

def test_stream_advice_cross_user_assessment(mock_supabase, mock_ai):
    """Assessment belonging to another user returns 404 — not a stream error."""
    assessment_id = str(uuid4())

    def table_router(name):
        if name == "assessments":
            tbl = MagicMock()
            # Simulate "no rows" exception from Supabase single()
            single_mock = MagicMock()
            single_mock.execute.side_effect = Exception("no rows returned")
            eq2 = MagicMock(); eq2.single.return_value = single_mock
            eq1 = MagicMock(); eq1.eq.return_value = eq2
            sel = MagicMock(); sel.eq.return_value = eq1
            tbl.select.return_value = sel
            return tbl
        return MagicMock()

    mock_supabase.table.side_effect = table_router

    client = _make_authed_client(mock_supabase, mock_ai)
    response = client.get(
        f"/ai/advice/{assessment_id}/cyber",
        headers={"Authorization": "Bearer valid-test-token"},
    )

    assert response.status_code == 404
    data = response.json()
    assert data["detail"]["error"] == "assessment_not_found"


# ---------------------------------------------------------------------------
# Test: rate limit — 429 after 20 requests in 24 hours
# ---------------------------------------------------------------------------

def test_stream_advice_rate_limited(mock_supabase, mock_ai):
    """After 20 requests, the 21st returns HTTP 429 before any streaming."""
    from backend.routers.ai import _ai_rate_limit, AI_RATE_LIMIT_WINDOW

    # Pre-fill the rate limit bucket for test user
    now = time.time()
    _ai_rate_limit[TEST_USER_ID] = [now - 1] * 20  # 20 recent requests

    assessment_id = str(uuid4())

    client = _make_authed_client(mock_supabase, mock_ai)
    response = client.get(
        f"/ai/advice/{assessment_id}/cyber",
        headers={"Authorization": "Bearer valid-test-token"},
    )

    assert response.status_code == 429
    data = response.json()
    assert data["detail"]["error"] == "ai_rate_limit"


# ---------------------------------------------------------------------------
# Test: assessment with missing scores returns 422 before streaming
# ---------------------------------------------------------------------------

def test_stream_advice_assessment_incomplete(mock_supabase, mock_ai):
    """Assessment with null scores returns HTTP 422 before any streaming begins."""
    assessment_id = str(uuid4())
    # Row with null cyber/ai/funding scores
    incomplete_row = _make_assessment_row(
        id=assessment_id,
        cyber_score=None,
        ai_score=None,
        funding_score=None,
    )

    def table_router(name):
        if name == "assessments":
            tbl = MagicMock()
            single_mock = MagicMock()
            single_mock.execute.return_value = MagicMock(data=incomplete_row)
            eq2 = MagicMock(); eq2.single.return_value = single_mock
            eq1 = MagicMock(); eq1.eq.return_value = eq2
            sel = MagicMock(); sel.eq.return_value = eq1
            tbl.select.return_value = sel
            return tbl
        return MagicMock()

    mock_supabase.table.side_effect = table_router

    client = _make_authed_client(mock_supabase, mock_ai)
    response = client.get(
        f"/ai/advice/{assessment_id}/cyber",
        headers={"Authorization": "Bearer valid-test-token"},
    )

    assert response.status_code == 422
    data = response.json()
    assert data["detail"]["error"] == "assessment_incomplete"


# ---------------------------------------------------------------------------
# Test: AI health endpoint returns provider info
# ---------------------------------------------------------------------------

def test_ai_health_returns_provider_info(mock_supabase):
    """GET /ai/health returns provider, model, available, latency_ms."""
    mock_ai = MagicMock()
    mock_ai.health_check = AsyncMock(return_value=True)

    client = _make_authed_client(mock_supabase, mock_ai)
    response = client.get("/ai/health")

    assert response.status_code == 200
    data = response.json()
    assert "provider" in data
    assert "model" in data
    assert data["available"] is True
    assert isinstance(data["latency_ms"], int)
    assert data["latency_ms"] >= 0


# ---------------------------------------------------------------------------
# Test: cache write is called after stream completes
# ---------------------------------------------------------------------------

def test_cache_write_on_stream_completion(mock_supabase, mock_ai):
    """After streaming completes, advice_cache.insert() is called once."""
    assessment_id = str(uuid4())
    row = _make_assessment_row(id=assessment_id)

    insert_execute = MagicMock(return_value=MagicMock(data=[{"id": str(uuid4())}]))
    insert_mock = MagicMock()
    insert_mock.execute = insert_execute

    def table_router(name):
        if name == "assessments":
            tbl = MagicMock()
            single_mock = MagicMock()
            single_mock.execute.return_value = MagicMock(data=row)
            eq2 = MagicMock(); eq2.single.return_value = single_mock
            eq1 = MagicMock(); eq1.eq.return_value = eq2
            sel = MagicMock(); sel.eq.return_value = eq1
            tbl.select.return_value = sel
            return tbl
        if name == "advice_cache":
            tbl = MagicMock()
            # Cache miss on select
            tbl.select.return_value = _mock_cache_miss(mock_supabase)
            # Record insert calls
            tbl.insert.return_value = insert_mock
            return tbl
        return MagicMock()

    mock_supabase.table.side_effect = table_router

    client = _make_authed_client(mock_supabase, mock_ai)
    response = client.get(
        f"/ai/advice/{assessment_id}/cyber",
        headers={"Authorization": "Bearer valid-test-token"},
    )

    assert response.status_code == 200
    body = response.text
    assert "data: [DONE]\n\n" in body
    # Verify insert was called (cache write happened)
    assert insert_mock.execute.called

"""
Feature 1 — Backend Scaffold Tests
Tests: health check, CORS, and get_current_user dependency.
"""
import pytest
from unittest.mock import MagicMock


def test_health_check(client):
    """GET /health returns 200 with status/env."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["env"] == "test"


def test_cors_allowed_origin(client):
    """CORS header present for an allowed origin."""
    response = client.get(
        "/health",
        headers={"Origin": "http://localhost:3000"},
    )
    assert response.status_code == 200
    assert "access-control-allow-origin" in response.headers


def test_cors_blocked_origin(client):
    """No allow-origin header (or wildcard) for unlisted origins."""
    response = client.get(
        "/health",
        headers={"Origin": "https://evil.example.com"},
    )
    # FastAPI CORS middleware omits the header for non-listed origins
    assert response.headers.get("access-control-allow-origin") != "https://evil.example.com"


def test_get_current_user_no_token(client):
    """GET /auth/me without a token returns 403 (HTTPBearer requires credentials)."""
    response = client.get("/auth/me")
    assert response.status_code in (401, 403)


def test_get_current_user_invalid_token(client, mock_supabase):
    """GET /auth/me with invalid token returns 401."""
    mock_supabase.auth.get_user.side_effect = Exception("Invalid token")
    response = client.get(
        "/auth/me",
        headers={"Authorization": "Bearer invalid-token"},
    )
    assert response.status_code == 401
    mock_supabase.auth.get_user.side_effect = None

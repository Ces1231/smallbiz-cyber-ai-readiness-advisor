"""
Feature 2 — Auth Endpoint Tests
Tests: signup, login, logout, /me
"""
import pytest
from unittest.mock import MagicMock


# ── /auth/signup ─────────────────────────────────────────────────────────────

def test_signup_success(client, mock_supabase):
    """POST /auth/signup returns 201 with user_id and email."""
    user = MagicMock()
    user.id = "00000000-0000-0000-0000-000000000001"
    user.email = "owner@brightpath.com"
    result = MagicMock()
    result.user = user
    mock_supabase.auth.sign_up.return_value = result

    response = client.post(
        "/auth/signup",
        json={"email": "owner@brightpath.com", "password": "SecurePass1!", "business_name": "Bright Path Café"},
    )
    assert response.status_code == 201
    data = response.json()
    assert "user_id" in data
    assert data["email"] == "owner@brightpath.com"


def test_signup_duplicate_email(client, mock_supabase):
    """POST /auth/signup with existing email returns 409."""
    mock_supabase.auth.sign_up.side_effect = Exception("already registered")
    response = client.post(
        "/auth/signup",
        json={"email": "dup@example.com", "password": "SecurePass1!", "business_name": "Test Biz"},
    )
    assert response.status_code == 409
    mock_supabase.auth.sign_up.side_effect = None


def test_signup_weak_password(client, mock_supabase):
    """POST /auth/signup with a password < 8 chars or no uppercase returns 422."""
    response = client.post(
        "/auth/signup",
        json={"email": "weak@example.com", "password": "short1", "business_name": "Test Biz"},
    )
    assert response.status_code == 422


def test_signup_no_uppercase_password(client, mock_supabase):
    """POST /auth/signup with all-lowercase password returns 422."""
    response = client.post(
        "/auth/signup",
        json={"email": "low@example.com", "password": "alllower1!", "business_name": "Test Biz"},
    )
    assert response.status_code == 422


def test_signup_no_digit_password(client, mock_supabase):
    """POST /auth/signup with no digit in password returns 422."""
    response = client.post(
        "/auth/signup",
        json={"email": "nodig@example.com", "password": "NoDigitPass!", "business_name": "Test Biz"},
    )
    assert response.status_code == 422


# ── /auth/login ───────────────────────────────────────────────────────────────

def test_login_success(client, mock_supabase):
    """POST /auth/login returns 200 with access_token."""
    user = MagicMock()
    user.id = "00000000-0000-0000-0000-000000000001"
    user.email = "owner@brightpath.com"
    session = MagicMock()
    session.access_token = "eyJtest.token"
    session.expires_in = 3600
    result = MagicMock()
    result.user = user
    result.session = session
    mock_supabase.auth.sign_in_with_password.return_value = result

    response = client.post(
        "/auth/login",
        json={"email": "owner@brightpath.com", "password": "SecurePass1!"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password(client, mock_supabase):
    """POST /auth/login with wrong password returns 401."""
    mock_supabase.auth.sign_in_with_password.side_effect = Exception("Invalid credentials")
    response = client.post(
        "/auth/login",
        json={"email": "owner@brightpath.com", "password": "WrongPass1!"},
    )
    assert response.status_code == 401
    mock_supabase.auth.sign_in_with_password.side_effect = None


def test_login_unconfirmed_email(client, mock_supabase):
    """POST /auth/login with unconfirmed email returns 403."""
    mock_supabase.auth.sign_in_with_password.side_effect = Exception("Email not confirmed")
    response = client.post(
        "/auth/login",
        json={"email": "unconf@example.com", "password": "SecurePass1!"},
    )
    assert response.status_code == 403
    mock_supabase.auth.sign_in_with_password.side_effect = None


# ── /auth/logout ──────────────────────────────────────────────────────────────

def test_logout_success(authed_client, mock_supabase):
    """POST /auth/logout returns 200."""
    mock_supabase.auth.sign_out.return_value = None
    response = authed_client.post("/auth/logout")
    assert response.status_code == 200
    assert "Logged out" in response.json()["message"]


# ── /auth/me ──────────────────────────────────────────────────────────────────

def test_me_authenticated(authed_client):
    """GET /auth/me returns 200 with user object."""
    response = authed_client.get("/auth/me")
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert "email" in data


def test_me_unauthenticated(client):
    """GET /auth/me without token returns 401/403."""
    response = client.get("/auth/me")
    assert response.status_code in (401, 403)

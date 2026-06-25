"""
Test configuration and fixtures.
Uses environment-based mocking so Supabase calls can be patched.
"""
import os
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

# Set required env vars before importing the app
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
os.environ.setdefault("SUPABASE_ANON_KEY", "test-anon-key")
os.environ.setdefault("ALLOWED_ORIGINS", "http://localhost:3000")
os.environ.setdefault("APP_ENV", "test")


@pytest.fixture(scope="session")
def mock_supabase():
    """Session-scoped Supabase mock — patch create_client globally."""
    with patch("backend.dependencies.create_client") as mock_create:
        client = MagicMock()
        mock_create.return_value = client
        yield client


@pytest.fixture
def client(mock_supabase):
    """FastAPI test client with mocked Supabase."""
    from backend.main import create_app
    app = create_app()
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


@pytest.fixture
def authed_client(client, mock_supabase):
    """Test client that includes a valid Bearer token.
    The mock_supabase fixture patches auth.get_user to return a test user.
    """
    test_user = MagicMock()
    test_user.id = "00000000-0000-0000-0000-000000000001"
    test_user.email = "test@example.com"
    test_user.created_at = "2026-06-17T00:00:00Z"

    auth_response = MagicMock()
    auth_response.user = test_user
    mock_supabase.auth.get_user.return_value = auth_response

    client.headers = {"Authorization": "Bearer valid-test-token"}
    yield client

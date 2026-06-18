"""
SmallBiz Advisor — FastAPI Dependencies
Provides Supabase client and auth middleware via FastAPI Depends().
"""
import structlog
from supabase import create_client, Client
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from backend.config import settings

log = structlog.get_logger()
security = HTTPBearer()


def get_supabase_client() -> Client:
    """Returns a Supabase client using the service role key (server-side only)."""
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    supabase: Client = Depends(get_supabase_client),
) -> dict:
    """
    Validates the Bearer JWT issued by Supabase Auth.
    Returns the decoded user dict: {id, email, ...}
    Raises HTTP 401 if token is invalid or expired.
    """
    token = credentials.credentials
    try:
        response = supabase.auth.get_user(token)
        if response is None or response.user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error": "auth_invalid_token",
                    "message": "Your session has expired. Please log in again.",
                    "details": {},
                },
            )
        user = response.user
        log.info("token_validated", user_id=str(user.id))
        return {"id": str(user.id), "email": user.email, "created_at": str(user.created_at)}
    except HTTPException:
        raise
    except Exception as exc:
        log.info(
            "token_invalid",
            error=str(exc),
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": "auth_invalid_token",
                "message": "Your session has expired. Please log in again.",
                "details": {},
            },
        )

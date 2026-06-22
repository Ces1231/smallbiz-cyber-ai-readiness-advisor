"""
Champ Compass — FastAPI Dependencies
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
        log.warning(
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


async def get_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    """Returns the raw Bearer token string for endpoints that need to pass it to Supabase admin."""
    return credentials.credentials


async def require_purchase(
    product_key: str,
    current_user: dict,
    supabase: Client,
) -> dict:
    """
    Verifies the current user has a completed purchase for the given product_key.
    launch_packet_pro access also satisfies launch_builder (pro is a superset).
    Raises HTTP 402 if no valid purchase found.
    """
    user_id = current_user["id"]
    keys_to_check = [product_key]
    if product_key == "launch_builder":
        keys_to_check.append("launch_packet_pro")

    try:
        result = (
            supabase.table("purchases")
            .select("id, product_key")
            .eq("user_id", user_id)
            .in_("product_key", keys_to_check)
            .eq("status", "completed")
            .limit(1)
            .execute()
        )
    except Exception as exc:
        log.error("require_purchase_db_error", user_id=user_id, product_key=product_key, error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "error": "purchase_required",
                "message": "A purchase is required to access this content.",
                "details": {"product_key": product_key},
            },
        )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "error": "purchase_required",
                "message": "A purchase is required to access this content.",
                "details": {"product_key": product_key},
            },
        )
    return current_user

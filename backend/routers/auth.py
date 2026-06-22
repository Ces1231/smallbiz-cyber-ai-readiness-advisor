"""
Champ Compass — Auth Router
Endpoints: /auth/signup, /auth/login, /auth/logout, /auth/me
Uses Supabase Auth as the identity provider.
"""
import asyncio
import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

from backend.email_helper import send_signup_notification_email, send_welcome_email

from backend.dependencies import get_supabase_client, get_current_user, get_token
from backend.schemas.auth import (
    SignupRequest,
    LoginRequest,
    SignupResponse,
    LoginResponse,
    LoginUser,
    MeResponse,
    MessageResponse,
    ForgotPasswordRequest,
    ChangePasswordRequest,
)

router = APIRouter()
log = structlog.get_logger()


@router.post("/signup", response_model=SignupResponse, status_code=201)
async def signup(
    body: SignupRequest,
    supabase: Client = Depends(get_supabase_client),
) -> SignupResponse:
    """Create account via Supabase Auth."""
    try:
        result = supabase.auth.sign_up(
            {
                "email": body.email,
                "password": body.password,
                "options": {"data": {"business_name": body.business_name}},
            }
        )
    except Exception as exc:
        err_str = str(exc).lower()
        if "already registered" in err_str or ("email" in err_str and "exist" in err_str) or "user already exists" in err_str:
            log.info("signup_conflict", reason="email_exists")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "error": "auth_email_exists",
                    "message": "An account with this email already exists.",
                    "details": {},
                },
            )
        log.error("signup_error", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "service_unavailable",
                "message": "Our service is temporarily unavailable. Please try again shortly.",
                "details": {},
            },
        )

    if result is None or result.user is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": "auth_email_exists",
                "message": "An account with this email already exists.",
                "details": {},
            },
        )

    log.info("user_created", user_id=str(result.user.id))
    asyncio.create_task(
        send_signup_notification_email(
            user_email=body.email,
            business_name=body.business_name or "",
            user_id=str(result.user.id),
        )
    )
    asyncio.create_task(
        send_welcome_email(user_email=body.email, business_name=body.business_name or "")
    )
    # When GOTRUE_MAILER_AUTOCONFIRM=true the session is immediately available —
    # return the token so the client can skip the email-confirm step.
    if result.session and result.session.access_token:
        return SignupResponse(
            user_id=str(result.user.id),
            email=result.user.email,
            message="Account created.",
            access_token=result.session.access_token,
            token_type="bearer",
            expires_in=result.session.expires_in or 3600,
        )
    return SignupResponse(
        user_id=str(result.user.id),
        email=result.user.email,
        message="Check your email to confirm your account.",
    )


@router.post("/login", response_model=LoginResponse, status_code=200)
async def login(
    body: LoginRequest,
    supabase: Client = Depends(get_supabase_client),
) -> LoginResponse:
    """Exchange email/password for a JWT."""
    try:
        result = supabase.auth.sign_in_with_password(
            {"email": body.email, "password": body.password}
        )
    except Exception as exc:
        err_str = str(exc).lower()
        if "not confirmed" in err_str:
            log.warning("login_failed", reason="email_unconfirmed")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "auth_email_unconfirmed",
                    "message": "Please confirm your email before logging in.",
                    "details": {},
                },
            )
        if "invalid" in err_str or "credentials" in err_str or "wrong" in err_str:
            log.warning("login_failed", reason="invalid_credentials")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error": "auth_invalid_credentials",
                    "message": "Incorrect email or password.",
                    "details": {},
                },
            )
        log.error("login_error", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": "auth_invalid_credentials",
                "message": "Incorrect email or password.",
                "details": {},
            },
        )

    if result is None or result.user is None or result.session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": "auth_invalid_credentials",
                "message": "Incorrect email or password.",
                "details": {},
            },
        )

    log.info("login_success", user_id=str(result.user.id))
    return LoginResponse(
        access_token=result.session.access_token,
        token_type="bearer",
        expires_in=result.session.expires_in or 3600,
        user=LoginUser(id=str(result.user.id), email=result.user.email),
    )


@router.post("/logout", response_model=MessageResponse, status_code=200)
async def logout(
    token: str = Depends(get_token),
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> MessageResponse:
    """Revoke the current session by invalidating the user's JWT via the admin API."""
    try:
        # Use admin sign_out to revoke the specific user's JWT on the server side
        supabase.auth.admin.sign_out(token)
    except Exception as exc:
        # Non-fatal: client-side token clearing still occurs; log the admin revocation failure
        log.error("logout_revocation_error", error=str(exc), user_id=current_user["id"])
    log.info("logout_success", user_id=current_user["id"])
    return MessageResponse(message="Logged out successfully.")


@router.post("/forgot-password", response_model=MessageResponse, status_code=200)
async def forgot_password(
    body: ForgotPasswordRequest,
    supabase: Client = Depends(get_supabase_client),
) -> MessageResponse:
    """Send a password recovery email. Always returns 200 to avoid email enumeration."""
    try:
        supabase.auth.reset_password_for_email(body.email)
        log.info("password_reset_requested", email=body.email)
    except Exception as exc:
        log.warning("password_reset_error", error=str(exc))
    return MessageResponse(message="If that email exists, a reset link has been sent.")


@router.patch("/change-password", response_model=MessageResponse, status_code=200)
async def change_password(
    body: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> MessageResponse:
    """Update the authenticated user's password."""
    user_id = current_user["id"]
    try:
        supabase.auth.admin.update_user_by_id(user_id, {"password": body.new_password})
        log.info("password_changed", user_id=user_id)
    except Exception as exc:
        log.error("password_change_error", user_id=user_id, error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "password_change_failed", "message": "Failed to update password.", "details": {}},
        )
    return MessageResponse(message="Password updated successfully.")


@router.get("/me", response_model=MeResponse, status_code=200)
async def me(
    current_user: dict = Depends(get_current_user),
) -> MeResponse:
    """Return the authenticated user's profile."""
    return MeResponse(
        id=current_user["id"],
        email=current_user["email"],
        created_at=current_user["created_at"],
    )


@router.delete("/account", response_model=MessageResponse, status_code=200)
async def delete_account(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> MessageResponse:
    """Permanently delete the authenticated user's account and all associated data."""
    user_id = current_user["id"]
    log.info("delete_account_requested", user_id=user_id)

    # FK-safe deletion: child tables first
    for table in ("advisor_requests", "purchases"):
        try:
            supabase.table(table).delete().eq("user_id", user_id).execute()
        except Exception as exc:
            log.warning("delete_account_table_error", table=table, user_id=user_id, error=str(exc))

    # launch_plans reference business_ideas.id, not user_id directly
    try:
        ideas = supabase.table("business_ideas").select("id").eq("user_id", user_id).execute()
        idea_ids = [r["id"] for r in (ideas.data or [])]
        if idea_ids:
            supabase.table("launch_plans").delete().in_("idea_id", idea_ids).execute()
    except Exception as exc:
        log.warning("delete_account_launch_plans_error", user_id=user_id, error=str(exc))

    for table in ("business_ideas", "assessments", "advice_cache", "user_profiles"):
        try:
            col = "id" if table == "user_profiles" else "user_id"
            supabase.table(table).delete().eq(col, user_id).execute()
        except Exception as exc:
            log.warning("delete_account_table_error", table=table, user_id=user_id, error=str(exc))

    # Remove from GoTrue auth.users
    try:
        supabase.auth.admin.delete_user(user_id)
    except Exception as exc:
        log.error("delete_account_gotrue_error", user_id=user_id, error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "delete_failed", "message": "Failed to delete account. Please contact support.", "details": {}},
        )

    log.info("delete_account_success", user_id=user_id)
    return MessageResponse(message="Account deleted successfully.")

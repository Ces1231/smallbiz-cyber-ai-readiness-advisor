"""
SmallBiz Advisor — Auth Router
Endpoints: /auth/signup, /auth/login, /auth/logout, /auth/me
Uses Supabase Auth as the identity provider.
"""
import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

from backend.dependencies import get_supabase_client, get_current_user, get_token
from backend.schemas.auth import (
    SignupRequest,
    LoginRequest,
    SignupResponse,
    LoginResponse,
    LoginUser,
    MeResponse,
    MessageResponse,
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

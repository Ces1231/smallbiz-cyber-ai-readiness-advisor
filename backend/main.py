"""
SmallBiz Advisor — FastAPI Application Factory
Registers CORS, routers, and startup hooks.
"""
import structlog
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings

log = structlog.get_logger()


def configure_logging() -> None:
    structlog.configure(
        processors=[
            structlog.stdlib.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.ExceptionRenderer(),
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, settings.log_level.upper(), logging.INFO)
        ),
        logger_factory=structlog.PrintLoggerFactory(),
    )


def create_app() -> FastAPI:
    configure_logging()

    app = FastAPI(
        title="SmallBiz Advisor API",
        version="1.0.0",
        description="Backend API for SmallBiz Cyber & AI Readiness Advisor — Champtron Systems LLC",
    )

    # Request ID middleware — assigns UUID per request, binds to structlog context
    # Enables log correlation across concurrent SSE streaming requests
    from backend.middleware.request_id import RequestIDMiddleware
    app.add_middleware(RequestIDMiddleware)

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.origins_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"],
    )

    # Routers — registered lazily to allow imports after app init
    from backend.routers.auth import router as auth_router
    from backend.routers.assessments import router as assessments_router
    from backend.routers.baselines import router as baselines_router
    from backend.routers.startup import router as startup_router
    from backend.routers.ai import router as ai_router
    from backend.routers.profiles import router as profiles_router
    from backend.routers.billing import router as billing_router
    from backend.routers.admin import router as admin_router
    from backend.routers.business import router as business_router

    app.include_router(auth_router, prefix="/auth", tags=["auth"])
    app.include_router(assessments_router, prefix="/assessments", tags=["assessments"])
    app.include_router(baselines_router, prefix="/baselines", tags=["baselines"])
    app.include_router(startup_router, prefix="/startup", tags=["startup"])
    app.include_router(ai_router, prefix="/ai", tags=["ai"])
    app.include_router(profiles_router, prefix="/profiles", tags=["profiles"])
    app.include_router(billing_router, prefix="/billing", tags=["billing"])
    app.include_router(admin_router, prefix="/admin", tags=["admin"])
    app.include_router(business_router, prefix="/business", tags=["business"])

    @app.get("/health", tags=["health"])
    async def health_check() -> dict:
        return {"status": "ok", "env": settings.app_env}

    @app.on_event("startup")
    async def startup_event() -> None:
        log.info("app_started", env=settings.app_env)

    return app


app = create_app()

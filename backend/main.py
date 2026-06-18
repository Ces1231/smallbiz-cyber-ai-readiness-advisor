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

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routers — registered lazily to allow imports after app init
    from backend.routers.auth import router as auth_router
    from backend.routers.assessments import router as assessments_router
    from backend.routers.baselines import router as baselines_router
    from backend.routers.startup import router as startup_router

    app.include_router(auth_router, prefix="/auth", tags=["auth"])
    app.include_router(assessments_router, prefix="/assessments", tags=["assessments"])
    app.include_router(baselines_router, prefix="/baselines", tags=["baselines"])
    app.include_router(startup_router, prefix="/startup", tags=["startup"])

    @app.get("/health", tags=["health"])
    async def health_check() -> dict:
        return {"status": "ok", "env": settings.app_env}

    @app.on_event("startup")
    async def startup_event() -> None:
        log.info("app_started", env=settings.app_env)

    return app


app = create_app()

"""
Champ Compass — Request ID Middleware
Assigns a unique UUID to every request and binds it to structlog's context vars.
This enables correlation of log lines across concurrent SSE streaming requests.

The request ID is:
- Bound to structlog context vars (auto-propagated to all log.* calls in the request)
- Returned in the X-Request-ID response header for client-side debugging
"""
import uuid

import structlog
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    ASGI middleware that generates a UUID per request and binds it to structlog.
    Uses structlog.contextvars so the request_id automatically appears in every
    structured log event emitted during the request lifecycle, including inside
    async generators (SSE streaming).
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = str(uuid.uuid4())
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response

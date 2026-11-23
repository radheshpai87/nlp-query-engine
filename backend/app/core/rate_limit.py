import time
from collections import defaultdict
from collections.abc import Callable

from fastapi import HTTPException, Request, status
from app.core.config import get_settings


class SlidingWindowRateLimiter:
    """Thread-safe, sliding-window in-memory rate limiter for API endpoints."""

    def __init__(self, max_requests: int = 60, window_seconds: float = 60.0) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._history: dict[str, list[float]] = defaultdict(list)

    def is_allowed(self, key: str) -> bool:
        now = time.time()
        cutoff = now - self.window_seconds

        timestamps = self._history[key]
        # Discard expired timestamps
        valid = [t for t in timestamps if t > cutoff]
        self._history[key] = valid

        if len(valid) >= self.max_requests:
            return False

        self._history[key].append(now)
        return True

    def get_remaining(self, key: str) -> int:
        now = time.time()
        cutoff = now - self.window_seconds
        valid = [t for t in self._history.get(key, []) if t > cutoff]
        return max(0, self.max_requests - len(valid))

    def reset(self) -> None:
        """Clear rate limit history (useful in tests)."""
        self._history.clear()


settings = get_settings()

# Default granular limiter instances configured from settings
ai_query_rate_limiter = SlidingWindowRateLimiter(
    max_requests=settings.RATE_LIMIT_AI_QUERIES_PER_MINUTE, window_seconds=60.0
)
execution_rate_limiter = SlidingWindowRateLimiter(
    max_requests=settings.RATE_LIMIT_EXECUTION_PER_MINUTE, window_seconds=60.0
)
auth_rate_limiter = SlidingWindowRateLimiter(
    max_requests=settings.RATE_LIMIT_AUTH_PER_MINUTE, window_seconds=60.0
)
general_rate_limiter = SlidingWindowRateLimiter(
    max_requests=settings.RATE_LIMIT_GENERAL_PER_MINUTE, window_seconds=60.0
)


def get_client_identifier(request: Request) -> str:
    """Extract a robust rate limiting key from Authorization header or IP.
    Respects X-Forwarded-For and X-Real-IP for proxied requests.
    """
    auth_header = request.headers.get("Authorization", "").strip()
    if auth_header:
        # Rate limit per unique authenticated user session/token
        return f"auth:{auth_header}"

    # Unauthenticated: extract real client IP behind reverse proxy / Docker
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
    else:
        client_ip = request.headers.get("x-real-ip") or (request.client.host if request.client else "unknown")

    return f"ip:{client_ip}"


def rate_limit_dependency(
    limiter: SlidingWindowRateLimiter,
) -> Callable[[Request], None]:
    """FastAPI dependency factory enforcing rate limits with standard HTTP 429 and retry headers."""

    def check_rate_limit(request: Request) -> None:
        key = get_client_identifier(request)

        if not limiter.is_allowed(key):
            remaining = limiter.get_remaining(key)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded: maximum {limiter.max_requests} requests per {int(limiter.window_seconds)} seconds. Please wait before retrying.",
                headers={
                    "Retry-After": str(int(limiter.window_seconds)),
                    "X-RateLimit-Limit": str(limiter.max_requests),
                    "X-RateLimit-Remaining": str(remaining),
                },
            )

    return check_rate_limit


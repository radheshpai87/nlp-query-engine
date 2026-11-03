import time
from collections import defaultdict
from collections.abc import Callable

from fastapi import HTTPException, Request, status


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

    def reset(self) -> None:
        """Clear rate limit history (useful in tests)."""
        self._history.clear()


# Default limiter instances
execution_rate_limiter = SlidingWindowRateLimiter(max_requests=120, window_seconds=60.0)
general_rate_limiter = SlidingWindowRateLimiter(max_requests=300, window_seconds=60.0)


def rate_limit_dependency(
    limiter: SlidingWindowRateLimiter,
) -> Callable[[Request], None]:
    """FastAPI dependency factory enforcing rate limits by IP or Authorization header."""

    def check_rate_limit(request: Request) -> None:
        # Determine tracking key from Authorization token, user, or client IP
        auth_header = request.headers.get("Authorization", "")
        client_ip = request.client.host if request.client else "unknown"
        key = auth_header if auth_header else client_ip

        if not limiter.is_allowed(key):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded: maximum {limiter.max_requests} requests per {int(limiter.window_seconds)} seconds.",
            )

    return check_rate_limit

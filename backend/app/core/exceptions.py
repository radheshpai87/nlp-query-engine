from typing import Any


class AppError(Exception):
    """Base application exception."""

    def __init__(self, message: str, details: Any | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details


class DatabaseConnectionError(AppError):
    """Raised when connecting to a target database fails."""

    pass


class QueryValidationError(AppError):
    """Raised when generated or requested query violates safety or syntax policy."""

    pass


class AmbiguityDetectedError(AppError):
    """Raised when natural language intent cannot be resolved without user clarification."""

    pass


class ResourceNotFoundError(AppError):
    """Raised when an application entity is not found."""

    pass


class AuthorizationError(AppError):
    """Raised when a user lacks permission for a resource/workspace."""

    pass

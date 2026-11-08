from typing import Any

from fastapi import APIRouter, status
from pydantic import BaseModel

from app.core.config import get_settings

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: str
    environment: str
    version: str
    services: dict[str, str]


@router.get("/health", response_model=HealthResponse, status_code=status.HTTP_200_OK)
def get_health() -> HealthResponse:
    settings = get_settings()
    return HealthResponse(
        status="healthy",
        environment=settings.APP_ENV,
        version="0.1.0",
        services={
            "api": "up",
            "metadata_storage": "configured",
            "query_engine": "ready",
        },
    )


@router.get("/ready", response_model=dict[str, Any], status_code=status.HTTP_200_OK)
def get_readiness() -> dict[str, Any]:
    settings = get_settings()
    return {
        "ready": True,
        "app_name": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "llm_provider": settings.LLM_PROVIDER,
    }

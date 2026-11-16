from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import (
    ambiguity,
    audit,
    auth,
    connections,
    conversations,
    execution,
    health,
    nlp,
    query_plan,
    schemas,
    workspaces,
)
from app.core.config import get_settings
from app.core.database import close_mongo_connection, init_metadata_indexes
from app.core.exceptions import AppError, AuthorizationError, ResourceNotFoundError
from app.core.logging import setup_logging

logger = setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    settings = get_settings()
    logger.info("Starting %s in %s mode", settings.APP_NAME, settings.APP_ENV)
    try:
        init_metadata_indexes()
    except Exception as e:
        logger.warning("Could not auto-initialize indexes on startup: %s", e)

    yield

    logger.info("Shutting down %s", settings.APP_NAME)
    close_mongo_connection()


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.APP_NAME,
        version="0.1.0",
        description="Ambiguity-Aware Natural Language Query Engine for Heterogeneous Databases",
        lifespan=lifespan,
        docs_url="/docs" if settings.DEBUG or settings.APP_ENV != "production" else None,
        redoc_url="/redoc" if settings.DEBUG or settings.APP_ENV != "production" else None,
    )

    # CORS configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Global Exception Handlers
    @app.exception_handler(AuthorizationError)
    async def authorization_error_handler(
        request: Request, exc: AuthorizationError
    ) -> JSONResponse:
        logger.warning("Authorization error: %s", exc.message)
        return JSONResponse(
            status_code=403,
            content={"error": "AuthorizationError", "message": exc.message},
        )

    @app.exception_handler(ResourceNotFoundError)
    async def not_found_error_handler(request: Request, exc: ResourceNotFoundError) -> JSONResponse:
        return JSONResponse(
            status_code=404,
            content={"error": "ResourceNotFoundError", "message": exc.message},
        )

    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
        logger.warning("Application error: %s (details: %s)", exc.message, exc.details)
        return JSONResponse(
            status_code=400,
            content={
                "error": exc.__class__.__name__,
                "message": exc.message,
                "details": exc.details,
            },
        )

    # Health routers
    app.include_router(health.router)
    app.include_router(health.router, prefix="/api/v1")

    # API v1 routers
    app.include_router(auth.router, prefix="/api/v1")
    app.include_router(workspaces.router, prefix="/api/v1")
    app.include_router(connections.router, prefix="/api/v1")
    app.include_router(schemas.router, prefix="/api/v1")
    app.include_router(ambiguity.router, prefix="/api/v1")
    app.include_router(query_plan.router, prefix="/api/v1")
    app.include_router(execution.router, prefix="/api/v1")
    app.include_router(conversations.router, prefix="/api/v1")
    app.include_router(nlp.router, prefix="/api/v1")
    app.include_router(audit.router, prefix="/api/v1")

    return app


app = create_app()

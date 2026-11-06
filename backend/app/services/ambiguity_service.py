from typing import Any

from fastapi import Depends, HTTPException, status

from app.engine.ambiguity_engine import AmbiguityEngine
from app.models.ambiguity import (
    AmbiguityEvaluationResult,
    ClarificationResolutionRequest,
    ClarificationResolutionResponse,
    PendingClarification,
)
from app.repositories.connection_repository import (
    ConnectionRepository,
    get_connection_repository,
)
from app.repositories.schema_repository import (
    SchemaRepository,
    get_schema_repository,
)
from app.services.audit_service import AuditService, get_audit_service


class AmbiguityService:
    def __init__(
        self,
        connection_repo: ConnectionRepository,
        schema_repo: SchemaRepository,
        audit_service: AuditService,
    ) -> None:
        self.connection_repo = connection_repo
        self.schema_repo = schema_repo
        self.audit_service = audit_service
        self.engine = AmbiguityEngine()

    def evaluate_query(
        self,
        workspace_id: str,
        query: str,
        resolved_context: dict[str, Any] | None = None,
        user_id: str | None = None,
    ) -> AmbiguityEvaluationResult:
        """Evaluate query against schemas and determine if clarification questions are needed."""
        connections = {c.id: c for c in self.connection_repo.get_by_workspace(workspace_id)}
        snapshots = {
            s.connection_id: s for s in self.schema_repo.get_all_latest_for_workspace(workspace_id)
        }

        result = self.engine.evaluate_query(
            query=query,
            connections=connections,
            snapshots=snapshots,
            resolved_context=resolved_context,
        )

        if result.is_ambiguous:
            self.audit_service.log_event(
                workspace_id=workspace_id,
                action="ambiguity.detected",
                resource_type="query",
                user_id=user_id,
                details={
                    "query": query,
                    "clarification_count": len(result.clarifications),
                    "parameters": [c.parameter_name for c in result.clarifications],
                },
            )

        return result

    def resolve_clarification(
        self,
        workspace_id: str,
        request: ClarificationResolutionRequest,
        pending_clarifications: list[PendingClarification],
        user_id: str | None = None,
    ) -> ClarificationResolutionResponse:
        """Resolve a specific clarification question and return the remaining pending clarifications."""
        target_clarification = next(
            (c for c in pending_clarifications if c.id == request.clarification_id),
            None,
        )
        if not target_clarification:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Clarification '{request.clarification_id}' not found in active request.",
            )

        res = self.engine.resolve_clarification(
            clarification=target_clarification,
            selected_value=request.selected_value,
            custom_input=request.custom_input,
            remaining_clarifications=pending_clarifications,
        )

        self.audit_service.log_event(
            workspace_id=workspace_id,
            action="clarification.resolved",
            resource_type="clarification",
            resource_id=request.clarification_id,
            user_id=user_id,
            details={
                "parameter_name": res.parameter_name,
                "resolved_value": str(res.resolved_value),
                "ready_to_execute": res.ready_to_execute,
            },
        )

        return res


def get_ambiguity_service(
    connection_repo: ConnectionRepository = Depends(get_connection_repository),
    schema_repo: SchemaRepository = Depends(get_schema_repository),
    audit_service: AuditService = Depends(get_audit_service),
) -> AmbiguityService:
    return AmbiguityService(
        connection_repo=connection_repo,
        schema_repo=schema_repo,
        audit_service=audit_service,
    )

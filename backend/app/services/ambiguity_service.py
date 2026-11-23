from typing import Any

from fastapi import Depends, HTTPException, status

from app.engine.ambiguity_engine import AmbiguityEngine
from app.models.ambiguity import (
    AmbiguityEvaluationResult,
    ClarificationResolutionRequest,
    ClarificationResolutionResponse,
    PendingClarification,
)
from app.nlp.domain_guard import DomainCheckResult, DomainGuard, DomainQueryCategory
from app.repositories.connection_repository import (
    ConnectionRepository,
    get_connection_repository,
)
from app.repositories.feedback_repository import (
    FeedbackRepository,
    get_feedback_repository,
)
from app.repositories.schema_repository import (
    SchemaRepository,
    get_schema_repository,
)
from app.nlp.providers.base import BaseLLMProvider
from app.nlp.providers.factory import get_llm_provider
from app.nlp.providers.mock_provider import MockLLMProvider
from app.nlp.schema_rag import SchemaRAGService
from app.services.audit_service import AuditService, get_audit_service


class AmbiguityService:
    def __init__(
        self,
        connection_repo: ConnectionRepository,
        schema_repo: SchemaRepository,
        audit_service: AuditService,
        llm_provider: BaseLLMProvider | None = None,
        feedback_repo: FeedbackRepository | None = None,
    ) -> None:
        self.connection_repo = connection_repo
        self.schema_repo = schema_repo
        self.audit_service = audit_service
        self.llm_provider = llm_provider
        self.feedback_repo = feedback_repo
        self.engine = AmbiguityEngine()
        self.rag = (
            SchemaRAGService(provider=llm_provider)
            if llm_provider and not isinstance(llm_provider, MockLLMProvider)
            else None
        )

    def evaluate_query(
        self,
        workspace_id: str,
        query: str,
        resolved_context: dict[str, Any] | None = None,
        user_id: str | None = None,
    ) -> AmbiguityEvaluationResult:
        """Evaluate query against schemas using Schema-RAG and fall back to engine."""
        connections = {c.id: c for c in self.connection_repo.get_by_workspace(workspace_id)}
        snapshots = {
            s.connection_id: s for s in self.schema_repo.get_all_latest_for_workspace(workspace_id)
        }

        # 1. Deterministic Domain Guardrail check BEFORE Schema-RAG or any LLM invocation
        guard_result = DomainGuard.check_query(
            query=query,
            connections=connections,
            snapshots=snapshots,
        )
        if not guard_result.is_allowed and guard_result.category != DomainQueryCategory.METADATA:
            return AmbiguityEvaluationResult(
                is_ambiguous=False,
                confidence=1.0,
                clarifications=[],
                inferred_intent={"raw_query": query, "category": guard_result.category.value},
                suggested_action="conversational_response" if guard_result.category == DomainQueryCategory.GREETING else "guardrail_blocked",
                conversational_response=guard_result.direct_response,
                is_metadata_query=False,
                is_guardrail_blocked=(guard_result.category in (DomainQueryCategory.UNSAFE_MUTATION, DomainQueryCategory.OUT_OF_DOMAIN)),
            )

        # 2. If it's a structural metadata query, handle deterministically without calling LLM
        if guard_result.category == DomainQueryCategory.METADATA:
            return self.engine.evaluate_query(
                query=query,
                connections=connections,
                snapshots=snapshots,
                resolved_context=resolved_context,
            )

        # 3. Try dynamic Schema-RAG for valid database queries if LLM provider is available
        if self.rag:
            try:
                learning_examples = (
                    self.feedback_repo.get_learning_examples(workspace_id)
                    if self.feedback_repo
                    else None
                )
                rag_res = self.rag.evaluate_and_plan(
                    workspace_id=workspace_id,
                    query=query,
                    connections=connections,
                    snapshots=snapshots,
                    resolved_context=resolved_context,
                    learning_examples=learning_examples,
                )
                if rag_res.direct_response:
                    return AmbiguityEvaluationResult(
                        is_ambiguous=False,
                        confidence=1.0,
                        clarifications=[],
                        inferred_intent={"raw_query": query, "category": rag_res.intent},
                        suggested_action="conversational_response",
                        conversational_response=rag_res.direct_response,
                        is_metadata_query=(rag_res.intent == "metadata"),
                        is_guardrail_blocked=(rag_res.intent == "guardrail_blocked"),
                    )
                if rag_res.intent == "ambiguous" and rag_res.clarification:
                    return AmbiguityEvaluationResult(
                        is_ambiguous=True,
                        confidence=0.5,
                        clarifications=[rag_res.clarification],
                        suggested_action="request_clarification",
                    )
                if rag_res.intent == "data_query":
                    return AmbiguityEvaluationResult(
                        is_ambiguous=False,
                        confidence=1.0,
                        clarifications=[],
                        inferred_intent={"raw_query": query, "category": "data_query"},
                        suggested_action="proceed_to_plan",
                    )
            except Exception:
                pass

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
    llm_provider: BaseLLMProvider = Depends(get_llm_provider),
    feedback_repo: FeedbackRepository = Depends(get_feedback_repository),
) -> AmbiguityService:
    return AmbiguityService(
        connection_repo=connection_repo,
        schema_repo=schema_repo,
        audit_service=audit_service,
        llm_provider=llm_provider,
        feedback_repo=feedback_repo,
    )

from typing import Any

from fastapi import Depends

from app.engine.compiler import MultiDialectCompiler
from app.engine.generators.models import CompilationResult
from app.engine.ir.explainer import explain_logical_plan
from app.engine.ir.models import (
    LogicalQueryPlan,
    PlanExplanation,
    PlanValidationResult,
)
from app.engine.optimizer import LogicalPlanOptimizer
from app.engine.validator import LogicalPlanValidator
from app.models.connection import DatabaseType
from app.repositories.connection_repository import (
    ConnectionRepository,
    get_connection_repository,
)
from app.repositories.relationship_repository import (
    RelationshipRepository,
    get_relationship_repository,
)
from app.repositories.schema_repository import (
    SchemaRepository,
    get_schema_repository,
)
from app.services.audit_service import AuditService, get_audit_service


class QueryPlanService:
    def __init__(
        self,
        connection_repo: ConnectionRepository,
        schema_repo: SchemaRepository,
        relationship_repo: RelationshipRepository,
        audit_service: AuditService,
    ) -> None:
        self.connection_repo = connection_repo
        self.schema_repo = schema_repo
        self.relationship_repo = relationship_repo
        self.audit_service = audit_service
        self.optimizer = LogicalPlanOptimizer()
        self.compiler = MultiDialectCompiler()

    def validate_plan(self, workspace_id: str, plan: LogicalQueryPlan) -> PlanValidationResult:
        """Validate logical query plan against workspace connections and schemas."""
        connections_list = self.connection_repo.get_by_workspace(workspace_id)
        connections_map = {c.id: c for c in connections_list}

        snapshots_list = self.schema_repo.get_all_latest_for_workspace(workspace_id)
        snapshots_map = {s.connection_id: s for s in snapshots_list}

        relationships = self.relationship_repo.get_by_workspace(workspace_id)

        validator = LogicalPlanValidator(
            connections=connections_map,
            snapshots=snapshots_map,
            user_relationships=relationships,
        )
        return validator.validate(plan)

    def optimize_plan(self, plan: LogicalQueryPlan) -> LogicalQueryPlan:
        """Apply algebraic and schema-aware optimization passes to the logical plan."""
        return self.optimizer.optimize(plan)

    def explain_plan(self, plan: LogicalQueryPlan) -> PlanExplanation:
        """Generate accessible step-by-step and natural language summary of plan."""
        return explain_logical_plan(plan)

    def compile_plan(self, workspace_id: str, plan: LogicalQueryPlan) -> CompilationResult:
        """Compile an optimized logical query plan into database-specific target queries."""
        connections_list = self.connection_repo.get_by_workspace(workspace_id)
        connection_types: dict[str, DatabaseType] = {c.id: c.db_type for c in connections_list}
        optimized_plan = self.optimize_plan(plan)
        return self.compiler.compile(optimized_plan, connection_types)

    def synthesize_plan(
        self,
        workspace_id: str,
        query: str,
        resolved_context: dict[str, Any] | None = None,
        llm_provider: Any = None,
    ) -> LogicalQueryPlan:
        """Synthesize a schema-grounded LogicalQueryPlan dynamically from workspace databases."""
        from app.core.config import get_settings
        from app.nlp.intent_extractor import IntentExtractor
        from app.nlp.plan_synthesizer import LogicalPlanSynthesizer
        from app.nlp.providers.factory import get_llm_provider

        connections_list = self.connection_repo.get_by_workspace(workspace_id)
        connections_map = {c.id: c for c in connections_list}

        snapshots_list = self.schema_repo.get_all_latest_for_workspace(workspace_id)
        snapshots_map = {s.connection_id: s for s in snapshots_list}

        relationships = self.relationship_repo.get_by_workspace(workspace_id)

        effective_provider = llm_provider or get_llm_provider(settings=get_settings())

        from app.nlp.providers.mock_provider import MockLLMProvider
        from app.nlp.schema_rag import SchemaRAGService

        if effective_provider and not isinstance(effective_provider, MockLLMProvider):
            try:
                rag = SchemaRAGService(provider=effective_provider)
                rag_res = rag.evaluate_and_plan(
                    workspace_id=workspace_id,
                    query=query,
                    connections=connections_map,
                    snapshots=snapshots_map,
                    relationships=relationships,
                    resolved_context=resolved_context,
                )
                if rag_res.plan is not None:
                    return rag_res.plan
            except Exception as e:
                logger.warning("SchemaRAG synthesis error, falling back to rule-based: %s", e)

        extractor = IntentExtractor(provider=effective_provider)
        intent = extractor.extract(
            query=query, snapshots=snapshots_map, connections=connections_map
        )

        synthesizer = LogicalPlanSynthesizer()
        return synthesizer.synthesize(
            workspace_id=workspace_id,
            query=query,
            intent=intent,
            connections=connections_map,
            snapshots=snapshots_map,
            relationships=relationships,
            resolved_context=resolved_context,
        )


def get_query_plan_service(
    connection_repo: ConnectionRepository = Depends(get_connection_repository),
    schema_repo: SchemaRepository = Depends(get_schema_repository),
    relationship_repo: RelationshipRepository = Depends(get_relationship_repository),
    audit_service: AuditService = Depends(get_audit_service),
) -> QueryPlanService:
    return QueryPlanService(
        connection_repo=connection_repo,
        schema_repo=schema_repo,
        relationship_repo=relationship_repo,
        audit_service=audit_service,
    )

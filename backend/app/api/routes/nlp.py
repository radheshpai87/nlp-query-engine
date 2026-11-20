from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.core.auth import WorkspacePermissionChecker, get_current_user
from app.engine.ir.models import LogicalQueryPlan
from app.models.execution import ExecutionResult
from app.models.user import User
from app.models.workspace import WorkspaceMembership
from app.nlp.intent_extractor import ExtractedIntent, IntentExtractor
from app.nlp.providers.base import BaseLLMProvider
from app.nlp.providers.factory import get_llm_provider
from app.nlp.result_explainer import ResultExplainer, ResultExplanationResponse
from app.nlp.suggested_queries import SuggestedQueriesGenerator
from app.repositories.schema_repository import (
    SchemaRepository,
    get_schema_repository,
)

router = APIRouter(prefix="/workspaces/{workspace_id}/nlp", tags=["nlp"])


class ExtractIntentRequest(BaseModel):
    query: str = Field(min_length=1, description="Natural language query string")


class ExplainResultRequest(BaseModel):
    query: str = Field(min_length=1, description="Original natural language query")
    plan: LogicalQueryPlan = Field(description="Executed logical plan")
    result: ExecutionResult = Field(description="Execution result to explain")


@router.post("/extract-intent", response_model=ExtractedIntent)
def extract_intent(
    workspace_id: str,
    payload: ExtractIntentRequest,
    _current_user: User = Depends(get_current_user),
    schema_repo: SchemaRepository = Depends(get_schema_repository),
    llm_provider: BaseLLMProvider = Depends(get_llm_provider),
    _permission: WorkspaceMembership = Depends(WorkspacePermissionChecker()),
) -> ExtractedIntent:
    """Extract structured intent entities, filters, aggregations, and sorting from natural language."""
    snapshots = {s.connection_id: s for s in schema_repo.get_all_latest_for_workspace(workspace_id)}
    extractor = IntentExtractor(provider=llm_provider)
    return extractor.extract(query=payload.query, snapshots=snapshots)


@router.post("/explain", response_model=ResultExplanationResponse)
def explain_execution_result(
    workspace_id: str,
    payload: ExplainResultRequest,
    _current_user: User = Depends(get_current_user),
    llm_provider: BaseLLMProvider = Depends(get_llm_provider),
    _permission: WorkspaceMembership = Depends(WorkspacePermissionChecker()),
) -> ResultExplanationResponse:
    """Generate a non-technical summary and provenance insights for an execution result."""
    explainer = ResultExplainer(provider=llm_provider)
    return explainer.explain(
        natural_query=payload.query,
        plan=payload.plan,
        result=payload.result,
    )


@router.get("/suggested-queries", response_model=list[str])
def get_suggested_queries(
    workspace_id: str,
    _current_user: User = Depends(get_current_user),
    schema_repo: SchemaRepository = Depends(get_schema_repository),
    llm_provider: BaseLLMProvider = Depends(get_llm_provider),
    _permission: WorkspaceMembership = Depends(WorkspacePermissionChecker()),
) -> list[str]:
    """Dynamically generate suggested queries from introspected database schemas and LLM synthesis."""
    snapshots = schema_repo.get_all_latest_for_workspace(workspace_id)
    generator = SuggestedQueriesGenerator(provider=llm_provider)
    return generator.generate(snapshots)


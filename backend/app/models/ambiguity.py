from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field

from app.models.base import AppBaseModel


class AmbiguityType(StrEnum):
    VAGUE_PREDICATE = "vague_predicate"
    AMBIGUOUS_METRIC = "ambiguous_metric"
    MULTIPLE_SOURCES = "multiple_sources"
    MISSING_TIME_WINDOW = "missing_time_window"
    UNRESOLVED_JOIN = "unresolved_join"
    UNDERSPECIFIED_AGGREGATION = "underspecified_aggregation"
    UNDERSPECIFIED_ENTITY = "underspecified_entity"


class ClarificationOption(BaseModel):
    label: str
    value: Any
    is_recommended: bool = False
    description: str | None = None


class PendingClarification(AppBaseModel):
    """Structured interactive clarification question presented to user."""

    ambiguity_type: AmbiguityType
    parameter_name: str
    question: str
    options: list[ClarificationOption] = Field(default_factory=list)
    allow_custom_input: bool = True
    default_value: Any | None = None
    resolved: bool = False
    user_response: Any | None = None
    explanation: str | None = None


class AmbiguityEvaluationResult(BaseModel):
    is_ambiguous: bool
    confidence: float = 1.0
    clarifications: list[PendingClarification] = Field(default_factory=list)
    inferred_intent: dict[str, Any] = Field(default_factory=dict)
    suggested_action: str = "proceed_to_plan"  # proceed_to_plan, request_clarification, conversational_response, guardrail_blocked
    conversational_response: str | None = None
    is_metadata_query: bool = False
    is_guardrail_blocked: bool = False


class ClarificationResolutionRequest(BaseModel):
    clarification_id: str
    selected_value: Any = None
    custom_input: str | None = None


class ClarificationResolutionResponse(BaseModel):
    resolved: bool
    clarification_id: str
    parameter_name: str
    resolved_value: Any
    remaining_clarifications: list[PendingClarification] = Field(default_factory=list)
    ready_to_execute: bool = False

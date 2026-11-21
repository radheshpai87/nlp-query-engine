from collections import Counter
from fastapi import Depends

from app.models.feedback import CreateFeedbackRequest, FeedbackLearningSummary, QueryFeedback
from app.repositories.feedback_repository import FeedbackRepository, get_feedback_repository
from app.services.audit_service import AuditService, get_audit_service


class FeedbackService:
    """Service managing query ratings, user corrections, and continuous learning feedback."""

    def __init__(
        self,
        feedback_repo: FeedbackRepository,
        audit_service: AuditService,
    ) -> None:
        self.feedback_repo = feedback_repo
        self.audit_service = audit_service

    def record_feedback(
        self,
        workspace_id: str,
        user_id: str,
        payload: CreateFeedbackRequest,
    ) -> QueryFeedback:
        normalized_ws_id = (
            "ws_default"
            if workspace_id in ("default", "ws_default", "ws-default")
            else workspace_id
        )

        fb = QueryFeedback(
            workspace_id=normalized_ws_id,
            user_id=user_id,
            query_text=payload.query_text,
            is_correct=payload.is_correct,
            conversation_id=payload.conversation_id,
            message_id=payload.message_id,
            category=payload.category,
            user_notes=payload.user_notes,
            corrected_query=payload.corrected_query,
            generated_query=payload.generated_query,
            generated_plan=payload.generated_plan,
            target_databases=payload.target_databases,
        )

        saved = self.feedback_repo.create(fb)

        self.audit_service.log_event(
            workspace_id=workspace_id,
            user_id=user_id,
            action="query.feedback_recorded",
            resource_type="query_feedback",
            resource_id=saved.id,
            details={
                "is_correct": saved.is_correct,
                "category": saved.category,
                "query_text": saved.query_text,
                "has_notes": bool(saved.user_notes),
            },
        )

        return saved

    def list_feedback(self, workspace_id: str, limit: int = 100) -> list[QueryFeedback]:
        return self.feedback_repo.get_by_workspace(workspace_id=workspace_id, limit=limit)

    def get_learning_summary(self, workspace_id: str) -> FeedbackLearningSummary:
        feedbacks = self.feedback_repo.get_by_workspace(workspace_id=workspace_id, limit=200)
        total = len(feedbacks)
        if total == 0:
            return FeedbackLearningSummary()

        positive = sum(1 for f in feedbacks if f.is_correct)
        negative = total - positive
        accuracy = round(positive / total, 3)

        issue_categories = [
            f.category for f in feedbacks if not f.is_correct and f.category
        ]
        issue_counts = dict(Counter(issue_categories).most_common(5))

        # Active learning rules are feedback entries that have actionable corrections or verified plans
        learning_rules = sum(
            1 for f in feedbacks if (f.is_correct and f.generated_query) or (not f.is_correct and (f.user_notes or f.corrected_query))
        )

        return FeedbackLearningSummary(
            total_feedback=total,
            positive_count=positive,
            negative_count=negative,
            accuracy_rate=accuracy,
            common_issues=issue_counts,
            active_learning_rules_count=learning_rules,
        )


def get_feedback_service(
    feedback_repo: FeedbackRepository = Depends(get_feedback_repository),
    audit_service: AuditService = Depends(get_audit_service),
) -> FeedbackService:
    return FeedbackService(feedback_repo=feedback_repo, audit_service=audit_service)

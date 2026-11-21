from typing import Any

from fastapi import Depends, HTTPException, status

from app.models.ambiguity import ClarificationResolutionRequest
from app.models.conversation import Conversation, Message, MessageRole
from app.nlp.intent_extractor import IntentExtractor
from app.nlp.plan_synthesizer import LogicalPlanSynthesizer
from app.nlp.providers.base import BaseLLMProvider
from app.nlp.providers.factory import get_llm_provider
from app.nlp.result_explainer import ResultExplainer
from app.nlp.schema_rag import SchemaRAGService
from app.repositories.connection_repository import (
    ConnectionRepository,
    get_connection_repository,
)
from app.repositories.conversation_repository import (
    ConversationRepository,
    get_conversation_repository,
)
from app.repositories.feedback_repository import (
    FeedbackRepository,
    get_feedback_repository,
)
from app.repositories.relationship_repository import (
    RelationshipRepository,
    get_relationship_repository,
)
from app.repositories.schema_repository import (
    SchemaRepository,
    get_schema_repository,
)
from app.services.ambiguity_service import (
    AmbiguityService,
    get_ambiguity_service,
)
from app.services.audit_service import AuditService, get_audit_service
from app.services.execution_service import (
    ExecutionService,
    get_execution_service,
)


class ConversationService:
    """Orchestrates stateful conversational query sessions, ambiguity resolution, and execution."""

    def __init__(
        self,
        conversation_repo: ConversationRepository,
        connection_repo: ConnectionRepository,
        schema_repo: SchemaRepository,
        relationship_repo: RelationshipRepository,
        ambiguity_service: AmbiguityService,
        execution_service: ExecutionService,
        audit_service: AuditService,
        llm_provider: BaseLLMProvider,
        feedback_repo: FeedbackRepository | None = None,
    ) -> None:
        self.conversation_repo = conversation_repo
        self.connection_repo = connection_repo
        self.schema_repo = schema_repo
        self.relationship_repo = relationship_repo
        self.ambiguity_service = ambiguity_service
        self.execution_service = execution_service
        self.audit_service = audit_service
        self.llm_provider = llm_provider
        self.feedback_repo = feedback_repo

        self.intent_extractor = IntentExtractor(provider=llm_provider)
        self.plan_synthesizer = LogicalPlanSynthesizer()
        self.result_explainer = ResultExplainer(provider=llm_provider)
        self.rag_service = SchemaRAGService(provider=llm_provider)

    def create_conversation(
        self, workspace_id: str, user_id: str, title: str | None = None
    ) -> Conversation:
        """Create a new conversational query thread."""
        normalized_ws_id = (
            "ws_default"
            if workspace_id in ("default", "ws_default", "ws-default")
            else workspace_id
        )
        conv = Conversation(
            workspace_id=normalized_ws_id,
            user_id=user_id,
            title=title or "New Conversation",
        )
        saved = self.conversation_repo.create(conv)
        self.audit_service.log_event(
            workspace_id=workspace_id,
            user_id=user_id,
            action="conversation.created",
            resource_type="conversation",
            resource_id=saved.id,
            details={"title": saved.title},
        )
        return saved

    def list_conversations(
        self, workspace_id: str, user_id: str | None = None
    ) -> list[Conversation]:
        """List active conversations for a workspace."""
        return self.conversation_repo.get_by_workspace(workspace_id=workspace_id, user_id=user_id)

    def get_conversation(self, workspace_id: str, conversation_id: str) -> Conversation:
        """Retrieve conversation by ID within a workspace."""
        ws_filter = (
            {"$in": ["ws_default", "ws-default", "default"]}
            if workspace_id in ("default", "ws_default", "ws-default")
            else workspace_id
        )
        conv = self.conversation_repo.find_one(
            {"_id": conversation_id, "workspace_id": ws_filter}
        )
        if not conv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Conversation '{conversation_id}' not found in workspace.",
            )
        return conv

    def delete_conversation(self, workspace_id: str, conversation_id: str) -> bool:
        """Delete conversation and its associated messages."""
        conv = self.get_conversation(workspace_id, conversation_id)
        deleted = self.conversation_repo.delete_by_id_and_workspace(
            workspace_id=workspace_id, conversation_id=conversation_id
        )
        if deleted:
            self.audit_service.log_event(
                workspace_id=workspace_id,
                action="conversation.deleted",
                resource_type="conversation",
                resource_id=conv.id,
                details={"title": conv.title},
            )
        return deleted

    def update_conversation_title(
        self, workspace_id: str, conversation_id: str, title: str
    ) -> Conversation:
        """Rename conversation thread."""
        self.get_conversation(workspace_id, conversation_id)
        updated = self.conversation_repo.update_title(conversation_id, title)
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Failed to update conversation title.",
            )
        return updated

    def get_messages(self, workspace_id: str, conversation_id: str) -> list[Message]:
        """Fetch all messages for a conversation thread."""
        self.get_conversation(workspace_id, conversation_id)
        return self.conversation_repo.get_messages(conversation_id)

    def post_message(
        self,
        workspace_id: str,
        user_id: str,
        conversation_id: str,
        content: str,
    ) -> tuple[Message, Message]:
        """Execute a conversational query turn: evaluate ambiguity, extract intent, compile, and execute."""
        conv = self.get_conversation(workspace_id, conversation_id)

        # 1. Persist user message
        user_msg = self.conversation_repo.add_message(
            Message(
                conversation_id=conversation_id,
                role=MessageRole.USER,
                content=content,
            )
        )

        # 2. Automatically generate concise conversation title if current title is default
        if conv.title == "New Conversation":
            words = content.strip().split()
            new_title = " ".join(words[:6])
            if len(new_title) > 36:
                new_title = new_title[:33] + "..."
            self.conversation_repo.update_title(conversation_id, new_title)

        # 3. Evaluate Ambiguity
        ambiguity_res = self.ambiguity_service.evaluate_query(
            workspace_id=workspace_id,
            query=content,
            resolved_context=conv.resolved_context,
            user_id=user_id,
        )

        # Handle Conversational, Metadata, or Guard Rail responses directly
        if (
            ambiguity_res.conversational_response
            or ambiguity_res.is_guardrail_blocked
            or ambiguity_res.suggested_action in ("conversational_response", "guardrail_blocked")
        ):
            resp_content = (
                ambiguity_res.conversational_response
                or "I am your natural language query engine for PostgreSQL, MongoDB, and Elasticsearch."
            )
            assistant_msg = self.conversation_repo.add_message(
                Message(
                    conversation_id=conversation_id,
                    role=MessageRole.ASSISTANT,
                    content=resp_content,
                )
            )
            return user_msg, assistant_msg

        if ambiguity_res.is_ambiguous and ambiguity_res.clarifications:
            clarification = ambiguity_res.clarifications[0]
            self.conversation_repo.update(
                conversation_id,
                {
                    "pending_clarification": clarification.model_dump(),
                    "active_query": content,
                },
            )
            assistant_msg = self.conversation_repo.add_message(
                Message(
                    conversation_id=conversation_id,
                    role=MessageRole.ASSISTANT,
                    content=clarification.question,
                    clarification=clarification,
                )
            )
            return user_msg, assistant_msg

        # 4. Clear pending clarification if none detected
        self.conversation_repo.update(
            conversation_id,
            {"pending_clarification": None, "active_query": None},
        )

        # 5. Execute unambiguous query
        assistant_msg = self._process_query(
            workspace_id=workspace_id,
            user_id=user_id,
            conversation_id=conversation_id,
            query=content,
        )

        return user_msg, assistant_msg

    def resolve_clarification(
        self,
        workspace_id: str,
        user_id: str,
        conversation_id: str,
        clarification_id: str,
        selected_value: Any = None,
        custom_input: str | None = None,
    ) -> tuple[Message, Message]:
        """Resolve an active clarification prompt and resume the query execution workflow."""
        conv = self.get_conversation(workspace_id, conversation_id)
        if not conv.pending_clarification:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="There is no active clarification question pending for this conversation.",
            )

        resolution_value = selected_value if selected_value is not None else custom_input
        user_msg = self.conversation_repo.add_message(
            Message(
                conversation_id=conversation_id,
                role=MessageRole.USER,
                content=f"Selected: {resolution_value}",
            )
        )

        resolution_res = self.ambiguity_service.resolve_clarification(
            workspace_id=workspace_id,
            request=ClarificationResolutionRequest(
                clarification_id=clarification_id,
                selected_value=selected_value,
                custom_input=custom_input,
            ),
            pending_clarifications=[conv.pending_clarification],
            user_id=user_id,
        )

        # Accumulate resolved parameters
        updated_context = dict(conv.resolved_context)
        updated_context[resolution_res.parameter_name] = resolution_res.resolved_value

        if resolution_res.remaining_clarifications:
            next_clarification = resolution_res.remaining_clarifications[0]
            self.conversation_repo.update(
                conversation_id,
                {
                    "pending_clarification": next_clarification.model_dump(),
                    "resolved_context": updated_context,
                },
            )
            assistant_msg = self.conversation_repo.add_message(
                Message(
                    conversation_id=conversation_id,
                    role=MessageRole.ASSISTANT,
                    content=next_clarification.question,
                    clarification=next_clarification,
                )
            )
            return user_msg, assistant_msg

        # All clarifications resolved -> Execute active query
        active_query = (
            conv.active_query
            or f"Query with {resolution_res.parameter_name}={resolution_res.resolved_value}"
        )
        self.conversation_repo.update(
            conversation_id,
            {
                "pending_clarification": None,
                "active_query": None,
                "resolved_context": updated_context,
            },
        )

        assistant_msg = self._process_query(
            workspace_id=workspace_id,
            user_id=user_id,
            conversation_id=conversation_id,
            query=active_query,
        )

        return user_msg, assistant_msg

    def _process_query(
        self,
        workspace_id: str,
        user_id: str,
        conversation_id: str,
        query: str,
    ) -> Message:
        """Internal helper to extract intent, synthesize plan, execute, and generate natural explanation."""
        conv = self.get_conversation(workspace_id, conversation_id)
        connections = {c.id: c for c in self.connection_repo.get_by_workspace(workspace_id)}
        snapshots = {
            s.connection_id: s for s in self.schema_repo.get_all_latest_for_workspace(workspace_id)
        }
        relationships = self.relationship_repo.get_by_workspace(workspace_id)

        if not snapshots or not any(s.objects for s in snapshots.values()):
            return self.conversation_repo.add_message(
                Message(
                    conversation_id=conversation_id,
                    role=MessageRole.ASSISTANT,
                    content=(
                        "No database schemas are currently introspected for this workspace. "
                        "Please connect a database and introspect its schema via Data Sources to run queries."
                    ),
                )
            )

        try:
            plan = None
            if self.rag_service:
                try:
                    learning_examples = (
                        self.feedback_repo.get_learning_examples(workspace_id)
                        if self.feedback_repo
                        else None
                    )
                    rag_res = self.rag_service.evaluate_and_plan(
                        workspace_id=workspace_id,
                        query=query,
                        connections=connections,
                        snapshots=snapshots,
                        relationships=relationships,
                        resolved_context=conv.resolved_context,
                        learning_examples=learning_examples,
                    )
                    if rag_res.plan:
                        plan = rag_res.plan
                except Exception as ex:
                    logger.warning("SchemaRAG plan evaluation failed, using rule fallback: %s", ex)

            if not plan:
                # 1. Intent Extraction Fallback
                intent = self.intent_extractor.extract(query=query, snapshots=snapshots)

                # 2. Plan Synthesis Fallback
                plan = self.plan_synthesizer.synthesize(
                    workspace_id=workspace_id,
                    query=query,
                    intent=intent,
                    connections=connections,
                    snapshots=snapshots,
                    relationships=relationships,
                    resolved_context=conv.resolved_context,
                )

            # 3. Execution
            exec_result = self.execution_service.execute_plan(
                workspace_id=workspace_id,
                user_id=user_id,
                plan=plan,
                natural_query=query,
                conversation_id=conversation_id,
            )

            # 4. Result Explanation
            explanation_res = self.result_explainer.explain(
                natural_query=query,
                plan=plan,
                result=exec_result,
            )

            content_parts = [explanation_res.summary]
            if explanation_res.key_insights:
                insights_md = "\n".join(f"- {item}" for item in explanation_res.key_insights)
                content_parts.append(f"\n**Key Insights:**\n{insights_md}")
            full_content = "\n\n".join(content_parts)

            primary_query = None
            if exec_result.generated_queries:
                primary_query = next(iter(exec_result.generated_queries.values()))

            return self.conversation_repo.add_message(
                Message(
                    conversation_id=conversation_id,
                    role=MessageRole.ASSISTANT,
                    content=full_content,
                    query_plan=plan.model_dump(),
                    generated_query=primary_query,
                    target_databases=exec_result.sources_involved,
                    execution_result=exec_result.model_dump(),
                    duration_ms=exec_result.duration_ms,
                )
            )

        except Exception as e:
            return self.conversation_repo.add_message(
                Message(
                    conversation_id=conversation_id,
                    role=MessageRole.ASSISTANT,
                    content=f"Query execution could not be completed: {str(e)}",
                    duration_ms=0.0,
                )
            )


def get_conversation_service(
    conversation_repo: ConversationRepository = Depends(get_conversation_repository),
    connection_repo: ConnectionRepository = Depends(get_connection_repository),
    schema_repo: SchemaRepository = Depends(get_schema_repository),
    relationship_repo: RelationshipRepository = Depends(get_relationship_repository),
    ambiguity_service: AmbiguityService = Depends(get_ambiguity_service),
    execution_service: ExecutionService = Depends(get_execution_service),
    audit_service: AuditService = Depends(get_audit_service),
    llm_provider: BaseLLMProvider = Depends(get_llm_provider),
    feedback_repo: FeedbackRepository = Depends(get_feedback_repository),
) -> ConversationService:
    return ConversationService(
        conversation_repo=conversation_repo,
        connection_repo=connection_repo,
        schema_repo=schema_repo,
        relationship_repo=relationship_repo,
        ambiguity_service=ambiguity_service,
        execution_service=execution_service,
        audit_service=audit_service,
        llm_provider=llm_provider,
        feedback_repo=feedback_repo,
    )

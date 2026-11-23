from typing import Any

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field

from app.core.auth import WorkspacePermissionChecker, get_current_user
from app.models.ambiguity import PendingClarification
from app.models.conversation import Conversation, Message, MessageRole
from app.models.user import User
from app.models.workspace import WorkspaceMembership
from app.core.rate_limit import general_rate_limiter, rate_limit_dependency
from app.services.conversation_service import (
    ConversationService,
    get_conversation_service,
)

router = APIRouter(
    prefix="/workspaces/{workspace_id}/conversations",
    tags=["conversations"],
    dependencies=[Depends(rate_limit_dependency(general_rate_limiter))],
)


class CreateConversationRequest(BaseModel):
    title: str | None = Field(default=None, description="Initial conversation title")


class UpdateConversationRequest(BaseModel):
    title: str = Field(min_length=1, max_length=120, description="Updated title")


class PostMessageRequest(BaseModel):
    content: str = Field(min_length=1, description="User natural language message or query")


class PostMessageResponse(BaseModel):
    user_message: Message
    assistant_message: Message


class SaveMessageRequest(BaseModel):
    id: str | None = Field(default=None, description="Optional client message ID")
    role: MessageRole = Field(description="Role: user or assistant")
    content: str = Field(description="Message text content")
    clarification: PendingClarification | None = None
    query_plan: dict[str, Any] | None = None
    generated_query: str | None = None
    target_databases: list[str] = Field(default_factory=list)
    execution_result: dict[str, Any] | None = None
    duration_ms: float | None = None


class UpdateMessageRequest(BaseModel):
    content: str | None = None
    query_plan: dict[str, Any] | None = None
    generated_query: str | None = None
    execution_result: dict[str, Any] | None = None
    duration_ms: float | None = None


class ResolveClarificationInConversationRequest(BaseModel):
    clarification_id: str = Field(description="ID of the pending clarification prompt")
    selected_value: Any = Field(default=None, description="Selected option value")
    custom_input: str | None = Field(
        default=None, description="Custom user input if not selecting a preset option"
    )


@router.get("", response_model=list[Conversation])
def list_conversations(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    service: ConversationService = Depends(get_conversation_service),
    _permission: WorkspaceMembership = Depends(WorkspacePermissionChecker()),
) -> list[Conversation]:
    """List all active conversations for the authenticated user in the workspace."""
    return service.list_conversations(workspace_id=workspace_id, user_id=current_user.id)


@router.post("", response_model=Conversation, status_code=status.HTTP_201_CREATED)
def create_conversation(
    workspace_id: str,
    payload: CreateConversationRequest | None = None,
    current_user: User = Depends(get_current_user),
    service: ConversationService = Depends(get_conversation_service),
    _permission: WorkspaceMembership = Depends(WorkspacePermissionChecker()),
) -> Conversation:
    """Create a new conversational query thread."""
    title = payload.title if payload else None
    return service.create_conversation(
        workspace_id=workspace_id,
        user_id=current_user.id,
        title=title,
    )


@router.get("/{conversation_id}", response_model=Conversation)
def get_conversation(
    workspace_id: str,
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    service: ConversationService = Depends(get_conversation_service),
    _permission: WorkspaceMembership = Depends(WorkspacePermissionChecker()),
) -> Conversation:
    """Retrieve conversation thread by ID."""
    return service.get_conversation(
        workspace_id=workspace_id,
        conversation_id=conversation_id,
        user_id=current_user.id,
    )


@router.patch("/{conversation_id}", response_model=Conversation)
def update_conversation(
    workspace_id: str,
    conversation_id: str,
    payload: UpdateConversationRequest,
    current_user: User = Depends(get_current_user),
    service: ConversationService = Depends(get_conversation_service),
    _permission: WorkspaceMembership = Depends(WorkspacePermissionChecker()),
) -> Conversation:
    """Update title of a conversation thread."""
    return service.update_conversation_title(
        workspace_id=workspace_id,
        conversation_id=conversation_id,
        title=payload.title,
        user_id=current_user.id,
    )


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(
    workspace_id: str,
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    service: ConversationService = Depends(get_conversation_service),
    _permission: WorkspaceMembership = Depends(WorkspacePermissionChecker()),
) -> None:
    """Delete a conversation thread and its messages."""
    service.delete_conversation(
        workspace_id=workspace_id,
        conversation_id=conversation_id,
        user_id=current_user.id,
    )


@router.get("/{conversation_id}/messages", response_model=list[Message])
def get_messages(
    workspace_id: str,
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    service: ConversationService = Depends(get_conversation_service),
    _permission: WorkspaceMembership = Depends(WorkspacePermissionChecker()),
) -> list[Message]:
    """Retrieve message history for a conversation thread."""
    return service.get_messages(
        workspace_id=workspace_id,
        conversation_id=conversation_id,
        user_id=current_user.id,
    )


@router.post("/{conversation_id}/messages", response_model=PostMessageResponse)
def post_message(
    workspace_id: str,
    conversation_id: str,
    payload: PostMessageRequest,
    current_user: User = Depends(get_current_user),
    service: ConversationService = Depends(get_conversation_service),
    _permission: WorkspaceMembership = Depends(WorkspacePermissionChecker()),
) -> PostMessageResponse:
    """Post a user message, run ambiguity check, intent extraction, compilation, and execution."""
    user_msg, assistant_msg = service.post_message(
        workspace_id=workspace_id,
        user_id=current_user.id,
        conversation_id=conversation_id,
        content=payload.content,
    )
    return PostMessageResponse(user_message=user_msg, assistant_message=assistant_msg)


@router.post("/{conversation_id}/clarify", response_model=PostMessageResponse)
def resolve_clarification(
    workspace_id: str,
    conversation_id: str,
    payload: ResolveClarificationInConversationRequest,
    current_user: User = Depends(get_current_user),
    service: ConversationService = Depends(get_conversation_service),
    _permission: WorkspaceMembership = Depends(WorkspacePermissionChecker()),
) -> PostMessageResponse:
    """Submit clarification answer and continue execution for the active query."""
    user_msg, assistant_msg = service.resolve_clarification(
        workspace_id=workspace_id,
        user_id=current_user.id,
        conversation_id=conversation_id,
        clarification_id=payload.clarification_id,
        selected_value=payload.selected_value,
        custom_input=payload.custom_input,
    )
    return PostMessageResponse(user_message=user_msg, assistant_message=assistant_msg)


@router.post("/{conversation_id}/messages/save", response_model=Message)
def save_message(
    workspace_id: str,
    conversation_id: str,
    payload: SaveMessageRequest,
    current_user: User = Depends(get_current_user),
    service: ConversationService = Depends(get_conversation_service),
    _permission: WorkspaceMembership = Depends(WorkspacePermissionChecker()),
) -> Message:
    """Explicitly save a user or assistant message to the conversation history."""
    msg = Message(
        conversation_id=conversation_id,
        role=payload.role,
        content=payload.content,
        clarification=payload.clarification,
        query_plan=payload.query_plan,
        generated_query=payload.generated_query,
        target_databases=payload.target_databases,
        execution_result=payload.execution_result,
        duration_ms=payload.duration_ms,
    )
    if payload.id:
        msg.id = payload.id
    return service.save_message(
        workspace_id=workspace_id,
        user_id=current_user.id,
        conversation_id=conversation_id,
        message=msg,
    )


@router.patch("/{conversation_id}/messages/{message_id}", response_model=Message)
def update_message(
    workspace_id: str,
    conversation_id: str,
    message_id: str,
    payload: UpdateMessageRequest,
    current_user: User = Depends(get_current_user),
    service: ConversationService = Depends(get_conversation_service),
    _permission: WorkspaceMembership = Depends(WorkspacePermissionChecker()),
) -> Message:
    """Update message details (such as execution result) in the conversation history."""
    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    res = service.update_message(
        workspace_id=workspace_id,
        user_id=current_user.id,
        conversation_id=conversation_id,
        message_id=message_id,
        update_data=update_data,
    )
    if not res:
        raise HTTPException(status_code=404, detail="Message not found.")
    return res

import { authFetch } from "./auth-api";
import { PendingClarification } from "./ambiguity-api";
import { ExecutionResult } from "./execution-api";

export type MessageRole = "user" | "assistant" | "system";

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  clarification?: PendingClarification | null;
  query_plan?: Record<string, unknown> | null;
  generated_query?: string | null;
  target_databases?: string[];
  execution_result?: ExecutionResult | null;
  duration_ms?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface Conversation {
  id: string;
  workspace_id: string;
  user_id: string;
  title: string;
  is_archived: boolean;
  pending_clarification?: PendingClarification | null;
  active_query?: string | null;
  resolved_context?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface PostMessageResponse {
  user_message: Message;
  assistant_message: Message;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

function getHeaders(token?: string): HeadersInit {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export async function listConversations(
  workspaceId: string,
  token?: string
): Promise<Conversation[]> {
  const res = await authFetch(`${API_BASE}/workspaces/${workspaceId}/conversations`, {
    headers: getHeaders(token),
  });
  if (!res.ok) {
    throw new Error(`Failed to list conversations: ${res.statusText}`);
  }
  return res.json();
}

export async function createConversation(
  workspaceId: string,
  title?: string,
  token?: string
): Promise<Conversation> {
  const res = await authFetch(`${API_BASE}/workspaces/${workspaceId}/conversations`, {
    method: "POST",
    headers: getHeaders(token),
    body: JSON.stringify({ title }),
  });
  if (!res.ok) {
    throw new Error(`Failed to create conversation: ${res.statusText}`);
  }
  return res.json();
}

export async function getConversation(
  workspaceId: string,
  conversationId: string,
  token?: string
): Promise<Conversation> {
  const res = await authFetch(
    `${API_BASE}/workspaces/${workspaceId}/conversations/${conversationId}`,
    {
      headers: getHeaders(token),
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to get conversation: ${res.statusText}`);
  }
  return res.json();
}

export async function updateConversationTitle(
  workspaceId: string,
  conversationId: string,
  title: string,
  token?: string
): Promise<Conversation> {
  const res = await authFetch(
    `${API_BASE}/workspaces/${workspaceId}/conversations/${conversationId}`,
    {
      method: "PATCH",
      headers: getHeaders(token),
      body: JSON.stringify({ title }),
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to update conversation: ${res.statusText}`);
  }
  return res.json();
}

export async function deleteConversation(
  workspaceId: string,
  conversationId: string,
  token?: string
): Promise<void> {
  const res = await authFetch(
    `${API_BASE}/workspaces/${workspaceId}/conversations/${conversationId}`,
    {
      method: "DELETE",
      headers: getHeaders(token),
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to delete conversation: ${res.statusText}`);
  }
}

export async function getMessages(
  workspaceId: string,
  conversationId: string,
  token?: string
): Promise<Message[]> {
  const res = await authFetch(
    `${API_BASE}/workspaces/${workspaceId}/conversations/${conversationId}/messages`,
    {
      headers: getHeaders(token),
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to get messages: ${res.statusText}`);
  }
  return res.json();
}

export async function postMessage(
  workspaceId: string,
  conversationId: string,
  content: string,
  token?: string
): Promise<PostMessageResponse> {
  const res = await authFetch(
    `${API_BASE}/workspaces/${workspaceId}/conversations/${conversationId}/messages`,
    {
      method: "POST",
      headers: getHeaders(token),
      body: JSON.stringify({ content }),
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to send message: ${res.statusText}`);
  }
  return res.json();
}

export async function resolveClarificationInConversation(
  workspaceId: string,
  conversationId: string,
  clarificationId: string,
  selectedValue?: unknown,
  customInput?: string,
  token?: string
): Promise<PostMessageResponse> {
  const res = await authFetch(
    `${API_BASE}/workspaces/${workspaceId}/conversations/${conversationId}/clarify`,
    {
      method: "POST",
      headers: getHeaders(token),
      body: JSON.stringify({
        clarification_id: clarificationId,
        selected_value: selectedValue,
        custom_input: customInput,
      }),
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to submit clarification: ${res.statusText}`);
  }
  return res.json();
}

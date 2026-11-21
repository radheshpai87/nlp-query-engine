import { authFetch } from "./auth-api";

export interface CreateFeedbackPayload {
  query_text: string;
  is_correct: boolean;
  conversation_id?: string | null;
  message_id?: string | null;
  category?: string | null;
  user_notes?: string | null;
  corrected_query?: string | null;
  generated_query?: string | null;
  generated_plan?: Record<string, unknown> | null;
  target_databases?: string[];
}

export interface QueryFeedbackItem {
  id: string;
  workspace_id: string;
  user_id: string;
  query_text: string;
  is_correct: boolean;
  conversation_id?: string | null;
  message_id?: string | null;
  category?: string | null;
  user_notes?: string | null;
  corrected_query?: string | null;
  generated_query?: string | null;
  generated_plan?: Record<string, unknown> | null;
  target_databases?: string[];
  created_at?: string;
}

export interface FeedbackLearningSummary {
  total_feedback: number;
  positive_count: number;
  negative_count: number;
  accuracy_rate: number;
  common_issues: Record<string, number>;
  active_learning_rules_count: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export async function submitQueryFeedback(
  workspaceId: string,
  payload: {
    query_text: string;
    is_correct: boolean;
    conversation_id?: string | null;
    message_id?: string | null;
    category?: string | null;
    user_notes?: string | null;
    corrected_query?: string | null;
    generated_query?: string | null;
    generated_plan?: Record<string, unknown> | null;
    target_databases?: string[];
  },
  token?: string
): Promise<QueryFeedbackItem> {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await authFetch(`${API_BASE}/workspaces/${workspaceId}/feedback`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Failed to submit query feedback: ${res.statusText}`);
  }

  return res.json();
}

export async function getFeedbackLearningSummary(
  workspaceId: string,
  token?: string
): Promise<FeedbackLearningSummary> {
  const headers: HeadersInit = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await authFetch(`${API_BASE}/workspaces/${workspaceId}/feedback/learning-summary`, {
    headers,
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch feedback summary: ${res.statusText}`);
  }

  return res.json();
}

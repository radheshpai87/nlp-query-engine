import { authFetch } from "./auth-api";

export type AmbiguityType =
  | "vague_predicate"
  | "ambiguous_metric"
  | "multiple_sources"
  | "missing_time_window"
  | "unresolved_join"
  | "underspecified_aggregation";

export interface ClarificationOption {
  label: string;
  value: unknown;
  is_recommended?: boolean;
  description?: string | null;
}

export interface PendingClarification {
  id: string;
  ambiguity_type: AmbiguityType;
  parameter_name: string;
  question: string;
  options: ClarificationOption[];
  allow_custom_input: boolean;
  default_value?: unknown;
  resolved: boolean;
  user_response?: unknown;
  explanation?: string | null;
}

export interface AmbiguityEvaluationResult {
  is_ambiguous: boolean;
  confidence: number;
  clarifications: PendingClarification[];
  inferred_intent: Record<string, unknown>;
  suggested_action:
    | "proceed_to_plan"
    | "request_clarification"
    | "conversational_response"
    | "guardrail_blocked";
  conversational_response?: string | null;
  is_metadata_query?: boolean;
  is_guardrail_blocked?: boolean;
}

export interface ClarificationResolutionRequest {
  clarification_id: string;
  selected_value?: unknown;
  custom_input?: string | null;
}

export interface ClarificationResolutionResponse {
  resolved: boolean;
  clarification_id: string;
  parameter_name: string;
  resolved_value: unknown;
  remaining_clarifications: PendingClarification[];
  ready_to_execute: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export async function evaluateQueryAmbiguity(
  workspaceId: string,
  query: string,
  resolvedContext?: Record<string, unknown>,
  token?: string
): Promise<AmbiguityEvaluationResult> {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await authFetch(`${API_BASE}/workspaces/${workspaceId}/ambiguity/evaluate`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      query,
      resolved_context: resolvedContext,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to evaluate query ambiguity: ${res.statusText}`);
  }
  return res.json();
}

export async function resolveQueryClarification(
  workspaceId: string,
  request: ClarificationResolutionRequest,
  pendingClarifications: PendingClarification[],
  token?: string
): Promise<ClarificationResolutionResponse> {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await authFetch(`${API_BASE}/workspaces/${workspaceId}/ambiguity/resolve`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      request,
      pending_clarifications: pendingClarifications,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to resolve clarification: ${res.statusText}`);
  }
  return res.json();
}

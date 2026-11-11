import { authFetch } from "./auth-api";

export interface ExecutionColumnMetadata {
  name: string;
  data_type: string;
}

export interface ExecutionResult {
  execution_id: string;
  workspace_id: string;
  columns: ExecutionColumnMetadata[];
  rows: Record<string, unknown>[];
  row_count: number;
  duration_ms: number;
  is_truncated: boolean;
  status: string;
  error_message?: string | null;
  sources_involved: string[];
  generated_queries: Record<string, string>;
}

export interface QueryExecution {
  id: string;
  workspace_id: string;
  user_id: string;
  conversation_id?: string | null;
  natural_query: string;
  generated_syntax: Record<string, string>;
  status: string;
  row_count: number;
  duration_ms: number;
  error_message?: string | null;
  created_at: string;
}

export interface QueryExecutionRequest {
  logical_plan: Record<string, unknown>;
  natural_query?: string | null;
  conversation_id?: string | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export async function executeQueryPlan(
  workspaceId: string,
  request: QueryExecutionRequest,
  token?: string
): Promise<ExecutionResult> {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await authFetch(`${API_BASE}/workspaces/${workspaceId}/query/execute`, {
    method: "POST",
    headers,
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.detail || `Execution failed with status ${res.status}`);
  }
  return res.json();
}

export async function listQueryExecutions(
  workspaceId: string,
  limit: number = 50,
  skip: number = 0,
  token?: string
): Promise<QueryExecution[]> {
  const headers: HeadersInit = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await authFetch(
    `${API_BASE}/workspaces/${workspaceId}/query/executions?limit=${limit}&skip=${skip}`,
    {
      headers,
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to list query executions: ${res.statusText}`);
  }
  return res.json();
}

export async function getQueryExecution(
  workspaceId: string,
  executionId: string,
  token?: string
): Promise<QueryExecution> {
  const headers: HeadersInit = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await authFetch(
    `${API_BASE}/workspaces/${workspaceId}/query/executions/${executionId}`,
    {
      headers,
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch query execution: ${res.statusText}`);
  }
  return res.json();
}

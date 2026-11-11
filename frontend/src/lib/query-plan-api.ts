import { authFetch } from "./auth-api";

export interface CompiledSQLQuery {
  dialect: "postgres";
  connection_id: string;
  target_table: string;
  sql: string;
  parameterized_sql: string;
  parameters: Record<string, unknown>;
  is_read_only: boolean;
}

export interface CompiledMongoQuery {
  dialect: "mongodb";
  connection_id: string;
  collection: string;
  pipeline: Array<Record<string, unknown>>;
  is_read_only: boolean;
}

export interface CompiledElasticsearchQuery {
  dialect: "elasticsearch";
  connection_id: string;
  index: string;
  query_body: Record<string, unknown>;
  is_read_only: boolean;
}

export interface CrossDatabaseJoinStep {
  left_source_id: string;
  right_source_id: string;
  left_key: string;
  right_key: string;
  strategy: string;
}

export interface CrossDatabasePlan {
  is_cross_database: boolean;
  sub_queries: Array<CompiledSQLQuery | CompiledMongoQuery | CompiledElasticsearchQuery>;
  join_steps: CrossDatabaseJoinStep[];
  limit?: number | null;
  offset?: number | null;
}

export interface CompilationResult {
  workspace_id: string;
  is_cross_database: boolean;
  single_query?: CompiledSQLQuery | CompiledMongoQuery | CompiledElasticsearchQuery | null;
  cross_database_plan?: CrossDatabasePlan | null;
  dialect?: "postgres" | "mongodb" | "elasticsearch" | null;
  summary: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export async function compileLogicalPlan(
  workspaceId: string,
  plan: Record<string, unknown>,
  token?: string
): Promise<CompilationResult> {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await authFetch(`${API_BASE}/workspaces/${workspaceId}/query/plan/compile`, {
    method: "POST",
    headers,
    body: JSON.stringify(plan),
  });

  if (!res.ok) {
    throw new Error(`Failed to compile logical plan: ${res.statusText}`);
  }
  return res.json();
}

export async function synthesizeLogicalPlan(
  workspaceId: string,
  query: string,
  resolvedContext?: Record<string, unknown>,
  token?: string
): Promise<Record<string, unknown>> {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await authFetch(`${API_BASE}/workspaces/${workspaceId}/query/plan/synthesize`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      query,
      resolved_context: resolvedContext,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to synthesize logical plan: ${res.statusText}`);
  }
  return res.json();
}

import { authFetch } from "./auth-api";

export interface SchemaField {
  name: string;
  data_type: string;
  is_primary_key: boolean;
  is_foreign_key: boolean;
  is_nullable: boolean;
  description?: string | null;
  sample_values?: unknown[];
}

export interface SchemaRelationship {
  source_table: string;
  source_fields: string[];
  target_table: string;
  target_fields: string[];
  provenance: "foreign_key" | "inferred" | "user_defined";
  cardinality?: string;
  confidence: number;
}

export interface SchemaObject {
  connection_id: string;
  name: string;
  schema_name?: string | null;
  object_type: string; // table, view, collection, index
  description?: string | null;
  fields: SchemaField[];
  relationships: SchemaRelationship[];
  row_count_estimate?: number | null;
}

export interface SchemaSnapshot {
  id: string;
  workspace_id: string;
  connection_id: string;
  fingerprint: string;
  objects: SchemaObject[];
  total_objects: number;
  created_at: string;
}

export interface SchemaSearchResult {
  connection_id: string;
  connection_name?: string | null;
  object_name: string;
  object_type: string;
  field_name?: string | null;
  data_type?: string | null;
  match_type: "object" | "field";
  snippet?: string | null;
}

export interface UserDefinedRelationshipCreate {
  name?: string | null;
  source_connection_id: string;
  source_table: string;
  source_fields: string[];
  target_connection_id: string;
  target_table: string;
  target_fields: string[];
  cardinality?: string;
  description?: string | null;
}

export interface UserDefinedRelationship {
  id: string;
  workspace_id: string;
  name?: string | null;
  source_connection_id: string;
  source_table: string;
  source_fields: string[];
  target_connection_id: string;
  target_table: string;
  target_fields: string[];
  provenance: "user_defined";
  cardinality: string;
  confidence: number;
  description?: string | null;
  created_at: string;
}

export interface GraphNode extends Record<string, unknown> {
  id: string;
  name: string;
  connection_id: string;
  connection_name: string;
  database_type: "postgres" | "mongodb" | "elasticsearch" | string;
  schema_name?: string | null;
  object_type: string;
  fields: SchemaField[];
  row_count_estimate?: number | null;
}

export interface GraphEdge extends Record<string, unknown> {
  id: string;
  source_node_id: string;
  source_field: string;
  target_node_id: string;
  target_field: string;
  provenance: "foreign_key" | "inferred" | "user_defined";
  cardinality?: string;
  confidence: number;
  is_cross_database: boolean;
  description?: string | null;
}

export interface SchemaGraphStatistics {
  total_nodes: number;
  total_edges: number;
  foreign_keys_count: number;
  inferred_count: number;
  user_defined_count: number;
  cross_database_count: number;
}

export interface SchemaGraphResponse {
  workspace_id: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  statistics: SchemaGraphStatistics;
}

import { API_BASE } from "./api-config";

export async function fetchWorkspaceSchemas(
  workspaceId: string,
  token?: string
): Promise<SchemaSnapshot[]> {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await authFetch(`${API_BASE}/workspaces/${workspaceId}/schemas`, {
    headers,
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch workspace schemas: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchConnectionSchema(
  workspaceId: string,
  connectionId: string,
  token?: string
): Promise<SchemaSnapshot> {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await authFetch(
    `${API_BASE}/workspaces/${workspaceId}/schemas/${connectionId}`,
    { headers }
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch connection schema: ${res.statusText}`);
  }
  return res.json();
}

export async function refreshConnectionSchema(
  workspaceId: string,
  connectionId: string,
  token?: string
): Promise<SchemaSnapshot> {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await authFetch(
    `${API_BASE}/workspaces/${workspaceId}/schemas/${connectionId}/refresh`,
    {
      method: "POST",
      headers,
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to refresh schema: ${res.statusText}`);
  }
  return res.json();
}

export async function searchSchema(
  workspaceId: string,
  query: string,
  token?: string
): Promise<SchemaSearchResult[]> {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await authFetch(
    `${API_BASE}/workspaces/${workspaceId}/schemas/search?q=${encodeURIComponent(query)}`,
    { headers }
  );
  if (!res.ok) {
    throw new Error(`Failed to search schemas: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchSchemaGraph(
  workspaceId: string,
  token?: string
): Promise<SchemaGraphResponse> {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await authFetch(`${API_BASE}/workspaces/${workspaceId}/schemas/graph`, {
    headers,
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch schema graph: ${res.statusText}`);
  }
  return res.json();
}

export async function createUserDefinedRelationship(
  workspaceId: string,
  data: UserDefinedRelationshipCreate,
  token?: string
): Promise<UserDefinedRelationship> {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await authFetch(
    `${API_BASE}/workspaces/${workspaceId}/schemas/relationships`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to create relationship: ${res.statusText}`);
  }
  return res.json();
}

export async function deleteUserDefinedRelationship(
  workspaceId: string,
  relationshipId: string,
  token?: string
): Promise<void> {
  const headers: HeadersInit = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await authFetch(
    `${API_BASE}/workspaces/${workspaceId}/schemas/relationships/${relationshipId}`,
    {
      method: "DELETE",
      headers,
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to delete relationship: ${res.statusText}`);
  }
}

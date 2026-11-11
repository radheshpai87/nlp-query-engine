import { authFetch } from "./auth-api";

export interface AuditEvent {
  id: string;
  workspace_id: string;
  sequence: number;
  user_id?: string | null;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  details: Record<string, unknown>;
  ip_address?: string | null;
  status: "SUCCESS" | "FAILED" | "DENIED" | string;
  previous_hash?: string | null;
  event_hash?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface AuditQueryResponse {
  items: AuditEvent[];
  total: number;
  limit: number;
  skip: number;
}

export interface AuditIntegrityResponse {
  is_valid: boolean;
  total_events_checked: number;
  tampered_event_ids: string[];
  message: string;
}

export interface AuditQueryParams {
  action?: string;
  resource_type?: string;
  user_id?: string;
  status?: string;
  search?: string;
  limit?: number;
  skip?: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

function getHeaders(token?: string): HeadersInit {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export async function getAuditTrail(
  workspaceId: string,
  params: AuditQueryParams = {},
  token?: string
): Promise<AuditQueryResponse> {
  const query = new URLSearchParams();
  if (params.action) query.set("action", params.action);
  if (params.resource_type) query.set("resource_type", params.resource_type);
  if (params.user_id) query.set("user_id", params.user_id);
  if (params.status && params.status !== "ALL") query.set("status", params.status);
  if (params.search) query.set("search", params.search);
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  if (params.skip !== undefined) query.set("skip", String(params.skip));

  const url = `${API_BASE}/workspaces/${workspaceId}/audit?${query.toString()}`;
  const res = await authFetch(url, {
    headers: getHeaders(token),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch audit events: ${res.statusText}`);
  }
  return res.json();
}

export async function verifyAuditIntegrity(
  workspaceId: string,
  token?: string
): Promise<AuditIntegrityResponse> {
  const url = `${API_BASE}/workspaces/${workspaceId}/audit/integrity`;
  const res = await authFetch(url, {
    headers: getHeaders(token),
  });

  if (!res.ok) {
    throw new Error(`Failed to verify audit integrity: ${res.statusText}`);
  }
  return res.json();
}

export async function exportAuditTrail(
  workspaceId: string,
  format: "json" | "csv" = "json",
  token?: string
): Promise<Blob> {
  const url = `${API_BASE}/workspaces/${workspaceId}/audit/export?format=${format}`;
  const res = await authFetch(url, {
    headers: getHeaders(token),
  });

  if (!res.ok) {
    throw new Error(`Failed to export audit log: ${res.statusText}`);
  }
  return res.blob();
}

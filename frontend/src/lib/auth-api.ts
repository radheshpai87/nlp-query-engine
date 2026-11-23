/**
 * Client-side Authentication, Session Management & Admin API Client
 */
import { API_BASE } from "./api-config";

const TOKEN_STORAGE_KEY = "nlp_query_auth_token";
const REFRESH_TOKEN_STORAGE_KEY = "nlp_query_auth_refresh_token";
const USER_STORAGE_KEY = "nlp_query_auth_user";

export const DEMO_CREDENTIALS = {
  email: "admin@example.com",
  password: "Admin123!",
  fullName: "Demo Administrator",
  role: "Administrator",
  workspace: "Nexus Query",
};

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  is_active?: boolean;
  is_superuser: boolean;
  default_workspace_id: string;
  onboarding_completed?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  user: AuthUser;
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      document.cookie = "nlp_logged_in=1; path=/; max-age=2592000; SameSite=Lax";
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      document.cookie = "nlp_logged_in=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
    }
  } catch {
    // Ignore storage quota or security errors
  }
}

export function getStoredRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredRefreshToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (token) {
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore
  }
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem("stored-user");
      return null;
    }
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser | null): void {
  if (typeof window === "undefined") return;
  try {
    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem("stored-user");
    }
  } catch {
    // Ignore
  }
}

export async function logout(): Promise<void> {
  const refreshToken = getStoredRefreshToken();

  // 1. Immediately and synchronously clear all local and session storage
  setStoredToken(null);
  setStoredRefreshToken(null);
  setStoredUser(null);
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem("stored-user");
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
      sessionStorage.clear();
      document.cookie = "nlp_logged_in=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
    } catch {
      // Ignore
    }
  }

  // 2. Best-effort server side revocation
  if (refreshToken) {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch {
      // Best-effort
    }
  }
}

/**
 * Exchange stored refresh token for a fresh access token & rotated refresh token.
 */
export async function refreshAccessToken(): Promise<string | null> {
  const currentRefresh = getStoredRefreshToken();
  if (!currentRefresh) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: currentRefresh }),
    });

    if (!res.ok) {
      // Token expired or invalid
      setStoredToken(null);
      setStoredRefreshToken(null);
      return null;
    }

    const data: LoginResponse = await res.json();
    setStoredToken(data.access_token);
    if (data.refresh_token) {
      setStoredRefreshToken(data.refresh_token);
    }
    if (data.user) {
      setStoredUser(data.user);
    }
    return data.access_token;
  } catch {
    return null;
  }
}

/**
 * Register a new user account.
 */
export async function registerWithCredentials(
  fullName: string,
  email: string,
  password: string
): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ full_name: fullName, email, password }),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    const detail = errorBody?.detail || errorBody?.message || res.statusText;
    throw new Error(detail || `Registration failed (${res.status})`);
  }

  const data: LoginResponse = await res.json();
  setStoredToken(data.access_token);
  if (data.refresh_token) setStoredRefreshToken(data.refresh_token);
  setStoredUser(data.user);
  return data;
}

/**
 * Log in using email and password credentials.
 */
export async function loginWithCredentials(
  email: string,
  password: string
): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    const detail = errorBody?.detail || res.statusText;
    throw new Error(detail || `Authentication failed (${res.status})`);
  }

  const data: LoginResponse = await res.json();
  setStoredToken(data.access_token);
  if (data.refresh_token) setStoredRefreshToken(data.refresh_token);
  setStoredUser(data.user);
  return data;
}

/**
 * Request password reset token.
 */
export async function requestPasswordReset(email: string): Promise<{ message: string; reset_token?: string }> {
  const res = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new Error(errorBody?.detail || "Failed to process password reset request");
  }

  return res.json();
}

/**
 * Reset password using token.
 */
export async function resetPasswordWithToken(token: string, newPassword: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, new_password: newPassword }),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new Error(errorBody?.detail || "Invalid or expired reset token");
  }

  return res.json();
}

/**
 * Update user profile details.
 */
export async function updateUserProfile(updates: Partial<AuthUser>): Promise<AuthUser> {
  const res = await authFetch(`${API_BASE}/auth/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new Error(errorBody?.detail || "Failed to update profile");
  }

  const user: AuthUser = await res.json();
  setStoredUser(user);
  return user;
}

/**
 * Change current password.
 */
export async function changeUserPassword(currentPassword: string, newPassword: string): Promise<void> {
  const res = await authFetch(`${API_BASE}/auth/change-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new Error(errorBody?.detail || "Failed to change password");
  }
}

/**
 * Backward-compatible login function returning access_token.
 */
export async function login(
  email: string,
  password: string
): Promise<string> {
  const data = await loginWithCredentials(email, password);
  return data.access_token;
}

/**
 * Fetch current user profile from /auth/me using active token.
 */
export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const res = await authFetch(`${API_BASE}/auth/me`);
    if (res.ok) {
      const user: AuthUser = await res.json();
      setStoredUser(user);
      return user;
    }
    return null;
  } catch {
    return getStoredUser();
  }
}

/**
 * Handle incoming OAuth callback JWT token and initialize session.
 */
export async function handleOAuthCallbackToken(
  token: string,
  refreshToken?: string | null
): Promise<AuthUser | null> {
  setStoredToken(token);
  if (refreshToken) {
    setStoredRefreshToken(refreshToken);
  }
  const user = await fetchCurrentUser();
  if (user) {
    setStoredUser(user);
  }
  return user;
}

/**
 * Ensures an active JWT access token exists or returns null if unauthenticated.
 */
export async function ensureAuthToken(): Promise<string | null> {
  const existing = getStoredToken();
  if (existing) return existing;

  const refreshed = await refreshAccessToken();
  if (refreshed) return refreshed;

  return null;
}

/**
 * Authenticated fetch wrapper. Automatically attaches Bearer token,
 * refreshes via refreshAccessToken() on 401, and retries once.
 */
export async function authFetch(
  input: string | URL | Request,
  init?: RequestInit
): Promise<Response> {
  const rawHeaders = init?.headers;
  const headers: Record<string, string> = {};

  if (rawHeaders) {
    if (rawHeaders instanceof Headers) {
      rawHeaders.forEach((v, k) => {
        headers[k] = v;
      });
    } else if (Array.isArray(rawHeaders)) {
      for (const [k, v] of rawHeaders) {
        headers[k] = v;
      }
    } else {
      Object.assign(headers, rawHeaders);
    }
  }

  const hasAuth = Object.keys(headers).some(
    (k) => k.toLowerCase() === "authorization" && Boolean(headers[k])
  );

  if (!hasAuth) {
    let token = getStoredToken();
    if (!token) {
      token = await refreshAccessToken();
    }
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  let response = await fetch(input, {
    ...init,
    headers,
  });

  // If token expired or rejected, attempt refresh and retry once
  if (response.status === 401 && !hasAuth) {
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken) {
      headers["Authorization"] = `Bearer ${refreshedToken}`;
      response = await fetch(input, {
        ...init,
        headers,
      });
    }
  }

  return response;
}

/* ──────────────────────────────────────────────────────────────────────────
   Admin API Operations
   ────────────────────────────────────────────────────────────────────────── */

export interface AdminMetrics {
  users: {
    total: number;
    active: number;
    admins: number;
  };
  queries: {
    total: number;
    successful: number;
    failed: number;
    success_rate: number;
    avg_latency_ms: number;
  };
  connections: Array<{
    id: string;
    name: string;
    db_type: string;
    database: string;
    status: string;
    last_verified_at: string | null;
  }>;
  governance: {
    read_only_enforced: boolean;
    max_timeout_seconds: number;
    max_rows: number;
    active_llm_provider: string;
    llm_model: string;
    security_ledger: string;
  };
}

export interface DirectQueryResult {
  success: boolean;
  columns: string[];
  rows: (string | number | boolean | null)[][];
  row_count: number;
  execution_time_ms: number;
  command_status?: string;
  error?: string;
  connection?: {
    id: string;
    name: string;
    database: string;
  };
}

export const adminApi = {
  async getMetrics(): Promise<AdminMetrics> {
    const res = await authFetch(`${API_BASE}/admin/metrics`);
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.detail || "Failed to load admin metrics");
    }
    return res.json();
  },

  async listUsers(): Promise<AuthUser[]> {
    const res = await authFetch(`${API_BASE}/admin/users`);
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.detail || "Failed to list users");
    }
    return res.json();
  },

  async updateUserStatus(userId: string, isActive: boolean): Promise<void> {
    const res = await authFetch(`${API_BASE}/admin/users/${userId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: isActive }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.detail || "Failed to update user status");
    }
  },

  async updateUserRole(userId: string, isSuperuser: boolean): Promise<void> {
    const res = await authFetch(`${API_BASE}/admin/users/${userId}/role`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_superuser: isSuperuser }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.detail || "Failed to update user role");
    }
  },

  async deleteUser(userId: string): Promise<void> {
    const res = await authFetch(`${API_BASE}/admin/users/${userId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.detail || "Failed to delete user");
    }
  },

  async executeDirectQuery(query: string, connectionId?: string): Promise<DirectQueryResult> {
    const res = await authFetch(`${API_BASE}/admin/direct-query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, connection_id: connectionId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.detail || "Direct query execution failed");
    }
    return res.json();
  },
};

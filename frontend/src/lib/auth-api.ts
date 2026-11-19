/**
 * Client-side Authentication & Session Management
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const TOKEN_STORAGE_KEY = "nlp_query_auth_token";
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
  is_superuser: boolean;
  default_workspace_id: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage quota or security errors
  }
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser | null): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  } catch {
    // Ignore storage quota or security errors
  }
}

export function logout(): void {
  setStoredToken(null);
  setStoredUser(null);
}

/**
 * Log in using credentials and persist session.
 */
export async function loginWithCredentials(
  email = DEMO_CREDENTIALS.email,
  password = DEMO_CREDENTIALS.password
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
  setStoredUser(data.user);
  return data;
}

/**
 * Backward-compatible login function returning access_token.
 */
export async function login(
  email = DEMO_CREDENTIALS.email,
  password = DEMO_CREDENTIALS.password
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
 * Ensures an active JWT access token exists, authenticating as demo admin if needed.
 */
export async function ensureAuthToken(): Promise<string> {
  const existing = getStoredToken();
  if (existing) {
    return existing;
  }
  return login();
}

/**
 * Authenticated fetch wrapper. Automatically attaches Bearer token,
 * initializing demo auth if needed, and retries once on 401.
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

  // Check if an Authorization header is already provided by the caller
  const hasAuth = Object.keys(headers).some(
    (k) => k.toLowerCase() === "authorization" && Boolean(headers[k])
  );

  if (!hasAuth) {
    let token = getStoredToken();
    if (!token) {
      try {
        token = await login();
      } catch {
        // Fallback
      }
    }
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  let response = await fetch(input, {
    ...init,
    headers,
  });

  // If token expired or rejected and no caller-provided auth was supplied, refresh demo token and retry once
  if (response.status === 401 && !hasAuth) {
    try {
      const token = await login();
      headers["Authorization"] = `Bearer ${token}`;
      response = await fetch(input, {
        ...init,
        headers,
      });
    } catch {
      // Return original 401 response
    }
  }

  return response;
}

"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NexusLogo } from "@/components/ui/nexus-logo";
import { useShellStore } from "@/lib/store";
import { getStoredToken, getStoredUser } from "@/lib/auth-api";
import {
  Search,
  Copy,
  Check,
  ArrowRight,
  Terminal,
  ShieldCheck,
  Database,
  Layers,
  Sparkles,
  Key,
  ExternalLink,
  Code2,
  FileCode,
  Lock,
  ChevronRight,
  AlertTriangle,
  Server,
  BookOpen,
} from "lucide-react";

/* ── Code Snippet Tab Type ─────────────────────────────────────────────────── */
type CodeLang = "curl" | "typescript" | "python";

interface ApiEndpoint {
  id: string;
  category: string;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  title: string;
  description: string;
  authRequired: boolean;
  permission?: string;
  headers?: { name: string; type: string; required: boolean; description: string }[];
  params?: { name: string; in: "path" | "query"; type: string; required: boolean; description: string }[];
  requestBody?: {
    description: string;
    schema: string;
    example: string;
  };
  responses: {
    status: number;
    description: string;
    example: string;
  }[];
  codeSnippets: {
    curl: string;
    typescript: string;
    python: string;
  };
}

/* ── Comprehensive API Registry ────────────────────────────────────────────── */
const API_ENDPOINTS: ApiEndpoint[] = [
  // 1. Auth & Identity
  {
    id: "auth-signup",
    category: "Authentication",
    method: "POST",
    path: "/api/v1/auth/signup",
    title: "Register New Account",
    description: "Create a new user account with email, full name, and secure password. Returns active session JWT and refresh tokens.",
    authRequired: false,
    requestBody: {
      description: "User registration credentials",
      schema: `{ email: string, password: string, full_name?: string }`,
      example: JSON.stringify(
        {
          email: "analyst@company.com",
          password: "SecurePassword123!",
          full_name: "Clinical Data Analyst",
        },
        null,
        2
      ),
    },
    responses: [
      {
        status: 201,
        description: "Account created successfully with dual tokens",
        example: JSON.stringify(
          {
            access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            refresh_token: "f7b1e843c0a54...",
            token_type: "bearer",
            user: {
              id: "usr_8fa910",
              email: "analyst@company.com",
              full_name: "Clinical Data Analyst",
              is_active: true,
              is_superuser: false,
            },
          },
          null,
          2
        ),
      },
      {
        status: 400,
        description: "Email already registered or password policy failed",
        example: JSON.stringify({ detail: "Email already registered" }, null, 2),
      },
    ],
    codeSnippets: {
      curl: `curl -X POST https://nlp.radhesh.me/api/v1/auth/signup \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "analyst@company.com",
    "password": "SecurePassword123!",
    "full_name": "Clinical Data Analyst"
  }'`,
      typescript: `const res = await fetch("https://nlp.radhesh.me/api/v1/auth/signup", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "analyst@company.com",
    password: "SecurePassword123!",
    full_name: "Clinical Data Analyst"
  })
});
const data = await res.json();`,
      python: `import requests

res = requests.post(
    "https://nlp.radhesh.me/api/v1/auth/signup",
    json={
        "email": "analyst@company.com",
        "password": "SecurePassword123!",
        "full_name": "Clinical Data Analyst"
    }
)
tokens = res.json()`,
    },
  },
  {
    id: "auth-login",
    category: "Authentication",
    method: "POST",
    path: "/api/v1/auth/login",
    title: "User Login",
    description: "Authenticate with email and password to receive a short-lived access JWT and rotated refresh token.",
    authRequired: false,
    requestBody: {
      description: "Login credentials",
      schema: `{ email: string, password: string }`,
      example: JSON.stringify(
        {
          email: "analyst@company.com",
          password: "SecurePassword123!",
        },
        null,
        2
      ),
    },
    responses: [
      {
        status: 200,
        description: "Authentication successful",
        example: JSON.stringify(
          {
            access_token: "eyJhbGciOiJIUzI1NiIsIn...",
            refresh_token: "d9e8c7b6...",
            token_type: "bearer",
            user: {
              id: "usr_8fa910",
              email: "analyst@company.com",
              full_name: "Clinical Data Analyst",
              is_superuser: false,
            },
          },
          null,
          2
        ),
      },
      {
        status: 401,
        description: "Invalid email or password",
        example: JSON.stringify({ detail: "Invalid email or password" }, null, 2),
      },
    ],
    codeSnippets: {
      curl: `curl -X POST https://nlp.radhesh.me/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "analyst@company.com",
    "password": "SecurePassword123!"
  }'`,
      typescript: `const res = await fetch("https://nlp.radhesh.me/api/v1/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "analyst@company.com",
    password: "SecurePassword123!"
  })
});
const session = await res.json();`,
      python: `import requests

res = requests.post(
    "https://nlp.radhesh.me/api/v1/auth/login",
    json={"email": "analyst@company.com", "password": "SecurePassword123!"}
)
session = res.json()`,
    },
  },
  {
    id: "auth-refresh",
    category: "Authentication",
    method: "POST",
    path: "/api/v1/auth/refresh",
    title: "Refresh Access Token",
    description: "Exchange an existing refresh token for a brand new access JWT and rotated refresh token.",
    authRequired: false,
    requestBody: {
      description: "Existing refresh token payload",
      schema: `{ refresh_token: string }`,
      example: JSON.stringify({ refresh_token: "f7b1e843c0a54..." }, null, 2),
    },
    responses: [
      {
        status: 200,
        description: "Tokens successfully rotated",
        example: JSON.stringify(
          {
            access_token: "eyJhbGciOiJIUzI1NiIsIn...",
            refresh_token: "a1b2c3d4e5f6...",
            token_type: "bearer",
          },
          null,
          2
        ),
      },
    ],
    codeSnippets: {
      curl: `curl -X POST https://nlp.radhesh.me/api/v1/auth/refresh \\
  -H "Content-Type: application/json" \\
  -d '{"refresh_token": "f7b1e843c0a54..."}'`,
      typescript: `const res = await fetch("https://nlp.radhesh.me/api/v1/auth/refresh", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ refresh_token: storedRefreshToken })
});
const newTokens = await res.json();`,
      python: `import requests

res = requests.post(
    "https://nlp.radhesh.me/api/v1/auth/refresh",
    json={"refresh_token": "f7b1e843c0a54..."}
)
new_tokens = res.json()`,
    },
  },
  {
    id: "auth-me",
    category: "Authentication",
    method: "GET",
    path: "/api/v1/auth/me",
    title: "Get Current User Profile",
    description: "Retrieve authenticated user details and superuser status.",
    authRequired: true,
    headers: [{ name: "Authorization", type: "string", required: true, description: "Bearer <access_token>" }],
    responses: [
      {
        status: 200,
        description: "User profile payload",
        example: JSON.stringify(
          {
            id: "usr_8fa910",
            email: "analyst@company.com",
            full_name: "Clinical Data Analyst",
            is_active: true,
            is_superuser: false,
            created_at: "2026-11-20T12:00:00Z",
          },
          null,
          2
        ),
      },
    ],
    codeSnippets: {
      curl: `curl https://nlp.radhesh.me/api/v1/auth/me \\
  -H "Authorization: Bearer <access_token>"`,
      typescript: `const res = await fetch("https://nlp.radhesh.me/api/v1/auth/me", {
  headers: { "Authorization": "Bearer " + token }
});
const profile = await res.json();`,
      python: `import requests

res = requests.get(
    "https://nlp.radhesh.me/api/v1/auth/me",
    headers={"Authorization": f"Bearer {token}"}
)
profile = res.json()`,
    },
  },

  // 2. Natural Language Conversations
  {
    id: "conv-list",
    category: "Conversations & Chat",
    method: "GET",
    path: "/api/v1/workspaces/{workspace_id}/conversations",
    title: "List User Conversations",
    description: "Retrieve all active conversation threads strictly scoped to the authenticated user.",
    authRequired: true,
    params: [{ name: "workspace_id", in: "path", type: "string", required: true, description: "Target workspace ID" }],
    headers: [{ name: "Authorization", type: "string", required: true, description: "Bearer <access_token>" }],
    responses: [
      {
        status: 200,
        description: "List of conversation summaries",
        example: JSON.stringify(
          [
            {
              id: "conv_a190f",
              workspace_id: "ws_default",
              user_id: "usr_8fa910",
              title: "ICU Patient Readmissions by Department",
              created_at: "2026-11-22T08:30:00Z",
              updated_at: "2026-11-22T08:32:15Z",
            },
          ],
          null,
          2
        ),
      },
    ],
    codeSnippets: {
      curl: `curl https://nlp.radhesh.me/api/v1/workspaces/ws_default/conversations \\
  -H "Authorization: Bearer <access_token>"`,
      typescript: `const res = await fetch("https://nlp.radhesh.me/api/v1/workspaces/ws_default/conversations", {
  headers: { "Authorization": "Bearer " + token }
});
const chats = await res.json();`,
      python: `import requests

res = requests.get(
    "https://nlp.radhesh.me/api/v1/workspaces/ws_default/conversations",
    headers={"Authorization": f"Bearer {token}"}
)
chats = res.json()`,
    },
  },
  {
    id: "conv-post-message",
    category: "Conversations & Chat",
    method: "POST",
    path: "/api/v1/workspaces/{workspace_id}/conversations/{conversation_id}/messages",
    title: "Submit Natural Language Query",
    description: "The core intelligence endpoint. Accepts natural language questions, performs schema-grounded intent extraction, checks for ambiguity, compiles an explainable read-only logical plan, executes the query safely, and returns tabular records alongside dialect SQL.",
    authRequired: true,
    params: [
      { name: "workspace_id", in: "path", type: "string", required: true, description: "Workspace ID" },
      { name: "conversation_id", in: "path", type: "string", required: true, description: "Conversation thread ID" },
    ],
    headers: [{ name: "Authorization", type: "string", required: true, description: "Bearer <access_token>" }],
    requestBody: {
      description: "Query content message",
      schema: `{ content: string }`,
      example: JSON.stringify({ content: "Show total patient admissions grouped by department in 2026" }, null, 2),
    },
    responses: [
      {
        status: 200,
        description: "Synthesized assistant answer, compiled SQL, and tabular result data",
        example: JSON.stringify(
          {
            user_message: {
              id: "msg_user_1",
              role: "user",
              content: "Show total patient admissions grouped by department in 2026",
            },
            assistant_message: {
              id: "msg_asst_1",
              role: "assistant",
              content: "Retrieved 6 departments. Cardiology recorded the highest admission count (412 patients).",
            },
            query_plan: {
              plan_id: "plan_9f821",
              dialect: "postgresql",
              compiled_sql: "SELECT d.name AS department, COUNT(a.id) AS admissions FROM admissions a JOIN departments d ON a.department_id = d.id WHERE EXTRACT(year FROM a.admitted_at) = 2026 GROUP BY d.name ORDER BY admissions DESC;",
              read_only: true,
              estimated_cost: 0.12,
            },
            execution_result: {
              row_count: 6,
              duration_ms: 14.2,
              columns: ["department", "admissions"],
              rows: [
                { department: "Cardiology", admissions: 412 },
                { department: "Neurology", admissions: 284 },
                { department: "Oncology", admissions: 198 },
              ],
            },
          },
          null,
          2
        ),
      },
    ],
    codeSnippets: {
      curl: `curl -X POST https://nlp.radhesh.me/api/v1/workspaces/ws_default/conversations/conv_a190f/messages \\
  -H "Authorization: Bearer <access_token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "content": "Show total patient admissions grouped by department in 2026"
  }'`,
      typescript: `const res = await fetch(
  "https://nlp.radhesh.me/api/v1/workspaces/ws_default/conversations/conv_a190f/messages",
  {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      content: "Show total patient admissions grouped by department in 2026"
    })
  }
);
const result = await res.json();`,
      python: `import requests

res = requests.post(
    "https://nlp.radhesh.me/api/v1/workspaces/ws_default/conversations/conv_a190f/messages",
    headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    },
    json={"content": "Show total patient admissions grouped by department in 2026"}
)
result = res.json()`,
    },
  },
  {
    id: "conv-clarify",
    category: "Conversations & Chat",
    method: "POST",
    path: "/api/v1/workspaces/{workspace_id}/conversations/{conversation_id}/clarify",
    title: "Resolve Ambiguity with Selection",
    description: "When the ambiguity engine detects multiple valid semantic paths (e.g., 'billing amount' vs 'paid amount'), submit the user's chosen option to resume execution deterministically.",
    authRequired: true,
    headers: [{ name: "Authorization", type: "string", required: true, description: "Bearer <access_token>" }],
    requestBody: {
      description: "Selected option for disambiguation",
      schema: `{ clarification_id: string, selected_option_id: string }`,
      example: JSON.stringify(
        {
          clarification_id: "clar_4920",
          selected_option_id: "opt_invoiced_total",
        },
        null,
        2
      ),
    },
    responses: [
      {
        status: 200,
        description: "Resolved execution outcome",
        example: JSON.stringify(
          {
            status: "resolved",
            assistant_message: {
              content: "Compiled query using Invoiced Total. Total revenue calculated is $1,420,500.",
            },
          },
          null,
          2
        ),
      },
    ],
    codeSnippets: {
      curl: `curl -X POST https://nlp.radhesh.me/api/v1/workspaces/ws_default/conversations/conv_a190f/clarify \\
  -H "Authorization: Bearer <access_token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "clarification_id": "clar_4920",
    "selected_option_id": "opt_invoiced_total"
  }'`,
      typescript: `const res = await fetch("https://nlp.radhesh.me/api/v1/workspaces/ws_default/conversations/conv_a190f/clarify", {
  method: "POST",
  headers: {
    "Authorization": "Bearer " + token,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    clarification_id: "clar_4920",
    selected_option_id: "opt_invoiced_total"
  })
});`,
      python: `import requests

res = requests.post(
    "https://nlp.radhesh.me/api/v1/workspaces/ws_default/conversations/conv_a190f/clarify",
    headers={"Authorization": f"Bearer {token}"},
    json={"clarification_id": "clar_4920", "selected_option_id": "opt_invoiced_total"}
)`,
    },
  },

  // 3. Database Connections & Schema Catalog
  {
    id: "conn-list",
    category: "Data Sources & Catalog",
    method: "GET",
    path: "/api/v1/workspaces/{workspace_id}/connections",
    title: "List Registered Databases",
    description: "Returns all configured database targets in the workspace (PostgreSQL, MySQL, SQLite, MongoDB, ClickHouse).",
    authRequired: true,
    headers: [{ name: "Authorization", type: "string", required: true, description: "Bearer <access_token>" }],
    responses: [
      {
        status: 200,
        description: "List of connection configurations",
        example: JSON.stringify(
          [
            {
              id: "conn_pg_hospital",
              name: "Hospital Clinical DB",
              dialect: "postgresql",
              host: "postgres-target",
              port: 5432,
              database: "healthcare_demo",
              status: "active",
              table_count: 10,
            },
          ],
          null,
          2
        ),
      },
    ],
    codeSnippets: {
      curl: `curl https://nlp.radhesh.me/api/v1/workspaces/ws_default/connections \\
  -H "Authorization: Bearer <access_token>"`,
      typescript: `const res = await fetch("https://nlp.radhesh.me/api/v1/workspaces/ws_default/connections", {
  headers: { "Authorization": "Bearer " + token }
});
const dbs = await res.json();`,
      python: `import requests

res = requests.get(
    "https://nlp.radhesh.me/api/v1/workspaces/ws_default/connections",
    headers={"Authorization": f"Bearer {token}"}
)
dbs = res.json()`,
    },
  },
  {
    id: "conn-introspect",
    category: "Data Sources & Catalog",
    method: "POST",
    path: "/api/v1/workspaces/{workspace_id}/connections/{connection_id}/introspect",
    title: "Introspect Database Schema",
    description: "Triggers active schema crawling over tables, views, primary keys, foreign keys, and column data types. Persists the snapshot in the schema catalog.",
    authRequired: true,
    headers: [{ name: "Authorization", type: "string", required: true, description: "Bearer <access_token>" }],
    responses: [
      {
        status: 200,
        description: "Introspection results summary",
        example: JSON.stringify(
          {
            connection_id: "conn_pg_hospital",
            tables_discovered: 10,
            foreign_keys_indexed: 14,
            status: "synced",
            timestamp: "2026-11-23T08:50:00Z",
          },
          null,
          2
        ),
      },
    ],
    codeSnippets: {
      curl: `curl -X POST https://nlp.radhesh.me/api/v1/workspaces/ws_default/connections/conn_pg_hospital/introspect \\
  -H "Authorization: Bearer <access_token>"`,
      typescript: `const res = await fetch(
  "https://nlp.radhesh.me/api/v1/workspaces/ws_default/connections/conn_pg_hospital/introspect",
  {
    method: "POST",
    headers: { "Authorization": "Bearer " + token }
  }
);`,
      python: `import requests

res = requests.post(
    "https://nlp.radhesh.me/api/v1/workspaces/ws_default/connections/conn_pg_hospital/introspect",
    headers={"Authorization": f"Bearer {token}"}
)`,
    },
  },
  {
    id: "schemas-list",
    category: "Data Sources & Catalog",
    method: "GET",
    path: "/api/v1/workspaces/{workspace_id}/schemas",
    title: "Get Schema Graph & Metadata",
    description: "Fetch the relational schema graph, including entity definitions, field nullability, and primary/foreign key connections used for AST generation.",
    authRequired: true,
    headers: [{ name: "Authorization", type: "string", required: true, description: "Bearer <access_token>" }],
    responses: [
      {
        status: 200,
        description: "Schema nodes and foreign key edges",
        example: JSON.stringify(
          {
            tables: [
              {
                name: "patients",
                columns: [
                  { name: "id", type: "integer", primary_key: true },
                  { name: "full_name", type: "varchar(100)" },
                  { name: "date_of_birth", type: "date" },
                  { name: "gender", type: "varchar(10)" },
                ],
              },
              {
                name: "admissions",
                columns: [
                  { name: "id", type: "integer", primary_key: true },
                  { name: "patient_id", type: "integer", references: "patients.id" },
                  { name: "department_id", type: "integer", references: "departments.id" },
                  { name: "admitted_at", type: "timestamp" },
                ],
              },
            ],
          },
          null,
          2
        ),
      },
    ],
    codeSnippets: {
      curl: `curl https://nlp.radhesh.me/api/v1/workspaces/ws_default/schemas \\
  -H "Authorization: Bearer <access_token>"`,
      typescript: `const res = await fetch("https://nlp.radhesh.me/api/v1/workspaces/ws_default/schemas", {
  headers: { "Authorization": "Bearer " + token }
});
const schema = await res.json();`,
      python: `import requests

res = requests.get(
    "https://nlp.radhesh.me/api/v1/workspaces/ws_default/schemas",
    headers={"Authorization": f"Bearer {token}"}
)
schema = res.json()`,
    },
  },

  // 4. Governance, Safety & Audit
  {
    id: "audit-list",
    category: "Governance & Audit",
    method: "GET",
    path: "/api/v1/workspaces/{workspace_id}/audit",
    title: "Retrieve Audit Trail Logs",
    description: "Query immutable audit logs recording every natural language query, compiled SQL plan, execution latency, and safety evaluation.",
    authRequired: true,
    headers: [{ name: "Authorization", type: "string", required: true, description: "Bearer <access_token>" }],
    responses: [
      {
        status: 200,
        description: "Audit events stream",
        example: JSON.stringify(
          [
            {
              id: "aud_9a01",
              user_id: "usr_8fa910",
              action: "query.executed",
              status: "success",
              duration_ms: 18.5,
              query_text: "Show total patient admissions...",
              timestamp: "2026-11-23T08:50:12Z",
            },
          ],
          null,
          2
        ),
      },
    ],
    codeSnippets: {
      curl: `curl https://nlp.radhesh.me/api/v1/workspaces/ws_default/audit \\
  -H "Authorization: Bearer <access_token>"`,
      typescript: `const res = await fetch("https://nlp.radhesh.me/api/v1/workspaces/ws_default/audit", {
  headers: { "Authorization": "Bearer " + token }
});
const auditLogs = await res.json();`,
      python: `import requests

res = requests.get(
    "https://nlp.radhesh.me/api/v1/workspaces/ws_default/audit",
    headers={"Authorization": f"Bearer {token}"}
)
audit_logs = res.json()`,
    },
  },
  {
    id: "feedback-post",
    category: "Governance & Audit",
    method: "POST",
    path: "/api/v1/workspaces/{workspace_id}/feedback",
    title: "Submit User Query Feedback",
    description: "Record binary satisfaction ratings (+1/-1) and user corrections on generated queries to power fine-grained ground truth tuning.",
    authRequired: true,
    headers: [{ name: "Authorization", type: "string", required: true, description: "Bearer <access_token>" }],
    requestBody: {
      description: "User feedback payload",
      schema: `{ message_id: string, rating: number, comment?: string }`,
      example: JSON.stringify(
        {
          message_id: "msg_asst_1",
          rating: 1,
          comment: "Accurately selected the correct discharge date column.",
        },
        null,
        2
      ),
    },
    responses: [
      {
        status: 200,
        description: "Feedback logged successfully",
        example: JSON.stringify({ status: "success", feedback_id: "fb_7c12" }, null, 2),
      },
    ],
    codeSnippets: {
      curl: `curl -X POST https://nlp.radhesh.me/api/v1/workspaces/ws_default/feedback \\
  -H "Authorization: Bearer <access_token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "message_id": "msg_asst_1",
    "rating": 1,
    "comment": "Accurately selected the correct discharge date column."
  }'`,
      typescript: `const res = await fetch("https://nlp.radhesh.me/api/v1/workspaces/ws_default/feedback", {
  method: "POST",
  headers: {
    "Authorization": "Bearer " + token,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    message_id: "msg_asst_1",
    rating: 1,
    comment: "Accurately selected the correct discharge date column."
  })
});`,
      python: `import requests

res = requests.post(
    "https://nlp.radhesh.me/api/v1/workspaces/ws_default/feedback",
    headers={"Authorization": f"Bearer {token}"},
    json={
        "message_id": "msg_asst_1",
        "rating": 1,
        "comment": "Accurately selected the correct discharge date column."
    }
)`,
    },
  },
];

/* ── Distinct Categories for Nav ───────────────────────────────────────────── */
const CATEGORIES = [
  "Getting Started",
  "Architecture & Security",
  "Authentication",
  "Conversations & Chat",
  "Data Sources & Catalog",
  "Governance & Audit",
];

export default function DocsPage() {
  const { currentUser, setCurrentUser } = useShellStore();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeSnippetLang, setActiveSnippetLang] = React.useState<Record<string, CodeLang>>({});
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const token = getStoredToken();
      const user = getStoredUser();
      if (!token || !user) {
        if (useShellStore.getState().currentUser) {
          setCurrentUser(null);
        }
      } else if (!useShellStore.getState().currentUser) {
        setCurrentUser(user);
      }
    }
  }, [setCurrentUser]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getLangForEndpoint = (id: string): CodeLang => {
    return activeSnippetLang[id] || "curl";
  };

  const setLangForEndpoint = (id: string, lang: CodeLang) => {
    setActiveSnippetLang((prev) => ({ ...prev, [id]: lang }));
  };

  // Filter endpoints based on search
  const filteredEndpoints = React.useMemo(() => {
    if (!searchQuery.trim()) return API_ENDPOINTS;
    const q = searchQuery.toLowerCase();
    return API_ENDPOINTS.filter(
      (ep) =>
        ep.title.toLowerCase().includes(q) ||
        ep.path.toLowerCase().includes(q) ||
        ep.method.toLowerCase().includes(q) ||
        ep.description.toLowerCase().includes(q) ||
        ep.category.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const methodBadgeColor = (method: string) => {
    switch (method) {
      case "GET":
        return "bg-sky-500/10 text-sky-400 border-sky-500/30";
      case "POST":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "PATCH":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "DELETE":
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
      default:
        return "bg-zinc-500/10 text-zinc-400 border-zinc-500/30";
    }
  };

  return (
    <div className="min-h-screen bg-[#080A0E] text-slate-100 selection:bg-amber-500/30 selection:text-amber-200">
      {/* ── Top Header Navigation ────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#080A0E]/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <NexusLogo size={28} className="group-hover:scale-105 transition-transform" />
              <span className="text-sm font-semibold tracking-tight text-white">Nexus Query</span>
            </Link>
            <span className="text-zinc-600">/</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-amber-400">Documentation</span>
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 border-amber-500/30 text-amber-400 bg-amber-500/10 font-mono">
                v1.0 REST
              </Badge>
            </div>
          </div>

          {/* Quick links & CTA */}
          <div className="flex items-center gap-3">
            <a
              href="/api/openapi.json"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
            >
              <FileCode className="h-3.5 w-3.5 text-amber-400" />
              <span>OpenAPI Spec</span>
            </a>

            {currentUser ? (
              <Link href="/chat">
                <Button size="sm" className="h-8 gap-1.5 text-xs bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold shadow-[0_0_12px_rgba(245,158,11,0.25)]">
                  Launch Chat
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button size="sm" variant="outline" className="h-8 text-xs border-white/10 text-slate-300 hover:text-white hover:border-white/20">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Layout: Sidebar & Content ─────────────────────────────────── */}
      <div className="mx-auto flex max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Left Sticky Sidebar */}
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 overflow-y-auto border-r border-white/5 py-8 pr-6 lg:block">
          {/* Quick Search */}
          <div className="relative mb-6">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Filter endpoints & guides..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-zinc-900/60 py-1.5 pl-8 pr-3 text-xs text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            />
          </div>

          <div className="space-y-6 text-xs">
            {/* Guide Links */}
            <div>
              <p className="font-semibold uppercase tracking-wider text-[10px] text-zinc-400 mb-2">Getting Started</p>
              <ul className="space-y-1 text-zinc-400">
                <li>
                  <a href="#overview" className="block py-1 hover:text-amber-400 transition-colors">
                    Overview & Engine Design
                  </a>
                </li>
                <li>
                  <a href="#architecture" className="block py-1 hover:text-amber-400 transition-colors">
                    4-Stage Query Pipeline
                  </a>
                </li>
                <li>
                  <a href="#security-model" className="block py-1 hover:text-amber-400 transition-colors">
                    Security & Read-Only Policy
                  </a>
                </li>
                <li>
                  <a href="#quickstart" className="block py-1 hover:text-amber-400 transition-colors">
                    Quickstart Tutorial
                  </a>
                </li>
              </ul>
            </div>

            {/* Categorized Endpoints */}
            {CATEGORIES.slice(2).map((cat) => {
              const catEndpoints = filteredEndpoints.filter((ep) => ep.category === cat);
              if (catEndpoints.length === 0) return null;
              return (
                <div key={cat}>
                  <p className="font-semibold uppercase tracking-wider text-[10px] text-zinc-400 mb-2">{cat}</p>
                  <ul className="space-y-1">
                    {catEndpoints.map((ep) => (
                      <li key={ep.id}>
                        <a
                          href={`#${ep.id}`}
                          className="flex items-center gap-1.5 py-1 text-zinc-400 hover:text-white transition-colors group"
                        >
                          <span
                            className={`text-[9px] font-mono px-1 py-0.2 rounded border font-semibold ${methodBadgeColor(
                              ep.method
                            )}`}
                          >
                            {ep.method}
                          </span>
                          <span className="truncate group-hover:text-amber-400 transition-colors">
                            {ep.title}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Right Documentation Content */}
        <main className="min-w-0 flex-1 py-8 lg:pl-10 pb-24">
          {/* Hero Banner */}
          <div className="mb-12 border-b border-white/5 pb-8">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-400 text-xs font-medium mb-3">
              <Sparkles className="h-3.5 w-3.5" />
              Developer Documentation & API
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-3">
              Nexus Query Engine Reference
            </h1>
            <p className="text-sm text-zinc-400 max-w-3xl leading-relaxed">
              Nexus Query is an ambiguity-aware natural language query engine that turns plain English questions
              into deterministic, read-only SQL and AST plans across heterogeneous data sources.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-zinc-900/60 font-mono text-xs text-zinc-300">
                <span className="text-zinc-500">Base URL:</span>
                <span className="text-amber-400">https://nlp.radhesh.me/api/v1</span>
                <button
                  onClick={() => handleCopy("base-url", "https://nlp.radhesh.me/api/v1")}
                  className="ml-1 text-zinc-500 hover:text-white transition-colors"
                  title="Copy Base URL"
                >
                  {copiedId === "base-url" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>

              <a
                href="/api/openapi.json"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-zinc-900/60 text-xs text-zinc-300 hover:text-white hover:border-white/20 transition-all"
              >
                <Code2 className="h-3.5 w-3.5 text-amber-400" />
                Raw OpenAPI 3.1 JSON
              </a>
            </div>
          </div>

          {/* ── Section: Overview ────────────────────────────────────────────── */}
          <section id="overview" className="mb-14 scroll-mt-24">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-amber-400" />
              Why Nexus Query?
            </h2>
            <div className="prose prose-invert text-xs sm:text-sm text-zinc-300 space-y-4 max-w-none leading-relaxed">
              <p>
                Standard LLM text-to-SQL solutions blindly generate SQL queries directly from prompts, causing
                destructive operations (accidental <code className="text-rose-400">DELETE</code> or <code className="text-rose-400">DROP</code>),
                hallucinated column names, and unverified assumptions when business semantics are ambiguous.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
                <div className="p-4 rounded-xl border border-white/10 bg-zinc-900/40">
                  <div className="flex items-center gap-2 text-amber-400 font-semibold mb-1 text-xs">
                    <ShieldCheck className="h-4 w-4" />
                    Read-Only Guarantee
                  </div>
                  <p className="text-xs text-zinc-400">
                    Database adapters enforce read-only transactions at the connection level. DML/DDL statements are rejected before execution.
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-white/10 bg-zinc-900/40">
                  <div className="flex items-center gap-2 text-amber-400 font-semibold mb-1 text-xs">
                    <Sparkles className="h-4 w-4" />
                    Active Disambiguation
                  </div>
                  <p className="text-xs text-zinc-400">
                    When terms like "active patients" could refer to admitted status or recent visits, Nexus detects the ambiguity and prompts for clarification.
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-white/10 bg-zinc-900/40">
                  <div className="flex items-center gap-2 text-amber-400 font-semibold mb-1 text-xs">
                    <Database className="h-4 w-4" />
                    Ground-Truth Schema Catalog
                  </div>
                  <p className="text-xs text-zinc-400">
                    Live database schema crawler inspects tables, column types, primary keys, and foreign keys into an embedded graph.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ── Section: Architecture ────────────────────────────────────────── */}
          <section id="architecture" className="mb-14 scroll-mt-24">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Layers className="h-5 w-5 text-amber-400" />
              The 4-Stage Execution Pipeline
            </h2>
            <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                <div className="border border-white/10 rounded-lg p-3 bg-zinc-950/60">
                  <span className="text-[10px] font-mono font-semibold text-amber-400 block mb-1">STAGE 1</span>
                  <h4 className="font-semibold text-white mb-1">Intent Extraction</h4>
                  <p className="text-zinc-400 text-[11px]">
                    Parses query entities, temporal boundaries, aggregate metrics, and target tables from natural speech.
                  </p>
                </div>
                <div className="border border-white/10 rounded-lg p-3 bg-zinc-950/60">
                  <span className="text-[10px] font-mono font-semibold text-amber-400 block mb-1">STAGE 2</span>
                  <h4 className="font-semibold text-white mb-1">Ambiguity Evaluation</h4>
                  <p className="text-zinc-400 text-[11px]">
                    Scores semantic clarity against candidate columns. Triggers interactive clarification options if confidence falls below threshold.
                  </p>
                </div>
                <div className="border border-white/10 rounded-lg p-3 bg-zinc-950/60">
                  <span className="text-[10px] font-mono font-semibold text-amber-400 block mb-1">STAGE 3</span>
                  <h4 className="font-semibold text-white mb-1">Plan Compilation</h4>
                  <p className="text-zinc-400 text-[11px]">
                    Synthesizes an abstract syntax tree (AST) and compiles dialect-specific, parameterized SQL (PostgreSQL, ClickHouse, MySQL).
                  </p>
                </div>
                <div className="border border-white/10 rounded-lg p-3 bg-zinc-950/60">
                  <span className="text-[10px] font-mono font-semibold text-amber-400 block mb-1">STAGE 4</span>
                  <h4 className="font-semibold text-white mb-1">Verified Execution</h4>
                  <p className="text-zinc-400 text-[11px]">
                    Dispatches the read-only transaction with query timeout (default 30s) and row limits (default 1,000 rows).
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ── Section: Security & Authentication ───────────────────────────── */}
          <section id="security-model" className="mb-14 scroll-mt-24">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Lock className="h-5 w-5 text-amber-400" />
              Authentication & Security Model
            </h2>
            <div className="prose prose-invert text-xs sm:text-sm text-zinc-300 space-y-4 max-w-none leading-relaxed">
              <p>
                All workspace and chat endpoints require an authenticated JWT access token transmitted in the standard
                HTTP <code className="text-amber-400">Authorization</code> header:
              </p>
              <div className="p-3 rounded-lg border border-white/10 bg-zinc-950 font-mono text-xs text-zinc-300 flex items-center justify-between">
                <span>Authorization: Bearer &lt;access_token&gt;</span>
                <button
                  onClick={() => handleCopy("auth-header", "Authorization: Bearer <access_token>")}
                  className="text-zinc-500 hover:text-white"
                >
                  {copiedId === "auth-header" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>

              <div className="rounded-xl border border-white/10 bg-zinc-900/30 p-4 space-y-3">
                <h4 className="font-semibold text-white text-xs uppercase tracking-wider text-amber-400">
                  Dual-Token Architecture
                </h4>
                <ul className="list-disc list-inside space-y-1.5 text-xs text-zinc-400">
                  <li>
                    <strong className="text-zinc-200">Access Token:</strong> Short-lived JWT (30 minutes expiry) signed using HMAC-SHA256. Contains user ID and workspace permissions.
                  </li>
                  <li>
                    <strong className="text-zinc-200">Refresh Token:</strong> 30-day rotated token stored hashed in MongoDB. Exchangeable via <code className="text-amber-400">POST /api/v1/auth/refresh</code>.
                  </li>
                  <li>
                    <strong className="text-zinc-200">Multi-User Tenant Isolation:</strong> Every conversation thread and message log is strictly scoped by <code className="text-amber-400">user_id</code>. Cross-user attempts result in 404 Not Found.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* ── Section: Quickstart Tutorial ─────────────────────────────────── */}
          <section id="quickstart" className="mb-14 scroll-mt-24">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Terminal className="h-5 w-5 text-amber-400" />
              Quickstart in 3 Steps
            </h2>
            <div className="space-y-4">
              <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-center flex items-center justify-center text-[10px]">1</span>
                  Authenticate and get an Access Token
                </div>
                <div className="relative rounded-lg bg-zinc-950 p-3 font-mono text-[11px] text-zinc-300 overflow-x-auto">
                  <pre>{`curl -X POST https://nlp.radhesh.me/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email": "analyst@company.com", "password": "YourPassword123!"}'`}</pre>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-center flex items-center justify-center text-[10px]">2</span>
                  Create a Conversation Thread
                </div>
                <div className="relative rounded-lg bg-zinc-950 p-3 font-mono text-[11px] text-zinc-300 overflow-x-auto">
                  <pre>{`curl -X POST https://nlp.radhesh.me/api/v1/workspaces/ws_default/conversations \\
  -H "Authorization: Bearer <TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{"title": "Healthcare Admissions Q4 Analysis"}'`}</pre>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-center flex items-center justify-center text-[10px]">3</span>
                  Send a Natural Language Question
                </div>
                <div className="relative rounded-lg bg-zinc-950 p-3 font-mono text-[11px] text-zinc-300 overflow-x-auto">
                  <pre>{`curl -X POST https://nlp.radhesh.me/api/v1/workspaces/ws_default/conversations/<CONVERSATION_ID>/messages \\
  -H "Authorization: Bearer <TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{"content": "Show top 5 departments with highest patient admissions"}'`}</pre>
                </div>
              </div>
            </div>
          </section>

          {/* ── Section: Interactive API Reference ───────────────────────────── */}
          <section id="api-reference" className="mb-14 scroll-mt-24">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Code2 className="h-5 w-5 text-amber-400" />
                  REST API Endpoints Reference
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Showing {filteredEndpoints.length} {filteredEndpoints.length === 1 ? "endpoint" : "endpoints"}{" "}
                  {searchQuery && `matching "${searchQuery}"`}
                </p>
              </div>
            </div>

            {/* Endpoints List */}
            <div className="space-y-8">
              {filteredEndpoints.map((ep) => {
                const currentLang = getLangForEndpoint(ep.id);
                return (
                  <div
                    key={ep.id}
                    id={ep.id}
                    className="rounded-xl border border-white/10 bg-zinc-900/40 overflow-hidden shadow-lg scroll-mt-20"
                  >
                    {/* Endpoint Header Bar */}
                    <div className="border-b border-white/10 bg-zinc-950/80 px-4 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`font-mono font-bold text-xs px-2.5 py-1 rounded border ${methodBadgeColor(
                            ep.method
                          )}`}
                        >
                          {ep.method}
                        </span>
                        <code className="text-xs font-mono font-semibold text-zinc-200">{ep.path}</code>
                      </div>

                      <div className="flex items-center gap-2">
                        {ep.authRequired ? (
                          <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400 bg-amber-500/10">
                            Bearer Auth
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                            Public
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-[10px] bg-zinc-800 text-zinc-300">
                          {ep.category}
                        </Badge>
                      </div>
                    </div>

                    {/* Endpoint Details */}
                    <div className="p-4 sm:p-6 space-y-6">
                      <div>
                        <h3 className="text-base font-semibold text-white mb-1.5">{ep.title}</h3>
                        <p className="text-xs text-zinc-400 leading-relaxed">{ep.description}</p>
                      </div>

                      {/* Path & Query Params */}
                      {ep.params && ep.params.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                            Parameters
                          </h4>
                          <div className="overflow-x-auto rounded-lg border border-white/5">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-zinc-950/60 text-zinc-400 border-b border-white/5">
                                <tr>
                                  <th className="py-2 px-3 font-medium">Name</th>
                                  <th className="py-2 px-3 font-medium">In</th>
                                  <th className="py-2 px-3 font-medium">Type</th>
                                  <th className="py-2 px-3 font-medium">Description</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5 text-zinc-300">
                                {ep.params.map((p) => (
                                  <tr key={p.name}>
                                    <td className="py-2 px-3 font-mono text-amber-400">
                                      {p.name}
                                      {p.required && <span className="text-rose-400 ml-1">*</span>}
                                    </td>
                                    <td className="py-2 px-3 font-mono text-zinc-400">{p.in}</td>
                                    <td className="py-2 px-3 font-mono text-zinc-400">{p.type}</td>
                                    <td className="py-2 px-3 text-zinc-400">{p.description}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Request Body */}
                      {ep.requestBody && (
                        <div>
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                            Request Body (application/json)
                          </h4>
                          <p className="text-[11px] text-zinc-400 mb-2">{ep.requestBody.description}</p>
                          <div className="relative rounded-lg bg-zinc-950 p-3 font-mono text-xs text-zinc-300 border border-white/5 overflow-x-auto">
                            <pre>{ep.requestBody.example}</pre>
                            <button
                              onClick={() => handleCopy(`${ep.id}-req`, ep.requestBody!.example)}
                              className="absolute top-2.5 right-2.5 text-zinc-500 hover:text-white"
                              title="Copy JSON"
                            >
                              {copiedId === `${ep.id}-req` ? (
                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Code Snippets with Tabs */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                            Example Request
                          </h4>
                          <div className="flex items-center rounded-lg border border-white/10 bg-zinc-950 p-0.5 text-[10px]">
                            {(["curl", "typescript", "python"] as CodeLang[]).map((lang) => (
                              <button
                                key={lang}
                                onClick={() => setLangForEndpoint(ep.id, lang)}
                                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                                  currentLang === lang
                                    ? "bg-amber-500 text-zinc-950 font-semibold"
                                    : "text-zinc-400 hover:text-white"
                                }`}
                              >
                                {lang === "curl" ? "cURL" : lang === "typescript" ? "TypeScript" : "Python"}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="relative rounded-lg bg-zinc-950 p-3 font-mono text-xs text-zinc-300 border border-white/5 overflow-x-auto">
                          <pre>{ep.codeSnippets[currentLang]}</pre>
                          <button
                            onClick={() => handleCopy(`${ep.id}-${currentLang}`, ep.codeSnippets[currentLang])}
                            className="absolute top-2.5 right-2.5 text-zinc-500 hover:text-white transition-colors"
                            title="Copy Code"
                          >
                            {copiedId === `${ep.id}-${currentLang}` ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Response Payload */}
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                          Response Payload
                        </h4>
                        {ep.responses.map((resp, idx) => (
                          <div key={idx} className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                                  resp.status >= 200 && resp.status < 300
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                    : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                                }`}
                              >
                                {resp.status}
                              </span>
                              <span className="text-xs text-zinc-400">{resp.description}</span>
                            </div>
                            <div className="relative rounded-lg bg-zinc-950 p-3 font-mono text-xs text-zinc-300 border border-white/5 overflow-x-auto">
                              <pre>{resp.example}</pre>
                              <button
                                onClick={() => handleCopy(`${ep.id}-res-${idx}`, resp.example)}
                                className="absolute top-2.5 right-2.5 text-zinc-500 hover:text-white"
                                title="Copy Response"
                              >
                                {copiedId === `${ep.id}-res-${idx}` ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Footer ──────────────────────────────────────────────────────── */}
          <footer className="mt-16 border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-4">
            <div className="flex items-center gap-2">
              <NexusLogo size={20} />
              <span>Nexus Query API Documentation &copy; 2026</span>
            </div>
            <div className="flex items-center gap-6">
              <Link href="/" className="hover:text-amber-400 transition-colors">
                Home
              </Link>
              <Link href="/chat" className="hover:text-amber-400 transition-colors">
                Chat Console
              </Link>
              <a
                href="/api/openapi.json"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-amber-400 transition-colors"
              >
                OpenAPI Spec
              </a>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}

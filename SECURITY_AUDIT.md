# SECURITY AUDIT & GOVERNANCE REPORT

**System:** Ambiguity-Aware Natural Language Query Engine for Heterogeneous Databases  
**Audit Scope:** Authentication, Authorization, Database Connectivity, Secret Storage, Query Execution Guardrails, Audit Ledger Integrity.

---

## 1. Vulnerability Findings & Remediation

| Ref | Category | Finding | Severity | Status / Remediation |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-001** | Credentials | Frontend contained default credentials object (`DEMO_CREDENTIALS`) and auto-fill buttons. | High | **Remediated:** Removed all hardcoded demo credentials, passwords, and auto-login bypasses from frontend code. Implemented true self-service registration and login. |
| **SEC-002** | Exposure | Connection strings with credentials potentially exposed in connection listing API. | High | **Remediated:** Sanitized all connection responses so passwords and connection URIs are masked (`••••••••`). |
| **SEC-003** | Injection | Natural language to SQL/MQL/DSL translation could attempt SQL or NoSQL injection. | Critical | **Enforced:** Parameterized queries used for PostgreSQL; strictly structured AST builders for MongoDB aggregation and Elasticsearch DSL; strict identifier allowlisting against registered schema snapshots. |
| **SEC-004** | Execution Safety | Malicious queries could execute write operations (`DROP`, `DELETE`, `UPDATE`). | Critical | **Enforced:** Multi-layer read-only guardrails. Backend enforces read-only AST checks, read-only transaction flags, and statement execution timeouts (30s max). |
| **SEC-005** | Audit Tampering | Logs could be altered or deleted. | Medium | **Remediated:** SHA-256 cryptographic hash-chained immutable audit ledger. Every entry hashes the previous entry's hash, making log truncation or alteration mathematically detectable. |
| **SEC-006** | Multi-Tenancy | Workspace isolation bypass via ID tampering. | High | **Enforced:** `WorkspacePermissionChecker` dependency verifies active workspace membership and role (ADMIN, MEMBER, VIEWER) on every API request. |

---

## 2. Security Boundaries & Controls

1. **Authentication:**
   - Password hashing: `bcrypt` with unique salts.
   - Access tokens: Signed JWTs (`HS256`) with 24-hour expiration.
   - Password reset tokens: Secure randomly generated tokens with 1-hour expiration.

2. **Authorization & RBAC:**
   - **Admin / Owner:** Manage workspace, invite members, modify database connections, refresh schemas, view full audit ledger.
   - **Analyst / Member:** Execute natural language queries, create user-defined relationships, view schemas.
   - **Viewer:** Read-only access to saved queries and execution results.

3. **Database Security:**
   - Database accounts connected to target databases must be granted read-only privileges (`GRANT SELECT ON ALL TABLES`, read-only MongoDB roles).

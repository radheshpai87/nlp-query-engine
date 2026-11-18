# Security, Governance & Compliance Specification

## Ambiguity-Aware Natural Language Query Engine

The Ambiguity-Aware Natural Language Query Engine is built with **zero-trust security principles** and strict read-only execution guarantees designed for enterprise deployment across heterogeneous production databases.

---

### 1. Cryptographic Protection of Database Credentials

* **At-Rest Encryption**: Connection passwords, URIs, and authentication tokens are encrypted at rest using **Fernet cryptography** (`AES-128-CBC` with PKCS7 padding and `HMAC-SHA256` authentication).
* **Zero Plaintext Storage**: Plaintext secrets are never stored in MongoDB metadata or serialized in application memory outside the immediate adapter execution scope.
* **Automatic Log & API Redaction**: All connection strings and error messages undergo regex-based credential masking (`redact_connection_string`), replacing user passwords with `***REDACTED***` in server logs, API responses, and audit records.

---

### 2. AST-Level Query Security Scanner (`QuerySecurityScanner`)

All compiled queries must pass token- and AST-level security scanning before being dispatched to target databases. If any mutating keyword or dangerous stage is detected, execution is aborted immediately with a `SecurityViolation` exception.

#### 2.1 SQL Scanner (`scan_sql`)
- Rejects DML mutations: `INSERT`, `UPDATE`, `DELETE`, `MERGE`.
- Rejects DDL modifications: `DROP`, `ALTER`, `CREATE`, `TRUNCATE`, `RENAME`.
- Rejects administrative commands: `GRANT`, `REVOKE`, `VACUUM`, `REINDEX`, `COPY`, `EXEC`, `CALL`.
- Enforces strict `SELECT`-only execution.

#### 2.2 MongoDB Aggregation Scanner (`scan_mql`)
- Rejects collection modification stages: `$out`, `$merge`.
- Rejects arbitrary JavaScript code execution stages: `$where`, `$accumulator`, `$function`.
- Permitted stages: `$match`, `$project`, `$group`, `$sort`, `$limit`, `$skip`, `$lookup`, `$unwind`.

#### 2.3 Elasticsearch DSL Scanner (`scan_elasticsearch`)
- Permits read-only query and aggregation verbs (`query`, `aggs`, `aggregations`, `size`, `from`, `sort`).
- Rejects script execution (`inline`, `script`, `painless`, `source`).
- Rejects index modification endpoints (`_delete`, `_update`, `_reindex`).

---

### 3. Automated PII Data Masking (`mask_records`)

The execution engine automatically scans and masks sensitive Personally Identifiable Information (PII) before query results are delivered to the frontend or recorded in audit trails:

| Sensitive Field Type | Key Patterns | Sanitization Format |
| :--- | :--- | :--- |
| **Credit Card Numbers** | `credit_card`, `card_number`, `cc_num` | Standard PCI-DSS Mask: `****-****-****-1234` |
| **Social Security Numbers** | `ssn`, `social_security` | Masked: `***-**-6789` |
| **Passwords & Secrets** | `password`, `secret`, `hash`, `token` | Fully Redacted: `***MASKED***` |
| **API Keys** | `api_key`, `secret_key`, `access_token` | Prefix Mask: `sk_live_****` |

---

### 4. Sliding Window Rate Limiting (`SlidingWindowRateLimiter`)

* Execution and heavy compilation endpoints are guarded by a high-performance in-memory sliding window rate limiter.
* Default policy: **30 queries per minute per IP address / user**.
* Excess requests are immediately rejected with `429 Too Many Requests` and a `Retry-After` header.

---

### 5. Cryptographic Audit Blockchain Ledger

Every action in the system is recorded in an immutable, cryptographically chained audit log:

* **Strictly Monotonic Sequence**: Each workspace maintains a zero-indexed sequence (`sequence: int = 0, 1, 2, ...`).
* **Cryptographic Hash Chaining**:
  $$\text{event\_hash} = \text{SHA-256}(\text{sequence} \parallel \text{workspace\_id} \parallel \text{action} \parallel \text{resource\_type} \parallel \text{user\_id} \parallel \text{status} \parallel \text{timestamp} \parallel \text{previous\_hash})$$
* **Genesis Continuity**: The first event in any workspace points to `GENESIS`. Every subsequent event strictly references the preceding event's `event_hash`.
* **Tamper Detection (`verify_integrity`)**:
  - The verification endpoint re-computes every hash from genesis to head.
  - If any record has been modified, deleted, or reordered, the chain verification fails and returns the exact ID of the corrupted record.

---

### 6. Multi-Tenant Workspace RBAC

* Every connection, schema snapshot, query plan, and audit event is partitioned by `workspace_id`.
* Role-Based Access Control (RBAC):
  - **`ADMIN`**: Workspace owner; manage connections, members, schema relationships, and audit exports.
  - **`MEMBER`**: Query author; compose queries, resolve ambiguities, execute read-only plans, and inspect charts.
  - **`VIEWER`**: Read-only dashboard access to query results and audit logs.
* Cross-tenant access is strictly denied at the API gateway layer with `403 Forbidden`.

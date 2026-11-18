# Architecture and System Design

## Ambiguity-Aware Natural Language Query Engine for Heterogeneous Databases

### 1. Executive Summary

The **Ambiguity-Aware Natural Language Query Engine** allows non-technical users to query heterogeneous data sources (PostgreSQL, MongoDB, and Elasticsearch) using ordinary natural language. 

Unlike traditional Text-to-SQL solutions that silently guess missing constraints or hallucinate database objects, this engine:
1. **Discovers & Indexes Schemas**: Performs automated introspection across relational, document, and search systems, tracking schemas with deterministic SHA-256 fingerprints.
2. **Detects Ambiguity Deterministically**: Analyzes user prompts for vague predicates ("high-value", "top"), temporal ambiguity ("recently", "this year"), and competing join paths *before* building execution plans.
3. **Engages in Structured Clarification**: Renders interactive, multi-option parameter prompts in the chat workspace. Execution is paused safely until the user confirms their intent.
4. **Builds a Typed Intermediate Representation (IR)**: Generates a database-agnostic `LogicalQueryPlan` containing projections, filters, joins, groupings, and pagination.
5. **Compiles Heterogeneous Dialects**: Translates the IR into target dialect syntax:
   - **PostgreSQL**: Parameterized ANSI SQL (`SELECT ... FROM ... JOIN ... WHERE ...`)
   - **MongoDB**: Aggregation Pipelines (`[{"$match": ...}, {"$group": ...}, {"$project": ...}]`)
   - **Elasticsearch**: Query DSL (`{"query": {"bool": {"filter": [...]}}}`)
6. **Executes Safely with In-Memory Federation**: Dispatches read-only queries with strict AST verification, joins heterogeneous streams via an in-memory hash join evaluator, and automatically masks sensitive PII.
7. **Maintains a Cryptographic Audit Blockchain**: Chained SHA-256 event logging with strict monotonicity guarantees tamper-evident provenance across every query and workspace action.

---

### 2. High-Level Component Topology

```mermaid
flowchart TD
    subgraph UI ["Frontend (Next.js 16 + React 19 + Tailwind CSS)"]
        Canvas["n8n-Style Schema Canvas (@xyflow/react)"]
        Chat["ChatGPT-Style Conversational Workspace"]
        Visuals["Accessible SVG Visual Charts (Bar / Line / Donut)"]
        Inspector["Provenance & Explainability Inspector"]
        AuditUI["Tamper-Evident Audit Ledger Dashboard"]
    end

    subgraph API ["Backend API Layer (FastAPI + Python 3.12)"]
        AuthMiddleware["JWT Bearer Auth & Workspace RBAC"]
        RateLimiter["Sliding Window Rate Limiter"]
        AuditMiddleware["Cryptographic Audit Blockchain Service"]
        Router["API Router (/auth, /workspaces, /schemas, /query, /audit)"]
    end

    subgraph CoreEngine ["Query Processing Engine"]
        Intent["Schema-Grounded Intent Extractor (LLM + Fallback)"]
        Ambiguity["Deterministic Ambiguity Detection Engine"]
        IRBuilder["Logical Query Plan Builder & Validator"]
        Optimizer["Predicate & Projection Optimizer"]
        Compiler["Multi-Dialect AST Compiler (SQL, MQL, ES DSL)"]
        Scanner["AST Read-Only Security Scanner"]
        Evaluator["Federated In-Memory Hash Join Evaluator"]
        Masker["Automated PII Data Masker"]
    end

    subgraph Storage ["Infrastructure & Target Databases"]
        AppMongo[("Metadata Storage: MongoDB 7.0<br/>(Users, Workspaces, Secrets, Audits)")]
        TargetPG[("Target 1: PostgreSQL 16<br/>(Relational E-Commerce)")]
        TargetMongo[("Target 2: MongoDB 7.0<br/>(User Analytics & Reviews)")]
        TargetES[("Target 3: Elasticsearch 8.13<br/>(Search Catalog & Access Logs)")]
    end

    UI -->|REST / JSON| API
    API --> CoreEngine
    CoreEngine -->|State & Schemas| AppMongo
    CoreEngine -->|Safe Read-Only SQL| TargetPG
    CoreEngine -->|Safe Read-Only MQL| TargetMongo
    CoreEngine -->|Safe Read-Only DSL| TargetES
```

---

### 3. Detailed Subsystem Workflows

#### 3.1 Ambiguity Detection & Clarification State Machine

```mermaid
stateDiagram-v2
    [*] --> PromptReceived: User submits natural query
    PromptReceived --> SchemaGrounded: Match entities against indexed schemas
    SchemaGrounded --> AmbiguityCheck: Evaluate predicates, time horizons & join paths

    state AmbiguityCheck <<choice>>
    AmbiguityCheck --> ClarificationRequired: Ambiguity Found (Confidence < 0.85)
    AmbiguityCheck --> ReadyForPlanning: Deterministic Grounding (Confidence >= 0.85)

    ClarificationRequired --> UserPrompted: Checkpoint conversation & send interactive options
    UserPrompted --> UserResponse: User clicks option or provides custom input
    UserResponse --> AmbiguityCheck: Merge parameters & re-evaluate

    ReadyForPlanning --> PlanSynthesis: Construct Typed Logical Plan (IR)
    PlanSynthesis --> [*]
```

#### 3.2 Heterogeneous Query Compilation & Federated Join Pipeline

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Workspace as Chat Workspace
    participant Engine as Execution Engine
    participant Scanner as Security Scanner
    participant PG as PostgreSQL Target
    participant Mongo as MongoDB Target
    participant Evaluator as In-Memory Join Evaluator
    participant Masker as PII Masker
    participant Audit as Audit Blockchain

    User->>Workspace: "Show high-value products with verified reviews"
    Workspace->>Engine: POST /api/v1/workspaces/{id}/query/execute
    Engine->>Scanner: AST Read-Only Scan on SQL & MQL
    Scanner-->>Engine: Scan Passed (0 mutations, read-only confirmed)
    
    par Pushdown Execution
        Engine->>PG: SELECT id, name, price FROM products WHERE price >= 500
        PG-->>Engine: 10 rows (PostgreSQL)
    and
        Engine->>Mongo: db.reviews.aggregate([{$match: {verified_purchase: true}}])
        Mongo-->>Engine: 15 documents (MongoDB)
    end

    Engine->>Evaluator: Hash Join on (products.id == reviews.product_id)
    Evaluator-->>Engine: 12 joined composite records
    Engine->>Masker: Apply PII Masking (Mask credit cards, SSNs, passwords)
    Masker-->>Engine: Sanitized records
    Engine->>Audit: Append chained event (Hash = SHA-256(prev_hash, event_data))
    Engine-->>Workspace: Return normalized columns, rows, timing & provenance
    Workspace-->>User: Render Interactive Visual Chart, Table & Provenance Inspector
```

---

### 4. Cryptographic Audit Blockchain Architecture

To ensure tamper-evidence and regulatory compliance, the engine maintains a cryptographically chained audit ledger:

```mermaid
flowchart LR
    subgraph Event0 ["Genesis Event (Seq: 0)"]
        P0["Prev Hash: GENESIS"]
        D0["Action: WORKSPACE_CREATED"]
        H0["Hash: SHA256(...)"]
    end

    subgraph Event1 ["Event 1 (Seq: 1)"]
        P1["Prev Hash: Event0.Hash"]
        D1["Action: CONNECTION_CREATED"]
        H1["Hash: SHA256(...)"]
    end

    subgraph Event2 ["Event 2 (Seq: 2)"]
        P2["Prev Hash: Event1.Hash"]
        D2["Action: QUERY_EXECUTION"]
        H2["Hash: SHA256(...)"]
    end

    Event0 --> Event1 --> Event2
```

- **Monotonic Sequence**: Every event receives an incrementing integer `sequence`.
- **SHA-256 Hashing**: Hash is calculated from `sequence`, `workspace_id`, `action`, `resource_type`, `user_id`, `status`, integer epoch seconds timestamp, and `previous_hash`.
- **Tamper Detection**: Altering or deleting any past event invalidates the hash chain, immediately detected by `verify_integrity()`.

---

### 5. Multi-Database Provisioning Topology

| Container Service | Image | Internal Port | Host Port | Role |
| :--- | :--- | :--- | :--- | :--- |
| **`metadata-db`** | `mongo:7.0` | 27017 | 27017 | Users, Workspaces, Encrypted Secrets, Audit Ledger |
| **`postgres-target`** | `postgres:16-alpine` | 5432 | 5432 | Target E-Commerce Relational Database (`ecommerce_demo`) |
| **`mongo-target`** | `mongo:7.0` | 27017 | 27018 | Target User Analytics & Product Reviews (`analytics_demo`) |
| **`elasticsearch-target`**| `elasticsearch:8.13.0`| 9200 | 9200 | Target Full-Text Product Catalog & Access Logs (`catalog`, `access_logs`) |
| **`backend`** | Custom Python 3.12 | 8000 | 8000 | FastAPI REST API, Ambiguity Engine, Query Compilers |
| **`frontend`** | Custom Node.js 20 | 3000 | 3000 | Next.js 16 App Router Production Web Interface |

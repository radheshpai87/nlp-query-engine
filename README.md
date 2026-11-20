# Ambiguity-Aware Natural Language Query Engine for Heterogeneous Databases

A production-grade, enterprise-ready full-stack query engine that enables non-technical users to query multiple heterogeneous databases (**PostgreSQL**, **MongoDB**, and **Elasticsearch**) using ordinary natural language.

The engine features **interactive ambiguity detection**, preventing incorrect silent assumptions and LLM hallucinations by clarifying vague terms, temporal windows, and schema mappings with the user before compiling and executing safe, read-only federated queries.

---

## 1. Key System Capabilities

- **Automated Schema Discovery & Fingerprinting**: Deep introspection across relational tables, document collections, and search indices with deterministic SHA-256 fingerprinting.
- **n8n-Style Interactive Schema Canvas**: Infinite zoom/pan schema topology (`@xyflow/react`) allowing users to visually inspect schema nodes and declare cross-database relationships.
- **Deterministic Ambiguity Detection**: Flags vague predicates ("high-value", "top"), temporal ambiguity ("recently", "this quarter"), and multiple competing join paths.
- **Interactive In-Chat Clarification**: Structured multi-option prompts inside the ChatGPT-style conversation workspace.
- **Typed Logical Query Plan (IR)**: Database-agnostic Intermediate Representation with query validation and cost-based predicate pushdown optimization.
- **Multi-Dialect Query Compilation**: Translates the Logical Plan IR into:
  - **PostgreSQL**: Parameterized ANSI SQL
  - **MongoDB**: Aggregation Pipelines (`$match`, `$project`, `$group`, `$sort`)
  - **Elasticsearch**: Filter and aggregation Query DSL
- **Safe Read-Only Federated Execution**: Strict AST-level security scanner, in-memory hash join evaluator, and automated PII data masking (credit cards, SSNs, passwords).
- **Interactive Visual Charting**: Instant SVG-based Bar, Line, and Donut charts rendering directly inside assistant chat responses with metric/dimension switchers.
- **Provenance & Explainability Inspector**: Complete breakdown answering *"How did you get this result?"* with stage-by-stage timing, grounded schemas, and executed queries.
- **Cryptographic Audit Blockchain**: Sequentially chained SHA-256 audit ledger providing one-click tamper-evident integrity verification and CSV/JSON compliance exports.

---

## 2. Architecture & Monorepo Structure

```text
nlp-query-engine/
├── .github/workflows/ci.yml       # CI workflow for backend and frontend
├── backend/                       # Python 3.12 + FastAPI Backend
│   ├── app/
│   │   ├── adapters/              # Heterogeneous database adapters (Postgres, Mongo, ES)
│   │   ├── api/routes/            # REST API endpoints (auth, workspaces, schemas, query, audit)
│   │   ├── core/                  # Security (Fernet encryption, PII masking, rate limiting)
│   │   ├── engine/                # Ambiguity engine, IR builder, optimizer, compiler, evaluator
│   │   ├── models/                # Typed Pydantic & Mongo domain models
│   │   ├── nlp/                   # LLM providers (Mock, Ollama), intent extractor, synthesizer
│   │   ├── repositories/          # Data access layer for MongoDB metadata
│   │   └── services/              # Business logic (connection, schema, ambiguity, execution, audit)
│   ├── scripts/                   # Multi-database seeding & orchestration tool
│   ├── tests/                     # 104 unit, integration, benchmark & E2E tests
│   ├── pyproject.toml             # Python packaging and dependency config
│   └── Dockerfile                 # Backend production container
├── frontend/                      # Next.js 16 + React 19 + Tailwind CSS
│   ├── src/
│   │   ├── app/                   # App Router pages (/chat, /schema, /connections, /audit, /executions)
│   │   ├── components/            # Schema canvas, chat, visual charts, provenance inspector
│   │   ├── lib/                   # Typed API clients and Zustand stores
│   │   └── types/                 # Frontend TypeScript interfaces
│   ├── Dockerfile                 # Frontend multi-stage standalone production container
│   └── package.json               # Frontend dependencies & scripts
├── docker/                        # Database initialization fixtures (SQL & JS)
├── docs/                          # Architecture, User Guide & Security Specifications
├── docker-compose.yml             # Orchestrates 6 production services & healthchecks
├── Makefile                       # Development & test workflow automation
├── .env.example                   # Environment configuration template
└── README.md
```

---

## 3. Quickstart & Deployment

### Option A: Complete Dockerized Stack (Recommended)

Run the entire platform with a single command — zero manual host dependencies or database configurations required:

```bash
# Build and launch all 6 services with automated bootstrapping and demo seeding:
docker compose up --build -d

# Check health of all services:
docker compose ps
```

Once up:
* **Web Application**: [http://localhost:3000](http://localhost:3000)
* **Backend API & Swagger**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **Default Admin**: `admin@example.com`
* **Password**: `Admin123!`

For architecture and production options, see the [Docker Deployment Guide](docs/docker_deployment.md).

### Option B: Local Development Setup

#### Prerequisites
- **Python**: 3.12+ (or via `uv`)
- **Node.js**: 20+ with `pnpm`
- **Docker & Docker Compose**: for target databases

#### 1. Launch Target Databases
```bash
# Start all 4 database services (Metadata Mongo, Target Postgres, Target Mongo, Target ES):
docker compose up -d metadata-db postgres-target mongo-target elasticsearch-target
```

#### 2. Seed Heterogeneous Datasets & Demo Workspace
```bash
# Populate realistic e-commerce, reviews, catalog search, and default admin user:
make seed
```

#### 3. Backend Setup
```bash
uv venv --python 3.12
source .venv/bin/activate
uv pip install -e "./backend[dev]"

# Launch FastAPI Backend
uvicorn app.main:app --app-dir backend --reload --port 8000
```

#### 4. Frontend Setup
```bash
cd frontend
pnpm install
pnpm dev
```
Web Workspace: `http://localhost:3000`

---

## 4. Running Verification & Quality Checks

Run the entire verification suite across both backend and frontend:

```bash
# Run all backend tests (104 tests including E2E and benchmarks)
make backend-test

# Run all backend linters and typecheckers (ruff + mypy)
make backend-lint && make backend-typecheck

# Run all frontend tests (63 tests)
make frontend-test

# Run frontend linting, typechecking, and production build
make frontend-lint && make frontend-typecheck && make frontend-build
```

---

## 5. Security & Safety Guarantees

1. **Zero Hallucination Grounding**: Natural language queries map strictly to discovered, fingerprinted schema entities.
2. **AST Query Security Scanner**: Blocks mutating SQL statements (`INSERT`, `UPDATE`, `DELETE`, `DROP`), dangerous MQL stages (`$out`, `$merge`, `$where`), and unauthorized Elasticsearch commands before execution.
3. **Automated PII Masking**: Automatically detects and masks credit card numbers (PCI-compliant `****-****-****-1234`), SSNs, API keys, and passwords.
4. **Cryptographic Credential Encryption**: Database secrets encrypted at rest via Fernet `AES-128-CBC` + `HMAC-SHA256` and redacted from all application logs.
5. **Sliding Window Rate Limiting**: Execution endpoints throttled (30 req/min/IP) to safeguard database resources against query flooding.
6. **Cryptographic Audit Blockchain**: Monotonic `sequence`, `previous_hash`, and SHA-256 `event_hash` forming a verifiable, tamper-evident ledger.

---

## 6. Documentation Index

- [System Architecture & Design Specifications](docs/architecture.md)
- [Docker Deployment & Container Orchestration Guide](docs/docker_deployment.md)
- [Complete End-to-End User Guide](docs/user_guide.md)
- [Security, Governance & Compliance Specification](docs/security_and_governance.md)

---

## LLM Providers: Groq → Mistral → Gemini

The NLP pipeline uses a configurable provider chain. Groq (Qwen) is tried first,
then Mistral, then Gemini. If a provider times out, rejects the key or returns an
invalid response, the next configured provider handles that request. If none of
the three keys is set, the deterministic mock provider keeps local development
and tests working without network access.

### 1. Add keys

Edit the repository-root `.env` file (already created, gitignored):

```bash
GROQ_API_KEY=...
MISTRAL_API_KEY=...
GEMINI_API_KEY=...
```

Only the keys you have need to be filled in; missing providers are skipped.
Model names, base URLs and the per-provider timeout are also configurable there.

### 2. Run locally

The backend loads `.env` from the repository root when started from the root or
from `backend/`.

```bash
uvicorn app.main:app --app-dir backend --reload --port 8000
```

### 3. Run with Docker Compose

`docker-compose.yml` passes the root `.env` into the backend container and keeps
container-specific values (Mongo URI, service hostnames) as overrides.

```bash
docker compose up -d --build backend
```

Rebuild when backend code changes; the compose file mounts `backend/app` for
development but the provider modules still need to exist in the image.

### Secret handling

- `.env` is gitignored and excluded from Docker build contexts.
- Keys are read server-side only; they are never sent to the browser.
- Provider errors report the provider name and HTTP status, never headers,
  request bodies or keys.
- `LLM_PROVIDER=mock` disables cloud calls entirely; `ollama` selects local
  inference instead of the cloud chain.

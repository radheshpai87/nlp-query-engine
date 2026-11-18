# Docker Deployment & Container Orchestration Guide

This document specifies the complete containerization architecture, deployment instructions, and operational controls for the **Ambiguity-Aware Natural Language Query Engine**.

---

## 1. Container Topology & Architecture

The application is fully containerized using **Docker Compose** across 6 isolated services within a dedicated bridge network:

```
                  ┌────────────────────────────────────────┐
                  │          End User / Web Browser        │
                  └──────────────┬──────────────────┬──────┘
                                 │ :3000            │ :8000
                                 ▼                  ▼
                    ┌─────────────────┐   ┌─────────────────┐
                    │ frontend        │──>│ backend         │
                    │ Next.js 16 (SSR)│   │ FastAPI + Engine│
                    └─────────────────┘   └────────┬────────┘
                                                   │
         ┌───────────────────┬─────────────────────┼─────────────────────┐
         │                   │                     │                     │
         ▼                   ▼                     ▼                     ▼
┌─────────────────┐ ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│ metadata-db     │ │ postgres-target │   │ mongo-target    │   │ elasticsearch-  │
│ MongoDB 7.0     │ │ PostgreSQL 16   │   │ MongoDB 7.0     │   │ target (ES 8.13)│
│ (Workspace/Auth)│ │ (E-Commerce)    │   │ (Analytics)     │   │ (Catalog/Logs)  │
└─────────────────┘ └─────────────────┘   └─────────────────┘   └─────────────────┘
```

### Service Summary

| Service Name | Image | Port | User | Purpose |
|--------------|-------|------|------|---------|
| `metadata-db` | `mongo:7.0` | `27017` | `mongodb` | Application metadata, workspaces, encrypted credentials, query audit hash chains |
| `postgres-target` | `postgres:16-alpine` | `5432` | `postgres` | Target relational database (customers, orders, products) |
| `mongo-target` | `mongo:7.0` | `27018:27017` | `mongodb` | Target document store (user clickstream events, product reviews) |
| `elasticsearch-target`| `elasticsearch:8.13.0` | `9200` | `elasticsearch` | Target search engine (full-text catalog, API access logs) |
| `backend` | `nlp-query-engine-backend` | `8000` | `appuser` (1001) | FastAPI core, ambiguity detector, IR planner, multi-dialect compiler, read-only executor |
| `frontend` | `nlp-query-engine-frontend` | `3000` | `nextjs` (1001) | Next.js 16 standalone React UI (chat, canvas, schema, audit) |

---

## 2. Dockerfile Specifications

### Backend Dockerfile (`backend/Dockerfile`)
- **Base Image:** `python:3.12-slim`
- **Package Manager:** Astral `uv` for deterministic, sub-second dependency installation.
- **Security:** Creates dedicated unprivileged `appuser:appgroup` (UID/GID 1001). Runs with zero root privileges.
- **Automated Startup Seeding:** Executes `backend/scripts/entrypoint.sh` on startup. If `SEED_ON_STARTUP=true`, it connects to all targets, seeds schemas and demo data idempotently, runs introspection, and boots Uvicorn.
- **Healthcheck:** Probes `GET /api/v1/health` via `curl`.

### Frontend Dockerfile (`frontend/Dockerfile`)
- **Base Image:** `node:20-alpine`
- **Multi-Stage Build Pipeline:**
  1. `deps`: Installs package dependencies with `corepack pnpm` and frozen lockfile.
  2. `builder`: Inlines `NEXT_PUBLIC_API_URL` build argument and produces optimized standalone output via `pnpm build`.
  3. `runner`: Minimal Alpine runner image with non-root user `nextjs:nodejs` (UID/GID 1001). Only copies `.next/standalone`, `.next/static`, and `public`.
- **Healthcheck:** Probes `http://127.0.0.1:3000` via Alpine Busybox `wget`.

---

## 3. Dependency & Healthcheck Orchestration

Docker Compose enforces strict healthcheck dependency gating:

```yaml
backend:
  depends_on:
    metadata-db:
      condition: service_healthy
    postgres-target:
      condition: service_healthy
    mongo-target:
      condition: service_healthy
    elasticsearch-target:
      condition: service_healthy

frontend:
  depends_on:
    backend:
      condition: service_healthy
```

- Target databases must pass native ping / status checks before `backend` launches.
- `backend` executes database seeding and verifies metadata indices before reporting healthy.
- `frontend` only starts once `backend` is healthy and ready to serve requests.

---

## 4. Quick Start Guide

### Prerequisites
- Docker Engine `>= 24.0.0`
- Docker Compose `>= 2.20.0`

### 1. Start Entire Stack
To build images and spin up all 6 containers in the background:
```bash
docker compose up --build -d
```

### 2. Verify Container Status
Check that all services show `(healthy)`:
```bash
docker compose ps
```

Expected output:
```text
NAME                             IMAGE                      STATUS
nlp_query_backend                nlp-query-engine-backend   Up (healthy)
nlp_query_elasticsearch_target   elasticsearch:8.13.0       Up (healthy)
nlp_query_frontend               nlp-query-engine-frontend  Up (healthy)
nlp_query_metadata_db            mongo:7.0                  Up (healthy)
nlp_query_mongo_target           mongo:7.0                  Up (healthy)
nlp_query_postgres_target        postgres:16-alpine         Up (healthy)
```

### 3. Access Web UI and API
- **Web Interface:** [http://localhost:3000](http://localhost:3000)
- **REST API:** [http://localhost:8000/api/v1](http://localhost:8000/api/v1)
- **API Health:** [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

### 4. Default Seeded Credentials
- **Admin User:** `admin@example.com`
- **Password:** `Admin123!`
- **Default Workspace ID:** `ws_default`

---

## 5. Operations & Maintenance

### Real-Time Logs
```bash
# View backend startup and query execution logs
docker compose logs -f backend

# View frontend logs
docker compose logs -f frontend

# View all services
docker compose logs -f
```

### Manual Database Seeding
To manually re-trigger seeding inside the running backend container:
```bash
docker compose exec backend python scripts/seed_demo_databases.py
```

### Stop Containers
```bash
# Stop containers while preserving volume data
docker compose down

# Stop containers and wipe all persistent volumes (fresh restart)
docker compose down -v
```

---

## 6. Environment Configuration

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `APP_ENV` | `production` | Runtime mode (`development`, `production`, `test`) |
| `SECRET_KEY` | *(dev key)* | JWT signing secret (override in production) |
| `ENCRYPTION_KEY` | *(dev key)* | Fernet encryption key for database passwords |
| `APP_MONGO_URI` | `mongodb://...` | Connection URI for metadata MongoDB |
| `DEMO_POSTGRES_URI`| `postgresql://...` | Connection URI for PostgreSQL target |
| `DEMO_MONGO_URI` | `mongodb://...` | Connection URI for MongoDB target |
| `DEMO_ELASTICSEARCH_URL` | `http://...` | HTTP URL for Elasticsearch target |
| `SEED_ON_STARTUP` | `true` | Automatically run migrations & demo seeder on boot |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api/v1` | Public backend URL accessible from user browsers |

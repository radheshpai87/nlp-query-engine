# PRODUCTION DEPLOYMENT GUIDE

**System:** Ambiguity-Aware Natural Language Query Engine for Heterogeneous Databases  
**Environment:** Linux (Docker & Docker Compose / Kubernetes Ready)

---

## 1. Prerequisites

- **Docker:** v24.0+ & **Docker Compose:** v2.20+
- **Python:** 3.12+ (for local host development)
- **Node.js:** v20+ with **pnpm** v9+ (for frontend development)

---

## 2. Environment Variables (.env)

Ensure the following variables are configured in `.env` before running in production:

```bash
# Application Environment
APP_ENV=production
APP_NAME="Ambiguity-Aware NLP Query Engine"
SECRET_KEY="generate-a-strong-64-char-random-secret-key-here"
CORS_ORIGINS=["https://app.yourdomain.com", "http://localhost:3000"]

# Metadata Database (MongoDB)
METADATA_MONGODB_URI=mongodb://root:your-secure-password@nlp_query_metadata_db:27017/nlp_query_engine_meta?authSource=admin

# Query Execution Guardrails
QUERY_TIMEOUT_SECONDS=30
MAX_QUERY_RESULT_ROWS=1000
MAX_MEMORY_JOIN_MB=256
ENFORCE_STRICT_READONLY=true

# Optional Local SLM / LLM Provider
LLM_PROVIDER=mock # Options: "mock", "ollama", "openai"
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:1b
```

---

## 3. Deployment with Docker Compose

To start all services in detached production mode:

```bash
# 1. Build and launch all backend, frontend, and database services
docker compose -f docker-compose.yml up -d --build

# 2. Check service health status
docker compose ps

# 3. Seed demo databases with schema topologies (if initial deployment)
docker compose exec backend python -m app.scripts.seed_demo_data
```

---

## 4. Health Checks & Verification

- **Backend Health Check:**
  `curl -s http://localhost:8000/health`
  Response: `{"status":"healthy","services":{"api":"up","metadata_storage":"configured","query_engine":"ready"}}`

- **Frontend Health Check:**
  `curl -s http://localhost:3000/api/health || curl -s -I http://localhost:3000/`

- **Tamper-Evident Audit Verification:**
  `curl -s -X POST http://localhost:8000/api/v1/audit/verify -H "Authorization: Bearer <TOKEN>"`

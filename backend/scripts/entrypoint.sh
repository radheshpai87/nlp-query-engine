#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "    NLP Query Engine - Production Backend Initializing    "
echo "=========================================================="

# Run database seeding and metadata initialization idempotently if enabled
if [ "${SEED_ON_STARTUP:-true}" = "true" ]; then
    echo "[Entrypoint] Running database seeder and schema synchronizer..."
    python scripts/seed_demo_databases.py || echo "[Entrypoint] Warning: Seeding encountered non-fatal issues or was partially skipped."
else
    echo "[Entrypoint] Skipping SEED_ON_STARTUP (SEED_ON_STARTUP is disabled)."
fi

echo "[Entrypoint] Launching Uvicorn server on ${HOST:-0.0.0.0}:${PORT:-8000}..."
exec uvicorn app.main:app --host "${HOST:-0.0.0.0}" --port "${PORT:-8000}"

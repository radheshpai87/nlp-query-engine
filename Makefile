.PHONY: help dev seed docker-up docker-down docker-build docker-logs backend-test backend-lint backend-typecheck frontend-test frontend-lint frontend-typecheck frontend-build test lint

help:
	@echo "Available commands:"
	@echo "  make dev                 - Start local target databases with docker compose"
	@echo "  make seed                - Seed demo heterogeneous databases & metadata"
	@echo "  make docker-up           - Start all services with docker compose"
	@echo "  make docker-down         - Stop all services and containers"
	@echo "  make docker-build        - Build Docker container images"
	@echo "  make docker-logs         - View real-time logs from docker compose"
	@echo "  make backend-test        - Run pytest suite with coverage"
	@echo "  make backend-lint        - Run ruff check on backend"
	@echo "  make backend-typecheck   - Run mypy on backend"
	@echo "  make frontend-test       - Run vitest suite for frontend"
	@echo "  make frontend-lint       - Run eslint on frontend"
	@echo "  make frontend-typecheck  - Run TypeScript typecheck on frontend"
	@echo "  make frontend-build      - Build Next.js frontend production bundle"
	@echo "  make test                - Run all backend and frontend test suites"
	@echo "  make lint                - Run all linters across frontend and backend"

dev:
	docker compose up -d metadata-db postgres-target mongo-target elasticsearch-target

seed:
	.venv/bin/python backend/scripts/seed_demo_databases.py

docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-build:
	docker compose build

docker-logs:
	docker compose logs -f

backend-test:
	.venv/bin/pytest backend/tests -v

backend-lint:
	.venv/bin/ruff check backend

backend-typecheck:
	cd backend && ../.venv/bin/mypy app tests scripts

frontend-test:
	cd frontend && pnpm test

frontend-lint:
	cd frontend && pnpm lint

frontend-typecheck:
	cd frontend && pnpm typecheck

frontend-build:
	cd frontend && pnpm build

test: backend-test frontend-test

lint: backend-lint frontend-lint backend-typecheck frontend-typecheck

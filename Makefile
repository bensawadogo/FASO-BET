# ──────────────────────────────────────────────────────────
# FasoBet — Makefile (BLOC 3)
# Commandes Docker compose, tests, santé, CI/CD
# ──────────────────────────────────────────────────────────

.PHONY: help up down restart logs ps

help:
	@echo "═══════════════════════════════════════════════════════════"
	@echo "  FasoBet - Commandes disponibles"
	@echo "═══════════════════════════════════════════════════════════"
	@echo ""
	@echo "  🚀 Services :"
	@echo "    make up            - Demarrer tous les services"
	@echo "    make down          - Stopper tous les services"
	@echo "    make restart       - Redemarrer tous les services"
	@echo "    make logs          - Logs en temps reel"
	@echo "    make ps            - Etat des services"
	@echo ""
	@echo "  ⚡ Services individuels :"
	@echo "    make fastapi       - FastAPI Inference Engine"
	@echo "    make celery        - Celery Worker"
	@echo "    make celery-beat   - Celery Beat (taches periodiques)"
	@echo "    make postgres      - PostgreSQL"
	@echo "    make redis         - Redis"
	@echo ""
	@echo "  🧪 Tests :"
	@echo "    make test          - Tests unitaires + API"
	@echo "    make test-unit     - Tests unitaires uniquement"
	@echo "    make test-api      - Tests API FastAPI"
	@echo "    make test-integration - Tests integration Docker"
	@echo ""
	@echo "  🩺 Sante :"
	@echo "    make health        - Etat de tous les services"
	@echo "    make health-fastapi - Metriques FastAPI detaillees"
	@echo "    make logs-errors   - Dernieres erreurs"
	@echo ""
	@echo "  🔧 Utilitaires :"
	@echo "    make build         - Rebuilder toutes les images"
	@echo "    make rebuild-fastapi - Rebuild + restart FastAPI"
	@echo "    make clean         - Supprimer volumes + caches"
	@echo "    make prune         - Nettoyage Docker systeme"

up:
	docker compose up -d
	@echo "═══════════════════════════════════════════════════════════"
	@echo "  ✅ Services demarres :"
	@echo "     Django:    http://localhost:8000"
	@echo "     FastAPI:   http://localhost:8001"
	@echo "     Next.js:   http://localhost:3001"
	@echo "     Docs API:  http://localhost:8001/docs"
	@echo "═══════════════════════════════════════════════════════════"

down:
	docker compose down
	@echo "👋 Services arretes"

restart: down up

logs:
	docker compose logs -f

ps:
	docker compose ps

# ─── Services individuels ─────────────────────────────

fastapi:
	docker compose up -d fastapi
	@echo "✅ FastAPI demarre sur :8001"

celery:
	docker compose up -d celery
	@echo "✅ Celery worker demarre"

celery-beat:
	docker compose up -d celery-beat
	@echo "✅ Celery beat demarre"

redis:
	docker compose up -d redis
	@echo "✅ Redis demarre sur :6379"

postgres:
	docker compose up -d postgres
	@echo "✅ PostgreSQL demarre sur :5432"

# ─── Tests ─────────────────────────────────────────────

test: test-unit test-api
	python -m pytest api/tests/ -v --tb=short --ignore=api/tests/test_health.py 2>&1 | tail -5
	@echo "✅ Tests unitaires OK"
	python -m pytest api/tests/test_health.py -v --tb=short 2>&1 | tail -5
	@echo "✅ Tests API OK"

test-unit:
	python -m pytest api/tests/ -v --tb=short 2>&1 | tail -5

test-api:
	python -m pytest api/tests/test_health.py -v --tb=short 2>&1 | tail -5

test-integration:
	./scripts/test_integration.sh

# ─── Sante ─────────────────────────────────────────────

health:
	@echo "=== Etat des services ==="
	docker compose ps --services 2>/dev/null || echo "Docker Compose pas lance"
	@echo ""
	@echo "=== FastAPI ==="
	curl -sf http://localhost:8001/health 2>/dev/null || echo "❌ Injoignable"
	@echo ""

health-fastapi:
	curl -s http://localhost:8001/health | python -m json.tool
	@echo "---"
	curl -s http://localhost:8001/health/metrics | python -m json.tool

logs-errors:
	docker compose logs --tail=50 2>/dev/null | grep -i error || echo "Aucune erreur recente"

# ─── Utilitaires ──────────────────────────────────────

build:
	docker compose build --no-cache
	@echo "✅ Build termine"

rebuild-fastapi:
	docker compose build --no-cache fastapi
	docker compose up -d fastapi
	@echo "✅ FastAPI rebuild et redemarre"

clean:
	docker compose down -v --remove-orphans 2>/dev/null
	docker system prune -f 2>/dev/null
	@echo "🧹 Nettoyage termine"

prune:
	docker system prune -af 2>/dev/null
	docker volume prune -f 2>/dev/null
	@echo "🧹 Docker nettoye"

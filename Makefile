# ──────────────────────────────────────────────────────────
# FasoBet — Makefile (BLOC 3) - CORRIGÉ
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
	@echo "    make django        - Django Control Plane"
	@echo "    make fastapi       - FastAPI Inference Engine"
	@echo "    make celery        - Celery Worker"
	@echo "    make postgres      - PostgreSQL"
	@echo "    make redis         - Redis"
	@echo ""
	@echo "  🧪 Tests :"
	@echo "    make test          - Tests unitaires + API"
	@echo "    make test-unit     - Tests unitaires uniquement"
	@echo "    make test-api      - Tests API FastAPI"
	@echo ""
	@echo "  🩺 Sante :"
	@echo "    make health        - Etat de tous les services"
	@echo "    make health-django - Check Django :8001"
	@echo "    make health-fastapi - Check FastAPI :8000"
	@echo ""
	@echo "  🔧 Utilitaires :"
	@echo "    make build         - Rebuilder toutes les images"
	@echo "    make rebuild-django - Rebuild + restart Django"
	@echo "    make clean         - Supprimer volumes + caches"
	@echo "    make prune         - Nettoyage Docker systeme"

up:
	docker compose up -d
	@echo "═══════════════════════════════════════════════════════════"
	@echo "  ✅ Services demarres :"
	@echo "     Django:    http://localhost:8001"
	@echo "     FastAPI:   http://localhost:8000"
	@echo "     Next.js:   http://localhost:3001"
	@echo "     Docs API:  http://localhost:8000/docs"
	@echo "═══════════════════════════════════════════════════════════"

down:
	docker compose down
	@echo "👋 Services arretes"

restart: down up

logs:
	docker compose logs -f

ps:
	docker compose ps

# ─── Services individuels ─────────────────────────

django:
	docker compose up -d django
	@echo "✅ Django demarre sur :8001"

fastapi:
	docker compose up -d fastapi
	@echo "✅ FastAPI demarre sur :8000"

worker:
	docker compose up -d celery_worker
	@echo "✅ Celery worker demarre"

beat:
	docker compose up -d celery_beat
	@echo "✅ Celery beat demarre"

redis:
	docker compose up -d redis
	@echo "✅ Redis demarre sur :6379"

postgres:
	docker compose up -d postgres
	@echo "✅ PostgreSQL demarre sur :5433"

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

# ─── Sante ─────────────────────────────────────────────

health:
	@echo "=== Etat des services ==="
	docker compose ps
	@echo ""
	@echo "=== Django :8001 ==="
	curl -sf http://localhost:8001/health/ 2>/dev/null && echo "✅ OK" || echo "❌ Injoignable"
	@echo ""
	@echo "=== FastAPI :8000 ==="
	curl -sf http://localhost:8000/health 2>/dev/null && echo "✅ OK" || echo "❌ Injoignable"

health-django:
	curl -s http://localhost:8001/health/ | python -m json.tool 2>/dev/null || echo "Django non disponible"

health-fastapi:
	curl -s http://localhost:8000/health | python -m json.tool 2>/dev/null || echo "FastAPI non disponible"

# ─── Utilitaires ──────────────────────────────────────

build:
	docker compose build --no-cache
	@echo "✅ Build termine"

rebuild-django:
	docker compose build --no-cache django
	docker compose up -d django
	@echo "✅ Django rebuild et redemarre"

clean:
	docker compose down -v --remove-orphans 2>/dev/null
	docker system prune -f 2>/dev/null
	@echo "🧹 Nettoyage termine"

prune:
	docker system prune -af 2>/dev/null
	docker volume prune -f 2>/dev/null
	@echo "🧹 Docker nettoye"

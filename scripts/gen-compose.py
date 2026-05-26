#!/usr/bin/env python3
"""Generate docker-compose.yml for FasoBet (BLOC 1)."""

YAML_CONTENT = r"""# --- FasoBet - Docker Compose (BLOC 1) ---
# 6 services : postgres, redis, django, fastapi, nextjs, celery
# Profiles : dev (hot-reload), prod (production)

x-env-common: &env-common
  POSTGRES_DB: ${POSTGRES_DB:-fasobet}
  POSTGRES_USER: ${POSTGRES_USER:-fasobet}
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-changeme_in_prod}
  REDIS_HOST: redis
  REDIS_PORT: 6379
  DJANGO_DB_HOST: postgres
  DJANGO_DB_PORT: 5432
  DJANGO_DB_NAME: ${POSTGRES_DB:-fasobet}
  DJANGO_DB_USER: ${POSTGRES_USER:-fasobet}
  DJANGO_DB_PASSWORD: ${POSTGRES_PASSWORD:-changeme_in_prod}
  DJANGO_SECRET_KEY: ${DJANGO_SECRET_KEY:-django-insecure-dev-key}
  FASTAPI_REDIS_URL: redis://redis:6379/0
  NEXT_PUBLIC_API_URL: http://localhost:8001
  NEXT_PUBLIC_DJANGO_URL: http://localhost:8000
  CELERY_BROKER_URL: redis://redis:6379/0
  CELERY_RESULT_BACKEND: redis://redis:6379/0
  PYTHONDONTWRITEBYTECODE: "1"
  PYTHONUNBUFFERED: "1"

x-logging: &default-logging
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"

services:

  postgres:
    image: postgres:16-alpine
    container_name: fasobet-postgres
    restart: unless-stopped
    profiles: ["dev", "prod"]
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-fasobet}
      POSTGRES_USER: ${POSTGRES_USER:-fasobet}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-changeme_in_prod}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init-db.sql:ro
    ports:
      - "${POSTGRES_PORT:-5432}:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-fasobet} -d ${POSTGRES_DB:-fasobet}"]
      interval: 5s
      timeout: 3s
      retries: 5
      start_period: 10s
    logging: *default-logging
    networks:
      - fasobet-net

  redis:
    image: redis:7-alpine
    container_name: fasobet-redis
    restart: unless-stopped
    profiles: ["dev", "prod"]
    ports:
      - "${REDIS_PORT:-6379}:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
      start_period: 5s
    volumes:
      - redis_data:/data
    logging: *default-logging
    networks:
      - fasobet-net

  django:
    build:
      context: .
      dockerfile: Dockerfile.django
      target: ${DJANGO_TARGET:-development}
    container_name: fasobet-django
    restart: unless-stopped
    profiles: ["dev", "prod"]
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      <<: *env-common
      DJANGO_SETTINGS_MODULE: ${DJANGO_SETTINGS_MODULE:-sportpred.settings_docker}
    ports:
      - "${DJANGO_PORT:-8000}:8000"
    volumes:
      - .:/app
      - django_static:/app/staticfiles
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/health/')"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 30s
    logging: *default-logging
    networks:
      - fasobet-net

  fastapi:
    build:
      context: .
      dockerfile: Dockerfile.fastapi
      target: ${FASTAPI_TARGET:-development}
    container_name: fasobet-fastapi
    restart: unless-stopped
    profiles: ["dev", "prod"]
    depends_on:
      redis:
        condition: service_healthy
      django:
        condition: service_started
    environment:
      <<: *env-common
    ports:
      - "${FASTAPI_PORT:-8001}:8001"
    volumes:
      - .:/app
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8001/health/metrics')"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 20s
    logging: *default-logging
    networks:
      - fasobet-net

  nextjs:
    build:
      context: .
      dockerfile: Dockerfile.nextjs
      target: ${NEXTJS_TARGET:-development}
    container_name: fasobet-nextjs
    restart: unless-stopped
    profiles: ["dev", "prod"]
    depends_on:
      fastapi:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      <<: *env-common
    ports:
      - "${NEXTJS_PORT:-3000}:3000"
    volumes:
      - .:/app
      - nextjs_node_modules:/app/node_modules
      - nextjs_next:/app/.next
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 30s
    logging: *default-logging
    networks:
      - fasobet-net

  celery:
    build:
      context: .
      dockerfile: Dockerfile.celery
    container_name: fasobet-celery
    restart: unless-stopped
    profiles: ["dev", "prod"]
    depends_on:
      redis:
        condition: service_healthy
      postgres:
        condition: service_healthy
      fastapi:
        condition: service_started
    environment:
      <<: *env-common
      CELERY_CONCURRENCY: ${CELERY_CONCURRENCY:-4}
    volumes:
      - .:/app
    healthcheck:
      test: ["CMD-SHELL", "celery -A tasks inspect ping -d celery@$$HOSTNAME || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    logging: *default-logging
    networks:
      - fasobet-net

networks:
  fasobet-net:
    name: fasobet-network
    driver: bridge
    attachable: true

volumes:
  postgres_data:
    name: fasobet-postgres-data
  redis_data:
    name: fasobet-redis-data
  django_static:
    name: fasobet-django-static
  nextjs_node_modules:
    name: fasobet-nextjs-node-modules
  nextjs_next:
    name: fasobet-nextjs-next-cache
"""

if __name__ == "__main__":
    import os
    output_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "docker-compose.yml")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(YAML_CONTENT.lstrip("\n"))
    print(f"Written {len(YAML_CONTENT)} bytes to {output_path}")

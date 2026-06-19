#!/bin/bash
# ═════════════════════════════════════════════════════════════
# FasoBet — Production Deployment Script
# Usage: ./deploy-prod.sh
# ═════════════════════════════════════════════════════════════

set -e

echo "🚀 FasoBet Production Deployment"
echo "════════════════════════════════════════════════"

# 1. Check .env.prod exists
if [ ! -f .env.prod ]; then
    echo "❌ .env.prod NOT FOUND"
    echo "⚠️  Copy from .env.prod.example and fill real values"
    exit 1
fi

# 2. Clean old images
echo "🧹 Cleaning old images..."
docker compose down

# 3. Build images
echo "🔨 Building Docker images..."
docker compose -f docker-compose.yml build --no-cache

# 4. Start services
echo "▶️  Starting services..."
docker compose -f docker-compose.yml up -d

# 5. Wait for health checks
echo "⏳ Waiting for services to be healthy..."
sleep 30

# 6. Run migrations
echo "📊 Running Django migrations..."
docker compose exec -T django python manage.py migrate --noinput

# 7. Collect static
echo "📦 Collecting static files..."
docker compose exec -T django python manage.py collectstatic --noinput --clear

# 8. Health checks
echo "🩺 Health checks..."
DJANGO_HEALTH=$(curl -s http://localhost:8001/health/ | grep -o '"status":"[^"]*"' || echo '"status":"error"')
FASTAPI_HEALTH=$(curl -s http://localhost:8000/health | grep -o '"status":"[^"]*"' || echo '"status":"error"')

echo "   Django:  $DJANGO_HEALTH"
echo "   FastAPI: $FASTAPI_HEALTH"

# 9. Final status
echo ""
echo "════════════════════════════════════════════════"
docker compose ps
echo "════════════════════════════════════════════════"
echo "✅ Deployment complete!"
echo ""
echo "Services:"
echo "  Frontend:   http://localhost:3001"
echo "  Django API: http://localhost:8001"
echo "  FastAPI:    http://localhost:8000/docs"
echo ""

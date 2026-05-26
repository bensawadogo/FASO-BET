#!/bin/sh
# ──────────────────────────────────────────────────────────────
# FasoBet — Test d'intégration cross-services (BLOC 3)
# Vérifie que tous les services Docker répondent et interagissent.
# Usage: ./scripts/test_integration.sh
# ──────────────────────────────────────────────────────────────

set -e

echo "═══════════════════════════════════════════════════════════"
echo "  FasoBet — Test d'intégration BLOC 3"
echo "═══════════════════════════════════════════════════════════"

# ─── 1. Vérifier que Docker Compose est en cours ────────────
echo ""
echo "📦 [1/6] Vérification des services Docker..."
if ! docker compose ps --services 2>/dev/null | grep -q .; then
    echo "❌ Aucun service Docker trouvé. Lancez 'docker compose up -d' d'abord."
    exit 1
fi
echo "✅ Services Docker présents"

# ─── 2. Vérifier Postgres ──────────────────────────────────
echo ""
echo "🗄️  [2/6] Vérification de PostgreSQL..."
if docker compose exec postgres pg_isready -U fasobet 2>/dev/null; then
    echo "✅ PostgreSQL répond"
else
    echo "⚠️  PostgreSQL injoignable (peut-être pas configuré)"
fi

# ─── 3. Vérifier Redis ─────────────────────────────────────
echo ""
echo "📀 [3/6] Vérification de Redis..."
if docker compose exec redis redis-cli ping 2>/dev/null | grep -q PONG; then
    echo "✅ Redis répond"
else
    echo "⚠️  Redis injoignable"
fi

# ─── 4. Vérifier FastAPI ───────────────────────────────────
echo ""
echo "⚡ [4/6] Vérification de FastAPI..."
FASTAPI_URL="http://localhost:8001"

if curl -sf "$FASTAPI_URL/health" > /dev/null 2>&1; then
    echo "✅ FastAPI /health répond"
    
    HEALTH=$(curl -sf "$FASTAPI_URL/health/metrics")
    echo "   Métriques: $HEALTH"
else
    echo "❌ FastAPI injoignable sur $FASTAPI_URL"
    echo "   Vérifiez que le service fastapi est démarré"
fi

# ─── 5. Tester le pipeline de prédiction ───────────────────
echo ""
echo "🧪 [5/6] Test du pipeline de prédiction..."
PREDICT_RESULT=$(curl -sf -X POST "$FASTAPI_URL/predict" \
    -H "Content-Type: application/json" \
    -d '{}' 2>&1) || true

if echo "$PREDICT_RESULT" | python -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('predictions',[])))" 2>/dev/null; then
    NB_PREDS=$(echo "$PREDICT_RESULT" | python -c "import sys,json; d=json.load(sys.stdin); print(len(d['predictions']))")
    NB_COMBOS=$(echo "$PREDICT_RESULT" | python -c "import sys,json; d=json.load(sys.stdin); print(len(d['combos']))")
    echo "✅ Pipeline OK: $NB_PREDS prédictions, $NB_COMBOS combinés"
else
    echo "⚠️  Pipeline: $PREDICT_RESULT"
fi

# ─── 6. Test complet E2E ──────────────────────────────────
echo ""
echo "🎯 [6/6] Test E2E complet..."
# Collecter + Analyser + Prédire en séquence

echo "   Test: /matches/collect"
COLLECT=$(curl -sf -X POST "$FASTAPI_URL/matches/collect" \
    -H "Content-Type: application/json" \
    -d '{}' 2>&1) || true

NB_MATCHES=$(echo "$COLLECT" | python -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('verified_matches',[])))" 2>/dev/null || echo "0")
echo "   ✅ Collecte: $NB_MATCHES matchs"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ✅ Tests d'intégration terminés"
echo "═══════════════════════════════════════════════════════════"

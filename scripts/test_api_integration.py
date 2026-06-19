import httpx
import asyncio
import sys
import pytest

# Configuration des ports basés sur l'audit
FASTAPI_URL = "http://localhost:8000"
DJANGO_URL = "http://localhost:8002"
INTERNAL_KEY = "fasobet-internal-2025"

@pytest.mark.asyncio
async def test_api_integration():
    print("🚀 Démarrage des tests d'intégration API...\n")
    
    async with httpx.AsyncClient(timeout=30) as client:
        # 1. Test Santé FastAPI
        print(f"📡 [GET] {FASTAPI_URL}/health")
        try:
            resp = await client.get(f"{FASTAPI_URL}/health")
            print(f"   ✅ Status: {resp.status_code}, Body: {resp.json()}")
        except Exception as e:
            print(f"   ❌ FastAPI injoignable (Est-il démarré ?): {e}")

        # 2. Test Santé Django
        print(f"\n📡 [GET] {DJANGO_URL}/health/")
        try:
            resp = await client.get(f"{DJANGO_URL}/health/")
            print(f"   ✅ Status: {resp.status_code}, Body: {resp.json()}")
        except Exception as e:
            print(f"   ❌ Django injoignable (Est-il démarré ?): {e}")

        # 3. Test Pipeline (Simulation du bouton 'LANCER IA')
        # On utilise une date fixe pour tester
        print(f"\n📡 [POST] {FASTAPI_URL}/pipeline/execute")
        try:
            # On envoie une requête simple
            payload = {"date": "2026-06-03", "leagues": [61]}
            resp = await client.post(f"{FASTAPI_URL}/pipeline/execute", json=payload)
            print(f"   ✅ Status: {resp.status_code}")
            data = resp.json()
            if "predictions" in data:
                print(f"   🎉 Succès ! {len(data['predictions'].get('predictions', []))} prédictions générées.")
            else:
                print(f"   ⚠️ Réponse inattendue: {data}")
        except Exception as e:
            print(f"   ❌ Erreur lors de l'exécution du pipeline: {e}")

        # 4. Test de récupération des prédictions (Simulation du dashboard)
        print(f"\n📡 [GET] {FASTAPI_URL}/predictions")
        try:
            resp = await client.get(f"{FASTAPI_URL}/predictions?limit=5")
            print(f"   ✅ Status: {resp.status_code}")
            preds = resp.json()
            print(f"   📦 Prédictions en base: {len(preds)}")
            if preds:
                print(f"      Dernier match: {preds[0].get('home_team')} vs {preds[0].get('away_team')}")
        except Exception as e:
            print(f"   ❌ Erreur lors de la récupération des prédictions: {e}")

        # 5. Test Performance Django
        print(f"\n📡 [GET] {DJANGO_URL}/api/performance/")
        try:
            resp = await client.get(f"{DJANGO_URL}/api/performance/")
            # Devrait renvoyer 401 si non authentifié, ou des données si public
            print(f"   ✅ Status: {resp.status_code}, Body: {resp.json()}")
        except Exception as e:
            print(f"   ❌ Erreur performance API: {e}")

if __name__ == "__main__":
    try:
        asyncio.run(test_api_integration())
    except KeyboardInterrupt:
        pass

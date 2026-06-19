import os
import requests
import sys

# Configuration des services (ports mappés dans docker-compose)
SERVICES = {
    "FastAPI (Inférence)": "http://localhost:8000/health",
    "Django (API)":        "http://localhost:8002/health/",
}

def check_service(name, url):
    print(f"--- Vérification de {name} ---")
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ OK: {data}")
            return True
        else:
            print(f"❌ Erreur {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Connexion impossible : {e}")
        return False

def main():
    success = True
    for name, url in SERVICES.items():
        if not check_service(name, url):
            success = False
    
    if success:
        print("\n🚀 TOUS LES SERVICES SONT OPÉRATIONNELS")
        sys.exit(0)
    else:
        print("\n🚨 ÉCHEC DES TESTS DE SANTÉ")
        sys.exit(1)

if __name__ == "__main__":
    main()

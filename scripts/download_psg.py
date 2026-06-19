import json, requests, time
from pathlib import Path

LOGO_DIR = Path("public/logos/teams")
META_FILE = Path("public/logos/metadata.json")
dest_file = LOGO_DIR / "paris_saint_germain.png"
BASE_URL = "https://www.thesportsdb.com/api/v1/json/3"

print("Tentative de téléchargement du logo PSG...")

try:
    # Recherche spécifique "PSG"
    r = requests.get(f"{BASE_URL}/searchteams.php", params={"t": "PSG"}, timeout=10)
    data = r.json()
    
    if data and data.get("teams"):
        badge = data["teams"][0].get("strBadge")
        if badge:
            img = requests.get(badge, timeout=15)
            if img.status_code == 200:
                dest_file.write_bytes(img.content)
                print("✅ Logo PSG téléchargé avec succès")
                
                # Update metadata
                meta = json.loads(META_FILE.read_text(encoding='utf-8'))
                if "Paris Saint-Germain" in meta:
                    meta["Paris Saint-Germain"].update({
                        "local_path": "/logos/teams/paris_saint_germain.png", 
                        "status": "downloaded"
                    })
                    META_FILE.write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding='utf-8')
                    print("✅ Metadata mis à jour")
                else:
                    print("⚠️ Entrée 'Paris Saint-Germain' non trouvée dans metadata.json")
            else:
                print(f"❌ Erreur téléchargement image: {img.status_code}")
        else:
            print("❌ Aucun logo trouvé pour PSG")
    else:
        print("❌ Aucune équipe trouvée pour PSG")
except Exception as e:
    print(f"❌ Erreur: {e}")

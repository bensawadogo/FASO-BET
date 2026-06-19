import requests, json
from pathlib import Path

LOGO_DIR  = Path("public/logos/teams")
META_FILE = Path("public/logos/metadata.json")
BASE_URL  = "https://www.thesportsdb.com/api/v1/json/3"

TEAMS_TO_FIX = {
    "Marseille": "Olympique Marseille",
    "River Plate": "River Plate",
    "Raja Casablanca": "Raja Casablanca",
    "Salitas FC": "Salitas",
    "AS Douanes": "AS Douanes"
}

meta = json.loads(META_FILE.read_text(encoding='utf-8'))

for team, search_term in TEAMS_TO_FIX.items():
    print(f"Tentative de téléchargement pour {team}...")
    try:
        r = requests.get(f"{BASE_URL}/searchteams.php", params={"t": search_term}, timeout=10)
        data = r.json()
        if data and data.get("teams"):
            badge = data["teams"][0].get("strBadge")
            if badge:
                img = requests.get(badge, timeout=15)
                if img.status_code == 200:
                    slug = meta[team]['slug']
                    dest_file = LOGO_DIR / f"{slug}.png"
                    dest_file.write_bytes(img.content)
                    meta[team].update({"local_path": f"/logos/teams/{slug}.png", "status": "downloaded"})
                    print(f"✅ {team} téléchargé")
    except Exception as e:
        print(f"❌ Erreur {team}: {e}")

META_FILE.write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding='utf-8')

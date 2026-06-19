import requests, os, time
from pathlib import Path

OUTPUT_DIR = Path("data/fdco")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Ligues à télécharger (codes football-data.co.uk)
LEAGUES = {
    "E0":  "Premier League",
    "SP1": "La Liga",
    "D1":  "Bundesliga",
    "I1":  "Serie A",
    "F1":  "Ligue 1",
}

# Saisons disponibles (format football-data.co.uk)
SEASONS = [
    "1819", "1920", "2021",
    "2122", "2223", "2324", "2425"
]

BASE_URL = "https://www.football-data.co.uk/mmz4281/{season}/{league}.csv"

downloaded = 0
failed = []

for season in SEASONS:
    for league_code, league_name in LEAGUES.items():
        url = BASE_URL.format(season=season, league=league_code)
        filename = OUTPUT_DIR / f"{league_code}_{season}.csv"

        if filename.exists():
            print(f"  Déjà téléchargé : {filename.name}")
            continue

        try:
            r = requests.get(url, timeout=15)
            if r.status_code == 200 and len(r.content) > 500:
                filename.write_bytes(r.content)
                print(f"  ✅ {league_name} {season} : {len(r.content)//1024}KB")
                downloaded += 1
            else:
                print(f"  ❌ {league_name} {season} : HTTP {r.status_code}")
                failed.append(f"{league_code}_{season}")
            time.sleep(0.5)  # respecter le serveur
        except Exception as e:
            print(f"  ❌ {league_name} {season} erreur : {e}")
            failed.append(f"{league_code}_{season}")

print(f"\nTéléchargés : {downloaded}")
print(f"Échoués : {len(failed)} → {failed}")

# VÉRIFICATION OBLIGATOIRE
files = list(OUTPUT_DIR.glob("*.csv"))
print(f"Fichiers CSV disponibles : {len(files)}")
if len(files) == 0:
    print("ERREUR CRITIQUE : aucun fichier téléchargé")
    exit(1)

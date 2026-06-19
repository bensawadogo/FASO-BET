import os, requests, time, json, sys
from pathlib import Path

LOGO_DIR = Path("src/public/logos/teams")
META_FILE = Path("src/public/logos/metadata.json")
BASE_URL = "https://www.thesportsdb.com/api/v1/json/3"

TEAMS = [
    "ASFA Yennenga", "Etoile Filante", "Rail Club du Kadiogo",
    "AS Douanes", "Salitas FC",
    "TP Mazembe", "Al Ahly", "Wydad AC", "Zamalek",
    "Esperance Sportive", "Mamelodi Sundowns", "Club Africain",
    "Arsenal", "Chelsea", "Liverpool", "Manchester City",
    "Manchester United", "Tottenham Hotspur",
    "Real Madrid", "FC Barcelona", "Atletico Madrid",
    "Bayern Munich", "Borussia Dortmund", "RB Leipzig",
    "Juventus", "Inter Milan", "AC Milan", "SSC Napoli",
    "Paris Saint-Germain", "Olympique de Marseille",
    "Olympique Lyonnais", "Monaco",
    "Porto", "Benfica", "Ajax",
    "Borussia Monchengladbach", "Villarreal",
    "PSV Eindhoven", "Celtic FC", "Rangers FC"
]

def download_team_logo(team_name):
    safe_name = team_name.lower() \
        .replace(" ", "_") \
        .replace("/", "-") \
        .replace("'", "")
    local_path = LOGO_DIR / f"{safe_name}.png"

    if local_path.exists():
        print(f"  [CACHED] {team_name}")
        return {"team": team_name, "slug": safe_name,
                "local_path": f"/logos/teams/{safe_name}.png",
                "status": "cached"}

    try:
        r = requests.get(f"{BASE_URL}/searchteams.php",
                         params={"t": team_name}, timeout=10)
        data = r.json()
        time.sleep(2)

        if not data or not data.get("teams"):
            print(f"  [NOT FOUND] {team_name}")
            return {"team": team_name, "slug": safe_name,
                    "local_path": "/logos/default.png",
                    "status": "not_found"}

        team = data["teams"][0]
        badge_url = team.get("strBadge") or team.get("strLogo", "")
        if not badge_url:
            return {"team": team_name, "slug": safe_name,
                    "local_path": "/logos/default.png",
                    "status": "no_logo"}

        img = requests.get(badge_url, timeout=15)
        time.sleep(2)

        if img.status_code == 200:
            local_path.write_bytes(img.content)
            print(f"  [OK] {team_name} -> {safe_name}.png")
            return {"team": team_name, "slug": safe_name,
                    "local_path": f"/logos/teams/{safe_name}.png",
                    "remote_url": badge_url,
                    "thesportsdb_id": team.get("idTeam"),
                    "country": team.get("strCountry", ""),
                    "league": team.get("strLeague", ""),
                    "status": "downloaded"}

    except Exception as e:
        print(f"  [ERROR] {team_name}: {e}")

    return {"team": team_name, "slug": safe_name,
            "local_path": "/logos/default.png",
            "status": "error"}

def main():
    LOGO_DIR.mkdir(parents=True, exist_ok=True)
    metadata = {}
    if META_FILE.exists():
        metadata = json.loads(META_FILE.read_text())

    print(f"Downloading logos for {len(TEAMS)} teams...")
    print("=" * 50)

    for team in TEAMS:
        result = download_team_logo(team)
        metadata[team] = result

    META_FILE.write_text(json.dumps(metadata, indent=2, ensure_ascii=False))
    print("=" * 50)

    downloaded = sum(1 for v in metadata.values() if v.get("status") == "downloaded")
    cached = sum(1 for v in metadata.values() if v.get("status") == "cached")
    not_found = sum(1 for v in metadata.values() if v.get("status") in ("not_found", "error"))

    print(f"Downloaded : {downloaded}")
    print(f"Cached     : {cached}")
    print(f"Not found  : {not_found}")
    print(f"Metadata   : {META_FILE}")



import json, requests, time, unicodedata
from pathlib import Path

LOGO_DIR  = Path("public/logos/teams")
META_FILE = Path("public/logos/metadata.json")
BASE_URL  = "https://www.thesportsdb.com/api/v1/json/3"

LOGO_DIR.mkdir(parents=True, exist_ok=True)

def slugify(name: str) -> str:
    name = unicodedata.normalize('NFD', name)
    name = ''.join(c for c in name
                   if unicodedata.category(c) != 'Mn')
    return (name.lower()
            .replace(' ','_').replace('-','_')
            .replace('.','').replace("'",'')
            .replace('/','_'))

def search_and_download(team_name: str) -> str:
    slug      = slugify(team_name)
    dest_file = LOGO_DIR / f"{slug}.png"

    if dest_file.exists():
        return f"/logos/teams/{slug}.png"

    # Essai 1 : nom complet
    for search_term in [team_name,
                        team_name.split(' FC')[0],
                        team_name.replace(' FC','')
                                 .replace(' SC','')
                                 .replace(' CF','')]:
        try:
            r = requests.get(
                f"{BASE_URL}/searchteams.php",
                params={"t": search_term},
                timeout=10,
                headers={"User-Agent": "FasoBetBot/1.0"}
            )
            data = r.json()
            time.sleep(2)

            if not data or not data.get("teams"):
                continue

            team   = data["teams"][0]
            badge  = (team.get("strBadge")
                      or team.get("strLogo")
                      or "")

            if not badge:
                continue

            img = requests.get(badge, timeout=15)
            time.sleep(1)

            if img.status_code == 200:
                dest_file.write_bytes(img.content)
                print(f"  ✅ {team_name}")
                return f"/logos/teams/{slug}.png"

        except Exception as e:
            print(f"  ⚠️  {team_name} [{search_term}]: {e}")
            continue

    print(f"  ❌ {team_name} — non trouvé")
    return "/logos/default.png"

# Charge metadata et identifie les manquants
meta    = json.loads(META_FILE.read_text(encoding='utf-8'))
missing = []
for team in meta:
    slug = slugify(team)
    if not (LOGO_DIR / f"{slug}.png").exists():
        missing.append(team)

print(f"Logos à télécharger : {len(missing)}")
print("="*50)

# Télécharge chaque logo manquant
for team in missing:
    local_path = search_and_download(team)
    slug       = slugify(team)
    meta[team].update({
        "slug":       slug,
        "local_path": local_path,
        "status":     "downloaded"
                      if local_path != "/logos/default.png"
                      else "not_found"
    })

# Sauvegarde metadata mis à jour
META_FILE.write_text(
    json.dumps(meta, indent=2, ensure_ascii=False), encoding='utf-8'
)

# Rapport final
on_disk   = len(list(LOGO_DIR.glob("*.png")))
downloaded = sum(1 for v in meta.values()
                 if v.get("status") == "downloaded")
not_found  = sum(1 for v in meta.values()
                 if v.get("status") == "not_found")

print("="*50)
print(f"✅ Fichiers sur disque  : {on_disk}")
print(f"✅ Téléchargés avec succès : {downloaded}")
print(f"❌ Non trouvés          : {not_found}")

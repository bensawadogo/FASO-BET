import requests, time, json, unicodedata
from pathlib import Path

LOGO_DIR  = Path("public/logos/teams")
META_FILE = Path("public/logos/metadata.json")
LOGO_DIR.mkdir(parents=True, exist_ok=True)

def slugify(n):
    n = unicodedata.normalize('NFD', n)
    n = ''.join(c for c in n if unicodedata.category(c)!='Mn')
    return (n.lower().replace(' ','_').replace('-','_')
             .replace('.','').replace("'",''))

def try_download(url, dest):
    try:
        r = requests.get(url, timeout=10,
            headers={"User-Agent":"Mozilla/5.0"})
        if r.status_code == 200 and len(r.content) > 500:
            dest.write_bytes(r.content)
            return True
    except:
        pass
    return False

TEAMS = {
    # Europe
    "Arsenal":          "https://a.espncdn.com/i/teamlogos/soccer/500/359.png",
    "Chelsea":          "https://a.espncdn.com/i/teamlogos/soccer/500/363.png",
    "Liverpool":        "https://a.espncdn.com/i/teamlogos/soccer/500/364.png",
    "Manchester City":  "https://a.espncdn.com/i/teamlogos/soccer/500/382.png",
    "Manchester United":"https://a.espncdn.com/i/teamlogos/soccer/500/360.png",
    "Tottenham Hotspur":"https://a.espncdn.com/i/teamlogos/soccer/500/367.png",
    "Real Madrid":      "https://a.espncdn.com/i/teamlogos/soccer/500/86.png",
    "FC Barcelona":     "https://a.espncdn.com/i/teamlogos/soccer/500/83.png",
    "Atletico Madrid":  "https://a.espncdn.com/i/teamlogos/soccer/500/1068.png",
    "Bayern Munich":    "https://a.espncdn.com/i/teamlogos/soccer/500/132.png",
    "Borussia Dortmund":"https://a.espncdn.com/i/teamlogos/soccer/500/124.png",
    "Juventus":         "https://a.espncdn.com/i/teamlogos/soccer/500/111.png",
    "Inter Milan":      "https://a.espncdn.com/i/teamlogos/soccer/500/110.png",
    "AC Milan":         "https://a.espncdn.com/i/teamlogos/soccer/500/103.png",
    "SSC Napoli":       "https://a.espncdn.com/i/teamlogos/soccer/500/116.png",
    "PSG":              "https://a.espncdn.com/i/teamlogos/soccer/500/160.png",
    "Olympique de Marseille": "https://a.espncdn.com/i/teamlogos/soccer/500/162.png",
    "Porto":            "https://a.espncdn.com/i/teamlogos/soccer/500/197.png",
    "Benfica":          "https://a.espncdn.com/i/teamlogos/soccer/500/193.png",
    "Ajax":             "https://a.espncdn.com/i/teamlogos/soccer/500/169.png",
    # Afrique
    "Al Ahly":          "https://upload.wikimedia.org/wikipedia/en/e/ec/Al_Ahly_SC_Logo.png",
    "Wydad AC":         "https://upload.wikimedia.org/wikipedia/en/b/b7/Wydad_Athletic_Club.png",
    "Zamalek":          "https://upload.wikimedia.org/wikipedia/en/8/8e/Zamalek_SC_logo.png",
    "TP Mazembe":       "https://upload.wikimedia.org/wikipedia/en/d/d4/TP_Mazembe_logo.png",
    "Espérance Sportive":"https://upload.wikimedia.org/wikipedia/en/1/10/Esp%C3%A9rance_Sportive_de_Tunis_logo.png",
    "Mamelodi Sundowns":"https://upload.wikimedia.org/wikipedia/en/6/66/Mamelodi_Sundowns_FC.png",
}

meta = json.loads(META_FILE.read_text(encoding='utf-8')) if META_FILE.exists() else {}
ok_count = 0

for team, url in TEAMS.items():
    slug = slugify(team)
    dest = LOGO_DIR / f"{slug}.png"
    if dest.exists():
        print(f"  SKIP {team}")
        meta[team] = {"slug":slug,
                      "local_path":f"/logos/teams/{slug}.png",
                      "status":"downloaded"}
        ok_count += 1
        continue
    success = try_download(url, dest)
    print(f"  {'✅' if success else '❌'} {team}")
    meta[team] = {
        "slug":       slug,
        "local_path": f"/logos/teams/{slug}.png"
                      if success else "/logos/default.png",
        "status":     "downloaded" if success else "not_found"
    }
    if success:
        ok_count += 1
    time.sleep(0.5)

META_FILE.write_text(json.dumps(meta, indent=2,
                                ensure_ascii=False), encoding='utf-8')
print(f"\n✅ {ok_count}/{len(TEAMS)} logos téléchargés")
print(f"📁 {len(list(LOGO_DIR.glob('*.png')))} fichiers sur disque")

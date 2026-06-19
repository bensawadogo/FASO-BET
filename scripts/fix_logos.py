"""
Fix PSG logo (currently a copy of OL) and add missing national team logos.
Uses TheSportsDB free API (no key required).
"""
import json
import time
import hashlib
import requests
from pathlib import Path

LOGO_DIR  = Path(r"C:\site-antigra\site-antigra\public\logos\teams")
META_FILE = Path(r"C:\site-antigra\site-antigra\public\logos\metadata.json")
BASE_URL  = "https://www.thesportsdb.com/api/v1/json/3"

LOGO_DIR.mkdir(parents=True, exist_ok=True)

def get_file_hash(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def download_logo(team_name: str, search_name: str = None) -> bytes | None:
    """Try to download logo from TheSportsDB."""
    name = search_name or team_name
    try:
        r = requests.get(f"{BASE_URL}/searchteams.php", params={"t": name}, timeout=10)
        time.sleep(1.5)
        teams = r.json().get("teams") or []
        if teams and teams[0].get("strBadge"):
            badge_url = teams[0]["strBadge"] + "/preview"
            img = requests.get(badge_url, timeout=15)
            time.sleep(1)
            if img.status_code == 200 and len(img.content) > 2000:
                return img.content
    except Exception as e:
        print(f"  ERROR: {e}")
    return None

def slugify(name: str) -> str:
    import re, unicodedata
    n = name.lower().strip()
    n = unicodedata.normalize("NFD", n)
    n = re.sub(r"[\u0300-\u036f]", "", n)
    n = re.sub(r"[\s\-\.\'\/]+", "_", n)
    n = re.sub(r"[^a-z0-9_]", "", n)
    n = re.sub(r"_+", "_", n)
    return n.strip("_")

# ============================================================
# 1. Detect PSG duplicate
# ============================================================
ol_path  = LOGO_DIR / "olympique_lyonnais.png"
psg_path = LOGO_DIR / "paris_saint-germain.png"

print("=" * 60)
print("STEP 1: Check PSG vs OL logo duplicate")
print("=" * 60)

if ol_path.exists() and psg_path.exists():
    ol_hash  = get_file_hash(ol_path)
    psg_hash = get_file_hash(psg_path)
    if ol_hash == psg_hash:
        print(f"  DUPLICATE DETECTED: PSG is using OL logo!")
        print(f"  Downloading correct PSG logo...")
        data = download_logo("Paris Saint-Germain", "Paris Saint-Germain")
        if not data:
            # Try alternative name
            data = download_logo("PSG", "PSG")
        if data:
            psg_path.write_bytes(data)
            new_hash = get_file_hash(psg_path)
            if new_hash != ol_hash:
                print(f"  [OK] PSG logo fixed! ({len(data)} bytes)")
            else:
                print(f"  [WARN] Downloaded file still matches OL hash -- try manual replacement")
        else:
            print(f"  [ERROR] Could not download PSG logo from TheSportsDB")
    else:
        print(f"  [OK] PSG and OL logos are different (no issue)")
else:
    print(f"  [WARN] One or both files missing")

# ============================================================
# 2. National teams to add
# ============================================================
NATIONAL_TEAMS = {
    # Afrique
    "Senegal":            {"slug": "senegal",          "search": "Senegal"},
    "Maroc":              {"slug": "maroc",             "search": "Morocco"},
    "Algerie":            {"slug": "algerie",           "search": "Algeria"},
    "Egypte":             {"slug": "egypte",            "search": "Egypt"},
    "Nigeria":            {"slug": "nigeria",           "search": "Nigeria"},
    "Ghana":              {"slug": "ghana",             "search": "Ghana"},
    "Cameroun":           {"slug": "cameroun",          "search": "Cameroon"},
    "Cote D Ivoire":      {"slug": "cote_d_ivoire",    "search": "Ivory Coast"},
    "Tunisie":            {"slug": "tunisie",           "search": "Tunisia"},
    "Mali":               {"slug": "mali",              "search": "Mali"},
    "Burkina Faso":       {"slug": "burkina_faso",      "search": "Burkina Faso"},
    "Guinee":             {"slug": "guinee",            "search": "Guinea"},
    "Cap Vert":           {"slug": "cap_vert",          "search": "Cape Verde"},
    "Afrique Du Sud":     {"slug": "afrique_du_sud",    "search": "South Africa"},
    "Congo Dr":           {"slug": "congo_dr",          "search": "Congo DR"},
    "Tanzania":           {"slug": "tanzania",          "search": "Tanzania"},
    "Angola":             {"slug": "angola",            "search": "Angola"},
    "Mozambique":         {"slug": "mozambique",        "search": "Mozambique"},
    "Zimbabwe":           {"slug": "zimbabwe",          "search": "Zimbabwe"},
    "Zambie":             {"slug": "zambie",            "search": "Zambia"},
    # Europe
    "France":             {"slug": "france",            "search": "France"},
    "Espagne":            {"slug": "espagne",           "search": "Spain"},
    "Angleterre":         {"slug": "angleterre",        "search": "England"},
    "Allemagne":          {"slug": "allemagne",         "search": "Germany"},
    "Portugal":           {"slug": "portugal",          "search": "Portugal"},
    "Italie":             {"slug": "italie",            "search": "Italy"},
    "Pays Bas":           {"slug": "pays_bas",          "search": "Netherlands"},
    "Belgique":           {"slug": "belgique",          "search": "Belgium"},
    "Croatie":            {"slug": "croatie",           "search": "Croatia"},
    "Serbie":             {"slug": "serbie",            "search": "Serbia"},
    "Danemark":           {"slug": "danemark",          "search": "Denmark"},
    "Suisse":             {"slug": "suisse",            "search": "Switzerland"},
    "Autriche":           {"slug": "autriche",          "search": "Austria"},
    "Turquie":            {"slug": "turquie",           "search": "Turkey"},
    "Pologne":            {"slug": "pologne",           "search": "Poland"},
    "Ecosse":             {"slug": "ecosse",            "search": "Scotland"},
    # Amérique
    "Bresil":             {"slug": "bresil",            "search": "Brazil"},
    "Argentine":          {"slug": "argentine",         "search": "Argentina"},
    "Uruguay":            {"slug": "uruguay",           "search": "Uruguay"},
    "Colombie":           {"slug": "colombie",          "search": "Colombia"},
    "Mexique":            {"slug": "mexique",           "search": "Mexico"},
    "Etats Unis":         {"slug": "etats_unis",        "search": "USA"},
    # Asie/Oceanie
    "Japon":              {"slug": "japon",             "search": "Japan"},
    "Coree Du Sud":       {"slug": "coree_du_sud",      "search": "South Korea"},
    "Australie":          {"slug": "australie",         "search": "Australia"},
    "Saudi Arabie":       {"slug": "saudi_arabie",      "search": "Saudi Arabia"},
}

print("\n" + "=" * 60)
print("STEP 2: Download missing national team logos")
print("=" * 60)

meta = json.loads(META_FILE.read_text(encoding="utf-8"))

results = {"ok": [], "failed": [], "skipped": []}

for display_name, info in NATIONAL_TEAMS.items():
    slug      = info["slug"]
    search    = info["search"]
    logo_path = LOGO_DIR / f"{slug}.png"

    if logo_path.exists() and logo_path.stat().st_size > 2000:
        print(f"  [SKIP] {display_name} -- already exists, skipping")
        results["skipped"].append(display_name)
        # Still ensure it's in metadata
        if display_name not in meta:
            meta[display_name] = {
                "team": display_name,
                "slug": slug,
                "local_path": f"/logos/teams/{slug}.png",
                "status": "cached"
            }
        continue

    print(f"  [DOWN] Downloading {display_name} (search: '{search}')...", end=" ", flush=True)
    data = download_logo(display_name, search)

    if data:
        logo_path.write_bytes(data)
        meta[display_name] = {
            "team": display_name,
            "slug": slug,
            "local_path": f"/logos/teams/{slug}.png",
            "status": "cached"
        }
        print(f"[OK] ({len(data)} bytes)")
        results["ok"].append(display_name)
    else:
        print(f"[ERROR] FAILED")
        results["failed"].append(display_name)

# ============================================================
# 3. Also add aliases for national teams in metadata.json
# ============================================================
EXTRA_ALIASES = {
    "Morocco":       "maroc",
    "Algeria":       "algerie",
    "Egypt":         "egypte",
    "Cameroon":      "cameroun",
    "Ivory Coast":   "cote_d_ivoire",
    "Tunisia":       "tunisie",
    "South Africa":  "afrique_du_sud",
    "Congo":         "congo_dr",
    "Brazil":        "bresil",
    "Argentina":     "argentine",
    "Colombia":      "colombie",
    "Mexico":        "mexique",
    "Spain":         "espagne",
    "England":       "angleterre",
    "Germany":       "allemagne",
    "Italy":         "italie",
    "Netherlands":   "pays_bas",
    "Belgium":       "belgique",
    "Croatia":       "croatie",
    "Serbia":        "serbie",
    "Denmark":       "danemark",
    "Switzerland":   "suisse",
    "Austria":       "autriche",
    "Turkey":        "turquie",
    "Poland":        "pologne",
    "Scotland":      "ecosse",
    "Japan":         "japon",
    "South Korea":   "coree_du_sud",
    "Australia":     "australie",
    "USA":           "etats_unis",
    "United States": "etats_unis",
    "Senegal":       "senegal",
    "Nigeria":       "nigeria",
    "Ghana":         "ghana",
    "Guinea":        "guinee",
    "Cape Verde":    "cap_vert",
    "Angola":        "angola",
    "Zambia":        "zambie",
    "Tanzania":      "tanzania",
    "Zimbabwe":      "zimbabwe",
    "Mozambique":    "mozambique",
}

for eng_name, slug in EXTRA_ALIASES.items():
    logo_path = LOGO_DIR / f"{slug}.png"
    if logo_path.exists() and eng_name not in meta:
        meta[eng_name] = {
            "team": eng_name,
            "slug": slug,
            "local_path": f"/logos/teams/{slug}.png",
            "status": "cached"
        }

# ============================================================
# 4. Save updated metadata
# ============================================================
META_FILE.write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"\n[OK] metadata.json updated ({len(meta)} entries)")

# ============================================================
# 5. Summary
# ============================================================
print("\n" + "=" * 60)
print("SUMMARY")
print("=" * 60)
print(f"  Downloaded:  {len(results['ok'])} teams")
print(f"  Skipped:     {len(results['skipped'])} teams (already existed)")
print(f"  Failed:      {len(results['failed'])} teams")
if results["failed"]:
    print(f"\n  Failed teams:")
    for t in results["failed"]:
        print(f"    - {t}")
print("\nDone!")

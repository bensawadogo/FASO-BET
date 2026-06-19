import json, unicodedata
from pathlib import Path
import re

# Paths
LOGO_DIR  = Path("public/logos/teams")
META_FILE = Path("public/logos/metadata.json")
DATA_DIR  = Path("api/data_sources")

def slugify(n):
    n = unicodedata.normalize('NFD', n)
    n = ''.join(c for c in n if unicodedata.category(c)!='Mn')
    return (n.lower().replace(' ','_').replace('-','_')
             .replace('.','').replace("'",''))

# 1. Load existing registry
meta = json.loads(META_FILE.read_text(encoding='utf-8')) if META_FILE.exists() else {}

# 2. Extract potential teams from seed data
teams_found = set()
for f in DATA_DIR.glob('*.py'):
    content = f.read_text(encoding='utf-8')
    # Simple regex to find team names in common seed formats
    found = re.findall(r'["\']([A-Z][a-zA-Z\s]+)["\']', content)
    for team in found:
        if len(team) > 3 and team not in ["Home", "Away", "Match"]:
            teams_found.add(team)

# 3. Analyze
print("--- Analyse de Santé des Logos ---")
print(f"Total équipes dans metadata.json : {len(meta)}")
print(f"Total équipes scannées dans les seeds : {len(teams_found)}")

missing_in_meta = [t for t in teams_found if t not in meta]
missing_files = [t for t, data in meta.items() if not (LOGO_DIR / f"{data['slug']}.png").exists()]

print(f"\n❌ Équipes totalement absentes du registre : {len(missing_in_meta)}")
for t in missing_in_meta[:10]: print(f"  - {t}")

print(f"\n⚠️ Équipes dans le registre mais sans fichier PNG : {len(missing_files)}")
for t in missing_files[:10]: print(f"  - {t}")

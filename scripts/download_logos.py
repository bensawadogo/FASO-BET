"""Download team logos from TheSportsDB (free tier, no API key needed)."""
import json, requests, time
from pathlib import Path

LOGO_DIR  = Path(r"C:\site-antigra\site-antigra\public\logos\teams")
META_FILE = Path(r"C:\site-antigra\site-antigra\public\logos\metadata.json")
BASE_URL  = "https://www.thesportsdb.com/api/v1/json/3"

LOGO_DIR.mkdir(parents=True, exist_ok=True)
meta = json.loads(META_FILE.read_text())

downloaded = 0
for team_name, data in meta.items():
    slug = data.get("slug", "")
    local_path = LOGO_DIR / f"{slug}.png"

    if local_path.exists() and local_path.stat().st_size > 1000:
        continue  # already has a real logo

    print(f"Downloading: {team_name}...", end=" ", flush=True)
    try:
        r = requests.get(f"{BASE_URL}/searchteams.php", params={"t": team_name}, timeout=10)
        time.sleep(1.5)  # rate limit
        teams = r.json().get("teams")
        if teams and teams[0].get("strBadge"):
            badge_url = teams[0]["strBadge"]
            if badge_url:
                img = requests.get(badge_url + "/preview", timeout=15)
                time.sleep(1)
                if img.status_code == 200 and len(img.content) > 1000:
                    local_path.write_bytes(img.content)
                    print(f"OK ({len(img.content)} bytes)")
                    downloaded += 1
                    continue
        print("FAILED")
    except Exception as e:
        print(f"ERROR: {e}")

print(f"\nDownloaded: {downloaded} new logos")

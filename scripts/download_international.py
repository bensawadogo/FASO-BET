import requests
from pathlib import Path

# Create directory
Path("data/international").mkdir(parents=True, exist_ok=True)

url = "https://raw.githubusercontent.com/martj42/international_results/master/results.csv"
print(f"Downloading from {url}...")

try:
    r = requests.get(url, timeout=30)
    if r.status_code == 200 and len(r.content) > 10000:
        Path("data/international/results.csv").write_bytes(r.content)
        print(f"✅ Téléchargé : {len(r.content)//1024}KB")
    else:
        print(f"❌ Échec HTTP {r.status_code}")
        exit(1)
except Exception as e:
    print(f"❌ Erreur : {e}")
    exit(1)

# Inspect immediately
import pandas as pd
try:
    df = pd.read_csv("data/international/results.csv")
    print(f"Lignes : {len(df)}")
    print(f"Colonnes : {df.columns.tolist()}")
    print(f"Période : {df.date.min()} → {df.date.max()}")
    
    # Compter les matchs africains
    african_tournaments = df[df.tournament.str.contains(
        'African|AFCON|Africa Cup|CAF|CHAN', case=False, na=False
    )]
    print(f"\nMatchs africains : {len(african_tournaments)}")

    # Vérifier WC teams
    wc_africa = ['Senegal', 'Morocco', 'Nigeria', 'South Africa',
                 'Egypt', 'Mali', 'Cameroon', 'Ivory Coast']
    for team in wc_africa:
        count = len(df[(df.home_team==team) | (df.away_team==team)])
        print(f"  {team} : {count} matchs historiques")
except Exception as e:
    print(f"❌ Erreur inspection : {e}")
    exit(1)

import pandas as pd
from pathlib import Path

CSV_DIR = Path("data/fdco")
files = sorted(CSV_DIR.glob("*.csv"))

if not files:
    print("ERREUR : aucun CSV trouvé dans data/fdco/")
    exit(1)

# Inspecter le premier fichier
try:
    sample = pd.read_csv(files[0], encoding='latin-1', on_bad_lines='skip')
    print(f"Fichier : {files[0].name}")
    print(f"Lignes : {len(sample)}")
    print(f"Colonnes disponibles :")
    print(sample.columns.tolist())
    print()
    
    # Colonnes de base
    base_cols = ['Date','HomeTeam','AwayTeam','FTHG','FTAG']
    # Colonnes optionnelles
    opt_cols = ['B365H','B365D','B365A','1XBH','1XBD','1XBA']
    available_cols = [c for c in base_cols + opt_cols if c in sample.columns]
    
    print("3 premières lignes :")
    print(sample[available_cols].head(3).to_string())

    # Vérifier la disponibilité des cotes 1XBet
    has_1xbet = '1XBH' in sample.columns
    has_b365 = 'B365H' in sample.columns
    has_pinnacle = 'PSH' in sample.columns or 'PH' in sample.columns
    has_shots = 'HS' in sample.columns

    print(f"\nCotes 1XBet disponibles : {'✅' if has_1xbet else '❌'}")
    print(f"Cotes Bet365 disponibles : {'✅' if has_b365 else '❌'}")
    print(f"Cotes Pinnacle disponibles : {'✅' if has_pinnacle else '❌'}")
    print(f"Stats tirs disponibles : {'✅' if has_shots else '❌'}")

except Exception as e:
    print(f"Erreur inspection : {e}")

# Compter les matchs totaux sur tous les fichiers
total = 0
for f in files:
    try:
        df = pd.read_csv(f, encoding='latin-1', on_bad_lines='skip')
        df = df.dropna(subset=['HomeTeam', 'AwayTeam'])
        total += len(df)
    except:
        pass
print(f"\nTotal matchs dans tous les CSV : {total}")

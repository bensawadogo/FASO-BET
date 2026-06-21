"""Sync actual scores from openfootball/worldcup.json into InternationalMatch + compute accuracy"""
import os, sys, django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sportpred.settings")
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
django.setup()

import requests, joblib, glob, pandas as pd
from django.db.models import F
from datetime import datetime

TEAM_NORMALIZE = {
    "Korea Republic": "South Korea",
    "Czechia": "Czech Republic",
    "Congo DR": "DR Congo",
    "Bosnia & Herzegovina": "Bosnia and Herzegovina",
    "USA": "United States",
    "Curacao": "Curaçao",
    "Cote d'Ivoire": "Ivory Coast",
}

def norm(name):
    name = name.strip()
    name = name.replace("'", " ").replace("é", "e").replace("è", "e").replace("ê", "e")
    return TEAM_NORMALIZE.get(name, name)


def fetch_openfootball():
    resp = requests.get(
        "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json",
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()
    matches = data.get("matches", [])
    played = [m for m in matches if m.get("score") and m["score"].get("ft")]
    results = []
    for m in played:
        ft = m["score"]["ft"]
        if len(ft) < 2:
            continue
        hs, aws = int(ft[0]), int(ft[1])
        actual = "HOME" if hs > aws else ("AWAY" if aws > hs else "DRAW")
        results.append({
            "home_team": norm(m["team1"]),
            "away_team": norm(m["team2"]),
            "home_score": hs,
            "away_score": aws,
            "actual_result": actual,
            "date": m.get("date", ""),
        })
    return results


def load_model():
    xgb_files = sorted(glob.glob("ml/models/xgb_international_*.joblib"))
    lgbm_files = sorted(glob.glob("ml/models/lgbm_international_*.joblib"))
    le_files = sorted(glob.glob("ml/models/le_international_*.joblib"))
    if not xgb_files:
        print("ERREUR: Aucun modele international trouve dans ml/models/")
        return None, None, None
    xgb = joblib.load(xgb_files[-1])
    lgbm = joblib.load(lgbm_files[-1])
    le = joblib.load(le_files[-1])
    return xgb, lgbm, le


def predict_outcome(home_team, away_team, xgb_model, lgbm_model, le):
    from predictions.models import InternationalFeatures
    feat = InternationalFeatures.objects.filter(
        match__home_team=home_team, match__away_team=away_team
    ).first()
    if feat and feat.elo_home is not None:
        feats = {
            "elo_home": feat.elo_home,
            "elo_away": feat.elo_away,
            "form_home": feat.form_home or 0.5,
            "form_away": feat.form_away or 0.5,
            "form_wc_home": feat.form_wc_home or 0.5,
            "form_wc_away": feat.form_wc_away or 0.5,
            "h2h_wins": feat.h2h_wins or 0.5,
        }
    else:
        latest_h = InternationalFeatures.objects.filter(match__home_team=home_team).order_by("-match__match_date").first()
        latest_a = InternationalFeatures.objects.filter(match__away_team=away_team).order_by("-match__match_date").first()
        elo_h = latest_h.elo_home if latest_h else 1500.0
        elo_a = latest_a.elo_away if latest_a else 1500.0
        feats = {"elo_home": elo_h, "elo_away": elo_a, "form_home": 0.5, "form_away": 0.5,
                 "form_wc_home": 0.5, "form_wc_away": 0.5, "h2h_wins": 0.5}

    FEATURES = ["elo_home", "elo_away", "form_home", "form_away",
                "form_wc_home", "form_wc_away", "h2h_wins"]
    X = pd.DataFrame([feats])[FEATURES]
    xgb_p = xgb_model.predict_proba(X)[0]
    lgbm_p = lgbm_model.predict_proba(X)[0]
    ens = xgb_p * 0.45 + lgbm_p * 0.55
    labels = le.classes_
    idx = ens.argmax()
    return labels[idx]


def main():
    from predictions.models import InternationalMatch, InternationalFeatures

    print("=== SYNC SCORES CDM 2026 ===")

    # 1) Fetch scores
    print("\n[1] Récupération des scores openfootball...")
    try:
        scores = fetch_openfootball()
        print(f"  {len(scores)} matchs joués récupérés")
    except Exception as e:
        print(f"  ERREUR: {e}")
        return

    # 2) Load ML model
    print("\n[2] Chargement du modèle ML...")
    xgb, lgbm, le = load_model()
    if xgb is None:
        print("  Impossible de charger le modele - accuracy non calculable")
        return
    print("  Modèle chargé OK")

    # 3) Update matches
    print("\n[3] Mise à jour des matchs dans la DB...")
    updated = 0
    not_found = []
    for s in scores:
        qs = InternationalMatch.objects.filter(
            home_team__iexact=s["home_team"],
            away_team__iexact=s["away_team"],
        )
        # Try reversed if not found
        if not qs.exists():
            qs = InternationalMatch.objects.filter(
                home_team__iexact=s["away_team"],
                away_team__iexact=s["home_team"],
            )
        if not qs.exists():
            not_found.append(f"{s['home_team']} vs {s['away_team']}")
            continue

        match = qs.first()
        match.home_score = s["home_score"]
        match.away_score = s["away_score"]
        match.actual_result = s["actual_result"]
        if match.status != "finished":
            match.status = "finished"

        # Compute predicted outcome
        try:
            pred = predict_outcome(match.home_team, match.away_team, xgb, lgbm, le)
            match.predicted_outcome = pred
        except Exception as e:
            print(f"  Prediction error for {match.home_team} vs {match.away_team}: {e}")

        match.save()
        updated += 1
        print(f"  [{s['date']}] {match.home_team} {s['home_score']}-{s['away_score']} {match.away_team} | Real: {s['actual_result']} | Pred: {getattr(match, 'predicted_outcome', '?')}")

    if not_found:
        print(f"\n  Non trouvés dans DB ({len(not_found)}):")
        for nf in not_found:
            print(f"    - {nf}")

    # 4) Calculate accuracy
    print("\n[4] Calcul de la vraie accuracy...")
    finished = InternationalMatch.objects.filter(
        status="finished",
        actual_result__isnull=False,
        predicted_outcome__isnull=False,
    )
    total = finished.count()
    correct = finished.filter(actual_result=F("predicted_outcome")).count()
    wrong = total - correct

    print(f"\n{'='*50}")
    print(f"  Matchs terminés dans DB : {total}")
    print(f"  Prédictions correctes    : {correct}")
    print(f"  Prédictions fausses      : {wrong}")
    if total > 0:
        acc = round(correct / total * 100, 1)
        print(f"  VRAIE ACCURACY           : {acc}%")
    else:
        print(f"  Pas assez de données pour accuracy")
    print(f"{'='*50}")

    # 5) Also update predicted_outcome for upcoming matches (for future tracking)
    print("\n[5] Mise à jour des prédictions pour les matchs à venir...")
    upcoming = InternationalMatch.objects.filter(
        match_date__gte=datetime.now().date(),
        predicted_outcome__isnull=True,
    )
    updated_upcoming = 0
    for m in upcoming:
        try:
            pred = predict_outcome(m.home_team, m.away_team, xgb, lgbm, le)
            m.predicted_outcome = pred
            m.save()
            updated_upcoming += 1
        except Exception:
            pass
    print(f"  {updated_upcoming} matchs à venir mis à jour avec predicted_outcome")


if __name__ == "__main__":
    main()

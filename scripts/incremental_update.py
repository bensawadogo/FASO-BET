"""Incremental XGBoost + LightGBM update after each matchday.
Continues training from existing models with new actual results."""
import joblib, glob, numpy as np, os, time, shutil, json, sys, django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sportpred.settings")
django.setup()

from sklearn.metrics import accuracy_score
from xgboost import XGBClassifier
import lightgbm as lgb
import pandas as pd
from django.db import connection

FEATURES = ['elo_home', 'elo_away', 'form_home', 'form_away',
            'form_wc_home', 'form_wc_away', 'h2h_wins']

TRACKER_FILE = "ml/models/last_incremental_update.json"


def load_models():
    xgb_files = sorted(glob.glob("ml/models/xgb_international_*.joblib"))
    lgbm_files = sorted(glob.glob("ml/models/lgbm_international_*.joblib"))
    le_files = sorted(glob.glob("ml/models/le_international_*.joblib"))

    if not xgb_files or not lgbm_files or not le_files:
        raise FileNotFoundError("Model files not found")

    xgb = joblib.load(xgb_files[-1])
    lgbm = joblib.load(lgbm_files[-1])
    le = joblib.load(le_files[-1])
    try:
        xgb_trees = xgb.get_booster().num_boosted_rounds()
    except Exception:
        xgb_trees = "?"
    try:
        lgbm_trees = lgbm.booster_.num_trees()
    except Exception:
        lgbm_trees = "?"
    print(f"  XGBoost:   {os.path.basename(xgb_files[-1])} ({xgb_trees} trees)")
    print(f"  LightGBM:  {os.path.basename(lgbm_files[-1])} ({lgbm_trees} trees)")
    print(f"  LabelEncoder: {le.classes_}")
    print(f"  LabelEncoder: {le.classes_}")
    return xgb, lgbm, le, xgb_files[-1], lgbm_files[-1]


def get_new_results(last_update_ts=None):
    from predictions.models import InternationalMatch, InternationalFeatures
    from django.db.models import F as dbF

    qs = InternationalMatch.objects.filter(
        status="finished",
        actual_result__isnull=False,
    ).exclude(
        predicted_outcome__isnull=True
    ).annotate(
        elo_home=dbF("internationalfeatures__elo_home"),
        elo_away=dbF("internationalfeatures__elo_away"),
        form_home=dbF("internationalfeatures__form_home"),
        form_away=dbF("internationalfeatures__form_away"),
        form_wc_home=dbF("internationalfeatures__form_wc_home"),
        form_wc_away=dbF("internationalfeatures__form_wc_away"),
        h2h_wins=dbF("internationalfeatures__h2h_wins"),
    ).filter(
        elo_home__isnull=False
    ).order_by("kickoff_utc")

    if last_update_ts:
        qs = qs.filter(kickoff_utc__gt=last_update_ts)

    return list(qs)


def ensure_features(match_ids):
    """Compute features for InternationalMatch rows that lack InternationalFeatures or have NULL label."""
    from predictions.models import InternationalFeatures, InternationalMatch
    existing = set(InternationalFeatures.objects.filter(
        match_id__in=match_ids, label__isnull=False
    ).values_list('match_id', flat=True))
    missing = [mid for mid in match_ids if mid not in existing]
    if not missing:
        return
    print(f"    Calcul des features pour {len(missing)} matchs...")
    for mid in missing:
        try:
            m = InternationalMatch.objects.get(id=mid)
        except InternationalMatch.DoesNotExist:
            continue
        from django.db.models import Max
        recent_h = InternationalFeatures.objects.filter(match__home_team=m.home_team).order_by('-match__match_date').first()
        recent_a = InternationalFeatures.objects.filter(match__away_team=m.away_team).order_by('-match__match_date').first()
        elo_h = recent_h.elo_home if recent_h else 1500.0
        elo_a = recent_a.elo_away if recent_a else 1500.0
        form_h = recent_h.form_home if recent_h else 0.5
        form_a = recent_a.form_away if recent_a else 0.5
        fwc_h = recent_h.form_wc_home if recent_h else 0.5
        fwc_a = recent_a.form_wc_away if recent_a else 0.5
        h2h = recent_h.h2h_wins if recent_h else 0.5
        # Update existing feature row if label is NULL, otherwise create new
        feat = InternationalFeatures.objects.filter(match_id=mid).first()
        if feat:
            feat.elo_home = elo_h
            feat.elo_away = elo_a
            feat.form_home = form_h
            feat.form_away = form_a
            feat.form_wc_home = fwc_h
            feat.form_wc_away = fwc_a
            feat.h2h_wins = h2h
            feat.label = m.actual_result
            feat.save()
        else:
            InternationalFeatures.objects.create(
                match=m,
                elo_home=elo_h, elo_away=elo_a,
                form_home=form_h, form_away=form_a,
                form_wc_home=fwc_h, form_wc_away=fwc_a,
                h2h_wins=h2h,
                label=m.actual_result,
            )
    print(f"    -> {len(missing)} features mises à jour")


def get_new_results_db(last_update_ts=None):
    """Get matches with actual results and features via Django ORM."""
    from django.db import connection as db_conn
    from predictions.models import InternationalMatch

    # Ensure features exist for all matches with actual results
    match_qs = InternationalMatch.objects.filter(
        status='finished', actual_result__isnull=False
    )
    if last_update_ts:
        match_qs = match_qs.filter(kickoff_utc__gt=last_update_ts)
    m_ids = list(match_qs.values_list('id', flat=True))
    ensure_features(m_ids)

    filter_clause = ""
    params = []
    if last_update_ts:
        filter_clause = "AND m.kickoff_utc > %s"
        params.append(last_update_ts)

    with db_conn.cursor() as cursor:
        cursor.execute(f"""
            SELECT
                m.home_team, m.away_team, m.actual_result,
                f.elo_home, f.elo_away, f.form_home, f.form_away,
                f.form_wc_home, f.form_wc_away, f.h2h_wins,
                m.kickoff_utc
            FROM predictions_internationalmatch m
            JOIN predictions_internationalfeatures f ON f.match_id = m.id
            WHERE m.status = 'finished'
            AND m.actual_result IS NOT NULL
            AND f.elo_home IS NOT NULL
            AND f.label IS NOT NULL
            {filter_clause}
            ORDER BY m.kickoff_utc ASC
        """, params)
        rows = cursor.fetchall()
    return rows


def build_X_y(rows, le):
    X = pd.DataFrame([
        [r[3], r[4], r[5], r[6], r[7], r[8], r[9] if r[9] is not None else 0.5]
        for r in rows
    ], columns=FEATURES)
    y = le.transform([r[2] for r in rows])
    return X, y


def get_last_kickoff(rows):
    """Get the latest kickoff_utc from the rows (index 10)."""
    latest = None
    for r in rows:
        if len(r) > 10 and r[10] is not None:
            if latest is None or r[10] > latest:
                latest = r[10]
    return latest


def update_xgboost(old_model, X, y, le):
    print(f"\n  --- XGBoost incremental ---")
    y_pred_before = old_model.predict(X)
    acc_before = accuracy_score(y, y_pred_before)

    # Ensure all 3 classes are present - pad with synthetic data if needed
    present_classes = set(np.unique(y))
    expected_classes = set(range(len(le.classes_)))
    if present_classes != expected_classes:
        missing = expected_classes - present_classes
        for mc in missing:
            # Add a synthetic row at the mean of X with the missing class
            mean_row = np.nanmean(X.values if hasattr(X, 'values') else X, axis=0).reshape(1, -1)
            X_pad = pd.DataFrame(mean_row, columns=X.columns) if hasattr(X, 'columns') else mean_row
            X = pd.concat([X, X_pad], ignore_index=True) if hasattr(X, 'concat') else np.vstack([X, mean_row])
            y = np.append(y, mc)
        print(f"    Classes manquantes {missing} -> {len(missing)} lignes synthétiques ajoutées")

    new_model = XGBClassifier(
        n_estimators=50,
        learning_rate=0.02,
        max_depth=4,
        random_state=42,
        eval_metric="mlogloss",
        verbosity=0,
    )
    new_model.fit(X, y, xgb_model=old_model)

    # Remove synthetic rows for accuracy calculation
    y_pred_after = new_model.predict(X[:len(y_pred_before)])
    y_true = y[:len(y_pred_before)]
    acc_after = accuracy_score(y_true, y_pred_after)
    delta = acc_after - acc_before

    print(f"    Accuracy avant:  {acc_before:.4f} ({acc_before*100:.1f}%)")
    print(f"    Accuracy apres:  {acc_after:.4f} ({acc_after*100:.1f}%)")
    print(f"    Delta:           {delta*100:+.1f} pts")
    try:
        new_trees = new_model.get_booster().num_boosted_rounds()
    except Exception:
        new_trees = "?"
    print(f"    Arbres:          {new_trees}")

    return new_model, acc_before, acc_after


def update_lightgbm(old_model, X, y, le):
    print(f"\n  --- LightGBM incremental (keep_training_booster) ---")
    from lightgbm import LGBMClassifier
    y_pred_before = old_model.predict(X)
    acc_before = accuracy_score(y, y_pred_before)

    # Use keep_training_booster to continue from the old model
    old_params = {k: v for k, v in old_model.booster_.params.items()
                  if k in ('objective', 'num_class', 'learning_rate', 'max_depth',
                           'num_leaves', 'min_data_in_leaf', 'min_data_in_bin', 'metric')}
    old_params['learning_rate'] = 0.02
    old_params['min_data_in_leaf'] = 3
    old_params['min_data_in_bin'] = 3
    old_params['verbosity'] = 0

    ds = lgb.Dataset(X.values if hasattr(X, 'values') else X, label=y)
    booster = lgb.train(
        old_params,
        ds,
        num_boost_round=50,
        init_model=old_model.booster_,
        keep_training_booster=True,
    )

    new_trees = booster.num_trees()
    old_trees = old_model.booster_.num_trees()

    if new_trees <= old_trees:
        print(f"    Aucun nouvel arbre ajouté ({new_trees} == {old_trees}). Utilisation de l'ancien modèle.")
        print(f"    Accuracy:        {acc_before*100:.1f}% (inchangée)")
        return old_model, acc_before, acc_before

    # Wrap booster into LGBMClassifier
    new_model = LGBMClassifier()
    new_model._Booster = booster
    new_model._n_features = X.shape[1]
    new_model._classes = le.classes_.tolist()
    new_model._n_classes = 3
    new_model.fitted_ = True
    new_model._le = le

    y_pred_after = new_model.predict(X)
    acc_after = accuracy_score(y, y_pred_after)
    delta = acc_after - acc_before

    print(f"    Accuracy avant:  {acc_before:.4f} ({acc_before*100:.1f}%)")
    print(f"    Accuracy apres:  {acc_after:.4f} ({acc_after*100:.1f}%)")
    print(f"    Delta:           {delta*100:+.1f} pts")
    print(f"    Arbres:          {new_trees} (old: {old_trees})")

    return new_model, acc_before, acc_after


def main(min_new_matches=3):

    print("=== INCREMENTAL UPDATE FASOBET ===")

    # 1) Charger les modèles
    print("\n[1] Chargement des modèles...")
    xgb, lgbm, le, xgb_path, lgbm_path = load_models()

    # 2) Dernier timestamp
    last_update_ts = None
    if os.path.exists(TRACKER_FILE):
        with open(TRACKER_FILE) as f:
            data = json.load(f)
            last_update_ts = data.get("last_update")
        print(f"\n[2] Dernier update: {last_update_ts}")
    else:
        print(f"\n[2] Premier update")

    # 3) Nouveaux matchs
    print(f"\n[3] Recherche nouveaux matchs (dernier update: {last_update_ts or 'jamais'})...")
    new_rows = get_new_results_db(last_update_ts)
    print(f"    Nouveaux matchs avec résultat: {len(new_rows)}")

    if len(new_rows) < min_new_matches:
        print(f"    Pas assez ({len(new_rows)} < {min_new_matches}). Skip.")
        return {"updated": False, "reason": f"Seulement {len(new_rows)} nouveaux matchs (min: {min_new_matches})"}

    # 4) Préparer données
    print(f"\n[4] Préparation des données...")
    X, y = build_X_y(new_rows, le)
    from collections import Counter
    dist = dict(zip(le.classes_, np.bincount(y, minlength=3)))
    print(f"    Distribution: {dist}")

    # 5) Backups
    print(f"\n[5] Backups...")
    ts = int(time.time())
    xgb_backup = xgb_path.replace(".joblib", f"_backup_{ts}.joblib")
    lgbm_backup = lgbm_path.replace(".joblib", f"_backup_{ts}.joblib")
    shutil.copy(xgb_path, xgb_backup)
    shutil.copy(lgbm_path, lgbm_backup)
    print(f"    XGBoost backup: {os.path.basename(xgb_backup)}")
    print(f"    LightGBM backup: {os.path.basename(lgbm_backup)}")

    # 6) Update XGBoost
    print(f"\n[6] Update XGBoost...")
    xgb_new, xgb_acc_before, xgb_acc_after = update_xgboost(xgb, X, y, le)

    # 7) Update LightGBM
    print(f"\n[7] Update LightGBM...")
    try:
        lgbm_new, lgbm_acc_before, lgbm_acc_after = update_lightgbm(lgbm, X, y, le)
    except Exception as e:
        print(f"    ERREUR LightGBM: {e}")
        print(f"    Utilisation de l'ancien modèle LightGBM")
        # Predict accuracy on new data using old model
        y_pred = lgbm.predict(X)
        acc = accuracy_score(y, y_pred)
        lgbm_new, lgbm_acc_before, lgbm_acc_after = lgbm, acc, acc

    # 8) Sauvegarder
    print(f"\n[8] Sauvegarde des modèles mis à jour...")
    xgb_new_path = f"ml/models/xgb_international_v{ts}.joblib"
    lgbm_new_path = f"ml/models/lgbm_international_v{ts}.joblib"
    joblib.dump(xgb_new, xgb_new_path)
    joblib.dump(lgbm_new, lgbm_new_path)
    print(f"    XGBoost: {os.path.basename(xgb_new_path)}")
    print(f"    LightGBM: {os.path.basename(lgbm_new_path)}")

    # 9) Tracker
    from datetime import datetime, timezone
    last_kickoff = get_last_kickoff(new_rows)
    if last_kickoff is None:
        last_kickoff = datetime.now(timezone.utc).isoformat()
    elif hasattr(last_kickoff, 'isoformat'):
        last_kickoff = last_kickoff.isoformat()
    tracker_data = {
        "last_update": datetime.now(timezone.utc).isoformat(),
        "n_matches": len(new_rows),
        "xgb_accuracy_before": xgb_acc_before,
        "xgb_accuracy_after": xgb_acc_after,
        "lgbm_accuracy_before": lgbm_acc_before,
        "lgbm_accuracy_after": lgbm_acc_after,
        "models_saved": [os.path.basename(xgb_new_path), os.path.basename(lgbm_new_path)],
    }
    with open(TRACKER_FILE, "w") as f:
        json.dump(tracker_data, f)
    print(f"\n[9] Tracker mis à jour: {TRACKER_FILE}")

    # 10) Résumé
    print(f"\n{'='*60}")
    print(f"  RÉSUMÉ UPDATE INCRÉMENTAL")
    print(f"{'='*60}")
    print(f"  Nouveaux matchs:           {len(new_rows)}")
    print(f"  XGBoost:                   {xgb_acc_before*100:.1f}% -> {xgb_acc_after*100:.1f}% ({xgb_acc_after-xgb_acc_before:+.1%})")
    print(f"  LightGBM:                  {lgbm_acc_before*100:.1f}% -> {lgbm_acc_after*100:.1f}% ({lgbm_acc_after-lgbm_acc_before:+.1%})")
    print(f"{'='*60}")

    return {
        "updated": True,
        "n_matches": len(new_rows),
        "xgb": {"before": xgb_acc_before, "after": xgb_acc_after},
        "lgbm": {"before": lgbm_acc_before, "after": lgbm_acc_after},
    }


if __name__ == "__main__":
    import sys
    min_m = int(sys.argv[1]) if len(sys.argv) > 1 else 3
    result = main(min_new_matches=min_m)
    print(f"\nResultat: {result}")

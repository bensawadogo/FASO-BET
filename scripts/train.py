import yaml, joblib, os, time
import xgboost as xgb
import lightgbm as lgb
from sklearn.metrics import accuracy_score, confusion_matrix
from sklearn.utils.class_weight import compute_sample_weight
from ml.data import get_training_data, get_temporal_split
import pandas as pd

FEATURES = [
    'elo_home', 'elo_away',
    'form_home', 'form_away',
    'goals_for_home', 'goals_ag_home',
    'goals_for_away', 'goals_ag_away',
    'odds_implied_home', 'odds_implied_draw', 'odds_implied_away',
    'odds_margin'
]

def train():
    os.makedirs("ml/models", exist_ok=True)
    with open("ml/config.yaml") as f:
        config = yaml.safe_load(f)

    df = get_training_data()
    train_df, test_df = get_temporal_split(df)
    timestamp = int(time.time())
    
    X_train, y_train = train_df[FEATURES], train_df['label']
    X_test, y_test = test_df[FEATURES], test_df['label']

    print(f"Entraînement sur {len(train_df)} matchs, test sur {len(test_df)}")
    print(f"Distribution labels: {y_train.value_counts().to_dict()}")

    # Calculer les poids pour équilibrer HOME/DRAW/AWAY
    # 0=AWAY, 1=DRAW, 2=HOME
    sample_weights = compute_sample_weight(
        class_weight={0: 1.0, 1: 1.5, 2: 1.0},
        y=y_train
    )

    # XGBoost
    xgb_model = xgb.XGBClassifier(
        n_estimators=300,
        max_depth=5,
        learning_rate=0.04,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        eval_metric='mlogloss',
        verbosity=0
    )
    xgb_model.fit(X_train, y_train, sample_weight=sample_weights)
    xgb_preds = xgb_model.predict(X_test)
    xgb_acc = accuracy_score(y_test, xgb_preds)
    print(f"XGBoost accuracy: {xgb_acc:.4f}")
    
    cm = confusion_matrix(y_test, xgb_preds)
    print("Confusion Matrix XGBoost:")
    print(cm)
    draw_pred_pct = (xgb_preds == 1).mean()
    print(f"DRAW predicted pct: {draw_pred_pct:.2%}")

    joblib.dump(xgb_model, f"ml/models/xgboost_v{timestamp}.joblib")

    # LightGBM
    lgbm = lgb.LGBMClassifier(
        n_estimators=300,
        learning_rate=0.04,
        max_depth=5,
        num_leaves=31,
        class_weight={0: 1.0, 1: 1.5, 2: 1.0},
        random_state=42,
        verbose=-1
    )
    lgbm.fit(X_train, y_train)
    lgbm_preds = lgbm.predict(X_test)
    lgbm_acc = accuracy_score(y_test, lgbm_preds)
    print(f"LightGBM accuracy: {lgbm_acc:.4f}")
    
    cm_lgbm = confusion_matrix(y_test, lgbm_preds)
    print("Confusion Matrix LightGBM:")
    print(cm_lgbm)
    draw_pred_pct_lgbm = (lgbm_preds == 1).mean()
    print(f"DRAW predicted pct LightGBM: {draw_pred_pct_lgbm:.2%}")

    joblib.dump(lgbm, f"ml/models/lightgbm_v{timestamp}.joblib")
    print(f"LightGBM sauvegardé : ml/models/lightgbm_v{timestamp}.joblib")

if __name__ == "__main__":
    train()

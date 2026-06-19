import yaml, joblib, os, time
import xgboost as xgb
import lightgbm as lgb
from sklearn.metrics import accuracy_score
from ml.data import get_training_data, get_temporal_split

FEATURES = ['elo_home', 'elo_away', 'form_home', 'form_away', 
            'goals_for_home', 'goals_ag_home', 'goals_for_away', 'goals_ag_away', 
            'odds_home', 'odds_draw', 'odds_away', 'h2h_home_wins',
            'form_last3_home', 'form_last3_away', 'home_advantage', 'away_weakness',
            'odds_implied_home', 'odds_implied_draw', 'odds_implied_away', 'odds_margin',
            'streak_home', 'streak_away', 'ranking_home', 'ranking_away',
            'goal_diff_home', 'goal_diff_away', 'momentum_home', 'momentum_away']

def train():
    os.makedirs("ml/models", exist_ok=True)
    with open("ml/config.yaml") as f:
        config = yaml.safe_load(f)

    df = get_training_data()
    train_df, test_df = get_temporal_split(df)
    timestamp = int(time.time())
    
    print(f"Entraînement sur {len(train_df)} matchs, test sur {len(test_df)}")

    # XGBoost
    xgb_model = xgb.XGBClassifier(**config['params'])
    xgb_model.fit(train_df[FEATURES], train_df['label'])
    xgb_acc = accuracy_score(test_df['label'], xgb_model.predict(test_df[FEATURES]))
    print(f"XGBoost accuracy: {xgb_acc:.4f}")
    joblib.dump(xgb_model, f"ml/models/xgboost_v{timestamp}.joblib")

    # LightGBM
    lgbm = lgb.LGBMClassifier(
        n_estimators=300,
        learning_rate=0.05,
        max_depth=5,
        num_leaves=31,
        random_state=42
    )
    lgbm.fit(train_df[FEATURES], train_df['label'])
    lgbm_acc = lgbm.score(test_df[FEATURES], test_df['label'])
    print(f"LightGBM accuracy: {lgbm_acc:.4f}")
    joblib.dump(lgbm, f"ml/models/lightgbm_v{timestamp}.joblib")

if __name__ == "__main__":
    train()

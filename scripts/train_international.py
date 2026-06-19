import pandas as pd, numpy as np, joblib, time
from sqlalchemy import create_engine
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier
from sklearn.model_selection import cross_val_score, StratifiedKFold
from sklearn.preprocessing import LabelEncoder
from sklearn.utils.class_weight import compute_sample_weight
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ml.feature_defaults import XG_HOME_DEFAULT, XG_AWAY_DEFAULT

db_url = os.environ.get('DATABASE_URL', 'postgresql://fasobet:changeme_prod@postgres/fasobet')
engine = create_engine(db_url)

FEATURES = [
    'elo_home', 'elo_away',
    'form_home', 'form_away',
    'form_wc_home', 'form_wc_away',
    'h2h_wins', 'xg_home', 'xg_away'
]

df = pd.read_sql("""
    SELECT f.*, m.neutral as home_neutral
    FROM predictions_internationalfeatures f
    JOIN predictions_internationalmatch m ON f.match_id = m.id
    WHERE f.label IS NOT NULL
      AND f.elo_home IS NOT NULL
      AND f.form_home IS NOT NULL
""", engine)

print(f"Matchs utilisables : {len(df)}")
print(f"Distribution : {df.label.value_counts(normalize=True).to_dict()}")

if len(df) < 500:
    print("INSUFFISANT : moins de 500 matchs")
    exit(1)

X = df[FEATURES].copy()
X['xg_home'] = X['xg_home'].fillna(XG_HOME_DEFAULT)
X['xg_away'] = X['xg_away'].fillna(XG_AWAY_DEFAULT)
X = X.fillna(X.median())
le = LabelEncoder()
y = le.fit_transform(df['label'])

# Poids pour équilibrer
sample_weights = compute_sample_weight(
    class_weight='balanced', y=y
)

# XGBoost
xgb = XGBClassifier(
    n_estimators=300, max_depth=4,
    learning_rate=0.04, subsample=0.8,
    colsample_bytree=0.8, random_state=42,
    eval_metric='mlogloss', verbosity=0
)
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
scores_xgb = cross_val_score(xgb, X, y, cv=cv)
print(f"XGBoost CV (w/o sample_weight) : {scores_xgb.mean():.4f}")

# LightGBM
lgbm = LGBMClassifier(
    n_estimators=300, learning_rate=0.04,
    max_depth=5, num_leaves=31,
    class_weight='balanced', random_state=42, verbose=-1
)
scores_lgbm = cross_val_score(lgbm, X, y, cv=cv)
print(f"LightGBM CV : {scores_lgbm.mean():.4f}")

# Entraîner et sauvegarder
xgb.fit(X, y, sample_weight=sample_weights)
lgbm.fit(X, y)

ts = int(time.time())
os.makedirs("ml/models", exist_ok=True)
joblib.dump(xgb, f"ml/models/xgb_international_v{ts}.joblib")
joblib.dump(lgbm, f"ml/models/lgbm_international_v{ts}.joblib")
joblib.dump(le, f"ml/models/le_international_v{ts}.joblib")

print(f"Modèles sauvegardés : v{ts}")
print()
print("Top features :")
for feat, imp in sorted(zip(FEATURES, xgb.feature_importances_),
                         key=lambda x: x[1], reverse=True):
    print(f"  {feat}: {imp:.4f}")

import glob, joblib, pandas as pd, numpy as np

FEATURES = [
    'elo_home', 'elo_away',
    'form_home', 'form_away',
    'goals_for_home', 'goals_ag_home',
    'goals_for_away', 'goals_ag_away',
    'odds_implied_home', 'odds_implied_draw', 'odds_implied_away',
    'odds_margin'
]

class EnsemblePredictor:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._loaded = False
        return cls._instance

    def load(self):
        if self._loaded:
            return
        xgb_files = sorted(glob.glob("ml/models/xgboost_*.joblib"))
        lgbm_files = sorted(glob.glob("ml/models/lightgbm_*.joblib"))
        if not xgb_files:
            raise FileNotFoundError("Aucun modèle XGBoost dans ml/models/")
        if not lgbm_files:
            raise FileNotFoundError("Aucun modèle LightGBM dans ml/models/")
        self.xgb = joblib.load(xgb_files[-1])
        self.lgbm = joblib.load(lgbm_files[-1])
        # Ordre classes : dépend du LabelEncoder (AWAY=0, DRAW=1, HOME=2)
        self.classes = ['AWAY', 'DRAW', 'HOME']
        self._loaded = True
        print(f"[Ensemble] XGBoost : {xgb_files[-1]}")
        print(f"[Ensemble] LightGBM : {lgbm_files[-1]}")
        print(f"[Ensemble] Classes : {self.classes}")

    def predict(self, features: dict) -> dict:
        self.load()
        # Ensure all required features are present
        X = pd.DataFrame([features])[FEATURES].fillna(0.0)
        
        xgb_proba = self.xgb.predict_proba(X)[0]
        lgbm_proba = self.lgbm.predict_proba(X)[0]
        
        # Pondération : LightGBM légèrement favorisé (55%) vs XGBoost (45%)
        ensemble_proba = (xgb_proba * 0.45) + (lgbm_proba * 0.55)
        idx = int(ensemble_proba.argmax())
        label = self.classes[idx]
        
        proba_dict = {
            self.classes[i]: round(float(ensemble_proba[i]), 4)
            for i in range(len(self.classes))
        }
        
        return {
            "prediction": label,
            "probabilities": proba_dict,
            "confidence": round(float(ensemble_proba.max()), 4),
            "model_version": "ensemble_v2",
            "prediction_source": "ensemble_xgb_lgbm"
        }

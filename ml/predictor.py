from ml.ensemble import EnsemblePredictor

class ModelNotReadyError(Exception): pass

class Predictor:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            try:
                cls._instance.ensemble = EnsemblePredictor()
            except Exception as e:
                raise ModelNotReadyError(f"Modèle d'ensemble non prêt: {e}")
        return cls._instance

    def predict(self, features: dict):
        return self.ensemble.predict(features)

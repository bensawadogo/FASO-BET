"""
Valeurs de remplissage (fillna) pour les features avec couverture
partielle — DOIVENT etre identiques entre l'entrainement et l'inference.

Regle : si le modele international est reentraine avec une couverture xG
different, ces valeurs DOIVENT etre recalculees depuis le nouveau set
d'entrainement et mises a jour ici. Ne jamais laisser l'inference utiliser
une valeur differente de celle vue a l'entrainement.

Historique :
- 2026-06-18 : XG_HOME_DEFAULT / XG_AWAY_DEFAULT fixes a la mediane des
  290 matchs reellement enrichis via StatsBomb (CAN2023, WC2022, WC2018,
  Euro2024, Euro2020, Copa America 2024). A recalculer si la couverture
  StatsBomb est etendue.
"""

import os

# Recalcule depuis predictions_internationalfeatures.xg_home (290 valeurs)
XG_HOME_DEFAULT = 1.3152
XG_AWAY_DEFAULT = 1.0726

TRAINING_DATA_DATE = "2026-06-18"
TRAINING_COVERAGE_PCT = 1.15

# Cache for env override (useful for testing)
_XG_HOME = None
_XG_AWAY = None

def get_xg_defaults():
    global _XG_HOME, _XG_AWAY
    if _XG_HOME is None:
        _XG_HOME = float(os.environ.get("XG_HOME_DEFAULT", str(XG_HOME_DEFAULT)))
        _XG_AWAY = float(os.environ.get("XG_AWAY_DEFAULT", str(XG_AWAY_DEFAULT)))
    return _XG_HOME, _XG_AWAY

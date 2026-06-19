"""
Configuration de calibration des probabilités — modèle international.

Historique :
- 2026-06-18 : T=1.1346 fit sur set CALIB (20% du dataset international,
  split chronologique 60/20/20). Vérifié : 0 changement de prédiction de
  classe, DRAW recall préservé (0.261), gain Log-Loss -0.0016 sur TEST
  jamais vu. Voir session ML du 2026-06-18 pour le détail de la
  méthodologie anti-fuite.

RÈGLE : si le modèle international est réentraîné (nouvelles features,
nouveau xG StatsBomb, etc.), CETTE VALEUR DOIT ÊTRE RECALCULÉE. Un T fit
sur un ancien modèle n'a aucune validité sur un nouveau modèle.
"""

INTERNATIONAL_MODEL_TEMPERATURE = 1.1346

# Date du modèle sur lequel ce T a été calibré — à comparer avec la date
# de modification du fichier .joblib chargé en prod. Si elles ne
# correspondent plus, ce T est obsolète.
CALIBRATED_FOR_MODEL_DATE = "2026-06-18"

"""Utilitaires de calibration des probabilités de prédiction."""
import numpy as np

EPS = 1e-12


def apply_temperature(proba: np.ndarray, temperature: float) -> np.ndarray:
    """
    Applique le temperature scaling à une matrice de probabilités.

    Ne change JAMAIS l'ordre des classes (argmax identique avant/après).
    Modifie uniquement la confiance affichée :
    - temperature > 1 : adoucit (rapproche de l'uniforme)
    - temperature < 1 : accentue
    - temperature == 1 : aucun effet (identité)

    Args:
        proba: array (n_samples, n_classes) de probabilités, somme=1 par ligne
        temperature: scalaire > 0

    Returns:
        array de même forme, probabilités recalibrées, somme=1 par ligne
    """
    if temperature <= 0:
        raise ValueError(f"temperature doit être > 0, reçu {temperature}")

    log_p = np.log(np.clip(proba, EPS, 1.0))
    scaled = log_p / temperature
    exp_scaled = np.exp(scaled - scaled.max(axis=-1, keepdims=True))
    return exp_scaled / exp_scaled.sum(axis=-1, keepdims=True)

"""
Kelly Criterion — Gestion de risque et recommandation de mise.
Module pour FasoBet : mise responsable basée sur la valeur mathématique.
"""

from __future__ import annotations


def kelly_fraction(
    prob_model: float,
    odds_decimal: float,
    kelly_multiplier: float = 0.25,
) -> float:
    """
    Calcule la fraction Kelly fractionnaire (1/4 Kelly par défaut).

    prob_model  : probabilité estimée par le modèle (ex: 0.54)
    odds_decimal: cote décimale du bookmaker (ex: 2.10)
    kelly_multiplier : fraction du Kelly complet (0.25 = 1/4 Kelly, conservateur)

    Retourne : fraction du bankroll à miser (0.0 à 1.0)
    """
    b = odds_decimal - 1  # gain net pour 1 unité mise
    p = prob_model
    q = 1 - p

    if b <= 0:
        return 0.0

    f_full = (b * p - q) / b

    # Si edge négatif ou nul → ne pas miser
    if f_full <= 0:
        return 0.0

    f_fractional = f_full * kelly_multiplier

    # CAP DE SÉCURITÉ : jamais plus de 5% du bankroll sur un seul pari
    return min(f_fractional, 0.05)


def stake_recommendation(
    prob_model: float,
    odds_decimal: float,
    bankroll: float,
    currency: str = "FCFA",
) -> dict:
    """
    Retourne une recommandation de mise complète avec avertissements.
    """
    b = odds_decimal - 1
    implied_prob = round(1.0 / odds_decimal, 4) if odds_decimal > 0 else 0.0
    edge = round(prob_model - implied_prob, 4)
    kelly_full = round((b * prob_model - (1 - prob_model)) / b, 4) if b > 0 else 0.0

    fraction = kelly_fraction(prob_model, odds_decimal)
    stake = round(bankroll * fraction, 0)

    MIN_STAKE = 100  # FCFA

    if stake < MIN_STAKE:
        return {
            "recommended_stake": 0,
            "fraction_bankroll": 0,
            "edge": edge,
            "implied_prob": implied_prob,
            "kelly_full": kelly_full,
            "reason": "Edge insuffisant ou bankroll trop faible",
        }

    return {
        "recommended_stake": int(stake),
        "fraction_bankroll": round(fraction * 100, 2),
        "edge": edge,
        "implied_prob": implied_prob,
        "kelly_full": kelly_full,
        "currency": currency,
        "kelly_type": "1/4 Kelly (conservateur)",
        "warning": (
            "Ne jamais miser plus que vous ne pouvez perdre. "
            "Cette recommandation est mathématique, pas une garantie."
        ),
        "max_drawdown_note": (
            "À 1/4 Kelly, le risque de ruine est "
            "très faible mais non nul sur le long terme."
        ),
    }

"""FasoBet - Poisson distribution math (BLOC 2)
Équivalent Python de src/lib/poisson.ts

Calcule les probabilités de score à partir des lambdas (xG attendus).
Méthode : Distribution de Poisson pour modéliser les buts marqués.
"""

from __future__ import annotations

import math

# Nombre maximum de buts simulés (au-delà, probabilité négligeable)
MAX_GOALS = 10


def poisson_pmf(k: int, lam: float) -> float:
    """Probabilité d'exactement k buts avec une moyenne lam (xG)."""
    return (math.e ** -lam) * (lam ** k) / math.factorial(k)


def compute_lambdas(
    home_xg_att: float,
    home_xg_def: float,
    away_xg_att: float,
    away_xg_def: float,
    league_avg_goals: float = 2.5,
) -> tuple[float, float]:
    """Calcule les lambdas pour les équipes à domicile et à l'extérieur.
    
    Args:
        home_xg_att: xG offensif domicile
        home_xg_def: xG défensif domicile
        away_xg_att: xG offensif extérieur
        away_xg_def: xG défensif extérieur
        league_avg_goals: Moyenne de buts de la ligue (défaut 2.5)
    
    Returns:
        Tuple (lambda_home, lambda_away)
    """
    # Force offensive et défensive normalisées par la moyenne de la ligue
    home_attack = home_xg_att / league_avg_goals if league_avg_goals > 0 else 1.0
    home_defense = home_xg_def / league_avg_goals if league_avg_goals > 0 else 1.0
    away_attack = away_xg_att / league_avg_goals if league_avg_goals > 0 else 1.0
    away_defense = away_xg_def / league_avg_goals if league_avg_goals > 0 else 1.0

    lambda_home = home_attack * away_defense * (league_avg_goals / 2)
    lambda_away = away_attack * home_defense * (league_avg_goals / 2)

    return max(0.1, lambda_home), max(0.1, lambda_away)


def prob_1x2(lambda_home: float, lambda_away: float) -> dict[str, float]:
    """Calcule les probabilités 1X2 via somme de Poisson.
    
    Returns:
        dict avec clés: "home", "draw", "away"
    """
    prob_home = 0.0
    prob_draw = 0.0
    prob_away = 0.0

    for i in range(MAX_GOALS):
        for j in range(MAX_GOALS):
            p = poisson_pmf(i, lambda_home) * poisson_pmf(j, lambda_away)
            if i > j:
                prob_home += p
            elif i == j:
                prob_draw += p
            else:
                prob_away += p

    total = prob_home + prob_draw + prob_away
    if total > 0:
        prob_home /= total
        prob_draw /= total
        prob_away /= total

    return {"home": prob_home, "draw": prob_draw, "away": prob_away}


def prob_over_25(lambda_home: float, lambda_away: float) -> float:
    """Probabilité que le total de buts dépasse 2.5."""
    prob = 0.0
    for i in range(MAX_GOALS):
        for j in range(MAX_GOALS):
            if i + j > 2:
                prob += poisson_pmf(i, lambda_home) * poisson_pmf(j, lambda_away)
    return min(1.0, prob)


def prob_btts(lambda_home: float, lambda_away: float) -> float:
    """Probabilité que les deux équipes marquent (Both Teams To Score)."""
    prob = 0.0
    for i in range(MAX_GOALS):
        for j in range(MAX_GOALS):
            if i > 0 and j > 0:
                prob += poisson_pmf(i, lambda_home) * poisson_pmf(j, lambda_away)
    return min(1.0, prob)

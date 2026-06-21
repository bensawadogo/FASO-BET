"""FasoBet - Poisson distribution math (BLOC 2)
SOURCE DE VÉRITÉ pour les calculs de distribution de Poisson.
La version TypeScript (src/lib/poisson.ts) est un miroir et doit rester alignée.
"""

from __future__ import annotations

import math

# Nombre maximum de buts simulés (au-delà, probabilité négligeable)
MAX_GOALS = 10


def poisson_pmf(k: int, lam: float) -> float:
    """Probabilité d'exactement k buts avec une moyenne lam (xG)."""
    return math.exp(-lam) * (lam ** k) / math.factorial(k)


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

def compute_over_under(lambda_home: float, lambda_away: float,
                        threshold: float) -> dict:
    """Retourne P(total buts > threshold) et P(total buts < threshold)."""
    max_goals = 10
    p_over = 0.0
    for h in range(max_goals):
        for a in range(max_goals):
            if h + a > threshold:
                p_over += (poisson_pmf(h, lambda_home) *
                          poisson_pmf(a, lambda_away))
    return {
        "over": round(p_over, 4),
        "under": round(1 - p_over, 4)
    }

def compute_double_chance(prob_home: float, prob_draw: float,
                           prob_away: float) -> dict:
    """Double chance derive directement du 1X2."""
    return {
        "1X": round(prob_home + prob_draw, 4),
        "12": round(prob_home + prob_away, 4),
        "X2": round(prob_draw + prob_away, 4)
    }

def compute_draw_no_bet(prob_home: float, prob_away: float) -> dict:
    """Renormalise HOME/AWAY sans le DRAW."""
    total = prob_home + prob_away
    if total == 0:
        return {"home": 0.5, "away": 0.5}
    return {
        "home": round(prob_home / total, 4),
        "away": round(prob_away / total, 4)
    }

def compute_top_scores(lambda_home: float, lambda_away: float,
                        top_n: int = 3) -> list:
    """Retourne les top_n scores exacts les plus probables."""
    max_goals = 6
    scores = []
    for h in range(max_goals):
        for a in range(max_goals):
            p = (poisson_pmf(h, lambda_home) *
                 poisson_pmf(a, lambda_away))
            scores.append({"score": f"{h}-{a}", "probability": round(p, 4)})
    scores.sort(key=lambda x: x["probability"], reverse=True)
    return scores[:top_n]


def compute_match_lambdas(elo_home, elo_away, xg_home=0.0, xg_away=0.0,
                           form_home=0.5, form_away=0.5,
                           goals_for_home=None, goals_ag_home=None,
                           goals_for_away=None, goals_ag_away=None):
    """Calcule lambda_home et lambda_away avec priorite:
    1. xG reel (StatsBomb)
    2. fallback: form_factor + ELO (form_home+form_away module base_total)
    """
    avg_elo = (float(elo_home) + float(elo_away)) / 2.0
    base_total = 2.6 * (avg_elo / 1500.0)

    if xg_home and xg_home > 0 and xg_away and xg_away > 0:
        expected_total = float(xg_home) + float(xg_away)
    else:
        ff = float(form_home) + float(form_away)
        ff = max(0.5, min(ff, 2.0))
        expected_total = base_total * ff

    elo_diff = float(elo_home) - float(elo_away)
    home_strength = 10 ** (elo_diff / 400.0)
    total_ratio = home_strength + 1
    lambda_home = expected_total * home_strength / total_ratio
    lambda_away = expected_total * 1 / total_ratio
    lambda_home = max(0.3, min(lambda_home, 5.0))
    lambda_away = max(0.3, min(lambda_away, 5.0))
    return lambda_home, lambda_away

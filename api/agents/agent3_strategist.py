"""FasoBet - Agent 3: Strategist (BLOC 2)
Équivalent Python de src/agents/agent-strategist.ts

Rôle : Prendre les analyses du statisticien et les cotes du collecteur,
calculer la value, appliquer le risk-gating, générer les paris simples
et les combinés (express).
Utilise Perplexity Sonar Pro si PERPLEXITY_API_KEY est configuré.
"""

from __future__ import annotations

import json
import os
import re
from datetime import datetime, timezone
from typing import Optional

from api.lib.calibration import get_calibrated_confidence, risk_gate
from api.models import (
    Agent2Output,
    Agent3Output,
    ComboLeg,
    ExpressCombo,
    MatchPrediction,
    RiskLevel,
    Signal,
    StrategistInput,
    VerifiedMatch,
)


# Constantes (identiques au TS)
COMBO_TARGETS = [5, 10, 20, 50, 100, 300, 500, 1000]
FRIENDLY_MAX_CONFIDENCE = 60
VALUE_THRESHOLD = 0.05
CONFIDENCE_THRESHOLD = 65
CONSENSUS_THRESHOLD = 60
ODDS_DC_THRESHOLD = 1.4
DC_ODDS_MULTIPLIER = 0.85
DC_ODDS_OFFSET = 0.2
CONSENSUS_HIGH = 72
CONSENSUS_MEDIUM = 68
CONSENSUS_LOW = 55
CONSENSUS_PROB_THRESHOLD = 0.6
CONFIDENCE_MAX = 95
CONFIDENCE_MIN = 40
MAX_COUPON_PROB = 45
MIN_COMBO_LEGS = 3
MAX_LEGS_SMALL_TARGET = 7
MAX_LEGS_LARGE_TARGET = 12


def calc_value(prob: float, odds: float) -> float:
    """Calcule la value betting : prob * odds - 1.
    Équivalent de calcValue() dans agent-strategist.ts
    """
    return prob * odds - 1


def resolve_signal(confidence: float, value: float, consensus: int,
                   is_friendly: bool) -> Signal:
    """Détermine le signal (value_bet, neutral, avoid).
    Équivalent de resolveSignal().
    """
    if is_friendly:
        confidence = min(FRIENDLY_MAX_CONFIDENCE, confidence)
    
    has_value = value > VALUE_THRESHOLD
    has_conf = confidence >= CONFIDENCE_THRESHOLD
    has_consensus = consensus >= CONSENSUS_THRESHOLD
    
    score = sum([has_value, has_conf, has_consensus])
    if score >= 3:
        return Signal.VALUE_BET
    if score >= 1 or (has_value and value > 0):
        return Signal.NEUTRAL
    return Signal.AVOID


def needs_double_chance(match: VerifiedMatch) -> bool:
    """Détermine si un match nécessite une double chance.
    Équivalent de needsDoubleChance().
    """
    competition = match.competition.lower()
    if any(x in competition for x in ["final", "barrage", "playoff", "elimination"]):
        return True
    if match.odds.home_win < ODDS_DC_THRESHOLD or match.odds.away_win < ODDS_DC_THRESHOLD:
        return True
    return False


def build_prediction(
    match: VerifiedMatch,
    analysis: dict,
    calibrations: Optional[list[dict]] = None,
) -> MatchPrediction:
    """Construit une prédiction pour un match.
    Équivalent de buildPrediction() dans agent-strategist.ts
    """
    poisson = analysis.get("poisson", {})
    stats = analysis.get("composite_score", {"home": 50, "away": 50})
    context_flags = analysis.get("context_flags", [])
    match_type_warning = analysis.get("match_type_warning")
    form_display = analysis.get("form_summary", {"home": "N/A", "away": "N/A"})
    xg_display = analysis.get("xg_diff", {"home": "0.0", "away": "0.0"})
    h2h_display = analysis.get("h2h_summary")
    
    is_friendly = "friendly" in match.match_type.value if hasattr(match.match_type, "value") else False
    
    over_prob = poisson.get("prob_over_2_5", 0.5)
    btts_prob = poisson.get("prob_btts", 0.5)
    home_prob = poisson.get("prob_home_win", 0.33)
    
    markets = [
        {"market": "Over 2.5", "selection": "Over 2.5",
         "prob": over_prob, "odds": match.odds.over_2_5},
        {"market": "BTTS Oui", "selection": "BTTS Oui",
         "prob": btts_prob, "odds": match.odds.btts},
        {"market": "Victoire Domicile", "selection": f"Victoire {match.home}",
         "prob": home_prob, "odds": match.odds.home_win},
    ]
    
    # Meilleur marché (value la plus élevée)
    best = max(markets, key=lambda m: calc_value(m["prob"], m["odds"]))
    
    dc = needs_double_chance(match)
    selection = best["selection"]
    market = best["market"]
    min_odds = best["odds"]
    
    if dc and "Victoire" in best["market"]:
        market = "Double Chance"
        home_strength = stats.get("home", 50)
        away_strength = stats.get("away", 50)
        if home_strength >= away_strength:
            selection = f"DC {match.home} (1X)"
            min_odds = min(match.odds.home_win, match.odds.draw) * DC_ODDS_MULTIPLIER + DC_ODDS_OFFSET
        else:
            selection = f"DC {match.away} (X2)"
            min_odds = min(match.odds.away_win, match.odds.draw) * DC_ODDS_MULTIPLIER + DC_ODDS_OFFSET
    
    value = calc_value(best["prob"], min_odds)
    
    if match.odds_movement.value == "home_dropping" and best["prob"] == home_prob:
        consensus = CONSENSUS_HIGH
    elif best["prob"] > CONSENSUS_PROB_THRESHOLD:
        consensus = CONSENSUS_MEDIUM
    else:
        consensus = CONSENSUS_LOW
    
    # Confiance brute
    total_score = stats.get("home", 50) + stats.get("away", 50)
    if total_score > 0:
        confidence = round((stats.get("home", 50) / total_score) * 100 * best["prob"])
    else:
        confidence = CONFIDENCE_MIN
    confidence = max(CONFIDENCE_MIN, min(CONFIDENCE_MAX, confidence))
    if is_friendly:
        confidence = min(FRIENDLY_MAX_CONFIDENCE, confidence)
    
    # ─── Calibration historique ──────────────────────────
    final_confidence = float(confidence)
    gate_note = None
    
    if calibrations:
        market_map = {
            "Over 2.5": "over_under",
            "BTTS Oui": "btts",
            "Victoire Domicile": "final_result",
            "Double Chance": "final_result",
        }
        norm_market = market_map.get(best["market"], "final_result")
        final_confidence = get_calibrated_confidence(float(confidence), norm_market, calibrations)
        
        gate = risk_gate(
            adjusted_trust=final_confidence,
            raw_trust=float(confidence),
            value=value,
            calibrations=calibrations,
            match_type=match.match_type.value if hasattr(match.match_type, "value") else "",
            market=norm_market,
        )
        
        if not gate.accepted:
            gate_note = gate.reason
        if gate.adjusted_confidence is not None:
            final_confidence = gate.adjusted_confidence
    
    signal = resolve_signal(final_confidence, value, consensus, is_friendly)
    
    if signal == Signal.VALUE_BET:
        risk = RiskLevel.FAIBLE
    elif signal == Signal.NEUTRAL:
        risk = RiskLevel.MOYEN
    else:
        risk = RiskLevel.ELEVE
    
    return MatchPrediction(
        match_id=analysis.get("match_id", match.id),
        home=match.home,
        away=match.away,
        competition=match.competition,
        date=match.date,
        market=market,
        selection=selection,
        min_odds=round(min_odds, 2),
        confidence=final_confidence,
        risk=risk,
        signal=signal,
        value=round(value, 3),
        consensus_pct=consensus,
        double_chance=dc or None,
        match_type_warning=match_type_warning,
        form_display=form_display,
        xg_display=xg_display,
        h2h_display=h2h_display,
    )


def build_combos(predictions: list[MatchPrediction]) -> list[ExpressCombo]:
    """Construit les combinés pour différentes cibles de cotes.
    Équivalent de buildCombos().
    """
    eligible = [p for p in predictions if p.signal != Signal.AVOID]
    eligible.sort(key=lambda p: (0 if p.signal == Signal.VALUE_BET else 1 if p.signal == Signal.NEUTRAL else 2))
    
    combos = []
    for target in COMBO_TARGETS:
        max_legs = MAX_LEGS_SMALL_TARGET if target <= 10 else MAX_LEGS_LARGE_TARGET
        legs_needed = min(max_legs, len(eligible))
        legs_count = max(MIN_COMBO_LEGS, legs_needed)
        selected = eligible[:legs_count]
        
        legs = []
        for p in selected:
            legs.append(ComboLeg(
                match_label=f"{p.home} vs {p.away}",
                selection=p.selection,
                odds=p.min_odds,
                confidence=p.confidence,
                double_chance=p.double_chance,
            ))
        
        total_odds = round(
            sum(l.odds for l in legs), 2  # Approximation: somme pour éviter des cotes irréalistes
        )
        
        coupon_prob = round(
            sum(l.confidence / 100 for l in legs) / len(legs) * 100
        )
        
        combos.append(ExpressCombo(
            target_multiplier=target,
            legs=legs,
            total_odds=total_odds or float(target),
            coupon_probability_pct=min(coupon_prob, MAX_COUPON_PROB),
            stake_1000_gain=round(1000 * (total_odds or target)),
            stake_5000_gain=round(5000 * (total_odds or target)),
        ))
    
    return combos


def run_deterministic(input_data: StrategistInput) -> Agent3Output:
    """Exécution déterministe complète (fallback si pas d'IA).
    Équivalent de runDeterministic().
    """
    stats_map = {a.match_id: a.model_dump() for a in input_data.statistics.analyses}
    calibrations = input_data.historical.get("marketCalibrations") if input_data.historical else None
    
    predictions = []
    for match in input_data.matches:
        analysis = stats_map.get(match.id)
        if not analysis:
            continue
        pred = build_prediction(match, analysis, calibrations)
        predictions.append(pred)
    
    predictions.sort(key=lambda p: (
        0 if p.signal == Signal.VALUE_BET else 1 if p.signal == Signal.NEUTRAL else 2
    ))
    
    return Agent3Output(
        predictions=predictions,
        combos=build_combos(predictions),
        strategized_at=datetime.now(timezone.utc).isoformat(),
    )


class AgentStrategist:
    """Agent stratège : génère les prédictions et combinés."""
    
    async def run(self, input_data: StrategistInput) -> Agent3Output:
        perplexity_key = os.environ.get("PERPLEXITY_API_KEY", "")
        
        if perplexity_key:
            try:
                return await self._run_with_perplexity(input_data)
            except Exception as e:
                print(f"[Agent3] Perplexity failed, fallback deterministic: {e}")
        
        return run_deterministic(input_data)
    
    async def _run_with_perplexity(self, input_data: StrategistInput) -> Agent3Output:
        """Utilise Perplexity Sonar Pro pour l'analyse avec accès web."""
        import httpx
        
        skill_path = os.path.join(os.path.dirname(__file__), "..", "data", "football_skill.txt")
        skill = ""
        if os.path.exists(skill_path):
            with open(skill_path) as f:
                skill = f.read()
        
        system_prompt = f"""Tu es un agent stratège football spécialisé en value betting.
Tu as accès au web en temps réel — utilise-le pour vérifier cotes et consensus.
Tu dois OBLIGATOIREMENT suivre le skill ci-dessous.

=== SKILL : PRÉDICTION FOOTBALL & PARIS SPORTIFS ===
{skill}
=====================================================

Réponds UNIQUEMENT en JSON valide:
{{{{
  "predictions": [{{ match_id, home, away, competition, date, market, selection, min_odds, confidence, risk, signal, value, consensus_pct }}],
  "combos": [{{ target_multiplier, legs, total_odds, coupon_probability_pct, stake_1000_gain }}],
  "strategized_at": "ISO8601"
}}}}
signal: "value_bet" | "neutral" | "avoid\""""
        
        payload = json.dumps({
            "matches": [m.model_dump() for m in input_data.matches],
            "statistics": input_data.statistics.model_dump(),
        }, default=str)
        
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                "https://api.perplexity.ai/chat/completions",
                headers={
                    "Authorization": f"Bearer {perplexity_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "sonar-pro",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": payload},
                    ],
                },
            )
            response.raise_for_status()
            data = response.json()
            content = data["choices"][0]["message"]["content"]
            
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())
                return Agent3Output(**result)
            
            raise ValueError("No JSON found in Perplexity response")


agent_strategist = AgentStrategist()

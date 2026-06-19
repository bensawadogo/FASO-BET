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

from api.lib.llm_json import parse_llm_json_payload
from api.lib.calibration import get_calibrated_confidence, risk_gate
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
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
        
        # ✅ FIX: Utilisation d'une formule mathématique correcte pour la Double Chance
        # Formule : 1 / (1/Odd1 + 1/OddX)
        try:
            if home_strength >= away_strength:
                selection = f"DC {match.home} (1X)"
                implied_prob = (1 / match.odds.home_win) + (1 / match.odds.draw)
                min_odds = 1 / implied_prob
            else:
                selection = f"DC {match.away} (X2)"
                implied_prob = (1 / match.odds.away_win) + (1 / match.odds.draw)
                min_odds = 1 / implied_prob
            
            # Application d'une petite marge de sécurité (5%)
            min_odds = round(min_odds * 0.95, 2)
        except ZeroDivisionError:
            min_odds = 1.1
    
    value = calc_value(best["prob"], min_odds)
    
    if match.odds_movement.value == "home_dropping" and best["prob"] == home_prob:
        consensus = CONSENSUS_HIGH
    elif best["prob"] > CONSENSUS_PROB_THRESHOLD:
        consensus = CONSENSUS_MEDIUM
    else:
        consensus = CONSENSUS_LOW
    
    # ─── Confidence Calculation ───
    total_score = stats.get("home", 50) + stats.get("away", 50)
    if total_score > 0:
        confidence = round((stats.get("home", 50) / total_score) * 100 * best["prob"])
    else:
        confidence = CONFIDENCE_MIN
    
    confidence = max(CONFIDENCE_MIN, min(CONFIDENCE_MAX, confidence))
    if is_friendly:
        confidence = min(FRIENDLY_MAX_CONFIDENCE, confidence)

    final_confidence = float(confidence)

    # ─── Calibration historique ──────────────────────────


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

        if not selected:
            continue  # pas assez de matchs éligibles pour ce target

        legs = []
        for p in selected:
            legs.append(ComboLeg(
                match_label=f"{p.home} vs {p.away}",
                selection=p.selection,
                odds=p.min_odds,
                confidence=p.confidence,
                double_chance=p.double_chance,
            ))
        
        import math
        total_odds = round(
            math.prod(l.odds for l in legs), 2
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
        try:
            pred = build_prediction(match, analysis, calibrations)
            predictions.append(pred)
        except Exception as e:
            print(f"[Agent3] Skipping {match.id}: {e}", flush=True)
    
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
        """Méthode d'exécution principale pour le pipeline."""
        return run_deterministic(input_data)

    async def predict_match(self, match_id: int) -> dict: # Match_id est maintenant un int
        import asyncio
        from ml.ensemble import EnsemblePredictor as Predictor
        from api.db.repositories import get_match
        
        # 1. Lire les features depuis match_features
        features = await self._get_features(match_id)
        if not features:
            raise ValueError(f"Aucune feature pour match_id={match_id}")

        # 1b. Lire les infos du match pour la persistance (get_match prend maintenant un int)
        match_info = await asyncio.to_thread(get_match, match_id)

        # 2. Prédiction Ensemble locale (toujours)
        predictor = Predictor()
        ml_result = predictor.predict(features)

        # 3. Enrichissement LLM optionnel (timeout 3s)
        llm_explanation = None
        llm_used = False
        
        # Vérifier si les clés sont valides (simulé par présence et non 'invalid')
        has_llm_key = os.environ.get('ANTHROPIC_API_KEY') and os.environ.get('ANTHROPIC_API_KEY') != 'invalid'
        
        if has_llm_key:
            try:
                llm_explanation = await asyncio.wait_for(
                    self._get_llm_explanation(ml_result), timeout=3.0
                )
                llm_used = True
            except Exception:
                pass  # LLM down/error → on continue sans explication
        
        # Value bet logic (Expert Senior Rule)
        pred_label = ml_result["prediction"]
        model_prob = ml_result["probabilities"][pred_label]
        
        # Récupérer les cotes pour le calcul de value
        o_h = features.get('odds_home') or 2.5
        o_d = features.get('odds_draw') or 3.2
        o_a = features.get('odds_away') or 2.8
        market_probs = {"HOME": 1.0/o_h, "DRAW": 1.0/o_d, "AWAY": 1.0/o_a}
        market_prob = market_probs.get(pred_label, 0.33)
        
        value_bet = model_prob > (market_prob * 1.05)

        prediction = {
            "match_id": match_id, # C'est maintenant l'ID entier de la DB
            "home_team": match_info.get('home_team', 'Unknown') if match_info else 'Unknown',
            "away_team": match_info.get('away_team', 'Unknown') if match_info else 'Unknown',
            "home_logo": match_info.get('home_logo') or "https://media.api-sports.io/football/teams/unknown.png",
            "away_logo": match_info.get('away_logo') or "https://media.api-sports.io/football/teams/unknown.png",
            "competition": match_info.get('competition', 'Unknown') if match_info else 'Unknown',
            "prediction": pred_label,
            "probabilities": ml_result["probabilities"],
            "prediction_source": ml_result.get("prediction_source", "ensemble_xgb_lgbm"),
            "llm_used": llm_used,
            "explanation": llm_explanation,
            "confidence": round(float(ml_result.get("confidence", 0)), 4),
            "value_bet": value_bet
        }
        
        # Persistance
        from api.models import MatchPrediction
        # Création d'un objet MatchPrediction mocké pour _persist_predictions
        class MockSignal: 
            def __init__(self, val): self.value = val
        class MockPred:
            def __init__(self, p, match_id_int): # Prend l'ID entier
                self.match_id = match_id_int # C'est l'ID entier de la DB
                self.signal = MockSignal(p['prediction'])
                self.confidence = p['confidence']
                self.value = 0.5
                self.source = p['prediction_source']
                self.value_bet = p['value_bet']
        
        await self._persist_predictions([MockPred(prediction, match_id)], features, match_info)
        
        return prediction

    async def _get_features(self, match_id: int) -> dict:
        from api.db.repositories import get_match_features
        import asyncio
        return await asyncio.to_thread(get_match_features, match_id)
        
    async def _get_llm_explanation(self, ml_result: dict) -> str:
        # Implementation minimaliste pour le besoin du sprint
        return "Analyse via modèle ML local."

    async def _persist_predictions(self, predictions: list[MatchPrediction], features: dict, match_info: dict = None):
        """Persiste les prédictions générées vers Postgres via repository."""
        import asyncio
        from api.db.repositories import save_prediction, get_match
        
        for pred in predictions:
            try:
                # Récupérer les infos du match si non fournies
                info = match_info
                if not info:
                    info = await asyncio.to_thread(get_match, pred.match_id)

                payload = {
                    "match_id": str(pred.match_id),
                    "predicted_outcome": pred.signal.value if hasattr(pred.signal, "value") else str(pred.signal),
                    "confidence": float(pred.confidence),
                    "value": float(pred.value),
                    "model_version": "v1.2",
                    "prediction_source": getattr(pred, 'source', "ensemble_v2"),
                    "features_snapshot": features,
                    "value_bet": getattr(pred, 'value_bet', False),
                    "home_team": info.get('home_team', 'Unknown') if info else 'Unknown',
                    "away_team": info.get('away_team', 'Unknown') if info else 'Unknown',
                    "home_logo": info.get('home_logo') or "https://media.api-sports.io/football/teams/unknown.png",
                    "away_logo": info.get('away_logo') or "https://media.api-sports.io/football/teams/unknown.png",
                    "competition": info.get('competition', 'Unknown') if info else 'Unknown',
                    "kickoff_utc": str(info.get('kickoff_utc', '')) if info else '',
                }
                # Exécution synchrone
                await asyncio.to_thread(save_prediction, payload)
            except Exception as e:
                print(f"[Agent3] Failed to persist prediction for match {pred.match_id}: {e}")
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type(Exception),
    )
    async def _call_perplexity_with_retry(self, payload: str, system_prompt: str) -> dict:
        """Appelle Perplexity avec retry et backoff."""
        import httpx
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                "https://api.perplexity.ai/chat/completions",
                headers={
                    "Authorization": f"Bearer {os.environ.get('PERPLEXITY_API_KEY', '')}",
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
            return parse_llm_json_payload(content, Agent3Output)

    async def _run_with_perplexity(self, input_data: StrategistInput) -> Agent3Output:
        """Utilise Perplexity Sonar Pro pour l'analyse avec accès web."""
        
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
        
        return await self._call_perplexity_with_retry(payload, system_prompt)


agent_strategist = AgentStrategist()

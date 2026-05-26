"""FasoBet - Calibration & Risk-Gating (BLOC 2)
Équivalent Python de src/lib/calibration.ts

Ajuste la confiance des prédictions en fonction des données historiques
et filtre les paris risqués via le risk-gating.
"""

from __future__ import annotations

from typing import Optional


class CalibrationBucket:
    """Un bucket de calibration : plage de confiance → confiance ajustée."""
    def __init__(self, market: str, trust_range: tuple[float, float],
                 adjusted_confidence: float, sample_count: int = 0,
                 total_profit: float = 0.0, roi: float = 0.0,
                 avg_value: float = 0.0):
        self.market = market
        self.trust_range = trust_range
        self.adjusted_confidence = adjusted_confidence
        self.sample_count = sample_count
        self.total_profit = total_profit
        self.roi = roi
        self.avg_value = avg_value


class RiskGateDecision:
    """Décision du risk-gate."""
    def __init__(self, accepted: bool, reason: str = "OK",
                 adjusted_confidence: Optional[float] = None):
        self.accepted = accepted
        self.reason = reason
        self.adjusted_confidence = adjusted_confidence


def get_calibrated_confidence(
    trust: float,
    market: str,
    calibrations: Optional[list[dict]] = None,
) -> float:
    """Ajuste la confiance brute en utilisant les buckets de calibration historiques.
    
    Args:
        trust: Confiance brute (0-100)
        market: Le marché (ex: "over_under", "btts", "final_result")
        calibrations: Liste de dictionnaires de calibration
    
    Returns:
        Confiance ajustée, ou la confiance brute si pas de calibration
    """
    if not calibrations:
        return trust
    
    # Filtrer par marché
    market_buckets = [c for c in calibrations if c.get("market") == market]
    if not market_buckets:
        return trust
    
    # Trouver le bucket correspondant
    for bucket in market_buckets:
        trust_start, trust_end = bucket.get("trust_range", (0, 0))
        if trust_start <= trust < trust_end:
            return bucket.get("adjusted_confidence", trust)
    
    return trust


def risk_gate(
    adjusted_trust: float,
    raw_trust: float,
    value: float,
    calibrations: Optional[list[dict]] = None,
    match_type: str = "",
    market: str = "",
) -> RiskGateDecision:
    """Applique le risk-gating : filtre les paris risqués.
    
    Args:
        adjusted_trust: Confiance après calibration
        raw_trust: Confiance brute
        value: Value betting (prob * odds - 1)
        calibrations: Données de calibration historiques
        match_type: Type de match (club_official, friendly, etc.)
        market: Le marché
    
    Returns:
        RiskGateDecision avec accepted=True/False et reason
    """
    # 1. Bloquer les matchs amicaux (trop de variance)
    if "friendly" in match_type:
        return RiskGateDecision(
            accepted=False,
            reason="Friendly match — high variance",
        )
    
    # 2. Pas de calibration → pas de pari
    if not calibrations:
        return RiskGateDecision(
            accepted=False,
            reason="No calibration data available",
        )
    
    # 3. Vérifier la taille de l'échantillon
    market_buckets = [c for c in calibrations if c.get("market") == market]
    total_samples = sum(c.get("sample_count", 0) for c in market_buckets)
    if total_samples < 20:
        return RiskGateDecision(
            accepted=False,
            reason=f"Insufficient calibration data ({total_samples} samples)",
        )
    
    # 4. Vérifier la calibration dans cette plage de confiance
    for bucket in market_buckets:
        trust_start, trust_end = bucket.get("trust_range", (0, 0))
        if trust_start <= raw_trust < trust_end:
            diff = abs(bucket.get("adjusted_confidence", 0) - trust_start)
            if diff > 15:  # Écart > 15% → calibration pauvre
                return RiskGateDecision(
                    accepted=False,
                    reason=f"Poor calibration in trust range {trust_start}-{trust_end} (diff={diff:.1f})",
                )
            break
    
    return RiskGateDecision(accepted=True, reason="OK")

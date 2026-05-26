/**
 * Types pour le module de calibration et risk-gating.
 * Utilisés par l'agent-strategist pour la décision finale.
 */

/** Bucket de confiance calibrée issu des données historiques */
export interface ConfidenceCalibrationBucket {
  minTrust: number;
  maxTrust: number;
  sampleSize: number;
  observedHitRate: number;
}

/** Décision du Risk Gate — accepte ou rejette une prédiction */
export interface RiskGateDecision {
  accepted: boolean;
  reasons: string[];
  adjustedConfidence?: number;
}

export interface ConfidenceCalibrationBucket {
  minTrust: number;
  maxTrust: number;
  sampleSize: number;
  observedHitRate: number;
}

export interface RiskGateDecision {
  accepted: boolean;
  reasons: string[];
  adjustedConfidence?: number;
}

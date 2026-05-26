import type {
  MarketCalibration,
  HistoricalContext,
} from "@/types/historical.types";
import type {
  RiskGateDecision,
  ConfidenceCalibrationBucket,
} from "@/types/prediction-performance.types";

/**
 * Construit des buckets de confiance calibrés à partir des MarketCalibrations historiques.
 * Fusionne par plage de trust (0-20, 20-40, 40-60, 60-80, 80-100).
 */
export function buildConfidenceBuckets(
  marketCalibrations: MarketCalibration[]
): ConfidenceCalibrationBucket[] {
  const raw: { minTrust: number; maxTrust: number; hits: number; total: number }[] = [];

  for (const mc of marketCalibrations) {
    if (mc.sampleCount < 50) continue; // filtre bruit

    // Déduire le bucket trust depuis le nom du bucket (ex: "1.5_to_2.0" → trust moyen)
    // Fallback: on utilise observedAccuracy comme proxy si pas de trust direct
    const trustRange = inferTrustRange(mc.bucket);
    if (!trustRange) continue;

    let bucket = raw.find(
      (b) => b.minTrust === trustRange.min && b.maxTrust === trustRange.max
    );
    if (!bucket) {
      bucket = { minTrust: trustRange.min, maxTrust: trustRange.max, hits: 0, total: 0 };
      raw.push(bucket);
    }
    // On considère "correct" = observedAccuracy * sampleCount
    bucket.hits += Math.round(mc.observedAccuracy * mc.sampleCount);
    bucket.total += mc.sampleCount;
  }

  return raw
    .filter((b) => b.total >= 100)
    .map((b) => ({
      minTrust: b.minTrust,
      maxTrust: b.maxTrust,
      sampleSize: b.total,
      observedHitRate: Math.round((b.hits / b.total) * 1000) / 1000,
    }))
    .sort((a, b) => a.minTrust - b.minTrust);
}

/**
 * Infer trust range from a calibration bucket name.
 * Exemples: "under_1.5" → trust 0-20, "1.5_to_2.0" → trust 20-40, etc.
 */
function inferTrustRange(
  bucket: string
): { min: number; max: number } | null {
  if (bucket.includes("under")) return { min: 0, max: 20 };
  if (bucket.includes("1.5_to_2.0") || bucket.includes("1.5")) return { min: 20, max: 40 };
  if (bucket.includes("2.0_to_3.0") || bucket.includes("2.0")) return { min: 40, max: 60 };
  if (bucket.includes("3.0_to_5.0") || bucket.includes("3.0")) return { min: 60, max: 80 };
  if (bucket.includes("over_5.0")) return { min: 80, max: 100 };
  return null;
}

/**
 * Calcule la précision observée pour un niveau de confiance donné.
 * Cherche le bucket correspondant, retourne la hitRate observée.
 */
export function getCalibratedConfidence(
  rawConfidence: number,
  market: string,
  calibrations: MarketCalibration[]
): number {
  // Filtrer les calibrations du marché concerné
  const marketCals = calibrations.filter((c) => c.market === market);
  if (marketCals.length === 0) return rawConfidence;

  // Pondérer par proximité de confiance
  let weightedSum = 0;
  let weightTotal = 0;

  for (const cal of marketCals) {
    if (cal.sampleCount < 50) continue;
    // Poids = proximité * log(sampleCount)
    const proximity = 1 / (1 + Math.abs(rawConfidence - cal.observedAccuracy * 100));
    const weight = proximity * Math.log10(cal.sampleCount + 1);
    weightedSum += cal.observedAccuracy * 100 * weight;
    weightTotal += weight;
  }

  if (weightTotal === 0) return rawConfidence;

  const calibrated = Math.round(weightedSum / weightTotal);
  return Math.max(10, Math.min(95, calibrated));
}

/**
 * Risk Gate Decision Engine.
 * Vérifie si une prédiction doit être acceptée/refusée selon les calibrations historiques.
 */
export function riskGate(
  confidence: number,
  rawConfidence: number,
  value: number,
  calibrations: MarketCalibration[],
  matchType: string,
  market: string
): RiskGateDecision {
  const reasons: string[] = [];

  // 1. Confidence drop trop important après calibration
  const confidenceDrop = rawConfidence - confidence;
  if (confidenceDrop > 20) {
    reasons.push(
      `Calibration écart: confiance ${rawConfidence}% → ${confidence}% (drop ${confidenceDrop}%)`
    );
  }

    // 2. Value positive mais confiance calibrée < 50
  if (value > 0 && confidence < 50) {
    reasons.push(
      `Valeur détectée mais confiance calibrée insuffisante (${confidence}%)`
    );
  }

  // 3. Friendly match → cap confidence
  if (matchType.includes("friendly") && confidence > 55) {
    reasons.push(`Match amical: confiance plafonnée à 55%`);
  }

  // 4. Vérifier si le marché a assez d'échantillons historiques
  const marketCal = calibrations.filter((c) => c.market === market);
  const totalSamples = marketCal.reduce((a, c) => a + c.sampleCount, 0);
  if (value > 0.1 && totalSamples < 200) {
    reasons.push(
      `Marché "${market}" peu documenté (${totalSamples} échantillons)`
    );
  }

  if (reasons.length >= 2) {
    return {
      accepted: false,
      reasons,
      adjustedConfidence: Math.min(confidence, 50),
    };
  }

  if (reasons.length === 1) {
    return {
      accepted: true,
      reasons,
      adjustedConfidence: Math.min(confidence, 70),
    };
  }

  return {
    accepted: true,
    reasons: ["Pass: tous les contrôles validés"],
  };
}

/**
 * Calcule la calibration complète pour un contexte historique.
 * Retourne les buckets + la date de mise à jour.
 */
export function buildCalibrationProfile(
  context: HistoricalContext
): ConfidenceCalibrationBucket[] {
  return buildConfidenceBuckets(context.marketCalibrations);
}

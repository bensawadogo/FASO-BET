import { describe, it, expect, beforeAll } from "vitest";
import {
  buildConfidenceBuckets,
  getCalibratedConfidence,
  riskGate,
  buildCalibrationProfile,
} from "./calibration";
import type { MarketCalibration, HistoricalContext } from "../types/historical.types";

const mockCalibrations: MarketCalibration[] = [
  { market: "over_under", bucket: "under_1.5", sampleCount: 500, observedAccuracy: 0.55 },
  { market: "over_under", bucket: "1.5_to_2.0", sampleCount: 800, observedAccuracy: 0.62 },
  { market: "over_under", bucket: "2.0_to_3.0", sampleCount: 1200, observedAccuracy: 0.71 },
  { market: "btts",       bucket: "2.0_to_3.0", sampleCount: 300,  observedAccuracy: 0.58 },
  { market: "final_result", bucket: "3.0_to_5.0", sampleCount: 90,   observedAccuracy: 0.65 },
];

const mockContext: HistoricalContext = {
  leaguePriors: [],
  marketCalibrations: mockCalibrations,
  progress: [],
  lastUpdated: "2024-01-01",
};

describe("buildConfidenceBuckets", () => {
  it("devrait construire des buckets à partir des calibrations", () => {
    const buckets = buildConfidenceBuckets(mockCalibrations);
    expect(buckets.length).toBeGreaterThanOrEqual(3);
    expect(buckets[0].minTrust).toBeLessThan(buckets[1].minTrust);
  });

  it("devrait filtrer les buckets avec sampleCount < 50", () => {
    const smallCal: MarketCalibration[] = [
      { market: "final_result", bucket: "3.0_to_5.0", sampleCount: 30, observedAccuracy: 0.8 },
    ];
    const buckets = buildConfidenceBuckets(smallCal);
    expect(buckets.length).toBe(0);
  });

  it("devrait retourner un tableau vide si aucune calibration", () => {
    const buckets = buildConfidenceBuckets([]);
    expect(buckets).toEqual([]);
  });
});

describe("getCalibratedConfidence", () => {
  it("devrait retourner la confiance brute si pas de calibrations", () => {
    const result = getCalibratedConfidence(70, "over_under", []);
    expect(result).toBe(70);
  });

  it("devrait retourner une confiance calibrée entre 10 et 95", () => {
    const result = getCalibratedConfidence(85, "over_under", mockCalibrations);
    expect(result).toBeGreaterThanOrEqual(10);
    expect(result).toBeLessThanOrEqual(95);
  });

  it("devrait être plus conservateur pour les confiances élevées avec peu de support", () => {
    const calibrated = getCalibratedConfidence(95, "over_under", mockCalibrations);
    // Les calibrations montrent ~62% → devrait être < 95%
    expect(calibrated).toBeLessThanOrEqual(85);
  });
});

describe("riskGate", () => {
  it("devrait rejeter si le drop de confiance > 20 et value > 0", () => {
    const decision = riskGate(45, 75, 0.15, mockCalibrations, "league", "over_under");
    expect(decision.accepted).toBe(false);
    expect(decision.reasons.length).toBeGreaterThanOrEqual(2);
  });

  it("devrait accepter si tous les contrôles passent", () => {
    const decision = riskGate(72, 75, 0.08, mockCalibrations, "league", "over_under");
    expect(decision.accepted).toBe(true);
  });

  it("devrait capter les matchs amicaux", () => {
    const decision = riskGate(70, 72, 0.05, mockCalibrations, "friendly", "over_under");
    expect(decision.reasons.some((r) => r.includes("amical"))).toBe(true);
  });

  it("devrait avertir si le marché a peu d'échantillons et value élevée", () => {
    const decision = riskGate(60, 55, 0.2, mockCalibrations, "league", "corner");
    expect(decision.reasons.some((r) => r.includes("peu documenté"))).toBe(true);
  });

  it("devrait retourner un adjustedConfidence réduit si 1 raison", () => {
    const decision = riskGate(70, 72, -0.1, mockCalibrations, "friendly", "over_under");
    if (decision.adjustedConfidence !== undefined) {
      expect(decision.adjustedConfidence).toBeLessThanOrEqual(70);
    }
  });
});

describe("buildCalibrationProfile", () => {
  it("devrait construire un profile complet depuis un contexte historique", () => {
    const profile = buildCalibrationProfile(mockContext);
    expect(profile.length).toBeGreaterThan(0);
    expect(profile[0]).toHaveProperty("minTrust");
    expect(profile[0]).toHaveProperty("maxTrust");
    expect(profile[0]).toHaveProperty("sampleSize");
    expect(profile[0]).toHaveProperty("observedHitRate");
  });
});

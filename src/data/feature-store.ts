import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { buildHistoricalContext } from "@/data/adapters/historical-adapter";
import type { HistoricalContext } from "@/types/historical.types";

const DATA_DIR = join(process.cwd(), "data");
const PROGRESS_FILE = join(DATA_DIR, "progress.csv");
const ALL_MATCHES_FILE = join(DATA_DIR, "allMatches.xlsx");

let cachedContext: HistoricalContext | null = null;

/**
 * Charge et construit le contexte historique depuis les fichiers data/.
 * Cache en mémoire pour éviter re-parsing à chaque run pipeline.
 * Refresh possible via forceRefresh=true.
 */
export async function getHistoricalContext(
  forceRefresh = false
): Promise<HistoricalContext | null> {
  if (cachedContext && !forceRefresh) return cachedContext;

  if (!existsSync(PROGRESS_FILE) || !existsSync(ALL_MATCHES_FILE)) {
    console.warn(
      "[FeatureStore] Fichiers data/ manquants :",
      PROGRESS_FILE,
      ALL_MATCHES_FILE
    );
    return null;
  }

  try {
    const progressRaw = readFileSync(PROGRESS_FILE, "utf-8");
    const allMatchesBuffer = readFileSync(ALL_MATCHES_FILE).buffer;

    cachedContext = buildHistoricalContext(progressRaw, allMatchesBuffer);
    console.log(
      `[FeatureStore] Contexte chargé : ${cachedContext.leaguePriors.length} ligues, ${cachedContext.marketCalibrations.length} calibrations, ${cachedContext.progress.length} points progression`
    );
    return cachedContext;
  } catch (e) {
    console.error("[FeatureStore] Erreur chargement contexte historique :", e);
    return null;
  }
}

/**
 * Invalide le cache pour forcer un rechargement au prochain appel.
 */
export function invalidateHistoricalCache(): void {
  cachedContext = null;
}

/**
 * Vérifie si les fichiers data sont disponibles.
 */
export function isHistoricalDataAvailable(): boolean {
  return existsSync(PROGRESS_FILE) && existsSync(ALL_MATCHES_FILE);
}
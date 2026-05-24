import * as XLSX from "xlsx";
import {
  ProgressRowSchema,
  HistoricalMatchSchema,
  type ProgressRow,
  type HistoricalMatch,
  type LeaguePrior,
  type MarketCalibration,
  type HistoricalContext,
} from "@/types/historical.types";

/**
 * Parse progress.csv (1666 lignes, 2021-05-19 → 2026-02-23)
 * Colonnes: Date, Bankers Counter, Bankers Percent, All matches counter, All matches percent
 */
export function parseProgressCSV(raw: string): ProgressRow[] {
  const lines = raw.trim().split("\n");
  // skip header
  const rows: ProgressRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length < 5) continue;
    rows.push(
      ProgressRowSchema.parse({
        date: cols[0].trim(),
        bankersCounter: Number(cols[1]),
        bankersPercent: Number(cols[2]),
        allMatchesCounter: Number(cols[3]),
        allMatchesPercent: Number(cols[4]),
      })
    );
  }
  return rows;
}

/**
 * Parse allMatches.xlsx → HistoricalMatch[] (204626 lignes)
 * 5 feuilles: Matches_2022..Matches_2026
 */
export function parseAllMatchesXLSX(
  buffer: ArrayBuffer
): HistoricalMatch[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const matches: HistoricalMatch[] = [];

  const sheetNames = workbook.SheetNames.filter((n) =>
    n.startsWith("Matches_")
  );

  for (const sheetName of sheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: null,
    });

    for (const row of json) {
      // Anomalies connues: trustFinalResult <0 ou >100 → clamp
      let trustFR = Number(row["Trust Final Result"] ?? null);
      if (!isNaN(trustFR)) {
        trustFR = Math.max(0, Math.min(100, trustFR));
      }

      matches.push(
        HistoricalMatchSchema.parse({
          date: String(row["Date"] ?? ""),
          time: String(row["Time"] ?? ""),
          league: String(row["League"] ?? ""),
          country: String(row["Country"] ?? ""),
          homeTeam: String(row["Home Team"] ?? ""),
          awayTeam: String(row["Away Team"] ?? ""),
          goalsHome: nullableNum(row["Goals Home"]),
          goalsAway: nullableNum(row["Goals Away"]),
          oddHome: nullableNum(row["Odd Home"]),
          oddDraw: nullableNum(row["Odd Draw"]),
          oddAway: nullableNum(row["Odd Away"]),
          bestTip: String(row["Best Tip"] ?? null) || null,
          bestTipTrust: nullableNum(row["Best Tip Trust"]),
          bestTipOdd: nullableNum(row["Best Tip Odd"]),
          underover: String(row["Underover"] ?? null) || null,
          trustUnderover: nullableNum(row["Trust Underover"]),
          oddUnderover: nullableNum(row["Odd Underover"]),
          finalResult: String(row["Final Result"] ?? null) || null,
          trustFinalResult: isNaN(trustFR) ? null : trustFR,
          oddFinalResult: nullableNum(row["Odd Final Result"]),
          correctScore: String(row["Correct Score"] ?? null) || null,
          halfTimeCorrectScore:
            String(row["Half Time Correct Score"] ?? null) || null,
          bothTeamsToScore:
            String(row["Both Teams to Score"] ?? null) || null,
          trustBTTS: nullableNum(row["Trust for Both Teams to Score"]),
          oddBTTS: nullableNum(row["Odd for Both Teams to Score"]),
        })
      );
    }
  }

  return matches;
}

function nullableNum(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

// ─── Feature Engineering ────────────────────────────────────

/**
 * Calcule les priors par ligue/pays.
 * ~58 ligues identifiées dans le dataset
 */
export function computeLeaguePriors(
  matches: HistoricalMatch[]
): LeaguePrior[] {
  const groups = new Map<
    string,
    {
      country: string;
      homeGoals: number[];
      awayGoals: number[];
      total: number;
      homeWins: number;
      draws: number;
      awayWins: number;
      over25: number;
      btts: number;
    }
  >();

  for (const m of matches) {
    if (m.goalsHome === null || m.goalsAway === null) continue;
    const key = `${m.country}::${m.league}`;
    if (!groups.has(key)) {
      groups.set(key, {
        country: m.country,
        homeGoals: [],
        awayGoals: [],
        total: 0,
        homeWins: 0,
        draws: 0,
        awayWins: 0,
        over25: 0,
        btts: 0,
      });
    }
    const g = groups.get(key)!;
    g.total++;
    g.homeGoals.push(m.goalsHome);
    g.awayGoals.push(m.goalsAway);
    if (m.goalsHome > m.goalsAway) g.homeWins++;
    else if (m.goalsHome === m.goalsAway) g.draws++;
    else g.awayWins++;
    if (m.goalsHome + m.goalsAway > 2) g.over25++;
    if (m.goalsHome > 0 && m.goalsAway > 0) g.btts++;
  }

  const priors: LeaguePrior[] = [];
  for (const [key, g] of Array.from(groups.entries())) {
    const [country, league] = key.split("::");
    const avgHome =
      g.homeGoals.reduce((a, b) => a + b, 0) / g.homeGoals.length;
    const avgAway =
      g.awayGoals.reduce((a, b) => a + b, 0) / g.awayGoals.length;
    priors.push({
      league,
      country,
      matchCount: g.total,
      homeWinRate: round(g.homeWins / g.total),
      drawRate: round(g.draws / g.total),
      awayWinRate: round(g.awayWins / g.total),
      avgGoalsHome: round(avgHome),
      avgGoalsAway: round(avgAway),
      over25Rate: round(g.over25 / g.total),
      bttsRate: round(g.btts / g.total),
    });
  }

  return priors.sort((a, b) => b.matchCount - a.matchCount);
}

/**
 * Calibre la confiance historique par marché et bucket de cote.
 * Utile pour agent-strategist: ajuster le signal selon la précision réelle.
 */
export function computeMarketCalibrations(
  matches: HistoricalMatch[]
): MarketCalibration[] {
  type BucketKey = string;
  const buckets = new Map<
    BucketKey,
    { correct: number; total: number }
  >();

  for (const m of matches) {
    // Market: "final_result"
    if (m.finalResult && m.oddFinalResult && m.trustFinalResult !== null) {
      const bucket = bucketKey("final_result", m.oddFinalResult);
      if (!buckets.has(bucket)) buckets.set(bucket, { correct: 0, total: 0 });
      const b = buckets.get(bucket)!;
      b.total++;
      // On considère "correct" si trust ≥ 50 (simplification)
      if (m.trustFinalResult >= 50) b.correct++;
    }

    // Market: "over_under"
    if (m.underover && m.oddUnderover && m.trustUnderover !== null) {
      const bucket = bucketKey("over_under", m.oddUnderover);
      if (!buckets.has(bucket)) buckets.set(bucket, { correct: 0, total: 0 });
      const b = buckets.get(bucket)!;
      b.total++;
      if (m.trustUnderover >= 50) b.correct++;
    }

    // Market: "btts"
    if (m.oddBTTS && m.trustBTTS !== null) {
      const bucket = bucketKey("btts", m.oddBTTS);
      if (!buckets.has(bucket)) buckets.set(bucket, { correct: 0, total: 0 });
      const b = buckets.get(bucket)!;
      b.total++;
      if (m.trustBTTS >= 50) b.correct++;
    }
  }

  const calibrations: MarketCalibration[] = [];
  for (const [key, b] of Array.from(buckets.entries())) {
    calibrations.push({
      market: key.split("::")[0],
      bucket: key.split("::")[1],
      observedAccuracy: round(b.correct / b.total),
      sampleCount: b.total,
    });
  }

  return calibrations.sort((a, b) => b.sampleCount - a.sampleCount);
}

function bucketKey(market: string, odd: number): string {
  if (odd < 1.5) return `${market}::under_1.5`;
  if (odd < 2.0) return `${market}::1.5_to_2.0`;
  if (odd < 3.0) return `${market}::2.0_to_3.0`;
  if (odd < 5.0) return `${market}::3.0_to_5.0`;
  return `${market}::over_5.0`;
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Construit le contexte historique complet.
 * Idéalement appelé au démarrage / refresh périodique.
 */
export function buildHistoricalContext(
  progressRaw: string,
  allMatchesBuffer: ArrayBuffer
): HistoricalContext {
  const progress = parseProgressCSV(progressRaw);
  const matches = parseAllMatchesXLSX(allMatchesBuffer);

  return {
    leaguePriors: computeLeaguePriors(matches),
    marketCalibrations: computeMarketCalibrations(matches),
    progress,
    lastUpdated: new Date().toISOString(),
  };
}
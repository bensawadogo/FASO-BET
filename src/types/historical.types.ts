import { z } from "zod";

export const ProgressRowSchema = z.object({
  date: z.string(),
  bankersCounter: z.number(),
  bankersPercent: z.number(),
  allMatchesCounter: z.number(),
  allMatchesPercent: z.number(),
});

export type ProgressRow = z.infer<typeof ProgressRowSchema>;

export const HistoricalMatchSchema = z.object({
  date: z.string(),
  time: z.string(),
  league: z.string(),
  country: z.string(),
  homeTeam: z.string(),
  awayTeam: z.string(),
  goalsHome: z.number().nullable(),
  goalsAway: z.number().nullable(),
  oddHome: z.number().nullable(),
  oddDraw: z.number().nullable(),
  oddAway: z.number().nullable(),
  bestTip: z.string().nullable(),
  bestTipTrust: z.number().nullable(),
  bestTipOdd: z.number().nullable(),
  underover: z.string().nullable(),
  trustUnderover: z.number().nullable(),
  oddUnderover: z.number().nullable(),
  finalResult: z.string().nullable(),
  trustFinalResult: z.number().nullable(),
  oddFinalResult: z.number().nullable(),
  correctScore: z.string().nullable(),
  halfTimeCorrectScore: z.string().nullable(),
  bothTeamsToScore: z.string().nullable(),
  trustBTTS: z.number().nullable(),
  oddBTTS: z.number().nullable(),
});

export type HistoricalMatch = z.infer<typeof HistoricalMatchSchema>;

export interface LeaguePrior {
  league: string;
  country: string;
  matchCount: number;
  homeWinRate: number;
  drawRate: number;
  awayWinRate: number;
  avgGoalsHome: number;
  avgGoalsAway: number;
  over25Rate: number;
  bttsRate: number;
}

export interface MarketCalibration {
  market: string;
  bucket: string;
  observedAccuracy: number;
  sampleCount: number;
}

export interface HistoricalContext {
  leaguePriors: LeaguePrior[];
  marketCalibrations: MarketCalibration[];
  progress: ProgressRow[];
  lastUpdated: string;
}

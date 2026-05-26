import { z } from "zod";

export const SignalSchema = z.enum(["value_bet", "neutral", "avoid"]);

export const MatchPredictionSchema = z.object({
  match_id: z.string(),
  home: z.string(),
  away: z.string(),
  competition: z.string(),
  date: z.string(),
  market: z.string(),
  selection: z.string(),
  min_odds: z.number(),
  confidence: z.number().min(0).max(100),
  risk: z.enum(["FAIBLE", "MOYEN", "ELEVE"]),
  signal: SignalSchema,
  value: z.number(),
  consensus_pct: z.number().min(0).max(100),
  double_chance: z.boolean().optional(),
  match_type_warning: z.string().nullable().optional(),
  form_display: z.object({ home: z.string(), away: z.string() }).optional(),
  xg_display: z.object({ home: z.string(), away: z.string() }).optional(),
  h2h_display: z.string().optional(),
});

export const ComboLegSchema = z.object({
  match_label: z.string(),
  selection: z.string(),
  odds: z.number(),
  confidence: z.number(),
  double_chance: z.boolean().optional(),
});

export const ExpressComboSchema = z.object({
  target_multiplier: z.number(),
  legs: z.array(ComboLegSchema),
  total_odds: z.number(),
  coupon_probability_pct: z.number(),
  stake_1000_gain: z.number().optional(),
  stake_5000_gain: z.number().optional(),
});

export const Agent3OutputSchema = z.object({
  predictions: z.array(MatchPredictionSchema),
  combos: z.array(ExpressComboSchema),
  strategized_at: z.string(),
});

export type Signal = z.infer<typeof SignalSchema>;
export type MatchPrediction = z.infer<typeof MatchPredictionSchema>;
export type ExpressCombo = z.infer<typeof ExpressComboSchema>;
export type Agent3Output = z.infer<typeof Agent3OutputSchema>;

export interface StrategistInput {
  matches: import("./match.types").VerifiedMatch[];
  statistics: import("./agent2.types").Agent2Output;
  historical?: import("./historical.types").HistoricalContext | null;
}

import { z } from "zod";
import type { VerifiedMatch } from "./match.types";

export const MatchOddsSchema = z.object({
  home_win: z.number().positive(),
  draw: z.number().positive(),
  away_win: z.number().positive(),
  over_2_5: z.number().positive(),
  btts: z.number().positive(),
});

export const VerifiedMatchSchema = z.object({
  id: z.string(),
  home: z.string(),
  away: z.string(),
  home_id: z.number().optional(),
  away_id: z.number().optional(),
  competition: z.string(),
  league_id: z.number().optional(),
  date: z.string(),
  match_type: z.enum([
    "club_official",
    "club_friendly",
    "national_official",
    "national_friendly",
  ]),
  is_verified: z.boolean(),
  odds: MatchOddsSchema,
  odds_source: z.string(),
  odds_movement: z.enum(["home_dropping", "away_dropping", "draw_rising", "stable"]),
});

export const Agent1OutputSchema = z.object({
  verified_matches: z.array(VerifiedMatchSchema),
  rejected_matches: z.array(
    z.object({
      id: z.string().optional(),
      home: z.string().optional(),
      away: z.string().optional(),
      reason: z.string(),
    })
  ),
  collection_timestamp: z.string(),
});

export type Agent1Output = z.infer<typeof Agent1OutputSchema>;

export interface CollectorOptions {
  date?: string;
  leagues?: number[];
}

export type { VerifiedMatch };

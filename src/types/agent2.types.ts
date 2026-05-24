import { z } from "zod";

export const MatchStatisticsSchema = z.object({
  match_id: z.string(),
  composite_score: z.object({
    home: z.number().min(0).max(100),
    away: z.number().min(0).max(100),
  }),
  poisson: z.object({
    lambda_home: z.number(),
    lambda_away: z.number(),
    prob_over_2_5: z.number().min(0).max(1),
    prob_btts: z.number().min(0).max(1),
    prob_home_win: z.number().min(0).max(1),
    prob_draw: z.number().min(0).max(1).optional(),
    prob_away_win: z.number().min(0).max(1).optional(),
  }),
  form_summary: z.object({
    home: z.string(),
    away: z.string(),
  }),
  xg_diff: z.object({
    home: z.string(),
    away: z.string(),
  }),
  context_flags: z.array(z.string()),
  match_type_warning: z.string().nullable(),
  h2h_summary: z.string().optional(),
});

export const Agent2OutputSchema = z.object({
  analyses: z.array(MatchStatisticsSchema),
  analyzed_at: z.string(),
});

export type MatchStatistics = z.infer<typeof MatchStatisticsSchema>;
export type Agent2Output = z.infer<typeof Agent2OutputSchema>;

export interface StatisticianOptions {
  matches: import("./match.types").VerifiedMatch[];
}

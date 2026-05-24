export type MatchType =
  | "club_official"
  | "club_friendly"
  | "national_official"
  | "national_friendly";

export type OddsMovement = "home_dropping" | "away_dropping" | "draw_rising" | "stable";

export interface MatchOdds {
  home_win: number;
  draw: number;
  away_win: number;
  over_2_5: number;
  btts: number;
}

export interface VerifiedMatch {
  id: string;
  home: string;
  away: string;
  home_id?: number;
  away_id?: number;
  competition: string;
  league_id?: number;
  date: string;
  match_type: MatchType;
  is_verified: boolean;
  odds: MatchOdds;
  odds_source: string;
  odds_movement: OddsMovement;
}

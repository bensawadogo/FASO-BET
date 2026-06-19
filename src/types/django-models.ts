export interface Match {
  id?: number | string;
  teamA?: string | number;
  teamB?: string | number;
  league?: string;
  date?: string;
  external_id?: string;
  status?: string;
  home_score?: number | null;
  away_score?: number | null;
}

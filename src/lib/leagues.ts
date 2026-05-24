export const LEAGUES = {
  ligue1: { id: 61, name: "Ligue 1", goalsPerMatch: 2.6, season: 2025 },
  premier: { id: 39, name: "Premier League", goalsPerMatch: 2.8, season: 2025 },
  laliga: { id: 140, name: "La Liga", goalsPerMatch: 2.6, season: 2025 },
  bundesliga: { id: 78, name: "Bundesliga", goalsPerMatch: 3.1, season: 2025 },
  seriea: { id: 135, name: "Serie A", goalsPerMatch: 2.5, season: 2025 },
  cl: { id: 2, name: "Champions League", goalsPerMatch: 2.9, season: 2025 },
  can: { id: 6, name: "CAN", goalsPerMatch: 2.3, season: 2025 },
} as const;

export const DEFAULT_LEAGUE_IDS = [61, 39, 140, 78, 135, 2];

export function getLeagueGoalsAverage(leagueId?: number): number {
  const entry = Object.values(LEAGUES).find((l) => l.id === leagueId);
  return entry?.goalsPerMatch ?? 2.6;
}

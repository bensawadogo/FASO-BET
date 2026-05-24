const BASE = "https://v3.football.api-sports.io";
const API_TIMEOUT = 15_000; // 15 secondes

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = API_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export interface ApiFixture {
  fixture: { id: number; date: string; status: { short: string } };
  league: { id: number; name: string; round?: string };
  teams: {
    home: { id: number; name: string };
    away: { id: number; name: string };
  };
  goals?: { home: number | null; away: number | null };
}

export interface TeamStatistics {
  form?: string;
  goals?: {
    for?: { average?: { total?: string } };
    against?: { average?: { total?: string } };
  };
}

export async function fetchFixtures(
  leagueId: number,
  date: string,
  season: number
): Promise<ApiFixture[]> {
  const key = process.env.FOOTBALL_API_KEY;
  if (!key) return [];

  const url = `${BASE}/fixtures?league=${leagueId}&date=${date}&season=${season}`;
  const res = await fetchWithTimeout(url, {
    headers: { "x-apisports-key": key },
  });
  if (!res.ok) throw new Error(`API-Football fixtures: ${res.status}`);
  const data = await res.json();
  return (data.response ?? []).filter(
    (f: ApiFixture) => !["FT", "AET", "PEN", "CANC", "ABD"].includes(f.fixture.status.short)
  );
}

export async function fetchTeamStatistics(
  teamId: number,
  leagueId: number,
  season: number
): Promise<TeamStatistics | null> {
  const key = process.env.FOOTBALL_API_KEY;
  if (!key) return null;

  const url = `${BASE}/teams/statistics?team=${teamId}&league=${leagueId}&season=${season}`;
  const res = await fetchWithTimeout(url, {
    headers: { "x-apisports-key": key },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.response ?? null;
}

export async function fetchH2H(team1: number, team2: number): Promise<ApiFixture[]> {
  const key = process.env.FOOTBALL_API_KEY;
  if (!key) return [];

  const url = `${BASE}/fixtures/headtohead?h2h=${team1}-${team2}&last=5`;
  const res = await fetchWithTimeout(url, {
    headers: { "x-apisports-key": key },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.response ?? [];
}

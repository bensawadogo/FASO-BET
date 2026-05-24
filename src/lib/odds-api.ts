const BASE = "https://api.the-odds-api.com/v4";
const API_TIMEOUT = 10_000; // 10 secondes

export interface OddsEvent {
  id: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  bookmakers?: Array<{
    key: string;
    title: string;
    markets: Array<{
      key: string;
      outcomes: Array<{ name: string; price: number }>;
    }>;
  }>;
}

const SPORT_KEYS: Record<string, string> = {
  "Ligue 1": "soccer_france_ligue_one",
  "Premier League": "soccer_epl",
  "La Liga": "soccer_spain_la_liga",
  "Bundesliga": "soccer_germany_bundesliga",
  "Serie A": "soccer_italy_serie_a",
  "Champions League": "soccer_uefa_champs_league",
};

export async function fetchOddsForSport(sportKey: string): Promise<OddsEvent[]> {
  const key = process.env.ODDS_API_KEY;
  if (!key) return [];

  const url = `${BASE}/sports/${sportKey}/odds?apiKey=${key}&regions=eu&markets=h2h,totals&oddsFormat=decimal`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return [];
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

export function sportKeyForLeague(leagueName: string): string | null {
  return SPORT_KEYS[leagueName] ?? null;
}

export function extractOddsFromEvent(event: OddsEvent): {
  home_win: number;
  draw: number;
  away_win: number;
  over_2_5: number;
  btts: number;
  source: string;
} | null {
  const bookmaker =
    event.bookmakers?.find((b) => b.key === "pinnacle") ??
    event.bookmakers?.[0];
  if (!bookmaker) return null;

  const h2h = bookmaker.markets.find((m) => m.key === "h2h");
  const totals = bookmaker.markets.find((m) => m.key === "totals");

  const home = event.home_team;
  const away = event.away_team;
  const homeOutcome = h2h?.outcomes.find((o) => o.name === home);
  const awayOutcome = h2h?.outcomes.find((o) => o.name === away);
  const drawOutcome = h2h?.outcomes.find((o) => o.name === "Draw");

  const over25 = totals?.outcomes.find((o) => o.name === "Over");

  if (!homeOutcome || !awayOutcome) return null;

  return {
    home_win: homeOutcome.price,
    draw: drawOutcome?.price ?? 3.2,
    away_win: awayOutcome.price,
    over_2_5: over25?.price ?? 1.85,
    btts: 1.9,
    source: bookmaker.title,
  };
}

export function matchOddsEvent(
  events: OddsEvent[],
  home: string,
  away: string
): OddsEvent | undefined {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ");
  const h = norm(home);
  const a = norm(away);
  return events.find(
    (e) =>
      (norm(e.home_team).includes(h) || h.includes(norm(e.home_team))) &&
      (norm(e.away_team).includes(a) || a.includes(norm(e.away_team)))
  );
}

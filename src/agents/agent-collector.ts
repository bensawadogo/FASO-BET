import {
  Agent1OutputSchema,
  type Agent1Output,
  type CollectorOptions,
} from "@/types/agent1.types";
import type { MatchType, OddsMovement, VerifiedMatch } from "@/types/match.types";
import { fetchFixtures, type ApiFixture } from "@/lib/football-api";
import {
  extractOddsFromEvent,
  fetchOddsForSport,
  matchOddsEvent,
  sportKeyForLeague,
} from "@/lib/odds-api";
import { DEFAULT_LEAGUE_IDS, LEAGUES } from "@/lib/leagues";

// Constantes
const SUSPICIOUS_ODDS = { min: 1.01, max: 50 };
const IMPLIED_MIN = 0.95;
const IMPLIED_MAX = 1.15;
const DEFAULT_HOME_WIN = 2.1;
const DEFAULT_DRAW = 3.3;
const DEFAULT_AWAY_WIN = 3.5;
const DEFAULT_OVER_2_5 = 1.85;
const DEFAULT_BTTS = 1.75;
const HOME_DROPPING_THRESHOLD = 1.65;
const AWAY_DROPPING_THRESHOLD = 2.8;
const MAX_FIXTURES_PER_LEAGUE = 8;

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

/*
 * LOGIC EXPLANATION:
 * This function categorizes matches based on the league round and name.
 * - Friendlies are split into 'national_friendly' or 'club_friendly'.
 * - Official matches are categorized as 'national_official' if related to national events.
 */
function detectMatchType(fixture: ApiFixture): MatchType {
  const round = (fixture.league.round ?? "").toLowerCase();
  const name = fixture.league.name.toLowerCase();
  if (round.includes("friendly") || name.includes("friendly")) {
    const isNationalFriendly = name.includes("nation") || round.includes("international");
    return isNationalFriendly ? "national_friendly" : "club_friendly";
  }
  if (
    name.includes("nation") ||
    name.includes("world cup") ||
    name.includes("euro") ||
    name.includes("can")
  ) {
    return "national_official";
  }
  return "club_official";
}

function isOddsSuspicious(odds: VerifiedMatch["odds"]): string | null {
  /*
   * LOGIC EXPLANATION:
   * This function checks if the provided odds are suspicious.
   * - It verifies if any odd is outside the predefined SUSPICIOUS_ODDS range.
   * - It checks the implied probability based on the odds of 1X2.
   */
  const vals = [
    odds.home_win,
    odds.draw,
    odds.away_win,
    odds.over_2_5,
    odds.btts,
  ];
  for (const v of vals) {
    if (v < SUSPICIOUS_ODDS.min || v > SUSPICIOUS_ODDS.max) {
      return `Cote anormale: ${v}`;
    }
  }
  const implied = 1 / odds.home_win + 1 / odds.draw + 1 / odds.away_win;
  if (implied < 0.95 || implied > 1.15) return "Marge bookmaker suspecte";
  return null;
}

function defaultOdds(): VerifiedMatch["odds"] {
  return {
    home_win: DEFAULT_HOME_WIN,
    draw: DEFAULT_DRAW,
    away_win: DEFAULT_AWAY_WIN,
    over_2_5: DEFAULT_OVER_2_5,
    btts: DEFAULT_BTTS,
  };
}

function detectOddsMovement(homeOdds: number): OddsMovement {
  if (homeOdds < HOME_DROPPING_THRESHOLD) return "home_dropping";
  if (homeOdds > AWAY_DROPPING_THRESHOLD) return "away_dropping";
  return "stable";
}

function fixtureToMatch(
  f: ApiFixture,
  oddsEvents: Awaited<ReturnType<typeof fetchOddsForSport>>
): { match?: VerifiedMatch; reject?: { home: string; away: string; reason: string } } {
  const home = f.teams.home.name;
  const away = f.teams.away.name;
  const leagueEntry = Object.values(LEAGUES).find((l) => l.id === f.league.id);
  const season = leagueEntry?.season ?? 2025;

  let odds = defaultOdds();
  let source = "Estimation";
  const sportKey = sportKeyForLeague(f.league.name);
  if (sportKey && oddsEvents.length) {
    const event = matchOddsEvent(oddsEvents, home, away);
    const extracted = event ? extractOddsFromEvent(event) : null;
    if (extracted) {
      odds = {
        home_win: extracted.home_win,
        draw: extracted.draw,
        away_win: extracted.away_win,
        over_2_5: extracted.over_2_5,
        btts: extracted.btts,
      };
      source = extracted.source;
    }
  }

  const suspicious = isOddsSuspicious(odds);
  if (suspicious) {
    return { reject: { home, away, reason: suspicious } };
  }

  const match: VerifiedMatch = {
    id: `match_${f.fixture.id}`,
    home,
    away,
    home_id: f.teams.home.id,
    away_id: f.teams.away.id,
    competition: f.league.name,
    league_id: f.league.id,
    date: f.fixture.date,
    match_type: detectMatchType(f),
    is_verified: true,
    odds,
    odds_source: source,
    odds_movement: detectOddsMovement(odds.home_win),
  };

  return { match };
}

/** Données démo si aucune clé API configurée */
function demoMatches(): VerifiedMatch[] {
  const d = new Date();
  d.setHours(20, 45, 0, 0);
  return [
    {
      id: "match_demo_001",
      home: "PSG",
      away: "Lyon",
      competition: "Ligue 1",
      league_id: 61,
      date: d.toISOString(),
      match_type: "club_official",
      is_verified: true,
      odds: {
        home_win: 1.85,
        draw: 3.4,
        away_win: 4.2,
        over_2_5: 1.75,
        btts: 1.9,
      },
      odds_source: "Pinnacle",
      odds_movement: "home_dropping",
    },
    {
      id: "match_demo_002",
      home: "Liverpool",
      away: "Arsenal",
      competition: "Premier League",
      league_id: 39,
      date: d.toISOString(),
      match_type: "club_official",
      is_verified: true,
      odds: {
        home_win: 2.2,
        draw: 3.5,
        away_win: 3.1,
        over_2_5: 1.72,
        btts: 1.65,
      },
      odds_source: "Pinnacle",
      odds_movement: "stable",
    },
    {
      id: "match_demo_003",
      home: "Real Madrid",
      away: "Barcelona",
      competition: "La Liga",
      league_id: 140,
      date: d.toISOString(),
      match_type: "club_official",
      is_verified: true,
      odds: {
        home_win: 2.05,
        draw: 3.6,
        away_win: 3.4,
        over_2_5: 1.68,
        btts: 1.55,
      },
      odds_source: "Pinnacle",
      odds_movement: "stable",
    },
  ];
}

export const agentCollector = {
  async run(options: CollectorOptions = {}): Promise<Agent1Output> {
    const date = options.date ?? todayISO();
    const leagueIds = options.leagues?.length
      ? options.leagues
      : DEFAULT_LEAGUE_IDS;

    const hasFootballKey = Boolean(process.env.FOOTBALL_API_KEY);

    if (!hasFootballKey) {
      const output: Agent1Output = {
        verified_matches: demoMatches(),
        rejected_matches: [],
        collection_timestamp: new Date().toISOString(),
      };
      return Agent1OutputSchema.parse(output);
    }

    const verified: VerifiedMatch[] = [];
    const rejected: Agent1Output["rejected_matches"] = [];

    for (const leagueId of leagueIds) {
      const leagueEntry = Object.values(LEAGUES).find((l) => l.id === leagueId);
      const season = leagueEntry?.season ?? 2025;
      const leagueName = leagueEntry?.name ?? "Ligue 1";

      let fixtures: ApiFixture[] = [];
      try {
        fixtures = await fetchFixtures(leagueId, date, season);
      } catch (e) {
        console.error(`[Agent1] fixtures league ${leagueId}:`, e);
        continue;
      }

      const sportKey = sportKeyForLeague(leagueName);
      const oddsEvents = sportKey ? await fetchOddsForSport(sportKey) : [];

      for (const f of fixtures.slice(0, MAX_FIXTURES_PER_LEAGUE)) {
        const { match, reject } = fixtureToMatch(f, oddsEvents);
        if (reject) {
          rejected.push({
            home: reject.home,
            away: reject.away,
            reason: reject.reason,
          });
        } else if (match) {
          verified.push(match);
        }
      }
    }

    if (verified.length === 0) {
      verified.push(...demoMatches());
    }

    const output: Agent1Output = {
      verified_matches: verified,
      rejected_matches: rejected,
      collection_timestamp: new Date().toISOString(),
    };

    return Agent1OutputSchema.parse(output);
  },
};

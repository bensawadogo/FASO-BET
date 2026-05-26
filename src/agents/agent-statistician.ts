import {
  Agent2OutputSchema,
  type Agent2Output,
  type MatchStatistics,
  type StatisticianOptions,
} from "@/types/agent2.types";
import type { VerifiedMatch } from "@/types/match.types";
import type { HistoricalContext, LeaguePrior } from "@/types/historical.types";
import { callClaudeJSON, loadFootballSkill } from "@/lib/anthropic";
import { fetchH2H, fetchTeamStatistics } from "@/lib/football-api";
import { getLeagueGoalsAverage, LEAGUES } from "@/lib/leagues";
import {
  computeLambdas,
  prob1X2,
  probBTTS,
  probOver25,
} from "@/lib/poisson";

// Constantes
const MAX_FORM_MATCHES = 5;
const POINTS_PER_WIN = 3;
const POINTS_PER_DRAW = 1;
const MAX_FORM_POINTS = MAX_FORM_MATCHES * POINTS_PER_WIN; // = 15
const DEFAULT_FORM_SCORE = 50;
const DEFAULT_XG_ATT = 1.3;
const DEFAULT_XG_DEF = 1.2;
const XG_SCALE_FACTOR = 20;
const XG_BASELINE = 50;
const FRIENDLY_FORM_WEIGHT = 0.25;
const COMPETITIVE_FORM_WEIGHT = 0.4;
const XG_WEIGHT = 0.3;
const H2H_WEIGHT = 0.15;
const HOME_BIAS = 55;
const AWAY_BIAS = 45;

function formToScore(form: string | undefined): number {
  if (!form) return DEFAULT_FORM_SCORE;
  const chars = form.slice(-MAX_FORM_MATCHES).split("");
  let pts = 0;
  for (const c of chars) {
    if (c === "W") pts += POINTS_PER_WIN;
    else if (c === "D") pts += POINTS_PER_DRAW;
  }
  return Math.min(100, Math.round((pts / MAX_FORM_POINTS) * 100));
}

function parseXgFromStats(stats: Awaited<ReturnType<typeof fetchTeamStatistics>>): {
  att: number;
  def: number;
} {
  const gf = parseFloat(stats?.goals?.for?.average?.total ?? String(DEFAULT_XG_ATT));
  const ga = parseFloat(stats?.goals?.against?.average?.total ?? String(DEFAULT_XG_DEF));
  return { att: gf, def: ga };
}

function h2hSummary(h2h: Awaited<ReturnType<typeof fetchH2H>>, homeName: string): string {
  if (!h2h.length) return "Pas de H2H récent";
  let homeWins = 0;
  let draws = 0;
  for (const m of h2h) {
    const isHome = m.teams.home.name === homeName;
    const hg = m.goals?.home ?? 0;
    const ag = m.goals?.away ?? 0;
    const homeGoals = isHome ? hg : ag;
    const awayGoals = isHome ? ag : hg;
    if (homeGoals > awayGoals) homeWins++;
    else if (homeGoals === awayGoals) draws++;
  }
  return `${homeName} ${homeWins}V-${draws}N sur ${h2h.length} matchs`;
}

/** Trouve le prior historique pour une ligue donnée */
function findLeaguePrior(
  leagueName: string,
  country: string,
  priors: LeaguePrior[]
): LeaguePrior | null {
  return (
    priors.find(
      (p) =>
        p.league.toLowerCase().includes(leagueName.toLowerCase()) ||
        (p.country === country &&
          p.league.toLowerCase().includes(leagueName.toLowerCase()))
    ) ?? null
  );
}

async function analyzeMatchDeterministic(
  match: VerifiedMatch,
  historical?: HistoricalContext | null
): Promise<MatchStatistics> {
  const season =
    Object.values(LEAGUES).find((l) => l.id === match.league_id)?.season ?? 2025;

  const [homeStats, awayStats, h2h] = await Promise.all([
    match.home_id && match.league_id
      ? fetchTeamStatistics(match.home_id, match.league_id, season)
      : null,
    match.away_id && match.league_id
      ? fetchTeamStatistics(match.away_id, match.league_id, season)
      : null,
    match.home_id && match.away_id
      ? fetchH2H(match.home_id, match.away_id)
      : [],
  ]);

  const homeXg = parseXgFromStats(homeStats);
  const awayXg = parseXgFromStats(awayStats);
  const leagueAvg = getLeagueGoalsAverage(match.league_id);

  const { lambda_home, lambda_away } = computeLambdas(
    homeXg.att,
    homeXg.def,
    awayXg.att,
    awayXg.def,
    leagueAvg
  );

  const formHome = formToScore(homeStats?.form);
  const formAway = formToScore(awayStats?.form);
  const xgScoreHome = Math.min(100, Math.round(XG_BASELINE + (homeXg.att - awayXg.def) * XG_SCALE_FACTOR));
  const xgScoreAway = Math.min(100, Math.round(XG_BASELINE + (awayXg.att - homeXg.def) * XG_SCALE_FACTOR));
  const h2hScore = h2h.length ? formToScore("WWDLW") : DEFAULT_FORM_SCORE;

  const isFriendly = match.match_type.includes("friendly");
  const formWeight = isFriendly ? FRIENDLY_FORM_WEIGHT : COMPETITIVE_FORM_WEIGHT;
  const compositeHome = Math.round(
    formHome * formWeight +
      xgScoreHome * XG_WEIGHT +
      h2hScore * H2H_WEIGHT +
      HOME_BIAS * H2H_WEIGHT
  );
  const compositeAway = Math.round(
    formAway * formWeight +
      xgScoreAway * XG_WEIGHT +
      (100 - h2hScore) * H2H_WEIGHT +
      AWAY_BIAS * H2H_WEIGHT
  );

  const ix2 = prob1X2(lambda_home, lambda_away);

  const context_flags: string[] = [];
  if (isFriendly) context_flags.push("friendly_match");
  if (match.odds_movement === "home_dropping") context_flags.push("sharp_money_home");

  return {
    match_id: match.id,
    composite_score: { home: compositeHome, away: compositeAway },
    poisson: {
      lambda_home,
      lambda_away,
      prob_over_2_5: Math.round(probOver25(lambda_home, lambda_away) * 100) / 100,
      prob_btts: Math.round(probBTTS(lambda_home, lambda_away) * 100) / 100,
      prob_home_win: Math.round(ix2.home * 100) / 100,
      prob_draw: Math.round(ix2.draw * 100) / 100,
      prob_away_win: Math.round(ix2.away * 100) / 100,
    },
    form_summary: {
      home: homeStats?.form?.slice(-5) ?? "WDWWL",
      away: awayStats?.form?.slice(-5) ?? "LWDWL",
    },
    xg_diff: {
      home: `${homeXg.att - awayXg.def >= 0 ? "+" : ""}${(homeXg.att - awayXg.def).toFixed(1)}`,
      away: `${awayXg.att - homeXg.def >= 0 ? "+" : ""}${(awayXg.att - homeXg.def).toFixed(1)}`,
    },
    context_flags,
    match_type_warning: isFriendly
      ? "⚠️ MATCH AMICAL — confiance plafonnée 60%"
      : null,
    h2h_summary: h2hSummary(h2h, match.home),
  };
}

export const agentStatistician = {
  async run(options: StatisticianOptions): Promise<Agent2Output> {
    const skill = loadFootballSkill();
    const matches = options.matches;

    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const system = `Tu es un agent statisticien football spécialisé.
Tu dois OBLIGATOIREMENT suivre les directives du skill ci-dessous.
Ne jamais dévier de la méthodologie décrite.

=== SKILL : PRÉDICTION FOOTBALL & PARIS SPORTIFS ===
${skill}
=====================================================

Réponds UNIQUEMENT en JSON valide avec cette structure:
{
  "analyses": [ { "match_id", "composite_score", "poisson", "form_summary", "xg_diff", "context_flags", "match_type_warning", "h2h_summary" } ],
  "analyzed_at": "ISO8601"
}`;

        const raw = await callClaudeJSON<Agent2Output>(
          system,
          JSON.stringify({ matches })
        );
        return Agent2OutputSchema.parse(raw);
      } catch (e) {
        console.warn("[Agent2] Claude échoué, fallback déterministe:", e);
      }
    }

    const historical = options.historical ?? null;
    const analyses = await Promise.all(
      matches.map((m) => analyzeMatchDeterministic(m, historical))
    );

    const output: Agent2Output = {
      analyses,
      analyzed_at: new Date().toISOString(),
    };

    return Agent2OutputSchema.parse(output);
  },
};

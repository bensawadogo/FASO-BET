import {
  Agent3OutputSchema,
  type Agent3Output,
  type ExpressCombo,
  type MatchPrediction,
  type Signal,
  type StrategistInput,
} from "@/types/agent3.types";
import type { MatchStatistics } from "@/types/agent2.types";
import type { VerifiedMatch } from "@/types/match.types";
import type { HistoricalContext, MarketCalibration } from "@/types/historical.types";
import { callPerplexityJSON, loadFootballSkill } from "@/lib/perplexity";
import { getCalibratedConfidence, riskGate } from "@/lib/calibration";

const COMBO_TARGETS = [5, 10, 20, 50, 100, 300, 500, 1000];

// Constantes de décision
const FRIENDLY_MAX_CONFIDENCE = 60;
const VALUE_THRESHOLD = 0.05;
const CONFIDENCE_THRESHOLD = 65;
const CONSENSUS_THRESHOLD = 60;
const ODDS_DC_THRESHOLD = 1.4;
const DC_ODDS_MULTIPLIER = 0.85;
const DC_ODDS_OFFSET = 0.2;
const CONSENSUS_HIGH = 72;
const CONSENSUS_MEDIUM = 68;
const CONSENSUS_LOW = 55;
const CONSENSUS_PROB_THRESHOLD = 0.6;
const CONFIDENCE_MAX = 95;
const CONFIDENCE_MIN = 40;
const MAX_COUPON_PROB = 45;
const MIN_COMBO_LEGS = 3;
const MAX_LEGS_SMALL_TARGET = 7;
const MAX_LEGS_LARGE_TARGET = 12;

function calcValue(prob: number, odds: number): number {
  return prob * odds - 1;
}

function resolveSignal(
  confidence: number,
  value: number,
  consensus: number,
  isFriendly: boolean
): Signal {
  if (isFriendly && confidence > FRIENDLY_MAX_CONFIDENCE) confidence = FRIENDLY_MAX_CONFIDENCE;
  const hasValue = value > VALUE_THRESHOLD;
  const hasConf = confidence >= CONFIDENCE_THRESHOLD;
  const hasConsensus = consensus >= CONSENSUS_THRESHOLD;
  const score = [hasValue, hasConf, hasConsensus].filter(Boolean).length;
  if (score >= 3) return "value_bet";
  if (score >= 1 || (hasValue && value > 0)) return "neutral";
  return "avoid";
}

function needsDoubleChance(match: VerifiedMatch, stats: MatchStatistics): boolean {
  const round = match.competition.toLowerCase();
  if (
    round.includes("final") ||
    round.includes("barrage") ||
    round.includes("playoff") ||
    round.includes("elimination")
  ) {
    return true;
  }
  if (match.odds.home_win < ODDS_DC_THRESHOLD || match.odds.away_win < ODDS_DC_THRESHOLD) return true;
  return stats.context_flags.includes("high_stakes_match");
}

function buildPrediction(
  match: VerifiedMatch,
  stats: MatchStatistics,
  calibrations?: MarketCalibration[]
): MatchPrediction {
  const isFriendly = match.match_type.includes("friendly");
  const overProb = stats.poisson.prob_over_2_5;
  const bttsProb = stats.poisson.prob_btts;
  const homeProb = stats.poisson.prob_home_win;

  const markets = [
    {
      market: "Over 2.5",
      selection: "Over 2.5",
      prob: overProb,
      odds: match.odds.over_2_5,
    },
    {
      market: "BTTS Oui",
      selection: "BTTS Oui",
      prob: bttsProb,
      odds: match.odds.btts,
    },
    {
      market: "Victoire Domicile",
      selection: `Victoire ${match.home}`,
      prob: homeProb,
      odds: match.odds.home_win,
    },
  ];

  const best = markets.reduce((a, b) =>
    calcValue(b.prob, b.odds) > calcValue(a.prob, a.odds) ? b : a
  );

  const dc = needsDoubleChance(match, stats);
  let selection = best.selection;
  let market = best.market;
  let minOdds = best.odds;

  if (dc && best.market.includes("Victoire")) {
    market = "Double Chance";
    selection =
      stats.composite_score.home >= stats.composite_score.away
        ? `DC ${match.home} (1X)`
        : `DC ${match.away} (X2)`;
    minOdds =
      stats.composite_score.home >= stats.composite_score.away
        ? Math.min(match.odds.home_win, match.odds.draw) * DC_ODDS_MULTIPLIER + DC_ODDS_OFFSET
        : Math.min(match.odds.away_win, match.odds.draw) * DC_ODDS_MULTIPLIER + DC_ODDS_OFFSET;
  }

  const value = calcValue(best.prob, minOdds);
  const consensus =
    match.odds_movement === "home_dropping" && best.prob === homeProb
      ? CONSENSUS_HIGH
      : best.prob > CONSENSUS_PROB_THRESHOLD
        ? CONSENSUS_MEDIUM
        : CONSENSUS_LOW;

  let confidence = Math.round(
    (stats.composite_score.home / (stats.composite_score.home + stats.composite_score.away)) *
      100 *
      best.prob
  );
  confidence = Math.min(CONFIDENCE_MAX, Math.max(CONFIDENCE_MIN, confidence));
  if (isFriendly) confidence = Math.min(FRIENDLY_MAX_CONFIDENCE, confidence);

  // ─── Calibration historique ──────────────────────────────────
  let finalConfidence = confidence;
  let gateNote: string | undefined;

  if (calibrations && calibrations.length > 0) {
    const normalizedMarket = best.market === "Over 2.5" ? "over_under" : best.market === "BTTS Oui" ? "btts" : "final_result";
    finalConfidence = getCalibratedConfidence(confidence, normalizedMarket, calibrations);

    const gate = riskGate(
      finalConfidence,
      confidence,
      value,
      calibrations,
      match.match_type,
      normalizedMarket
    );

    if (!gate.accepted) {
      gateNote = gate.reasons.join("; ");
    }
    if (gate.adjustedConfidence !== undefined) {
      finalConfidence = gate.adjustedConfidence;
    }
  }

  const signal = resolveSignal(finalConfidence, value, consensus, isFriendly);
  const risk =
    signal === "value_bet" ? "FAIBLE" : signal === "neutral" ? "MOYEN" : "ELEVE";

  return {
    match_id: match.id,
    home: match.home,
    away: match.away,
    competition: match.competition,
    date: match.date,
    market,
    selection,
    min_odds: Math.round(minOdds * 100) / 100,
    confidence: finalConfidence,
    risk,
    signal,
    value: Math.round(value * 1000) / 1000,
    consensus_pct: consensus,
    double_chance: dc,
    match_type_warning: stats.match_type_warning,
    form_display: stats.form_summary,
    xg_display: stats.xg_diff,
    h2h_display: stats.h2h_summary,
  };
}

function buildCombos(predictions: MatchPrediction[]): ExpressCombo[] {
  const eligible = predictions
    .filter((p) => p.signal !== "avoid")
    .sort((a, b) => {
      const order = { value_bet: 0, neutral: 1, avoid: 2 };
      return order[a.signal] - order[b.signal];
    });

  return COMBO_TARGETS.map((target) => {
    const legsNeeded = target <= 10 ? Math.min(MAX_LEGS_SMALL_TARGET, eligible.length) : Math.min(MAX_LEGS_LARGE_TARGET, eligible.length);
    const legs = eligible.slice(0, Math.max(MIN_COMBO_LEGS, legsNeeded)).map((p) => ({
      match_label: `${p.home} vs ${p.away}`,
      selection: p.selection,
      odds: p.min_odds,
      confidence: p.confidence,
      double_chance: p.double_chance,
    }));

    const totalOdds =
      Math.round(legs.reduce((acc, l) => acc * l.odds, 1) * 100) / 100;
    const couponProb = Math.round(
      legs.reduce((acc, l) => acc * (l.confidence / 100), 1) * 100
    );

    return {
      target_multiplier: target,
      legs,
      total_odds: totalOdds || target,
      coupon_probability_pct: Math.min(couponProb, MAX_COUPON_PROB),
      stake_1000_gain: Math.round(1000 * (totalOdds || target)),
      stake_5000_gain: Math.round(5000 * (totalOdds || target)),
    };
  });
}

function runDeterministic(input: StrategistInput): Agent3Output {
  const statsMap = new Map(
    input.statistics.analyses.map((a) => [a.match_id, a])
  );
  const calibrations = input.historical?.marketCalibrations;

  const predictions = input.matches
    .map((m) => {
      const stats = statsMap.get(m.id);
      if (!stats) return null;
      return buildPrediction(m, stats, calibrations);
    })
    .filter((p): p is MatchPrediction => p !== null)
    .sort((a, b) => {
      const order = { value_bet: 0, neutral: 1, avoid: 2 };
      return order[a.signal] - order[b.signal];
    });

  return {
    predictions,
    combos: buildCombos(predictions),
    strategized_at: new Date().toISOString(),
  };
}

export const agentStrategist = {
  async run(input: StrategistInput): Promise<Agent3Output> {
    const skill = loadFootballSkill();

    if (process.env.PERPLEXITY_API_KEY) {
      try {
        const system = `Tu es un agent stratège football spécialisé en value betting.
Tu as accès au web en temps réel — utilise-le pour vérifier cotes et consensus (forebet, predictz, windrawwin).
Tu dois OBLIGATOIREMENT suivre le skill ci-dessous.

=== SKILL : PRÉDICTION FOOTBALL & PARIS SPORTIFS ===
${skill}
=====================================================

Réponds UNIQUEMENT en JSON valide:
{
  "predictions": [{ match_id, home, away, competition, date, market, selection, min_odds, confidence, risk, signal, value, consensus_pct, double_chance?, match_type_warning?, form_display?, xg_display?, h2h_display? }],
  "combos": [{ target_multiplier, legs, total_odds, coupon_probability_pct, stake_1000_gain?, stake_5000_gain? }],
  "strategized_at": "ISO8601"
}
signal: "value_bet" | "neutral" | "avoid"`;

        const raw = await callPerplexityJSON<Agent3Output>(
          system,
          JSON.stringify({
            matches: input.matches,
            statistics: input.statistics,
          })
        );
        return Agent3OutputSchema.parse(raw);
      } catch (e) {
        console.warn("[Agent3] Perplexity échoué, fallback déterministe:", e);
      }
    }

    const output = runDeterministic(input);
    return Agent3OutputSchema.parse(output);
  },
};

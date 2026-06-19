export interface ExpressComboLeg {
  match_label: string;
  selection: string;
  odds: number;
  confidence: number;
  double_chance?: boolean;
}

export interface ExpressCombo {
  target_multiplier: number;
  legs: ExpressComboLeg[];
  coupon_probability_pct: number;
  total_odds: number;
  stake_1000_gain: number | null;
  stake_5000_gain: number | null;
}

export interface MatchPrediction {
  match_id: string;
  home: string;
  away: string;
  competition: string;
  date: string;
  min_odds: number;
  confidence: number;
  value: number;
  risk: "FAIBLE" | "MOYEN" | "ELEVE";
  signal: "value_bet" | "neutral" | "avoid";
}

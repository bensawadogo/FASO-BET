/** P(k goals) = e^(-λ) × λ^k / k! */
export function poissonPMF(lambda: number, k: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / factorial(k);
}

function factorial(n: number): number {
  if (n <= 1) return 1;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

export function probAtLeastOneGoal(lambda: number): number {
  return 1 - poissonPMF(lambda, 0);
}

export function probOver25(lambdaHome: number, lambdaAway: number): number {
  const total = lambdaHome + lambdaAway;
  const p0 = poissonPMF(total, 0);
  const p1 = poissonPMF(total, 1);
  const p2 = poissonPMF(total, 2);
  return Math.max(0, Math.min(1, 1 - p0 - p1 - p2));
}

export function probBTTS(lambdaHome: number, lambdaAway: number): number {
  return probAtLeastOneGoal(lambdaHome) * probAtLeastOneGoal(lambdaAway);
}

/** Approximate 1X2 from independent Poisson scores (0-5 goals each). */
export function prob1X2(lambdaHome: number, lambdaAway: number) {
  let home = 0;
  let draw = 0;
  let away = 0;
  const max = 5;
  for (let h = 0; h <= max; h++) {
    for (let a = 0; a <= max; a++) {
      const p = poissonPMF(lambdaHome, h) * poissonPMF(lambdaAway, a);
      if (h > a) home += p;
      else if (h === a) draw += p;
      else away += p;
    }
  }
  const sum = home + draw + away || 1;
  return {
    home: home / sum,
    draw: draw / sum,
    away: away / sum,
  };
}

export function computeLambdas(
  xgHomeAtt: number,
  xgHomeDef: number,
  xgAwayAtt: number,
  xgAwayDef: number,
  leagueAvg: number
) {
  const divisor = leagueAvg > 0 ? leagueAvg : 1.0;
  const homeAttack = xgHomeAtt / divisor;
  const homeDefense = xgHomeDef / divisor;
  const awayAttack = xgAwayAtt / divisor;
  const awayDefense = xgAwayDef / divisor;

  const lambdaHome = homeAttack * awayDefense * (leagueAvg / 2);
  const lambdaAway = awayAttack * homeDefense * (leagueAvg / 2);

  return {
    lambda_home: Math.max(0.1, Math.round(lambdaHome * 100) / 100),
    lambda_away: Math.max(0.1, Math.round(lambdaAway * 100) / 100),
  };
}

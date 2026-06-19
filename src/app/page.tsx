"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import { Zap } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { ApiErrorBoundary } from "@/components/error-boundary";
import { CouponDrawer } from "@/components/CouponDrawer";
import { BottomNavBar } from "@/components/ui/BottomNavBar";
import { MatchCard } from "@/components/MatchCardV2";
import { couponStore } from "@/lib/coupon-store";
import { useTeamLogo } from "@/hooks/useTeamLogo";

type Step = "idle" | "loading" | "done" | "error";
type CategoryFilter = "all" | "football" | "high_confidence" | "caf" | "europe" | "ligue1bf";

const CATEGORIES: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "TOUS" },
  { value: "football", label: "FOOTBALL" },
  { value: "high_confidence", label: "HAUTE CONFIANCE" },
  { value: "ligue1bf", label: "LIGUE 1 BF" },
  { value: "caf", label: "CAF" },
  { value: "europe", label: "EUROPE" },
];

export default function HomePage() {
  const [step, setStep] = useState<Step>("idle");
  const [predictions, setPredictions] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [perf, setPerf] = useState<{ roi: number; win_rate: number } | null>(null);

  const clearCache = useCallback(async () => {
    try {
      console.log("DEBUG: Clearing cache...");
      const res = await fetch('/api/cache/clear', { method: 'POST' });
      const result = await res.json();
      console.log("DEBUG: Cache cleared:", result);
    } catch (err) {
      console.error("DEBUG: Error clearing cache:", err);
    }
    await fetchPredictions();
  }, []);

  const fetchPredictions = useCallback(async (): Promise<any[]> => {
    try {
      const response = await apiClient.getPredictions();
      const data = Array.isArray(response) ? response : [];

      const mapped = data.map((p: any, i: number) => {
        const predKey = String(p.prediction || p.predicted_outcome || "?").toUpperCase();
        const recMap: Record<string, string> = { HOME: "1", DRAW: "N", AWAY: "2" };
        const recBet = p.recommended_bet || p.selection || recMap[predKey] || "N";
        const predNormalized = recMap[predKey] || "N";
        const homeOdds = p.odds_home || p.odds?.home || 0.0;
        const drawOdds = p.odds_draw || p.odds?.draw || 0.0;
        const awayOdds = p.odds_away || p.odds?.away || 0.0;

        return {
          ...p,
          prediction: predNormalized,
          match_id: p.match_id || p.id || `match_${i}`,
          home_team: p.home_team || p.home || "",
          away_team: p.away_team || p.away || "",
          recommended_bet: recBet,
          min_odds:
            recBet === "1" ? homeOdds :
            recBet === "2" ? awayOdds :
            recBet === "N" ? drawOdds :
            Math.max(homeOdds, drawOdds, awayOdds) || 0.0,
          competition: p.competition || p.league || "Ligue",
          signal: p.signal || "neutral",
          confidence: p.confidence || p.confidence_score || 0.75,
          match_date: p.match_date || "2026-06-14",
        };
      });
      // Filter out finished matches (more than 2 hours past kickoff)
      const now = new Date()
      const filtered = mapped.filter(m => {
        const matchDate = new Date(m.match_date + (m.kickoff_utc?.includes('T') ? '' : 'T23:59:00Z'))
        const endTime = new Date(matchDate.getTime() + 2 * 60 * 60 * 1000)
        return endTime > now
      })
      setPredictions(filtered);
      return filtered;
    } catch (err) {
      console.error("DEBUG: Error in fetchPredictions:", err);
      setErrorMessage("Impossible de charger les prédictions.");
      return [];
    }
  }, []);

  const runPipeline = useCallback(async () => {
    if (step === "loading") return;
    setStep("loading");
    setErrorMessage("📊 Analyse en cours... résultats dans quelques secondes");

    try {
      setErrorMessage("📊 Analyse en cours...");

      await Promise.allSettled([
        fetch('/api/cache/clear', { method: 'POST' }).catch(() => {}),
        fetch('/api/fastapi/proxy/pipeline/run', {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }).catch(() => {}),
      ]);

      await new Promise(r => setTimeout(r, 2000));
      await fetch('/api/cache/clear', { method: 'POST' }).catch(() => {});
      const result = await fetchPredictions();

      if (!result || result.length === 0) {
        throw new Error("Aucune prédiction disponible — backends injoignables");
      }

      setStep("done");
      setErrorMessage("✅ Analyse terminée ! Nouvelles prédictions disponibles.");
      setTimeout(() => setErrorMessage(undefined), 5000);
    } catch (err: any) {
      console.error("DEBUG: Error in runPipeline:", err);
      setStep("done");
    }
  }, [step, fetchPredictions]);

  useEffect(() => {
    apiClient.getPerformance().then((res) => {
      if (res) setPerf({ roi: res.roi || 0, win_rate: res.win_rate || 0 });
    });
  }, []);

  const filtered = useMemo(() => {
    return predictions.filter((p: any) => {
      if (category === "all") return true;
      if (category === "ligue1bf") return p.competition?.toLowerCase().includes("burkina") || p.competition?.toLowerCase().includes("bf");
      if (category === "high_confidence") return (p.confidence_score || p.confidence || 0) >= 0.75;
      return true;
    });
  }, [predictions, category]);

  function MatchCardWithLogo({ p }: { p: any }) {
    const homeLogo = useTeamLogo(p.home_team);
    const awayLogo = useTeamLogo(p.away_team);

    const predKey = (p.prediction || "N").toUpperCase();
    const predOutcome: "home" | "draw" | "away" =
      predKey === "1" || predKey === "HOME" ? "home" :
      predKey === "2" || predKey === "AWAY" ? "away" : "draw";

    const mk = p.markets || {};
    const em = p.extended_markets || {};
    const secondaryMarkets: { label: string; lines: { outcomeLabel: string; probability: number; hasValueBet?: boolean }[] }[] = [];
    if (mk.btts_yes != null) secondaryMarkets.push({ label: "BTTS", lines: [{ outcomeLabel: "Oui", probability: Math.round(mk.btts_yes * 100) }, { outcomeLabel: "Non", probability: Math.round((1 - mk.btts_yes) * 100) }] });
    if (mk.over_2_5 != null) secondaryMarkets.push({ label: "O/U 2.5", lines: [{ outcomeLabel: "Over", probability: Math.round(mk.over_2_5 * 100) }, { outcomeLabel: "Under", probability: Math.round((1 - mk.over_2_5) * 100) }] });
    if (mk.double_chance_1x != null) secondaryMarkets.push({ label: "Double Chance", lines: [{ outcomeLabel: "1X", probability: Math.round(mk.double_chance_1x * 100), hasValueBet: mk.double_chance_1x >= 0.6 }, { outcomeLabel: "X2", probability: Math.round((em.double_chance?.X2 || 0) * 100) }] });
    if (em.over_under_1_5?.over != null) secondaryMarkets.push({ label: "O/U 1.5", lines: [{ outcomeLabel: "Over", probability: Math.round(em.over_under_1_5.over * 100) }, { outcomeLabel: "Under", probability: Math.round(em.over_under_1_5.under * 100) }] });
    if (em.draw_no_bet?.home != null) secondaryMarkets.push({ label: "Draw No Bet", lines: [{ outcomeLabel: "DNB1", probability: Math.round(em.draw_no_bet.home * 100) }, { outcomeLabel: "DNB2", probability: Math.round(em.draw_no_bet.away * 100) }] });
    if (em.over_under_3_5?.over != null) secondaryMarkets.push({ label: "O/U 3.5", lines: [{ outcomeLabel: "Over", probability: Math.round(em.over_under_3_5.over * 100) }, { outcomeLabel: "Under", probability: Math.round(em.over_under_3_5.under * 100) }] });

    const edge = p.stake_recommendation?.edge ?? 0;
    const stake = p.stake_recommendation;
    const matchId = String(p.match_id || p.id || "");
    const inCoupon = couponStore.get().some((m) => m.id === matchId);

    return (
      <MatchCard
        key={`${p.match_id}_${p.id}`}
        competition={p.competition || "Match"}
        date={p.match_date || "2026-06-18"}
        homeTeam={{
          name: p.home_team,
          odds: p.odds_home ?? 2.5,
          probability: Math.round((p.probabilities?.HOME ?? 0.33) * 100),
          flagUrl: homeLogo,
        }}
        draw={{
          odds: p.odds_draw ?? 3.2,
          probability: Math.round((p.probabilities?.DRAW ?? 0.34) * 100),
        }}
        awayTeam={{
          name: p.away_team,
          odds: p.odds_away ?? 2.8,
          probability: Math.round((p.probabilities?.AWAY ?? 0.33) * 100),
          flagUrl: awayLogo,
        }}
        predictedOutcome={predOutcome}
        edgePercent={edge * 100}
        kellyStakeFcfa={stake?.recommended_stake ?? 0}
        kellyFractionPercent={stake?.fraction_bankroll ?? 0}
        impliedProbabilityPercent={100}
        modelProbabilityPercent={Math.round((p.probabilities?.[predKey] ?? 0.33) * 100)}
        secondaryMarkets={secondaryMarkets}
        topScores={em.top_scores?.map((s: any) => ({ score: s.score, probability: s.probability * 100 }))}
        markets={mk}
        extendedMarkets={em}
        isSelectedForCoupon={inCoupon}
        onToggleCoupon={() => {
          if (inCoupon) {
            couponStore.remove(matchId);
          } else {
            const predOdds = predOutcome === "home" ? (p.odds_home ?? 2.5) : predOutcome === "away" ? (p.odds_away ?? 2.8) : (p.odds_draw ?? 3.2);
            couponStore.add({
              id: matchId,
              homeTeam: p.home_team,
              awayTeam: p.away_team,
              competition: p.competition,
              prediction: predKey,
              odds: predOdds,
            });
          }
        }}
      />
    );
  }

  return (
    <ApiErrorBoundary serviceName="dashboard-page">
      <div className="font-body-md antialiased pb-24 bg-surface-deep text-text-primary min-h-screen">
        <main className="max-w-md mx-auto">
          <nav className="py-stack-sm border-b border-outline-variant/50 sticky top-[var(--touch-target-min)] bg-surface-deep/80 backdrop-blur-md z-40">
            <div className="flex gap-2 px-margin-mobile overflow-x-auto no-scrollbar py-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`font-black text-[9px] uppercase px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                    category === cat.value ? "bg-ia-gold text-surface-deep shadow-lg shadow-ia-gold/20" : "bg-surface-raised border border-outline-variant text-text-secondary"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </nav>

          <div className="px-margin-mobile pt-8 pb-6 flex justify-between items-center">
            <div>
              <h2 className="font-headline-sm text-white leading-none mb-1">Analyses IA</h2>
              <p className="text-[10px] text-text-secondary uppercase font-bold tracking-widest">Matchs du Jour</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => runPipeline()}
                disabled={step === "loading"}
                className="flex items-center gap-2 bg-primary shadow-lg shadow-primary/20 text-surface-deep px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50"
              >
                <Zap className={`w-3.5 h-3.5 ${step === "loading" ? "animate-pulse" : ""}`} />
                {step === "loading" ? "SCAN..." : "LANCER IA"}
              </button>
              <button
                type="button"
                onClick={() => clearCache()}
                title="Vider le cache Upstash"
                className="bg-surface-raised border border-outline-variant text-text-secondary px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all hover:border-error hover:text-error"
              >
                🗑️
              </button>
            </div>
          </div>

          <div className="px-margin-mobile space-y-4">
            {filtered.length > 0 ? (
              filtered.map((p: any) => (
                <MatchCardWithLogo key={`${p.match_id}_${p.id}`} p={p} />
              ))
            ) : (
              <div className="text-center py-20 bg-surface-raised/30 rounded-3xl border border-dashed border-outline-variant mx-margin-mobile">
                <div className="text-text-secondary text-xs mb-6 font-bold uppercase tracking-widest opacity-50">Prêt pour l'analyse</div>
                <button 
                  onClick={() => runPipeline()} 
                  className="bg-surface-raised border border-outline-variant px-8 py-3 rounded-full text-xs font-black text-ia-gold hover:border-ia-gold transition-colors"
                >
                  DÉMARRER LE MOTEUR IA
                </button>
              </div>
            )}
          </div>
          
          {errorMessage && (
             <div className="mx-margin-mobile mt-6 p-4 bg-error/10 border border-error/20 rounded-xl text-error text-[10px] font-bold text-center uppercase tracking-widest">
               {errorMessage}
             </div>
          )}
        </main>
        
        <CouponDrawer />
        <BottomNavBar />
      </div>
    </ApiErrorBoundary>
  );
}

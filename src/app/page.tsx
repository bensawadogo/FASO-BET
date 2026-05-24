"use client";

import React, { useCallback, useMemo, useState } from "react";
import type { PipelineSuccess } from "@/agents/pipeline";
import type { MatchPrediction } from "@/types/agent3.types";
import { PipelineStatus } from "@/components/dashboard/PipelineStatus";
import { MatchCard, type MatchCardPrediction } from "@/components/dashboard/MatchCard";
import { ConnectedComboBuilder, useComboActions } from "@/components/dashboard/ComboBuilder";
import { HistoricalDashboard } from "@/components/dashboard/HistoricalDashboard";
import { SignalBadge } from "@/components/dashboard/SignalBadge";
import {
  DashboardLoading,
  DashboardError,
  DashboardEmpty,
  AgentTimeout,
  OfflineStatus,
} from "@/components/dashboard/DashboardStates";
import { X, Filter, SlidersHorizontal, ChevronDown } from "lucide-react";

type Step =
  | "idle"
  | "collector"
  | "statistician"
  | "strategist"
  | "done"
  | "error";

type SignalFilter = "all" | "value_bet" | "neutral" | "avoid";
type RiskFilter = "all" | "FAIBLE" | "MOYEN" | "ELEVE";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function DashboardPage() {
  const [step, setStep] = useState<Step>("idle");
  const [result, setResult] = useState<PipelineSuccess | null>(null);
  const [errorAgent, setErrorAgent] = useState<number>();
  const [errorMessage, setErrorMessage] = useState<string>();

  // ─── Filtres du Bloc 2 ──────────────────────────────────────
  const [signalFilter, setSignalFilter] = useState<SignalFilter>("all");
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");
  const [leagueFilter, setLeagueFilter] = useState<string>("all");
  const [edgeMin, setEdgeMin] = useState(0);
  const [edgeMax, setEdgeMax] = useState(30);
  const [showFilters, setShowFilters] = useState(true);

  const runPipeline = useCallback(async (refresh = false) => {
    setStep("collector");
    setErrorMessage(undefined);
    setResult(null);
    await sleep(50);

    try {
      setStep("statistician");
      await sleep(50);

      const res = await fetch(
        `/api/pipeline${refresh ? "?refresh=1" : ""}`,
        { method: "GET" }
      );
      setStep("strategist");
      await sleep(50);

      const data = await res.json();

      if (data.status === "error") {
        setStep("error");
        setErrorAgent(data.agent);
        setErrorMessage(data.message);
        return;
      }

      if (data.status === "no_matches") {
        setStep("error");
        setErrorMessage("Aucun match vérifié pour cette date.");
        return;
      }

      setResult(data as PipelineSuccess);
      setStep("done");
    } catch (e) {
      setStep("error");
      setErrorMessage(e instanceof Error ? e.message : "Erreur réseau");
    }
  }, []);

  const predictions = result?.predictions.predictions ?? [];
  const combos = result?.predictions.combos ?? [];

  // ─── Extraire les ligues uniques des prédictions ────────────
  const availableLeagues = useMemo(() => {
    const leagues = new Set<string>();
    predictions.forEach((p) => {
      if (p.competition) leagues.add(p.competition);
    });
    return Array.from(leagues).sort();
  }, [predictions]);

  // ─── Appliquer les filtres ──────────────────────────────────
  const filteredPredictions = useMemo(() => {
    return predictions.filter((p: MatchPrediction) => {
      // Filtre par signal
      if (signalFilter !== "all" && p.signal !== signalFilter) return false;
      // Filtre par risque
      if (riskFilter !== "all" && p.risk !== riskFilter) return false;
      // Filtre par ligue
      if (leagueFilter !== "all" && p.competition !== leagueFilter) return false;
      // Filtre par edge (value * 100)
      const edgePct = p.value * 100;
      if (edgePct < edgeMin || edgePct > edgeMax) return false;
      return true;
    });
  }, [predictions, signalFilter, riskFilter, leagueFilter, edgeMin, edgeMax]);

  // ─── Compter les filtres actifs ─────────────────────────────
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (signalFilter !== "all") count++;
    if (riskFilter !== "all") count++;
    if (leagueFilter !== "all") count++;
    if (edgeMin > 0 || edgeMax < 30) count++;
    return count;
  }, [signalFilter, riskFilter, leagueFilter, edgeMin, edgeMax]);

  // ─── Réinitialiser les filtres ──────────────────────────────
  const resetFilters = () => {
    setSignalFilter("all");
    setRiskFilter("all");
    setLeagueFilter("all");
    setEdgeMin(0);
    setEdgeMax(30);
  };

  // Build pipeline data for the new PipelineStatus component
  const pipelineData = {
    collector: {
      status: (step === "collector" ? "processing" : step === "done" ? "active" : "pending") as "active" | "processing" | "pending" | "error",
      latency: result ? `${((result.collected?.verified_matches?.length ?? 0) * 0.05).toFixed(0)}ms` : undefined,
      progress: step === "collector" ? 100 : step === "done" ? 100 : 0,
    },
    statistician: {
      status: (step === "statistician" ? "processing" : step === "done" ? "active" : "pending") as "active" | "processing" | "pending" | "error",
      progress: step === "statistician" ? 85 : step === "done" ? 100 : 0,
      models: step !== "idle" ? "12/12" : undefined,
    },
    strategist: {
      status: (step === "strategist" ? "processing" : step === "done" ? "active" : "pending") as "active" | "processing" | "pending" | "error",
      message: step === "idle" ? "Waiting for data..." : step === "done" ? "Analysis complete" : "Processing...",
    },
  };

  // ─── Hook ComboActions (Bloc 3) ──────────────────────────────
  const { addToCombo, removeFromCombo, checkInCombo } = useComboActions();

  // Build top signal from filtered predictions
  const topPrediction = filteredPredictions.length > 0 ? filteredPredictions[0] : null;
  const topSignal = topPrediction ? {
    match: {
      homeTeam: topPrediction.home,
      awayTeam: topPrediction.away,
      league: topPrediction.competition,
      startTime: new Date(topPrediction.date).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      homeLogo: undefined,
      awayLogo: undefined,
    },
    odds: topPrediction.min_odds,
    edgePrice: topPrediction.min_odds * (1 - topPrediction.value),
    calculatedEdge: (topPrediction.value * 100),
    confidence: {
      collector: topPrediction.confidence,
      statistical: topPrediction.consensus_pct,
    },
    reasoning: `L'Agent Stratégiste identifie un edge de ${(topPrediction.value * 100).toFixed(1)}% sur '${topPrediction.selection}'.`,
    signal: topPrediction.signal,
    prediction: topPrediction,
  } : null;

  return (
    <main className="min-h-screen bg-surface-container-lowest text-on-surface pb-24 lg:pb-8">
      {/* Header Intelligence */}
      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-md border-b border-outline-variant/20 px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
            <span className="text-surface font-black text-xs">FB</span>
          </div>
          <div className="flex items-center gap-2">
            <h1 className="font-display-lg text-headline-sm uppercase tracking-tighter text-primary">
              FASO BET
            </h1>
            <span className="text-[10px] text-on-surface-variant font-data-label hidden sm:inline">EDGE TERMINAL</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {step !== "idle" && step !== "done" && step !== "error" && (
            <span className="text-xs text-on-surface-variant animate-pulse">Analyse...</span>
          )}
          <div className="flex items-center gap-2 px-3 py-1 bg-surface-container-high rounded-full border border-primary/20">
            <div className={`w-2 h-2 rounded-full ${
              step === "done" ? "bg-success" : step === "error" ? "bg-error" : "bg-primary animate-pulse"
            }`} />
            <span className="font-data-label text-data-label text-primary uppercase">
              {step === "done" ? "En ligne" : step === "error" ? "Erreur" : step === "idle" ? "Veille" : "Actif"}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-max-width mx-auto p-margin-mobile lg:p-margin-desktop space-y-6">

        {/* Controls */}
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            type="button"
            onClick={() => runPipeline(false)}
            disabled={step !== "idle" && step !== "done" && step !== "error"}
            className="px-6 py-3 rounded-xl bg-primary text-surface font-semibold hover:opacity-90 disabled:opacity-40 transition-all"
          >
            {step === "idle" || step === "done" || step === "error"
              ? "Lancer le pipeline"
              : "Analyse en cours…"}
          </button>
          <button
            type="button"
            onClick={() => runPipeline(true)}
            disabled={step !== "idle" && step !== "done" && step !== "error"}
            className="px-4 py-3 rounded-xl border border-outline-variant/20 text-sm hover:bg-surface-container-high disabled:opacity-40"
          >
            Forcer refresh
          </button>
        </div>

        {/* Loading State */}
        {(step === "collector" || step === "statistician" || step === "strategist") && !result && (
          <DashboardLoading />
        )}

        {/* Agent Pipeline Section */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <PipelineStatus agentId="01" name="Collector" data={pipelineData.collector} />
          <PipelineStatus agentId="02" name="Statistician" data={pipelineData.statistician} />
          <PipelineStatus agentId="03" name="Strategist" data={pipelineData.strategist} />
        </section>

        {/* Error State */}
        {step === "error" && (
          <DashboardError
            title={errorAgent ? `Agent ${errorAgent} Failure` : "System Failure"}
            message={errorMessage || "Une erreur est survenue lors de l'analyse."}
            onRetry={() => runPipeline(false)}
          />
        )}

        {result && (
          <>
            <p className="text-center text-sm text-on-surface-variant">
              {result.total_matches} matchs analysés ·{" "}
              {new Date(result.pipeline_ran_at).toLocaleString("fr-FR")}
            </p>

            {/* ═══════════════════════════════════════════════════
               BLOC 2 — ENGINE FILTERS (version complète)
               ═══════════════════════════════════════════════════ */}
            <section className="bg-surface-container-low border border-outline-variant/10 rounded-2xl overflow-hidden">
              {/* En-tête du bloc filtres */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="w-full flex items-center justify-between p-5 hover:bg-surface-container-high transition-colors"
              >

                <div className="flex items-center gap-3">
                  <SlidersHorizontal className="w-5 h-5 text-primary" />
                  <h2 className="font-display-lg text-sm uppercase tracking-wider text-on-surface">
                    Moteur de Filtres
                  </h2>
                  {activeFilterCount > 0 && (
                    <span className="bg-primary text-surface text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {activeFilterCount}
                    </span>
                  )}
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-on-surface-variant transition-transform duration-300 ${
                    showFilters ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Corps des filtres */}
              <div
                className={`transition-all duration-300 overflow-hidden ${
                  showFilters ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <div className="p-5 pt-0 space-y-5">
                  {/* Ligne 1 : Signal + Risque */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Filtre Signal */}
                    <div>
                      <label className="font-data-label text-data-label uppercase text-on-surface-variant mb-2 block">
                        Signal
                      </label>
                      <div className="flex gap-1.5 flex-wrap">
                        {([
                          { value: "all", label: "Tous", color: "text-on-surface-variant border-outline-variant/10" },
                          { value: "value_bet", label: "✅ Value", color: "text-success border-success/30" },
                          { value: "neutral", label: "⚠️ Neutre", color: "text-warning border-warning/30" },
                          { value: "avoid", label: "❌ Éviter", color: "text-error border-error/30" },
                        ] as const).map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setSignalFilter(opt.value as SignalFilter)}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all border ${
                              signalFilter === opt.value
                                ? "bg-primary/20 text-primary border-primary/40 shadow-sm shadow-primary/10"
                                : `${opt.color} hover:bg-surface-container-highest`
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}

                      </div>
                    </div>

                    {/* Filtre Risque */}
                    <div>
                      <label className="font-data-label text-data-label uppercase text-on-surface-variant mb-2 block">
                        Risque
                      </label>
                      <div className="flex gap-1.5 flex-wrap">
                        {([
                          { value: "all", label: "Tous" },
                          { value: "FAIBLE", label: "🟢 Faible" },
                          { value: "MOYEN", label: "🟡 Moyen" },
                          { value: "ELEVE", label: "🔴 Élevé" },
                        ] as const).map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setRiskFilter(opt.value as RiskFilter)}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all border ${
                              riskFilter === opt.value
                                ? "bg-primary/20 text-primary border-primary/40 shadow-sm shadow-primary/10"
                                : "text-on-surface-variant border-outline-variant/10 hover:bg-surface-container-highest"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Ligne 2 : Ligue + Edge Range */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Filtre Ligue */}
                    <div>
                      <label className="font-data-label text-data-label uppercase text-on-surface-variant mb-2 block">
                        Compétition
                      </label>
                      <select
                        value={leagueFilter}
                        onChange={(e) => setLeagueFilter(e.target.value)}
                        title="Filtrer par compétition"
                        aria-label="Filtrer par compétition"
                        className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-lg p-2.5 text-sm text-on-surface focus:outline-none focus:border-primary/50 transition-colors"
                      >
                        <option value="all">Toutes les compétitions</option>
                        {availableLeagues.map((league) => (
                          <option key={league} value={league}>
                            {league}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Edge Range */}
                    <div>
                      <label className="font-data-label text-data-label uppercase text-on-surface-variant mb-2 block">
                        Edge Range ({edgeMin}% – {edgeMax}%)
                      </label>
                      <div className="space-y-2">
                        <input
                          type="range"
                          title="Edge minimum"
                          aria-label="Edge minimum"
                          className="w-full accent-primary bg-surface-container-highest rounded-lg h-1.5 appearance-none cursor-pointer"
                          min="0"
                          max="30"
                          step="1"
                          value={edgeMin}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setEdgeMin(Math.min(val, edgeMax - 1));
                          }}
                        />
                        <input
                          type="range"
                          title="Edge maximum"
                          aria-label="Edge maximum"
                          className="w-full accent-primary bg-surface-container-highest rounded-lg h-1.5 appearance-none cursor-pointer"
                          min="0"
                          max="30"
                          step="1"
                          value={edgeMax}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setEdgeMax(Math.max(val, edgeMin + 1));
                          }}
                        />
                        <div className="flex justify-between font-data-label text-[10px] text-on-surface-variant">
                          <span>0%</span>
                          <span>15%</span>
                          <span>30%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Barre d'actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-outline-variant/10">
                    <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                      <Filter className="w-3.5 h-3.5" />
                      <span>
                        {filteredPredictions.length} / {predictions.length} matchs
                        {activeFilterCount > 0 && " filtrés"}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {activeFilterCount > 0 && (
                        <button
                          onClick={resetFilters}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline-variant/10 text-xs text-on-surface-variant hover:bg-surface-container-highest transition-colors"
                        >
                          <X className="w-3 h-3" />
                          Réinitialiser
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Top Signal Highlight */}
            {topSignal && (
              <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-surface-container-low shadow-2xl">
                <div className="absolute top-0 right-0 p-6">
                  <SignalBadge type={topPrediction?.signal === "value_bet" ? "VALUE" : topPrediction?.signal === "avoid" ? "avoid" : "MEDIUM"} />
                </div>
                <div className="p-8">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <span className="text-on-surface-variant font-data-label uppercase tracking-widest text-xs">
                        {topSignal.match.league} • {topSignal.match.startTime}
                      </span>
                      <div className="mt-6 flex items-center gap-12">
                        <div className="text-center space-y-4">
                          <div className="w-16 h-16 bg-surface-container-highest rounded-2xl flex items-center justify-center p-3">
                            <span className="text-2xl font-black text-primary">{topSignal.match.homeTeam[0]}</span>
                          </div>
                          <p className="font-display-lg text-lg uppercase leading-tight w-24">{topSignal.match.homeTeam}</p>
                        </div>
                        <span className="italic font-serif opacity-30 text-headline-sm">VS</span>
                        <div className="text-center space-y-4">
                          <div className="w-16 h-16 bg-surface-container-highest rounded-2xl flex items-center justify-center p-3">
                            <span className="text-2xl font-black text-primary">{topSignal.match.awayTeam[0]}</span>
                          </div>
                          <p className="font-display-lg text-lg uppercase leading-tight w-24">{topSignal.match.awayTeam}</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-primary font-display-lg text-5xl leading-none">
                        {topSignal.calculatedEdge.toFixed(1)}%
                      </span>
                      <p className="font-data-label text-xs text-on-surface-variant uppercase mt-1">Calculated Edge</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/10">
                      <p className="text-[10px] text-on-surface-variant uppercase mb-1">Market Odds</p>
                      <p className="font-display-lg text-xl text-primary">{topSignal.odds.toFixed(2)}</p>
                    </div>
                    <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/10">
                      <p className="text-[10px] text-on-surface-variant uppercase mb-1">Edge Price</p>
                      <p className="font-display-lg text-xl text-secondary">{topSignal.edgePrice.toFixed(2)}</p>
                    </div>
                    <button className="bg-primary text-surface rounded-xl flex flex-col items-center justify-center font-bold uppercase text-[10px] gap-1 hover:scale-105 transition-transform">
                      <span className="text-lg">+</span>
                      Add to Combo
                    </button>
                  </div>

                  <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                    <p className="text-on-surface leading-relaxed italic text-sm">
                      &ldquo;{topSignal.reasoning}&rdquo;
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Prediction Feed */}
            <section className="space-y-4 pb-32">
              <div className="flex items-center justify-between">
                <h2 className="font-display-lg text-headline-sm uppercase border-l-4 border-primary pl-4">
                  Market Feed
                </h2>
                <span className="font-data-label text-[10px] text-on-surface-variant uppercase">
                  {filteredPredictions.length} signal{filteredPredictions.length > 1 ? "s" : ""}
                </span>
              </div>
              {/* ═══════════════════════════════════════════════════
                 BLOC 3 — MARKET FEED (cartes enrichies avec données réelles)
                 ═══════════════════════════════════════════════════ */}
              {filteredPredictions.length === 0 ? (
                <DashboardEmpty message="Aucun signal détecté pour les filtres actuels. Essayez d'élargir les critères." />
              ) : (
                filteredPredictions.slice(0, 24).map((p: MatchPrediction) => (
                  <MatchCard
                    key={p.match_id}
                    prediction={p as unknown as MatchCardPrediction}
                    onAddToCombo={addToCombo}
                    onRemoveFromCombo={removeFromCombo}
                    isInCombo={checkInCombo(p.match_id)}
                  />
                ))
              )}
            </section>
          </>
        )}

        {/* Idle State */}
        {step === "idle" && !result && (
          <DashboardEmpty message="Cliquez sur « Lancer le pipeline » pour analyser les matchs du jour." />
        )}

        {/* ═══════════════════════════════════════════════════
           BLOC 4 — HISTORICAL ANALYTICS (tableau de bord basé sur 5 ans de données)
           ═══════════════════════════════════════════════════ */}
        <HistoricalDashboard />
      </div>

      <ConnectedComboBuilder combos={combos} />
    </main>
  );
}

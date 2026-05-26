"use client";

import React, { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import type { PipelineSuccess } from "@/agents/pipeline";
import type { MatchPrediction } from "@/types/agent3.types";
import {
  Trophy,
  ThermometerSun,
  Shield,
  Swords,
  Zap,
  Filter,
  BarChart3,
  ScrollText,
  Medal,
  User,
  Plus,
  TrendingUp,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { ApiErrorBoundary } from "@/components/error-boundary";
import { CouponDrawer, type CouponLeg } from "@/components/CouponDrawer";

type Step = "idle" | "collector" | "statistician" | "strategist" | "done" | "error";
type CategoryFilter = "all" | "football" | "high_confidence" | "caf" | "europe";

const CATEGORIES: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "TOUS" },
  { value: "football", label: "FOOTBALL" },
  { value: "high_confidence", label: "HAUTE CONFIANCE" },
  { value: "caf", label: "CAF" },
  { value: "europe", label: "EUROPE" },
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function DashboardPage() {
  const [step, setStep] = useState<Step>("idle");
  const [result, setResult] = useState<PipelineSuccess | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [category, setCategory] = useState<CategoryFilter>("all");

  const runPipeline = useCallback(async () => {
    setStep("collector");
    setErrorMessage(undefined);
    setResult(null);
    await sleep(50);

    try {
      setStep("statistician");
      await sleep(50);

      const response = await apiClient.fastApiClient.predict();
      setStep("strategist");
      await sleep(50);

      if (response.success && response.data) {
        setResult(response.data as unknown as PipelineSuccess);
        setStep("done");
      } else {
        setStep("error");
        setErrorMessage(response.error || "Erreur lors de l'exécution du pipeline");
      }
    } catch (e) {
      setStep("error");
      setErrorMessage(e instanceof Error ? e.message : "Erreur réseau");
    }
  }, []);

  const predictions = result?.predictions.predictions ?? [];

  const filtered = useMemo(() => {
    return predictions.filter((p: MatchPrediction) => {
      if (category === "all") return true;
      if (category === "high_confidence") return p.confidence >= 70;
      if (category === "caf") {
        const caf = ["CAF", "Champions League", "Ligue 1 Burkina", "Ligue 1 Côte d'Ivoire"];
        return caf.some((l) => p.competition.toUpperCase().includes(l.toUpperCase()));
      }
      if (category === "europe") {
        const eu = ["Premier League", "La Liga", "Serie A", "Bundesliga", "Ligue 1", "Primeira"];
        return eu.some((l) => p.competition.toUpperCase().includes(l.toUpperCase()));
      }
      return true;
    });
  }, [predictions, category]);

  return (
    <ApiErrorBoundary serviceName="dashboard-page">
      <div className="font-body-md antialiased pb-24 bg-surface-deep text-text-primary min-h-screen">
        {/* TopAppBar */}
        <header className="bg-background border-b border-outline-variant sticky top-0 z-50 flex justify-between items-center w-full px-margin-mobile h-touch-target-min">
          <div className="flex items-center gap-stack-sm">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-ia-gold flex items-center justify-center bg-surface-container-high">
              <User className="w-5 h-5 text-ia-gold" />
            </div>
            <span className="font-headline-md text-headline-md font-bold text-ia-gold tracking-tighter">
              FASOBET
            </span>
          </div>
          <div className="flex items-center gap-stack-sm">
            <button
              type="button"
              className="bg-primary-container/20 text-primary font-label-caps text-label-caps px-stack-sm py-1 rounded border border-primary/30 hover:bg-primary-container/30 transition-all active:scale-95"
            >
              25,400 FCFA
            </button>
          </div>
        </header>

        <main className="max-w-md mx-auto">
          {/* Category Filters (Sticky) */}
          <nav className="sticky top-[48px] bg-surface-deep z-40 py-stack-sm border-b border-outline-variant/50 scroll-fade-right">
            <div className="flex gap-2 px-margin-mobile overflow-x-auto no-scrollbar">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`font-bold text-[10px] tracking-wider uppercase px-3 py-1.5 rounded whitespace-nowrap transition-all active:scale-95 border border-outline-variant/30 ${
                    category === cat.value
                      ? "bg-ia-gold text-surface-deep shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                      : "bg-surface-container-high text-on-surface hover:bg-surface-variant"
                  }`}
                  type="button"
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </nav>

          {/* ROI / Yield Indicators */}
          <div className="px-margin-mobile pt-stack-sm flex gap-2">
            <div className="flex items-center gap-2 bg-surface-container-low border border-outline-variant/30 px-3 py-1 rounded">
              <span className="text-[10px] font-label-caps text-on-surface-variant">ROI:</span>
              <span className="text-[11px] font-bold text-success-green">+14.2%</span>
            </div>
            <div className="flex items-center gap-2 bg-surface-container-low border border-outline-variant/30 px-3 py-1 rounded">
              <span className="text-[10px] font-label-caps text-on-surface-variant">YIELD:</span>
              <span className="text-[11px] font-bold text-ia-gold">6.8%</span>
            </div>
          </div>

          {/* Section Header */}
          <div className="px-margin-mobile pt-stack-lg pb-stack-md flex justify-between items-end">
            <div>
              <span className="text-ia-gold font-label-caps text-label-caps block mb-1">
                LIVE & À VENIR
              </span>
              <h2 className="font-headline-sm text-headline-sm uppercase tracking-wider text-white">
                Matchs du Jour
              </h2>
            </div>
            <button
              type="button"
              onClick={() => runPipeline()}
              disabled={step !== "idle" && step !== "done" && step !== "error"}
              className="flex items-center gap-1 text-on-surface-variant font-label-caps text-label-caps border border-outline-variant px-3 py-2 rounded hover:bg-surface-container transition-colors active:scale-95 disabled:opacity-50"
            >
              <Filter className="w-[18px] h-[18px]" />
              {step === "idle" ? "LANCER IA" : step === "done" ? "REFRESH" : "ANALYSE..."}
            </button>
          </div>

          {/* Loading State */}
          {(step === "collector" || step === "statistician" || step === "strategist") && (
            <div className="px-margin-mobile py-12 flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-2 border-t-transparent border-ia-gold rounded-full animate-spin" />
              <p className="font-label-caps text-label-caps text-on-surface-variant">
                {step === "collector" ? "Collecte des données..." : step === "statistician" ? "Analyse statistique..." : "Stratégie IA en cours..."}
              </p>
            </div>
          )}

          {/* Error State */}
          {step === "error" && (
            <div className="px-margin-mobile py-8">
              <div className="p-4 bg-error-container/10 border border-error/30 rounded text-center">
                <p className="text-sm text-error">{errorMessage || "Erreur inconnue"}</p>
                <button
                  onClick={() => runPipeline()}
                  className="mt-3 px-4 py-2 bg-error/20 text-error font-label-caps text-label-caps rounded hover:bg-error/30 transition-colors"
                  type="button"
                >
                  RÉESSAYER
                </button>
              </div>
            </div>
          )}

          {/* Match Cards List — Haute Densité */}
          <div className="px-margin-mobile space-y-2">
            {/* Empty State */}
            {step === "idle" && (
              <div className="py-16 text-center">
                <BarChart3 className="w-12 h-12 text-outline-variant mx-auto mb-4 opacity-40" />
                <p className="font-body-md text-on-surface-variant">
                  Cliquez sur "LANCER IA" pour analyser les matchs du jour
                </p>
              </div>
            )}

            {step === "done" && filtered.length === 0 && (
              <div className="py-16 text-center">
                <Trophy className="w-12 h-12 text-outline-variant mx-auto mb-4 opacity-40" />
                <p className="font-body-md text-on-surface-variant">
                  Aucun match trouvé pour ce filtre
                </p>
              </div>
            )}

            {filtered.map((p: MatchPrediction) => {
              const probHome = p.confidence;
              const probAway = p.value * 100;
              const probDraw = 100 - probHome - probAway;
              const isHighConf = p.confidence >= 70;
              const isVolatile = p.risk === "ELEVE";
              const isAvoid = p.signal === "avoid";

              return (
                <Link
                  key={p.match_id}
                  href={`/match/${p.match_id}`}
                  className={`bg-surface-raised rounded p-stack-md relative overflow-hidden transition-all group block border ${
                    isHighConf && !isAvoid
                      ? "border-ia-gold/50 hover:border-ia-gold"
                      : isVolatile
                        ? "border-error-container/50 hover:border-error"
                        : isAvoid
                          ? "border-outline-variant/30 opacity-50 grayscale"
                          : "border-outline-variant hover:border-primary"
                  }`}
                >
                  {/* Header Row */}
                  <div className="flex justify-between items-start mb-stack-sm">
                    <div className="flex items-center gap-2">
                      <span className={`font-label-caps text-label-caps px-2 py-0.5 rounded ${
                        isHighConf
                          ? "text-ia-gold bg-ia-gold/10"
                          : "text-on-surface-variant bg-surface-container-highest"
                      }`}>
                        {p.competition}
                      </span>
                      <span className="text-on-surface-variant text-[11px] font-label-caps">
                        {new Date(p.date).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-on-surface-variant text-[11px]">
                      <ThermometerSun className="w-[14px] h-[14px]" />
                      31°C
                      {isHighConf && (
                        <span className="ml-2 font-bold text-success-green">CRUCIAL</span>
                      )}
                      {isVolatile && (
                        <span className="ml-2 text-error bg-error-container/20 font-label-caps text-[10px] px-2 py-0.5 rounded border border-error/20">
                          VOLATILE
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Teams Row */}
                  <div className="grid grid-cols-7 items-center mb-stack-md">
                    <div className="col-span-3 flex flex-col items-center gap-2">
                      <div className="w-12 h-12 bg-surface-container-highest rounded-full flex items-center justify-center border border-outline-variant">
                        <Shield className="w-6 h-6 text-ia-gold" />
                      </div>
                      <span className="font-headline-sm text-headline-sm text-center">{p.home}</span>
                      {isHighConf && (
                        <span className="bg-primary-container text-primary font-label-caps text-[10px] px-2 py-0.5 rounded border border-primary/20">
                          IA PICK: {probHome.toFixed(0)}%
                        </span>
                      )}
                    </div>
                    <div className="col-span-1 flex flex-col items-center gap-1">
                      <span className="font-label-caps text-label-caps text-on-surface-variant">VS</span>
                      <div className="h-10 w-[1px] bg-outline-variant/30" />
                    </div>
                    <div className="col-span-3 flex flex-col items-center gap-2">
                      <div className="w-12 h-12 bg-surface-container-highest rounded-full flex items-center justify-center border border-outline-variant">
                        <Shield className="w-6 h-6 text-on-surface-variant" />
                      </div>
                      <span className="font-headline-sm text-headline-sm text-center">{p.away}</span>
                      <span className="text-on-surface-variant font-label-caps text-[10px]">
                        PROB: {probAway.toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  {/* Probability Bar */}
                  <div className="h-1.5 w-full bg-surface-container-high rounded-full flex overflow-hidden mb-stack-md">
                    <div className="h-full bg-ia-gold transition-all" style={{ width: `${Math.max(probHome, 1)}%` }} />
                    <div className="h-full bg-outline-variant transition-all" style={{ width: `${Math.max(probDraw, 1)}%` }} />
                    <div className="h-full bg-surface-variant transition-all" style={{ width: `${Math.max(probAway, 1)}%` }} />
                  </div>

                  {/* Volatility Warning */}
                  {isVolatile && p.match_type_warning && (
                    <div className="bg-error-container/10 p-3 rounded mb-stack-md border-l-2 border-error">
                      <p className="text-body-md text-error/90 text-sm italic">
                        {p.match_type_warning}
                      </p>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex justify-between items-center pt-stack-sm border-t border-outline-variant/30">
                    <div className="text-[10px] font-label-caps text-on-surface-variant">
                      COTE MOYENNE: {p.min_odds.toFixed(2)}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      className="w-touch-target-min h-touch-target-min flex items-center justify-center bg-primary text-surface-deep rounded transition-all active:scale-90 hover:shadow-[0_0_15px_rgba(165,208,185,0.3)]"
                      aria-label="Ajouter au coupon"
                    >
                      <Plus className="w-6 h-6" />
                    </button>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Spacer */}
          <div className="h-16" />
        </main>

        {/* Floating Action Button */}
        <button
          type="button"
          onClick={() => runPipeline()}
          disabled={step !== "idle" && step !== "done" && step !== "error"}
          className={`fixed bottom-24 right-margin-mobile w-14 h-14 rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(245,158,11,0.4)] z-50 active:scale-90 transition-transform disabled:opacity-50 ${
            step !== "idle" && step !== "done" && step !== "error"
              ? "bg-outline-variant"
              : "bg-ia-gold text-surface-deep"
          }`}
          aria-label="Lancer l'analyse IA"
        >
          <Zap className="w-8 h-8" />
        </button>

        {/* Coupon Drawer */}
        <CouponDrawer
          legs={[]}
          onRemove={() => {}}
          onClear={() => {}}
        />

        {/* BottomNavBar */}
        <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-base py-stack-sm bg-surface-container-lowest border-t border-primary-container z-50 h-16">
          <Link
            href="/dashboard"
            className="flex flex-col items-center justify-center text-ia-gold font-bold active:scale-90 transition-all duration-200"
          >
            <BarChart3 className="w-6 h-6" />
            <span className="font-label-caps text-label-caps">ANALYSES</span>
          </Link>
          <Link
            href="#"
            className="flex flex-col items-center justify-center text-on-surface-variant hover:bg-surface-bright/10 active:scale-90 transition-all duration-200"
          >
            <ScrollText className="w-6 h-6" />
            <span className="font-label-caps text-label-caps">COUPON</span>
          </Link>
          <Link
            href="#"
            className="flex flex-col items-center justify-center text-on-surface-variant hover:bg-surface-bright/10 active:scale-90 transition-all duration-200"
          >
            <Medal className="w-6 h-6" />
            <span className="font-label-caps text-label-caps">PRÉMIUM</span>
          </Link>
          <Link
            href="#"
            className="flex flex-col items-center justify-center text-on-surface-variant hover:bg-surface-bright/10 active:scale-90 transition-all duration-200"
          >
            <User className="w-6 h-6" />
            <span className="font-label-caps text-label-caps">COMPTE</span>
          </Link>
        </nav>
      </div>
    </ApiErrorBoundary>
  );
}
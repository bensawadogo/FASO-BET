"use client";

import React, { useCallback, useMemo, useState } from "react";
import Link from "next/link";
// import type { PipelineSuccess } from "@/agents/pipeline"; // Obsolete
import type { MatchPrediction } from "@/types/agent3.types";
import {
  User,
  Wallet,
  Filter,
  ArrowUpDown,
  TrendingUp,
  Shield,
  HelpCircle,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { BottomNavBar } from "@/components/ui/BottomNavBar";
import { apiClient } from "@/lib/api-client";
import { routes } from "@/lib/routes";

type Step = "idle" | "collector" | "statistician" | "strategist" | "done" | "error";
type SortMode = "odds" | "confidence" | "value";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function QuickScanPage() {
  const [step, setStep] = useState<Step>("idle");
  const [scanStatus, setScanStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [sortMode, setSortMode] = useState<SortMode>("value");

  const runPipeline = useCallback(async () => {
    setScanStatus("loading");
    setErrorMessage(undefined);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_INFERENCE_URL || 'http://localhost:8000'}/pipeline/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      setScanStatus(response.ok ? "done" : "error");
    } catch (e) {
      setScanStatus("error");
    }
  }, []);


  const predictions = result?.predictions.predictions ?? [];

  const sorted = useMemo(() => {
    const clone = [...predictions] as MatchPrediction[];
    if (sortMode === "odds") clone.sort((a, b) => b.min_odds - a.min_odds);
    if (sortMode === "confidence") clone.sort((a, b) => b.confidence - a.confidence);
    if (sortMode === "value") clone.sort((a, b) => b.value - a.value);
    return clone;
  }, [predictions, sortMode]);

  const iaPick = (p: MatchPrediction) => {
    const h = p.confidence;
    const a = p.value * 100;
    const d = 100 - h - a;
    if (h >= d && h >= a) return "H";
    if (d >= h && d >= a) return "X";
    return "A";
  };

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen overflow-x-hidden pb-[100px]">
      {/* Background grid decoration */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] z-0">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-background flex justify-between items-center h-14 px-margin-mobile border-b border-outline-variant">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center overflow-hidden border border-outline-variant">
            <User className="w-5 h-5 text-on-surface-variant" />
          </div>
          <h1 className="font-headline-lg text-headline-lg font-bold text-ia-gold tracking-tight">
            fasobet<br /><span className="text-xs text-ia-gold/60 font-normal tracking-normal">by ben rachid sawadogo</span>
          </h1>
        </Link>
        <div className="flex items-center gap-stack-sm">
          <div className="px-3 py-1.5 bg-primary-container rounded-lg flex items-center gap-1.5 border border-primary/20">
            <span className="font-label-caps text-label-caps text-on-primary-container">5,400 FCFA</span>
            <Wallet className="w-[14px] h-[14px] text-on-primary-container" />
          </div>
        </div>
      </header>

      <main className="pt-14 min-h-screen">
        {/* Dashboard Sub-Header */}
        <div className="px-margin-mobile py-stack-md flex justify-between items-end">
          <div>
            <p className="font-label-caps text-label-caps text-on-surface-variant">
              ANALYST TERMINAL
            </p>
            <h2 className="font-headline-sm text-headline-sm">Quick Scan Mode</h2>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => runPipeline()}
              disabled={step !== "idle" && step !== "done" && step !== "error"}
              className="w-10 h-10 flex items-center justify-center bg-surface-container rounded-lg border border-outline-variant active:scale-95 transition-transform disabled:opacity-50"
              aria-label="Lancer l'analyse"
            >
              <Filter className="w-5 h-5 text-on-surface-variant" />
            </button>
          </div>
        </div>

        {/* Sort Controls */}
        <div className="px-margin-mobile py-2 bg-surface-container-low border-b border-outline-variant flex items-center gap-4 overflow-x-auto no-scrollbar">
          <span className="font-label-caps text-[10px] text-on-surface-variant whitespace-nowrap">
            TRIER PAR
          </span>
          <div className="flex items-center gap-2">
            {([
              { key: "odds" as SortMode, label: "COTE" },
              { key: "confidence" as SortMode, label: "CONFIANCE %" },
              { key: "value" as SortMode, label: "VALEUR" },
            ]).map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSortMode(s.key)}
                className={`flex items-center gap-1 px-2 py-1 rounded-sm border transition-colors group ${
                  sortMode === s.key
                    ? "border-ia-gold/40 bg-ia-gold/5"
                    : "bg-surface-container border-outline-variant active:border-ia-gold"
                }`}
              >
                <span
                  className={`font-label-caps text-[10px] uppercase ${
                    sortMode === s.key ? "text-ia-gold" : "text-on-surface-variant group-active:text-ia-gold"
                  }`}
                >
                  {s.label}
                </span>
                {s.key === "odds" && (
                  <ArrowUpDown
                    className={`w-[14px] h-[14px] ${
                      sortMode === s.key ? "text-ia-gold" : "text-on-surface-variant group-active:text-ia-gold"
                    }`}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {(step === "collector" || step === "statistician" || step === "strategist") && (
          <div className="px-margin-mobile py-12 flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-t-transparent border-ia-gold rounded-full animate-spin" />
            <p className="font-label-caps text-label-caps text-on-surface-variant">
              {step === "collector" ? "Collecte des données..." : step === "statistician" ? "Analyse..." : "Stratégie..."}
            </p>
          </div>
        )}

        {/* Error State */}
        {step === "error" && (
          <div className="px-margin-mobile py-8">
            <div className="p-4 bg-error-container/10 border border-error/30 rounded text-center">
              <p className="text-sm text-error">{errorMessage || "Erreur inconnue"}</p>
              <button onClick={() => runPipeline()} type="button" className="mt-3 px-4 py-2 bg-error/20 text-error font-label-caps text-label-caps rounded">RÉESSAYER</button>
            </div>
          </div>
        )}

        {/* Idle State */}
        {step === "idle" && (
          <div className="px-margin-mobile py-16 text-center">
            <BarChart3 className="w-12 h-12 text-outline-variant mx-auto mb-4 opacity-40" />
            <p className="font-body-md text-on-surface-variant text-sm">Cliquez sur l'icône filtre pour lancer Quick Scan</p>
          </div>
        )}

        {/* Ultra-Compact List View */}
        {step === "done" && (
          <section className="flex flex-col">
            {sorted.map((p: MatchPrediction) => {
              const probHome = p.confidence;
              const probAway = p.value * 100;
              const probDraw = 100 - probHome - probAway;
              const pick = iaPick(p);
              const isVolatile = p.risk === "ELEVE";
              const isAvoid = p.signal === "avoid";
              const isHighConf = p.confidence >= 70;

              return (
                <Link
                  key={p.match_id}
                  href={routes.matchDetail(p.match_id)}
                  className={`bet-row h-[72px] px-margin-mobile border-b border-outline-variant flex items-center gap-3 transition-colors active:bg-surface-container-low ${
                    isAvoid ? "opacity-50 grayscale" : ""
                  }`}
                >
                  {/* Left: Time/League */}
                  <div className="flex flex-col min-w-[56px] items-start">
                    <span className="font-label-caps text-[10px] text-on-surface-variant leading-tight truncate max-w-[60px]">
                      {p.competition}
                    </span>
                    <span className="font-stat-value text-body-lg text-on-background font-bold">
                      {new Date(p.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  {/* Center: Teams */}
                  <div className="flex-grow flex flex-col justify-center gap-0">
                    <span className="font-body-lg text-on-background truncate">{p.home}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-body-lg text-on-background truncate">{p.away}</span>
                      {(isHighConf || p.signal === "value_bet") && !isVolatile && !isAvoid && (
                        <div className="px-1.5 py-0.5 border border-ia-gold/40 bg-ia-gold/10 rounded-sm">
                          <span className="font-label-caps text-[10px] text-ia-gold whitespace-nowrap">
                            {isHighConf ? "IA PICK" : "VALUE"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: IA Probabilities */}
                  <div className="flex items-center gap-3 shrink-0">
                    {isVolatile ? (
                      <div className="flex flex-col items-end">
                        <div className="px-2 py-0.5 bg-error text-on-tertiary rounded-sm">
                          <span className="font-label-caps text-[9px] uppercase font-bold">VOLATILE</span>
                        </div>
                        <span className="font-label-caps text-[10px] text-on-surface-variant whitespace-nowrap">DATA INSUFFICIENT</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-end">
                        <div className="flex gap-2 items-center">
                          <span className="font-label-caps text-[10px] text-on-surface-variant whitespace-nowrap">
                            {pick === "H" ? "H" : pick === "A" ? "A" : "X"}{" "}
                            {pick === "H" ? probHome : pick === "A" ? probAway : probDraw}%
                          </span>
                          <div className="w-12 h-1 bg-surface-container rounded-full overflow-hidden">
                            <div
                              className="h-full bg-ia-gold"
                              style={{ width: `${Math.max(pick === "H" ? probHome : pick === "A" ? probAway : probDraw, 1)}%` }}
                            />
                          </div>
                        </div>
                        <span className="font-label-caps text-[10px] text-on-surface-variant whitespace-nowrap">
                          H {probHome.toFixed(0)}% · X {probDraw.toFixed(0)}% · A {probAway.toFixed(0)}%
                        </span>
                      </div>
                    )}

                    {/* Confidence Badge */}
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                        isHighConf
                          ? "border border-ia-gold bg-ia-gold/5"
                          : isVolatile
                            ? "border border-outline bg-surface-container"
                            : "border border-outline bg-surface-container"
                      }`}
                      style={isHighConf ? { filter: "drop-shadow(0 0 2px #F59E0B)" } : undefined}
                    >
                      {isVolatile ? (
                        <HelpCircle className="w-[18px] h-[18px] text-outline" />
                      ) : (
                        <span
                          className={`font-stat-value text-[14px] ${
                            isHighConf ? "text-ia-gold" : "text-on-surface-variant"
                          }`}
                        >
                          {pick}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </section>
        )}

        {/* Dynamic Insights Banner */}
        <div className="mx-margin-mobile mt-stack-lg p-stack-md bg-surface-raised rounded-xl border border-outline-variant relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <BarChart3 className="w-16 h-16" />
          </div>
          <h3 className="font-headline-sm text-headline-sm text-ia-gold mb-1">Analyst Insight</h3>
          <p className="font-body-md text-on-surface-variant mb-3 text-sm">
            High-value drift detected on ASFA home odds. IA confirms 7.2% advantage over market current pricing.
          </p>
          <Link
            href="/dashboard"
            className="bg-primary-container text-on-primary-container px-4 h-10 rounded-lg font-label-caps text-label-caps flex items-center gap-2 active:scale-95 transition-transform inline-flex"
          >
            EXAMINE DEEP DATA
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      {/* BottomNavBar */}
      <BottomNavBar />
    </div>
  );
}
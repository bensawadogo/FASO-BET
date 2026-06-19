"use client";

import React from "react";
import Link from "next/link";
import {
  User,
  Terminal,
  BarChart3,
  ScrollText,
  Medal,
  Info,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────
interface ExecutionEntry {
  id: string;
  status: "executed" | "refused" | "cancelled";
  statusLabel: string;
  match: string;
  volatility: string;
  volatilityColor: string;
  betType?: string;
  odds?: number;
  stake?: number;
  gain?: number;
  reason?: string;
}

const EXECUTIONS: ExecutionEntry[] = [
  {
    id: "e1",
    status: "executed",
    statusLabel: "OK - EXÉCUTÉ",
    match: "Raja CA vs AS FAR",
    volatility: "STABLE",
    volatilityColor: "text-success-green",
    betType: "Raja ou Nul",
    odds: 2.15,
    stake: 500,
    gain: 1075,
  },
  {
    id: "e2",
    status: "refused",
    statusLabel: "REFUSÉ - COTE BASSE",
    match: "Real Madrid vs AC Milan",
    volatility: "1.50+",
    volatilityColor: "text-on-tertiary-container",
    reason: "Bot a détecté une cote de 1.42. Exécution annulée par stratégie conservatrice.",
  },
  {
    id: "e3",
    status: "executed",
    statusLabel: "OK - EXÉCUTÉ",
    match: "Everton vs Fulham",
    volatility: "MODÉRÉE",
    volatilityColor: "text-secondary",
    betType: "+2.5 Buts",
    odds: 1.95,
    stake: 250,
    gain: 487.5,
  },
  {
    id: "e4",
    status: "cancelled",
    statusLabel: "ANNULÉ",
    match: "Marseille vs PSG",
    volatility: "",
    volatilityColor: "",
    reason: "Marché suspendu par le bookmaker (VAR en cours). Bot a expiré l'ordre.",
  },
];

const barHeights = [40, 38, 45, 55, 50, 75, 70, 90, 85, 100];

export default function BotSummaryPage() {
  return (
    <div className="bg-surface-deep text-on-surface font-body-md min-h-screen pb-28">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-background border-b border-outline-variant flex justify-between items-center h-14 px-margin-mobile">
        <Link href="/dashboard" className="flex items-center gap-3">
          <User className="w-5 h-5 text-ia-gold" />
          <h1 className="font-headline-lg text-headline-lg font-bold text-ia-gold tracking-tight">
            fasobet<br /><span className="text-xs text-ia-gold/60 font-normal tracking-normal">by ben rachid sawadogo</span>
          </h1>
        </Link>
        <div className="flex items-center bg-surface-container px-3 py-1 rounded border border-outline-variant">
          <span className="font-label-caps text-label-caps text-on-primary-container mr-2">BALANCE</span>
          <span className="font-stat-value text-body-lg font-bold text-ia-gold">5,400 FCFA</span>
        </div>
      </header>

      <main className="pt-20 pb-8 px-margin-mobile max-w-xl mx-auto space-y-4">
        {/* Bot Status Indicator */}
        <section className="flex items-center justify-between bg-surface-raised border border-primary-container p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full rounded-full bg-success-green opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-success-green" />
            </div>
            <div>
              <p className="font-label-caps text-label-caps text-on-surface">AUTOMATED ANALYST LIVE</p>
              <p className="text-[10px] text-on-surface-variant font-mono">
                SCANNING MARKETS: PREMIER LEAGUE, LALIGA, BUNDESLIGA
              </p>
            </div>
          </div>
          <Terminal className="w-5 h-5 text-ia-gold" />
        </section>

        {/* Daily Stats Bento Grid */}
        <section className="grid grid-cols-2 gap-base">
          <div className="col-span-2 bg-surface-raised border border-outline-variant p-4 flex flex-col justify-between rounded-lg">
            <p className="font-label-caps text-label-caps text-on-surface-variant">ROI JOURNALIER</p>
            <div className="flex items-end justify-between">
              <span className="text-[42px] leading-none text-success-green font-stat-value">+4.2%</span>
              <div className="h-12 w-24">
                <svg className="w-full h-full stroke-success-green stroke-2 fill-none" viewBox="0 0 100 40">
                  <path d="M0 35 L20 30 L40 32 L60 15 L80 18 L100 5" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-surface-raised border border-outline-variant p-4 aspect-square flex flex-col justify-between rounded-lg">
            <p className="font-label-caps text-label-caps text-on-surface-variant">MISES EXÉCUTÉES</p>
            <span className="font-stat-value text-headline-lg text-ia-gold">08</span>
            <p className="text-[10px] text-on-surface-variant">SUR 12 OPPORTUNITÉS</p>
          </div>
          <div className="bg-surface-raised border border-outline-variant p-4 aspect-square flex flex-col justify-between rounded-lg">
            <p className="font-label-caps text-label-caps text-on-surface-variant">CAPITAL ENGAGÉ</p>
            <span className="font-stat-value text-headline-lg text-primary">12%</span>
            <div className="w-full bg-surface-container h-1 rounded-full overflow-hidden">
              <div className="bg-primary h-full" style={{ width: "12%" }} />
            </div>
          </div>
        </section>

        {/* Execution List */}
        <section className="space-y-stack-md">
          <div className="flex items-center justify-between border-b border-outline-variant pb-2">
            <h2 className="font-headline-sm text-headline-sm text-on-background">FLUX D'EXÉCUTION</h2>
            <span className="text-[10px] font-mono text-on-surface-variant">TODAY: 24 OCT</span>
          </div>
          <div className="space-y-base">
            {EXECUTIONS.map((entry) => (
              <div
                key={entry.id}
                className={`bg-surface-raised border border-outline-variant p-4 rounded-lg transition-colors ${
                  entry.status === "executed" ? "hover:border-primary cursor-pointer" : "opacity-70"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="space-y-1">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        entry.status === "executed"
                          ? "bg-primary-container text-on-primary-container"
                          : entry.status === "refused"
                            ? "bg-tertiary-container text-on-tertiary-container uppercase"
                            : "bg-surface-container-highest text-on-surface-variant uppercase"
                      }`}
                    >
                      {entry.statusLabel}
                    </span>
                    <h3 className="font-body-lg text-body-lg text-text-primary">{entry.match}</h3>
                  </div>
                  {entry.volatility && (
                    <div className="text-right">
                      <p className="font-label-caps text-label-caps text-on-surface-variant">
                        {entry.status === "refused" ? "SEUIL CIBLE" : "VOLATILITÉ IA"}
                      </p>
                      <span className={`${entry.volatilityColor} font-mono text-xs`}>{entry.volatility}</span>
                    </div>
                  )}
                </div>

                {/* Details for executed entries */}
                {entry.status === "executed" && entry.betType && (
                  <div className="grid grid-cols-2 gap-4 border-t border-outline-variant/30 pt-3 mt-3">
                    <div>
                      <p className="text-[10px] text-on-surface-variant uppercase">Type & Cote</p>
                      <p className="font-mono text-sm">
                        {entry.betType} <span className="text-ia-gold">@ {entry.odds}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-on-surface-variant uppercase">Mise / Gain Pot.</p>
                      <p className="font-mono text-sm">
                        {entry.stake?.toLocaleString()}{" "}
                        <span className="text-on-surface-variant text-[10px]">/</span>{" "}
                        <span className="text-ia-gold font-bold">{entry.gain?.toLocaleString()}</span>
                      </p>
                    </div>
                  </div>
                )}

                {/* Reason for refused/cancelled */}
                {entry.reason && (
                  <div className="flex justify-between items-end mt-4">
                    <p className="text-[10px] font-mono text-on-surface-variant max-w-[200px]">{entry.reason}</p>
                    <Info className="w-4 h-4 text-outline-variant" />
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            className="w-full h-touch-target-min bg-surface-container-high border border-outline-variant font-label-caps text-label-caps text-on-surface flex items-center justify-center gap-2 hover:bg-surface-bright transition-colors active:scale-95 rounded-lg"
          >
            <BarChart3 className="w-4 h-4" />
            VOIR TOUT L'HISTORIQUE DU JOUR
          </button>
        </section>

        {/* Bankroll Chart */}
        <section className="bg-surface-raised border border-outline-variant p-4 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-label-caps text-label-caps text-on-surface-variant">
              ÉVOLUTION BANKROLL (24H)
            </h3>
            <span className="font-mono text-[10px] text-success-green">+225 FCFA NET</span>
          </div>
          <div className="h-32 w-full flex items-end gap-1">
            {barHeights.map((height, i) => (
              <div
                key={i}
                className={`flex-1 rounded-t-sm ${
                  i >= 8 ? "bg-ia-gold" : i === barHeights.length - 1 ? "bg-success-green" : "bg-primary/20"
                }`}
                style={{ height: `${height}%`, opacity: i >= 7 && i < 9 ? 0.8 : i < 7 ? 0.2 + i * 0.05 : undefined }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2 font-mono text-[9px] text-outline">
            <span>08:00</span>
            <span>12:00</span>
            <span>16:00</span>
            <span>MAINTENANT</span>
          </div>
        </section>
      </main>

      {/* BottomNavBar */}
      <nav className="fixed bottom-0 w-full z-50 bg-surface-deep border-t border-outline-variant h-[72px] flex justify-around items-center px-base">
        <Link
          href="/dashboard"
          className="flex flex-col items-center justify-center text-on-surface-variant gap-1 hover:text-on-surface transition-colors active:opacity-80"
        >
          <BarChart3 className="w-6 h-6" />
          <span className="font-label-caps text-label-caps uppercase">ANALYSES</span>
        </Link>
        <Link
          href="/bot/summary"
          className="flex flex-col items-center justify-center text-ia-gold gap-1 hover:text-on-surface transition-colors active:opacity-80"
        >
          <ScrollText className="w-6 h-6" />
          <span className="font-label-caps text-label-caps uppercase">COUPON</span>
        </Link>
        <Link
          href="/premium"
          className="flex flex-col items-center justify-center text-on-surface-variant gap-1 hover:text-on-surface transition-colors active:opacity-80"
        >
          <Medal className="w-6 h-6" />
          <span className="font-label-caps text-label-caps uppercase">PRÉMIUM</span>
        </Link>
        <Link
          href="/profile"
          className="flex flex-col items-center justify-center text-on-surface-variant gap-1 hover:text-on-surface transition-colors active:opacity-80"
        >
          <User className="w-6 h-6" />
          <span className="font-label-caps text-label-caps uppercase">COMPTE</span>
        </Link>
      </nav>
    </div>
  );
}
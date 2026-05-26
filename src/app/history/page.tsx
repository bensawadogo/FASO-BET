"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import {
  User,
  ChevronRight,
  TrendingUp,
  Star,
  ChartBar,
  ScrollText,
  Medal,
  X,
  BarChart3,
  Zap,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────
interface HistoryEntry {
  id: string;
  date: string;
  league: string;
  home: string;
  away: string;
  time: string;
  status: "won" | "lost" | "in_progress";
  ai_pick: string;
  odds: number;
  result?: string;
  accuracy?: number;
  is_analyzed: boolean;
  live_minute?: string;
}

type DateGroup = { label: string; entries: HistoryEntry[] };

// ─── Success Ring ──────────────────────────────────────────
function SuccessRing({ percent }: { percent: number }) {
  // SVG circle: r=16, circumference=2*PI*16 ≈ 100.53
  const circumference = 2 * Math.PI * 16;
  const offset = circumference * (1 - percent / 100);

  return (
    <div className="relative w-12 h-12">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" fill="none" r="16" stroke="#374151" strokeWidth="3" />
        <circle
          cx="18"
          cy="18"
          fill="none"
          r="16"
          stroke="#F59E0B"
          strokeLinecap="round"
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
    </div>
  );
}

// ─── Status Badge ──────────────────────────────────────────
function StatusBadge({ status }: { status: HistoryEntry["status"] }) {
  const isInProgress = status === "in_progress";
  const labels: Record<HistoryEntry["status"], string> = {
    won: "GAGNÉ",
    lost: "PERDU",
    in_progress: "EN COURS",
  };
  const classNames: Record<HistoryEntry["status"], string> = {
    won: "bg-primary-container border border-primary/30 text-primary",
    lost: "bg-error-container border border-error/30 text-error",
    in_progress: "bg-secondary-container/20 border border-secondary-container/40 text-secondary",
  };
  return (
    <div className={`px-2 py-1 rounded-base font-label-caps text-[10px] flex items-center gap-1 ${classNames[status]}`}>
      {isInProgress && (
        <span className="w-1.5 h-1.5 rounded-full bg-secondary-container animate-pulse" />
      )}
      {labels[status]}
    </div>
  );
}

// ─── History Card ──────────────────────────────────────────
function HistoryCard({ entry }: { entry: HistoryEntry }) {
  const [showInsight, setShowInsight] = useState(false);

  return (
    <div className="border border-outline-variant bg-surface-raised overflow-hidden transition-all hover:border-ia-gold/50">
      {/* IA Tag */}
      {entry.is_analyzed && (
        <div className="absolute top-0 right-0 bg-ia-gold px-2 py-1 flex items-center gap-1">
          <Zap className="w-[14px] h-[14px] text-surface-deep" />
          <span className="font-label-caps text-[10px] text-surface-deep font-bold">ANALYSÉ</span>
        </div>
      )}
      <div className="p-stack-md flex flex-col gap-stack-sm relative">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
              {entry.league} • {entry.time}
            </span>
            <h3 className="font-headline-sm text-headline-sm text-on-surface mt-1">
              {entry.home} vs {entry.away}
            </h3>
          </div>
          <StatusBadge status={entry.status} />
        </div>

        {/* Prediction & Score */}
        <div className="grid grid-cols-2 gap-gutter mt-stack-sm pt-stack-sm border-t border-outline-variant/30">
          <div>
            <span className="font-label-caps text-[10px] text-on-surface-variant">
              PRÉDICTION IA
            </span>
            <div className="flex flex-col">
              <span className="font-body-lg text-body-lg text-ia-gold">{entry.ai_pick}</span>
              <span className="text-xs text-on-surface-variant">Cote: {entry.odds.toFixed(2)}</span>
            </div>
          </div>
          <div className="text-right border-l border-outline-variant/30 pl-gutter">
            <span className="font-label-caps text-[10px] text-on-surface-variant">
              {entry.status === "in_progress" ? "SCORE LIVE" : "RÉSULTAT FINAL"}
            </span>
            <div className="flex flex-col">
              <span
                className={`font-stat-value text-stat-value text-on-surface ${
                  entry.status === "in_progress" ? "animate-pulse text-secondary" : ""
                }`}
              >
                {entry.result ?? "-"}
              </span>
              {entry.accuracy != null && (
                <span className="text-xs text-success-green">Précision {entry.accuracy}%</span>
              )}
              {entry.status === "in_progress" && entry.live_minute && (
                <span className="text-xs text-on-surface-variant">{entry.live_minute}' Minute</span>
              )}
              {entry.status === "lost" && (
                <span className="text-xs text-error">Volatilité Élevée</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Action */}
      <Link
        href={`/match/${entry.id}`}
        className="bg-surface-container-high/50 px-stack-md py-2 flex justify-between items-center text-on-surface-variant hover:text-ia-gold transition-colors"
      >
        <span className="text-[11px] font-label-caps">
          {entry.status === "in_progress" ? "VOIR LE LIVE TRACKER" : "VOIR L'ANALYSE DÉTAILLÉE"}
        </span>
        <ChevronRight className="w-[18px] h-[18px]" />
      </Link>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────
export default function HistoryPage() {
  const [showPerformanceCard, setShowPerformanceCard] = useState(true);

  const groups: DateGroup[] = [
    {
      label: "AUJOURD'HUI — 24 MAI",
      entries: [
        {
          id: "m1", date: "2026-05-24", league: "Premier League", home: "Man. City", away: "Arsenal",
          time: "20:00", status: "won", ai_pick: "Victoire Domicile", odds: 1.85,
          result: "3 - 1", accuracy: 92, is_analyzed: true,
        },
        {
          id: "m2", date: "2026-05-24", league: "La Liga", home: "Real Madrid", away: "Betis",
          time: "18:30", status: "lost", ai_pick: "Plus de 2.5 Buts", odds: 1.62,
          result: "1 - 0", accuracy: undefined, is_analyzed: false,
        },
      ],
    },
    {
      label: "HIER — 23 MAI",
      entries: [
        {
          id: "m3", date: "2026-05-23", league: "Champions League", home: "Dortmund", away: "PSG",
          time: "21:00", status: "in_progress", ai_pick: "Les deux marquent", odds: 1.55,
          result: "1 - 1", live_minute: "72", is_analyzed: true,
        },
        {
          id: "m4", date: "2026-05-23", league: "Ligue 1", home: "Marseille", away: "Lyon",
          time: "21:00", status: "won", ai_pick: "Handicap (0) H", odds: 1.95,
          result: "2 - 0", accuracy: 100, is_analyzed: false,
        },
      ],
    },
  ];

  return (
    <div className="bg-surface-deep text-on-surface font-body-md antialiased min-h-screen pb-32">
      {/* Atmospheric background */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary-container/10 rounded-full blur-[120px]" />
        <div className="absolute top-[40%] -right-[10%] w-[30%] h-[30%] bg-ia-gold/5 rounded-full blur-[100px]" />
      </div>

      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-background border-b border-outline-variant flex justify-between items-center h-14 px-margin-mobile">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center border border-primary">
            <User className="w-5 h-5 text-primary" />
          </div>
          <h1 className="font-headline-lg text-headline-lg font-bold text-ia-gold tracking-tight">
            FASOBET
          </h1>
        </Link>
        <div className="flex items-center gap-2">
          <span className="font-label-caps text-label-caps text-ia-gold">5,400 FCFA</span>
        </div>
      </header>

      {/* Success Rate Summary Sticky */}
      <section className="mt-14 sticky top-14 z-40 bg-surface-deep/95 backdrop-blur-md border-b border-outline-variant px-margin-mobile py-stack-md">
        <div className="flex items-center justify-between gap-gutter">
          <div className="flex flex-col gap-1">
            <span className="font-label-caps text-label-caps text-on-surface-variant opacity-70">
              TAUX DE RÉUSSITE
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-stat-value text-stat-value text-ia-gold">78%</span>
              <span className="text-[10px] text-success-green flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" /> +2.4%
              </span>
            </div>
          </div>
          <div className="flex items-center gap-gutter">
            <div className="flex flex-col gap-1 text-right">
              <span className="font-label-caps text-label-caps text-on-surface-variant opacity-70">
                PRÉDICTIONS CE MOIS
              </span>
              <span className="font-stat-value text-stat-value text-on-surface">124</span>
            </div>
            <SuccessRing percent={78} />
          </div>
        </div>
      </section>

      {/* Prediction History List */}
      <main className="px-margin-mobile mt-stack-lg space-y-stack-lg">
        {groups.map((group) => (
          <div key={group.label}>
            {/* Date Header */}
            <div className="flex items-center gap-4 py-2">
              <span className="font-label-caps text-label-caps text-on-surface-variant">
                {group.label}
              </span>
              <div className="h-px flex-1 bg-outline-variant" />
            </div>

            {group.entries.map((entry) => (
              <HistoryCard key={entry.id} entry={entry} />
            ))}
          </div>
        ))}
      </main>

      {/* Performance Insights Floating Card */}
      {showPerformanceCard && (
        <div className="fixed bottom-24 left-margin-mobile right-margin-mobile z-40">
          <div className="bg-primary-container border border-primary/40 p-4 shadow-2xl flex items-center gap-4 rounded">
            <div className="p-2 bg-on-primary-fixed-variant rounded-full">
              <BarChart3 className="w-5 h-5 text-ia-gold" />
            </div>
            <div className="flex-1">
              <p className="font-label-caps text-on-primary-container text-[11px]">
                ANALYSE DE PERFORMANCE
              </p>
              <p className="font-body-md text-on-surface text-xs mt-0.5">
                Votre profitabilité sur les 7 derniers jours est de{" "}
                <span className="text-ia-gold font-bold">+18.5%</span>.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPerformanceCard(false)}
              className="text-on-surface-variant hover:text-error transition-colors"
              aria-label="Fermer l'analyse de performance"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* BottomNavBar */}
      <nav className="fixed bottom-0 w-full z-50 bg-surface-deep border-t border-outline-variant flex justify-around items-center h-[72px] px-base">
        <Link
          href="/dashboard"
          className="flex flex-col items-center justify-center text-ia-gold gap-1 hover:text-on-surface transition-colors active:opacity-80"
        >
          <ChartBar className="w-6 h-6" />
          <span className="font-label-caps text-label-caps uppercase">ANALYSES</span>
        </Link>
        <Link
          href="#"
          className="flex flex-col items-center justify-center text-on-surface-variant gap-1 hover:text-on-surface transition-colors active:opacity-80"
        >
          <ScrollText className="w-6 h-6" />
          <span className="font-label-caps text-label-caps uppercase">COUPON</span>
        </Link>
        <Link
          href="#"
          className="flex flex-col items-center justify-center text-on-surface-variant gap-1 hover:text-on-surface transition-colors active:opacity-80"
        >
          <Medal className="w-6 h-6" />
          <span className="font-label-caps text-label-caps uppercase">PRÉMIUM</span>
        </Link>
        <Link
          href="#"
          className="flex flex-col items-center justify-center text-on-surface-variant gap-1 hover:text-on-surface transition-colors active:opacity-80"
        >
          <User className="w-6 h-6" />
          <span className="font-label-caps text-label-caps uppercase">COMPTE</span>
        </Link>
      </nav>
    </div>
  );
}
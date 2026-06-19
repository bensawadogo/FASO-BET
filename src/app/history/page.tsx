"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  User,
  ChevronRight,
  TrendingUp,
  X,
  BarChart3,
  Zap,
  Filter,
} from "lucide-react";
import { BottomNavBar } from "@/components/ui/BottomNavBar";
import { apiClient } from "@/lib/api-client";
import { routes } from "@/lib/routes";

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
        href={routes.matchDetail(entry.id)}
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

// ─── Mini ROI chart (SVG) ──────────────────────────────────
function RoiChart({ data }: { data: { date: string; roi: number }[] }) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map(d => Math.abs(d.roi)), 1);
  const w = 200, h = 60;
  return (
    <svg width={w} height={h} className="w-full max-w-[200px]" viewBox={`0 0 ${w} ${h}`}>
      {data.map((d, i) => {
        const x = (i / (data.length - 1)) * (w - 4) + 2;
        const barH = (Math.abs(d.roi) / max) * (h - 8);
        const y = d.roi >= 0 ? h - 4 - barH : h - 4;
        const color = d.roi >= 0 ? "#34d399" : "#ef4444";
        return <rect key={i} x={x - 1} y={y} width={Math.max(w / data.length - 2, 2)} height={Math.max(barH, 1)} fill={color} rx={1} opacity={0.8} />;
      })}
    </svg>
  );
}

// ─── Inline filter chips ───────────────────────────────────
function FilterChips({ leagues, selected, onChange }: { leagues: string[]; selected: string; onChange: (v: string) => void }) {
  const all = ["Tous", ...leagues];
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
      {all.map((l) => (
        <button key={l} onClick={() => onChange(l === "Tous" ? "" : l)} className={`font-black text-[9px] uppercase px-3 py-1.5 rounded-full whitespace-nowrap transition-all ${(selected === "" && l === "Tous") || selected === l ? "bg-ia-gold text-surface-deep" : "bg-surface-raised border border-outline-variant text-text-secondary"}`}>
          {l}
        </button>
      ))}
    </div>
  );
}
function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86400000);

  if (diffDays === 0) return `AUJOURD'HUI — ${d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }).toUpperCase()}`;
  if (diffDays === 1) return `HIER — ${d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }).toUpperCase()}`;
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' }).toUpperCase();
}

function mapResultToStatus(result: string): HistoryEntry["status"] {
  if (result === "won") return "won";
  if (result === "lost") return "lost";
  return "in_progress";
}

// ─── Main Page ─────────────────────────────────────────────
export default function HistoryPage() {
  const [showPerformanceCard, setShowPerformanceCard] = useState(true);
  const [competFilter, setCompetFilter] = useState("");
  const [historyData, setHistoryData] = useState<{ results: { id: string; match: { home: string; away: string; date: string; league: string }; prediction: string; confidence: number; result: string }[]; count: number }>({ results: [], count: 0 });

  useEffect(() => {
    apiClient.controlApi.getHistorical().then((res) => {
      if (res.success && res.data) {
        setHistoryData(res.data);
      }
    }).catch((err) => {
      console.error("History fetch failed", err);
      setHistoryData({ results: [], count: 0 });
    });
  }, []);

  const allItems = historyData.results;
  const competitions = useMemo(() => {
    const s = new Set<string>();
    allItems.forEach((i) => { if (i.match.league) s.add(i.match.league); });
    return Array.from(s).sort();
  }, [allItems]);

  const filtered = competFilter ? allItems.filter((i) => i.match.league === competFilter) : allItems;

  const items = filtered;
  const total = items.length;
  const won = items.filter((i) => i.result === "won").length;
  const winRate = total > 0 ? Math.round((won / total) * 100) : 0;

  // ROI per day for chart
  const roiByDate = useMemo(() => {
    const map = new Map<string, { wins: number; losses: number }>();
    items.forEach((i) => {
      const key = i.match.date ? i.match.date.slice(0, 10) : "unknown";
      const entry = map.get(key) || { wins: 0, losses: 0 };
      if (i.result === "won") entry.wins++;
      else if (i.result === "lost") entry.losses++;
      map.set(key, entry);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, roi: ((v.wins - v.losses) / Math.max(v.wins + v.losses, 1)) * 100 }));
  }, [items]);

  // Group by date
  const dateMap = new Map<string, HistoryEntry[]>();
  items.forEach((item) => {
    const dateKey = item.match.date ? item.match.date.slice(0, 10) : "unknown";
    const entry: HistoryEntry = {
      id: item.id,
      date: item.match.date || "",
      league: item.match.league || "",
      home: item.match.home || "",
      away: item.match.away || "",
      time: item.match.date ? new Date(item.match.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : "",
      status: mapResultToStatus(item.result),
      ai_pick: item.prediction || "",
      odds: item.confidence ? item.confidence / 20 : 1.5,
      result: undefined,
      accuracy: item.confidence || undefined,
      is_analyzed: true,
    };
    const existing = dateMap.get(dateKey) || [];
    existing.push(entry);
    dateMap.set(dateKey, existing);
  });

  const groups: DateGroup[] = Array.from(dateMap.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, entries]) => ({
      label: formatDateLabel(date),
      entries,
    }));

  return (
    <div className="bg-surface-deep text-on-surface font-body-md antialiased min-h-screen pb-32">
      {/* Atmospheric background */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary-container/10 rounded-full blur-[120px]" />
        <div className="absolute top-[40%] -right-[10%] w-[30%] h-[30%] bg-ia-gold/5 rounded-full blur-[100px]" />
      </div>

      {/* TopAppBar */}
      <header className="fixed top-14 w-full z-50 bg-background border-b border-outline-variant flex justify-between items-center h-14 px-margin-mobile">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center border border-primary">
            <User className="w-5 h-5 text-primary" />
          </div>
          <h1 className="font-headline-lg text-headline-lg font-bold text-ia-gold tracking-tight">
            fasobet by ben rachid sawadogo
          </h1>
        </Link>
        <div className="flex items-center gap-2">
          <span className="font-label-caps text-label-caps text-ia-gold">5,400 FCFA</span>
        </div>
      </header>

      {/* Success Rate Summary Sticky */}
      <section className="mt-28 sticky top-28 z-40 bg-surface-deep/95 backdrop-blur-md border-b border-outline-variant px-margin-mobile py-stack-md">
        <div className="flex items-center justify-between gap-gutter">
          <div className="flex flex-col gap-1">
            <span className="font-label-caps text-label-caps text-on-surface-variant opacity-70">
              TAUX DE RÉUSSITE
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-stat-value text-stat-value text-ia-gold">{winRate}%</span>
              <span className="text-[10px] text-success-green flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" /> +{winRate > 50 ? winRate - 50 : 0}%
              </span>
            </div>
          </div>
          <div className="flex items-center gap-gutter">
            <RoiChart data={roiByDate} />
            <div className="flex flex-col gap-1 text-right">
              <span className="font-label-caps text-label-caps text-on-surface-variant opacity-70">
                {competFilter || "PRÉDICTIONS"}
              </span>
              <span className="font-stat-value text-stat-value text-on-surface">{total}</span>
            </div>
            <SuccessRing percent={winRate} />
          </div>
        </div>
      </section>

      {/* Prediction History List */}
      <main className="px-margin-mobile mt-stack-lg space-y-4">
        {competitions.length > 1 && (
          <FilterChips leagues={competitions} selected={competFilter} onChange={setCompetFilter} />
        )}
        {groups.length === 0 && (
          <div className="text-center py-12 text-on-surface-variant">
            Aucune prédiction historique trouvée.
          </div>
        )}
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
      {showPerformanceCard && groups.length > 0 && (
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
                Votre profitabilité sur les {total} prédictions est de{" "}
                <span className="text-ia-gold font-bold">{winRate}%</span>.
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
      <BottomNavBar />
    </div>
  );
}
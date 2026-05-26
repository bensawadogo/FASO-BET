"use client";

import React, { useEffect, useState } from "react";
import { BarChart3, Database, Calendar, TrendingUp, Loader2, AlertTriangle, Layers, Crosshair } from "lucide-react";
import { apiClient } from "../../lib/api-client";

interface MonthlyProgress {
  month: string;
  bankersAvg: number;
  allAvg: number;
}

interface TopLeague {
  league: string;
  country: string;
  matchCount: number;
  homeWinRate: number;
  drawRate: number;
  awayWinRate: number;
  avgGoalsHome: number;
  avgGoalsAway: number;
  over25Rate: number;
  bttsRate: number;
}

interface MarketCalibration {
  market: string;
  bucket: string;
  observedAccuracy: number;
  sampleCount: number;
}

interface HistoricalSummary {
  totalMatches: number;
  totalLeagues: number;
  totalCalibrations: number;
  dateRange: { from: string; to: string };
  lastUpdated: string;
}

interface HistoricalData {
  status: string;
  summary: HistoricalSummary;
  monthlyProgress: MonthlyProgress[];
  topLeagues: TopLeague[];
  topCalibrations: MarketCalibration[];
}

function formatNum(n: number): string {
  return n.toLocaleString("fr-FR");
}

function pct(n: number): string {
  return (n * 100).toFixed(1) + "%";
}

export function HistoricalDashboard() {
  const [data, setData] = useState<HistoricalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadHistoricalData() {
      try {
        const response = await apiClient.djangoApiClient.getHistoricalData();
        if (response.success && response.data) {
          setData(response.data);
        } else {
          setError(response.error || "Failed to load historical data");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    loadHistoricalData();
  }, []);

  if (loading) {
    return (
      <section className="bg-surface-container-low border border-outline-variant/10 rounded-2xl p-8">
        <div className="flex items-center justify-center gap-3 text-on-surface-variant">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="font-data-label text-xs uppercase">Chargement des données historiques...</span>
        </div>
      </section>
    );
  }

  if (error || data?.status === "no_data") {
    return (
      <section className="bg-surface-container-low border border-outline-variant/10 rounded-2xl p-8">
        <div className="flex items-center gap-3 text-warning">
          <AlertTriangle className="w-5 h-5" />
          <span className="text-sm">{error || "Données historiques non disponibles (fichiers data/ manquants)"}</span>
        </div>
      </section>
    );
  }

  if (!data) return null;

  const { summary, monthlyProgress, topLeagues, topCalibrations } = data;

  return (
    <section className="bg-surface-container-low border border-outline-variant/10 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-outline-variant/10 flex items-center gap-3">
        <Database className="w-5 h-5 text-primary" />
        <h2 className="font-display-lg text-sm uppercase tracking-wider text-on-surface">
          Intelligence Historique
        </h2>
        <span className="text-[8px] text-on-surface-variant font-data-label ml-auto">
          {summary.totalMatches.toLocaleString()} matchs · {summary.dateRange.from} → {summary.dateRange.to}
        </span>
      </div>

      <div className="p-5 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-surface-container-high rounded-xl p-3 text-center">
            <BarChart3 className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="font-data-label text-[8px] text-on-surface-variant uppercase">Matchs</p>
            <p className="font-display-lg text-lg text-on-surface">{formatNum(summary.totalMatches)}</p>
          </div>
          <div className="bg-surface-container-high rounded-xl p-3 text-center">
            <Layers className="w-4 h-4 text-secondary mx-auto mb-1" />
            <p className="font-data-label text-[8px] text-on-surface-variant uppercase">Ligues</p>
            <p className="font-display-lg text-lg text-on-surface">{summary.totalLeagues}</p>
          </div>
          <div className="bg-surface-container-high rounded-xl p-3 text-center">
            <Crosshair className="w-4 h-4 text-success mx-auto mb-1" />
            <p className="font-data-label text-[8px] text-on-surface-variant uppercase">Calibrations</p>
            <p className="font-display-lg text-lg text-on-surface">{formatNum(summary.totalCalibrations)}</p>
          </div>
          <div className="bg-surface-container-high rounded-xl p-3 text-center">
            <Calendar className="w-4 h-4 text-warning mx-auto mb-1" />
            <p className="font-data-label text-[8px] text-on-surface-variant uppercase">Depuis</p>
            <p className="font-display-lg text-sm text-on-surface">{summary.dateRange.from}</p>
          </div>
        </div>

        {/* Monthly Progress (mini spark bars) */}
        {monthlyProgress && monthlyProgress.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-3.5 h-3.5 text-primary" />
              <span className="font-data-label text-[8px] text-on-surface-variant uppercase">
                Progression mensuelle — Bankers
              </span>
            </div>
            <div className="bg-surface-container-high rounded-xl p-4 max-h-40 overflow-y-auto no-scrollbar">
              <div className="space-y-1">
                {monthlyProgress.slice(-24).map((m) => (
                  <div key={m.month} className="flex items-center gap-2">
                    <span className="font-data-label text-[7px] text-on-surface-variant w-16 shrink-0">
                      {m.month}
                    </span>
                    <div className="flex-1 h-3 bg-surface-container-highest rounded-sm relative overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-primary/60 rounded-sm"
                        style={{ width: m.bankersAvg + "%" }}
                      />
                    </div>
                    <span className="font-data-label text-[7px] text-primary w-8 text-right">
                      {m.bankersAvg.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Top Leagues */}
        {topLeagues && topLeagues.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-3.5 h-3.5 text-secondary" />
              <span className="font-data-label text-[8px] text-on-surface-variant uppercase">
                Top Ligues par volume
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto no-scrollbar">
              {topLeagues.slice(0, 10).map((l) => (
                <div
                  key={`${l.country}::${l.league}`}
                  className="bg-surface-container-high rounded-lg px-3 py-2 flex items-center justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-data-label text-[9px] text-on-surface truncate">{l.league}</p>
                    <p className="font-data-label text-[7px] text-on-surface-variant">{l.country}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-[8px] font-data-label">
                    <span className="text-on-surface-variant">{formatNum(l.matchCount)}</span>
                    <span className="text-success">{pct(l.homeWinRate)}</span>
                    <span className="text-warning">{pct(l.over25Rate)}</span>
                    <span className="text-info">{pct(l.bttsRate)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Market Calibrations */}
        {topCalibrations && topCalibrations.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Crosshair className="w-3.5 h-3.5 text-success" />
              <span className="font-data-label text-[8px] text-on-surface-variant uppercase">
                {"Précision par marché (sample > 100)"}
              </span>
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto no-scrollbar">
              {topCalibrations.slice(0, 10).map((c, i) => (
                <div
                  key={`${c.market}::${c.bucket}::${i}`}
                  className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-high/50 rounded-lg"
                >
                  <span className="font-data-label text-[7px] text-on-surface-variant uppercase w-20 shrink-0">
                    {c.market.replace("_", " ")}
                  </span>
                  <span className="font-data-label text-[7px] text-on-surface-variant w-20 shrink-0">
                    {c.bucket.replace("_", " ")}
                  </span>
                  <div className="flex-1 h-2 bg-surface-container-highest rounded-sm overflow-hidden">
                    <div
                      className={`h-full rounded-sm ${
                        c.observedAccuracy > 0.7
                          ? "bg-success"
                          : c.observedAccuracy > 0.5
                            ? "bg-warning"
                            : "bg-error"
                      }`}
                      style={{ width: c.observedAccuracy * 100 + "%" }}
                    />
                  </div>
                  <span className="font-data-label text-[7px] text-on-surface-variant w-12 text-right">
                    {(c.observedAccuracy * 100).toFixed(0)}%
                  </span>
                  <span className="font-data-label text-[7px] text-on-surface-variant w-12 text-right">
                    n={formatNum(c.sampleCount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

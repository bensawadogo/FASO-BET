"use client";

import React from "react";
import { useLandingStats, formatNumber } from "./LandingStatsFetcher";

export function HeroWinRate() {
  const stats = useLandingStats();
  return <>{stats.win_rate}%</>;
}

export function StatsGrid() {
  const stats = useLandingStats();
  return (
    <>
      <div className="etched-border p-stack-md flex flex-col gap-base">
        <span className="font-stat-value text-stat-value text-primary">{stats.win_rate}%</span>
        <span className="font-label-caps text-label-caps text-text-secondary uppercase">
          Taux de réussite
        </span>
      </div>
      <div className="etched-border p-stack-md flex flex-col gap-base">
        <span className="font-stat-value text-stat-value text-primary">+{formatNumber(stats.total_predictions)}</span>
        <span className="font-label-caps text-label-caps text-text-secondary uppercase">
          Analyses / Mois
        </span>
      </div>
      <div className="etched-border p-stack-md flex flex-col gap-base">
        <span className="font-stat-value text-stat-value text-primary">{formatNumber(stats.total_users)}</span>
        <span className="font-label-caps text-label-caps text-text-secondary uppercase">
          Membres Actifs
        </span>
      </div>
    </>
  );
}

export function JoinCount() {
  const stats = useLandingStats();
  return <>{formatNumber(stats.total_users)}</>;
}

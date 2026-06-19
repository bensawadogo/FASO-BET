"use client";

import React, { useState, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002";

export interface LandingStats {
  win_rate: number;
  total_predictions: number;
  total_users: number;
}

const DEFAULTS: LandingStats = {
  win_rate: 78,
  total_predictions: 5000,
  total_users: 12000,
};

export function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(".", ",")}k`;
  // Rendu différé pour éviter l'erreur d'hydratation
  return typeof window !== 'undefined' ? n.toLocaleString() : n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function useLandingStats(): LandingStats {
  const [stats, setStats] = useState<LandingStats>(DEFAULTS);

  useEffect(() => {
    fetch(`${API_URL}/api/public/stats/`)
      .then((r) => r.json())
      .then((data) => {
        if (data.accuracy_30j != null) {
          setStats({
            win_rate: data.accuracy_30j,
            total_predictions: data.total_predictions ?? 5000,
            total_users: 12000,
          });
        }
      })
      .catch(() => {
        /* garder les valeurs par défaut */
      });
  }, []);

  return stats;
}

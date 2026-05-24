"use client";

import React, { useState } from 'react';
import { SignalBadge } from './SignalBadge';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Activity,
  Target,
} from 'lucide-react';

export interface MatchCardPrediction {
  match_id: string;
  home: string;
  away: string;
  competition: string;
  date: string;
  market: string;
  selection: string;
  min_odds: number;
  confidence: number;
  risk: "FAIBLE" | "MOYEN" | "ELEVE";
  signal: "value_bet" | "neutral" | "avoid";
  value: number;
  consensus_pct: number;
  double_chance?: boolean;
  match_type_warning?: string | null;
  form_display?: { home: string; away: string };
  xg_display?: { home: string; away: string };
  h2h_display?: string;
}

interface MatchCardProps {
  prediction: MatchCardPrediction;
  onAddToCombo?: (prediction: MatchCardPrediction) => void;
  onRemoveFromCombo?: (matchId: string) => void;
  isInCombo?: boolean;
}

const riskConfig = {
  FAIBLE: { label: 'Faible', color: 'text-success border-success/30 bg-success/5' },
  MOYEN: { label: 'Moyen', color: 'text-warning border-warning/30 bg-warning/5' },
  ELEVE: { label: 'Élevé', color: 'text-error border-error/30 bg-error/5' },
};

export function MatchCard({
  prediction,
  onAddToCombo,
  onRemoveFromCombo,
  isInCombo = false,
}: MatchCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const {
    home,
    away,
    competition,
    date,
    market,
    selection,
    min_odds,
    confidence,
    risk,
    signal,
    value,
    consensus_pct,
    form_display,
    xg_display,
    h2h_display,
    match_type_warning,
  } = prediction;

  const edgePct = parseFloat((value * 100).toFixed(1));
  const isHighEdge = edgePct > 8;
  const isValueBet = signal === 'value_bet';

  const startTime = new Date(date).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={`group relative bg-surface-container-low border ${
        isValueBet
          ? 'border-primary/30 shadow-sm shadow-primary/5'
          : signal === 'avoid'
            ? 'border-error/20'
            : 'border-outline-variant/10'
      } rounded-2xl p-5 hover:bg-surface-container-high transition-all duration-200`}
    >
      {/* En-tête : Compétition · Heure + Signal + Risque */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-data-label text-[10px] text-on-surface-variant uppercase tracking-widest truncate">
            {competition} • {startTime}
          </span>
          {match_type_warning && (
            <span className="text-[9px] text-warning font-bold" title={match_type_warning}>
              ⚠️
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <SignalBadge
            type={
              signal === 'value_bet'
                ? 'VALUE'
                : signal === 'avoid'
                  ? 'avoid'
                  : 'MEDIUM'
            }
          />
          <span
            className={`font-data-label text-[9px] px-1.5 py-0.5 rounded border ${
              riskConfig[risk]?.color ?? 'text-on-surface-variant border-outline-variant/10'
            }`}
          >
            {riskConfig[risk]?.label ?? risk}
          </span>
        </div>
      </div>

      {/* Équipes */}
      <div className="flex items-center justify-between gap-4 mb-4">
        {/* Domicile */}
        <div className="flex flex-col items-center flex-1 text-center min-w-0">
          <div className="w-10 h-10 bg-surface-container-highest rounded-lg flex items-center justify-center p-2 mb-2 group-hover:scale-110 transition-transform">
            <span className="text-xs font-bold text-primary">{home[0]}</span>
          </div>
          <span className="font-display-lg text-xs uppercase leading-tight truncate max-w-full">
            {home}
          </span>
        </div>

        {/* VS + Résumé */}
        <div className="flex flex-col items-center gap-1">
          <span className="font-serif italic opacity-20 text-xs">VS</span>
          <div className="flex items-center gap-1 px-2 py-1 bg-surface-container-highest/50 rounded-lg">
            <span className="font-data-label text-[10px] text-on-surface-variant">
              {confidence}%
            </span>
            {isValueBet ? (
              <TrendingUp className="w-3 h-3 text-success" />
            ) : signal === 'avoid' ? (
              <TrendingDown className="w-3 h-3 text-error" />
            ) : (
              <Activity className="w-3 h-3 text-warning" />
            )}
          </div>
        </div>

        {/* Extérieur */}
        <div className="flex flex-col items-center flex-1 text-center min-w-0">
          <div className="w-10 h-10 bg-surface-container-highest rounded-lg flex items-center justify-center p-2 mb-2 group-hover:scale-110 transition-transform">
            <span className="text-xs font-bold text-primary">{away[0]}</span>
          </div>
          <span className="font-display-lg text-xs uppercase leading-tight truncate max-w-full">
            {away}
          </span>
        </div>
      </div>

      {/* Détails du marché */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-surface-container-highest/40 rounded-lg p-2 text-center">
          <p className="font-data-label text-[8px] text-on-surface-variant uppercase">
            Marché
          </p>
          <p className="font-data-label text-[10px] text-on-surface truncate">
            {market}
          </p>
        </div>
        <div className="bg-surface-container-highest/40 rounded-lg p-2 text-center">
          <p className="font-data-label text-[8px] text-on-surface-variant uppercase">
            Sélection
          </p>
          <p className="font-data-label text-[10px] text-on-surface truncate">
            {selection.length > 18 ? selection.slice(0, 16) + '…' : selection}
          </p>
        </div>
        <div className="bg-surface-container-highest/40 rounded-lg p-2 text-center">
          <p className="font-data-label text-[8px] text-on-surface-variant uppercase">
            Cote
          </p>
          <p className="font-bold text-sm text-primary">{min_odds.toFixed(2)}</p>
        </div>
      </div>

      {/* Edge et Barre de consensus */}
      <div className="space-y-2 mb-3">
        {/* Edge bar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1">
            <div className="flex justify-between mb-1">
              <span className="font-data-label text-[9px] text-on-surface-variant uppercase">
                Edge
              </span>
              <span
                className={`font-bold text-xs ${
                  isValueBet ? 'text-success' : 'text-on-surface-variant'
                }`}
              >
                {edgePct >= 0 ? '+' : ''}
                {edgePct}%
              </span>
            </div>
            <div className="w-full bg-surface-container-highest rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isValueBet
                    ? 'bg-success'
                    : signal === 'avoid'
                      ? 'bg-error'
                      : 'bg-warning'
                }`}
                style={{
                  width: `${Math.min(100, Math.max(2, edgePct * 4))}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Consensus */}
        <div className="flex items-center gap-2">
          <Target className="w-3 h-3 text-on-surface-variant" />
          <div className="flex-1">
            <div className="flex justify-between mb-0.5">
              <span className="font-data-label text-[8px] text-on-surface-variant uppercase">
                Consensus
              </span>
              <span className="font-data-label text-[8px] text-on-surface-variant">
                {consensus_pct}%
              </span>
            </div>
            <div className="w-full bg-surface-container-highest rounded-full h-1 overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-500"
                style={{ width: `${consensus_pct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Détails analytiques (expandable) */}
      {(form_display || xg_display || h2h_display) && (
        <>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-center gap-1 py-1.5 text-[10px] text-on-surface-variant hover:text-primary transition-colors"
          >
            <BarChart3 className="w-3 h-3" />
            <span className="font-data-label uppercase">
              {showDetails ? 'Masquer les stats' : 'Voir les stats'}
            </span>
            {showDetails ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>

          {showDetails && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3 animate-in fade-in slide-in-from-top-2 duration-200">
              {form_display && (
                <div className="bg-surface-container-highest/40 rounded-lg p-2">
                  <p className="font-data-label text-[8px] text-on-surface-variant uppercase mb-1">
                    Forme
                  </p>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-on-surface font-bold">H:</span>
                    <span className="text-[10px] text-on-surface">{form_display.home}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-on-surface font-bold">A:</span>
                    <span className="text-[10px] text-on-surface">{form_display.away}</span>
                  </div>
                </div>
              )}
              {xg_display && (
                <div className="bg-surface-container-highest/40 rounded-lg p-2">
                  <p className="font-data-label text-[8px] text-on-surface-variant uppercase mb-1">
                    xG Diff
                  </p>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-on-surface font-bold">H:</span>
                    <span
                      className={`text-[10px] ${
                        xg_display.home.startsWith('+') ? 'text-success' : 'text-error'
                      }`}
                    >
                      {xg_display.home}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-on-surface font-bold">A:</span>
                    <span
                      className={`text-[10px] ${
                        xg_display.away.startsWith('+') ? 'text-success' : 'text-error'
                      }`}
                    >
                      {xg_display.away}
                    </span>
                  </div>
                </div>
              )}
              {h2h_display && (
                <div className="bg-surface-container-highest/40 rounded-lg p-2">
                  <p className="font-data-label text-[8px] text-on-surface-variant uppercase mb-1">
                    H2H
                  </p>
                  <p className="text-[10px] text-on-surface leading-tight">{h2h_display}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Bouton d'action */}
      <div className="flex items-center justify-between pt-2 border-t border-outline-variant/10">
        <span
          className={`font-display-lg text-lg ${
            isHighEdge ? 'text-primary' : 'text-on-surface'
          }`}
        >
          EDGE {edgePct >= 0 ? '+' : ''}
          {edgePct}%
        </span>

        {isInCombo ? (
          <button
            onClick={() => onRemoveFromCombo?.(prediction.match_id)}
            className="px-4 py-2 rounded-xl border border-error/30 text-error font-bold uppercase text-[10px] tracking-widest hover:bg-error/10 transition-all"
          >
            Retirer
          </button>
        ) : (
          <button
            onClick={() => onAddToCombo?.(prediction)}
            disabled={signal === 'avoid'}
            className={`px-4 py-2 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all ${
              signal === 'avoid'
                ? 'border border-outline-variant/10 text-on-surface-variant opacity-40 cursor-not-allowed'
                : 'border border-primary/20 text-primary hover:bg-primary hover:text-surface'
            }`}
          >
            {signal === 'avoid' ? 'Éviter' : 'Ajouter'}
          </button>
        )}
      </div>
    </div>
  );
}

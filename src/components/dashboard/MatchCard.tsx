"use client";

import React, { useState, useCallback } from "react";
import { SignalBadge } from "./SignalBadge";
import {
  Trophy,
  Sun,
  PlusCircle,
  CheckCircle2,
  BrainCircuit,
  Swords,
} from "lucide-react";

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
  home_form?: string;
  away_form?: string;
  home_logo?: string;
  away_logo?: string;
  temperature?: number;
  match_type?: string;
  prob_home?: number;
  prob_draw?: number;
  prob_away?: number;
}

interface MatchCardProps {
  prediction: MatchCardPrediction;
  onAddToCombo?: (prediction: MatchCardPrediction) => void;
  onRemoveFromCombo?: (matchId: string) => void;
  isInCombo?: boolean;
}

function FormDisplay({ form, team }: { form?: string; team: string }) {
  if (!form) return null;
  const chars = form.split("").slice(-5);
  return (
    <>
      <span className="text-[10px] font-label-caps text-on-surface-variant">
        {team}:
      </span>
      {chars.map((c, i) => (
        <span
          key={i}
          className={
            c === "W"
              ? "text-success-green"
              : c === "D"
                ? "text-on-surface-variant"
                : "text-error"
          }
        >
          {c}
        </span>
      ))}
    </>
  );
}

export function MatchCard({
  prediction,
  onAddToCombo,
  onRemoveFromCombo,
  isInCombo = false,
}: MatchCardProps) {
  const [showAddedFeedback, setShowAddedFeedback] = useState(false);
  const isAvoid = prediction.signal === "avoid";

  const dateStr = new Date(prediction.date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    weekday: "short",
  });
  const timeStr = new Date(prediction.date).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const probHome = prediction.prob_home ?? prediction.confidence;
  const probDraw = prediction.prob_draw ?? 100 - prediction.confidence - prediction.value * 100;
  const probAway = prediction.prob_away ?? prediction.value * 100;

  const iaPick = probHome >= probDraw && probHome >= probAway
    ? "1"
    : probDraw >= probAway
      ? "X"
      : "2";

  const handleAddClick = useCallback(() => {
    if (isInCombo && onRemoveFromCombo) {
      onRemoveFromCombo(prediction.match_id);
      return;
    }
    if (onAddToCombo) {
      onAddToCombo(prediction);
      setShowAddedFeedback(true);
      setTimeout(() => setShowAddedFeedback(false), 2000);
    }
  }, [isInCombo, prediction, onAddToCombo, onRemoveFromCombo]);

  return (
    <article
      className={`bg-surface-raised border rounded-lg overflow-hidden flex flex-col transition-all ${
        isAvoid
          ? "border-outline-variant/40 opacity-60 grayscale-[0.3]"
          : "border-outline-variant hover:border-primary/30"
      }`}
    >
      {/* Header: Competition & Time */}
      <div className="px-stack-md py-base border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-lowest">
        <div className="flex items-center gap-base">
          <Trophy className="w-4 h-4 text-ia-gold" />
          <span className="font-label-caps text-label-caps text-on-surface-variant truncate max-w-[180px]">
            {prediction.competition}
          </span>
        </div>
        <span className="font-label-caps text-label-caps text-ia-gold">
          {dateStr} · {timeStr}
        </span>
      </div>

      {/* Body: Teams & Identity */}
      <div className="p-stack-md flex flex-col gap-stack-md">
        <div className="flex justify-between items-center px-base">
          {/* Team Home */}
          <div className="flex flex-col items-center gap-base w-1/3">
            <div className="w-12 h-12 bg-surface-container-high rounded flex items-center justify-center border border-outline-variant/50 overflow-hidden">
              {prediction.home_logo ? (
                <img
                  src={prediction.home_logo}
                  alt={prediction.home}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <span className="font-headline-sm text-text-primary text-lg">
                  {prediction.home.charAt(0)}
                </span>
              )}
            </div>
            <span className="font-headline-sm text-center leading-tight text-text-primary text-xs sm:text-sm">
              {prediction.home}
            </span>
          </div>

          {/* VS Divider */}
          <div className="flex flex-col items-center">
            <span className="font-label-caps text-label-caps text-on-surface-variant opacity-50">
              VS
            </span>
            <div className="h-8 w-[1px] bg-outline-variant/30" />
          </div>

          {/* Team Away */}
          <div className="flex flex-col items-center gap-base w-1/3">
            <div className="w-12 h-12 bg-surface-container-high rounded flex items-center justify-center border border-outline-variant/50 overflow-hidden">
              {prediction.away_logo ? (
                <img
                  src={prediction.away_logo}
                  alt={prediction.away}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <span className="font-headline-sm text-text-primary text-lg">
                  {prediction.away.charAt(0)}
                </span>
              )}
            </div>
            <span className="font-headline-sm text-center leading-tight text-text-primary text-xs sm:text-sm">
              {prediction.away}
            </span>
          </div>
        </div>

        {/* Strategic Context Tags */}
        <div className="flex flex-wrap gap-base justify-center">
          {/* Form */}
          {(prediction.home_form || prediction.away_form) && (
            <div className="bg-primary-container/20 border border-primary-container px-base py-0.5 rounded flex items-center gap-1">
              <FormDisplay form={prediction.home_form} team={prediction.home} />
              <span className="text-[10px] font-label-caps text-on-surface-variant mx-1">
                vs
              </span>
              <FormDisplay form={prediction.away_form} team={prediction.away} />
            </div>
          )}

          {/* Temperature */}
          {prediction.temperature != null && (
            <div className="bg-surface-container-high border border-outline-variant px-base py-0.5 rounded flex items-center gap-1">
              <Sun className="w-[14px] h-[14px]" />
              <span className="text-[10px] font-label-caps">
                {prediction.temperature}°C
              </span>
            </div>
          )}

          {/* Crucial tag */}
          {prediction.match_type === "crucial" && (
            <div className="bg-error-container/20 border border-error-container px-base py-0.5 rounded flex items-center gap-base">
              <span className="text-[10px] font-label-caps text-error">
                CRUCIAL
              </span>
            </div>
          )}
        </div>

        {/* Warning */}
        {prediction.match_type_warning && (
          <div className="px-3 py-2 rounded bg-warning/20 border border-warning/40 text-warning text-xs">
            {prediction.match_type_warning}
          </div>
        )}

        {/* IA PROBABILITIES */}
        <div className="mt-base">
          <div className="flex justify-between items-center mb-base">
            <div className="flex items-center gap-base">
              <BrainCircuit className="w-[18px] h-[18px] text-ia-gold" />
              <span className="font-label-caps text-label-caps text-ia-gold">
                ANALYSE IA
              </span>
            </div>
            <span className="bg-ia-gold text-surface-deep text-[10px] font-bold px-base py-0.5 rounded shadow-[0_0_15px_-3px_rgba(245,158,11,0.2)]">
              IA RECOMMANDE {iaPick}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-base h-12">
            {/* Home */}
            <div
              className={`relative rounded flex flex-col items-center justify-center overflow-hidden ${
                iaPick === "1"
                  ? "bg-surface-container border-2 border-ia-gold shadow-[0_0_15px_-3px_rgba(245,158,11,0.2)]"
                  : "bg-surface-container-low border border-outline-variant/30"
              }`}
            >
              {iaPick === "1" && (
                <div className="absolute inset-0 bg-ia-gold/10 pointer-events-none" />
              )}
              <span className="font-label-caps text-label-caps text-on-surface-variant">
                1
              </span>
              <span
                className={`font-stat-value text-stat-value ${
                  iaPick === "1" ? "text-ia-gold" : "text-text-primary"
                }`}
              >
                {probHome.toFixed(0)}%
              </span>
            </div>

            {/* Draw */}
            <div
              className={`relative rounded flex flex-col items-center justify-center ${
                iaPick === "X"
                  ? "bg-surface-container border-2 border-ia-gold shadow-[0_0_15px_-3px_rgba(245,158,11,0.2)]"
                  : "bg-surface-container-low border border-outline-variant/30"
              }`}
            >
              {iaPick === "X" && (
                <div className="absolute inset-0 bg-ia-gold/10 pointer-events-none" />
              )}
              <span className="font-label-caps text-label-caps text-on-surface-variant">
                X
              </span>
              <span
                className={`font-stat-value text-stat-value ${
                  iaPick === "X" ? "text-ia-gold" : "text-text-primary"
                }`}
              >
                {probDraw.toFixed(0)}%
              </span>
            </div>

            {/* Away */}
            <div
              className={`relative rounded flex flex-col items-center justify-center ${
                iaPick === "2"
                  ? "bg-surface-container border-2 border-ia-gold shadow-[0_0_15px_-3px_rgba(245,158,11,0.2)]"
                  : "bg-surface-container-low border border-outline-variant/30"
              }`}
            >
              {iaPick === "2" && (
                <div className="absolute inset-0 bg-ia-gold/10 pointer-events-none" />
              )}
              <span className="font-label-caps text-label-caps text-on-surface-variant">
                2
              </span>
              <span
                className={`font-stat-value text-stat-value ${
                  iaPick === "2" ? "text-ia-gold" : "text-text-primary"
                }`}
              >
                {probAway.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        {/* Signal Badge */}
        <SignalBadge type={prediction.signal === "value_bet" ? "VALUE" : prediction.signal === "avoid" ? "avoid" : "MEDIUM"} />
      </div>

      {/* Footer: Primary Action */}
      <div className="p-stack-md pt-0">
        <button
          onClick={handleAddClick}
          className={`w-full h-touch-target-min font-label-caps rounded-lg transition-all active:scale-95 flex items-center justify-center gap-stack-sm border uppercase tracking-widest font-bold text-sm ${
            isInCombo || showAddedFeedback
              ? "bg-success-green text-surface-deep border-success-green/30"
              : "bg-primary-container text-text-primary border-outline-variant/20 hover:bg-primary-container/80"
          }`}
          aria-label={
            isInCombo
              ? "Retirer du coupon"
              : showAddedFeedback
                ? "Ajouté au coupon"
                : "Ajouter au coupon"
          }
        >
          {isInCombo || showAddedFeedback ? (
            <>
              <CheckCircle2 className="w-5 h-5" />
              {isInCombo ? "RETIRER DU COUPON" : "AJOUTÉ"}
            </>
          ) : (
            <>
              <PlusCircle className="w-5 h-5" />
              AJOUTER AU COUPON
            </>
          )}
        </button>
        <button
          type="button"
          className="w-full mt-stack-sm h-touch-target-min bg-transparent text-on-surface-variant font-label-caps rounded flex items-center justify-center gap-stack-sm border border-outline-variant/40 hover:bg-surface-container-high transition-colors"
        >
          <Swords className="w-4 h-4" />
          VOIR L'ANALYSE DÉTAILLÉE
        </button>
      </div>
    </article>
  );
}
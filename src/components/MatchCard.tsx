"use client";

import type { MatchPrediction } from "@/types/agent3.types";
import { SignalBadge } from "./SignalBadge";
import { Trophy, PlusCircle, CheckCircle2, BrainCircuit, Swords } from "lucide-react";

export type { MatchCardPrediction } from "./dashboard/MatchCard";

function formToDots(form?: string): string {
  if (!form) return "○○○○○";
  return form
    .split("")
    .slice(-5)
    .map((c) => (c === "W" ? "●" : c === "D" ? "◐" : "○"))
    .join("");
}

export function MatchCard({ prediction }: { prediction: MatchPrediction }) {
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

  const probHome = prediction.confidence;
  const probAway = prediction.value * 100;
  const probDraw = 100 - probHome - probAway;

  const iaPick =
    probHome >= probDraw && probHome >= probAway
      ? "1"
      : probDraw >= probAway
        ? "X"
        : "2";

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

      {/* Body */}
      <div className="p-stack-md flex flex-col gap-stack-md">
        <div className="flex justify-between items-center px-base">
          <div className="flex flex-col items-center gap-base w-1/3">
            <div className="w-12 h-12 bg-surface-container-high rounded flex items-center justify-center border border-outline-variant/50">
              <span className="font-headline-sm text-text-primary text-lg">
                {prediction.home.charAt(0)}
              </span>
            </div>
            <span className="font-headline-sm text-center leading-tight text-text-primary text-xs sm:text-sm">
              {prediction.home}
            </span>
          </div>

          <div className="flex flex-col items-center">
            <span className="font-label-caps text-label-caps text-on-surface-variant opacity-50">
              VS
            </span>
            <div className="h-8 w-[1px] bg-outline-variant/30" />
          </div>

          <div className="flex flex-col items-center gap-base w-1/3">
            <div className="w-12 h-12 bg-surface-container-high rounded flex items-center justify-center border border-outline-variant/50">
              <span className="font-headline-sm text-text-primary text-lg">
                {prediction.away.charAt(0)}
              </span>
            </div>
            <span className="font-headline-sm text-center leading-tight text-text-primary text-xs sm:text-sm">
              {prediction.away}
            </span>
          </div>
        </div>

        {/* Form Display */}
        {prediction.form_display && (
          <div className="bg-primary-container/20 border border-primary-container px-base py-0.5 rounded flex items-center justify-center gap-2">
            <span className="text-[10px] font-label-caps text-on-surface-variant">
              FORME:
            </span>
            <span className="text-[10px] font-label-caps text-success-green">
              {formToDots(prediction.form_display.home)}
            </span>
            <span className="text-[10px] font-label-caps text-on-surface-variant">
              vs
            </span>
            <span className="text-[10px] font-label-caps text-on-surface-variant">
              {formToDots(prediction.form_display.away)}
            </span>
          </div>
        )}

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
              <span className="font-label-caps text-label-caps text-on-surface-variant">1</span>
              <span className={`font-stat-value text-stat-value ${iaPick === "1" ? "text-ia-gold" : "text-text-primary"}`}>
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
              <span className="font-label-caps text-label-caps text-on-surface-variant">X</span>
              <span className={`font-stat-value text-stat-value ${iaPick === "X" ? "text-ia-gold" : "text-text-primary"}`}>
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
              <span className="font-label-caps text-label-caps text-on-surface-variant">2</span>
              <span className={`font-stat-value text-stat-value ${iaPick === "2" ? "text-ia-gold" : "text-text-primary"}`}>
                {probAway.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        <SignalBadge signal={prediction.signal} />

        {isAvoid && (
          <p className="text-xs text-on-surface-variant/50">
            Match déconseillé — ne pas inclure dans un combiné.
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="p-stack-md pt-0">
        <div className="w-full h-touch-target-min bg-primary-container text-text-primary font-label-caps rounded-lg transition-all active:scale-95 flex items-center justify-center gap-stack-sm border border-outline-variant/20 uppercase tracking-widest font-bold text-sm">
          <PlusCircle className="w-5 h-5" />
          AJOUTER AU COUPON
        </div>
      </div>
    </article>
  );
}
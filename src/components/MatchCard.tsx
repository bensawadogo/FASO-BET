"use client";

import type { MatchPrediction } from "@/types/agent3.types";
import { SignalBadge } from "./SignalBadge";

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
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <article
      className={`glass p-5 transition-opacity ${
        isAvoid ? "opacity-50 grayscale" : ""
      }`}
    >
      {prediction.match_type_warning && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-warning/20 border border-warning/40 text-warning text-sm">
          {prediction.match_type_warning}
        </div>
      )}

      <header className="flex flex-wrap items-start justify-between gap-2 mb-4">
        <div>
          <h3 className="text-lg font-bold">
            ⚽ {prediction.home} vs {prediction.away}
          </h3>
          <p className="text-sm text-white/60">
            {prediction.competition} | {dateStr}
          </p>
        </div>
        <SignalBadge signal={prediction.signal} />
      </header>

      {prediction.form_display && (
        <div className="grid grid-cols-2 gap-2 text-sm mb-3 text-white/80">
          <div>
            Forme :{" "}
            <span className="tracking-widest">
              {formToDots(prediction.form_display.home)}
            </span>
          </div>
          <div>
            vs{" "}
            <span className="tracking-widest">
              {formToDots(prediction.form_display.away)}
            </span>
          </div>
        </div>
      )}

      {prediction.xg_display && (
        <p className="text-sm text-white/70 mb-2">
          xG : {prediction.home} {prediction.xg_display.home} vs{" "}
          {prediction.away} {prediction.xg_display.away}
        </p>
      )}

      {prediction.h2h_display && (
        <p className="text-sm text-white/60 mb-3">H2H : {prediction.h2h_display}</p>
      )}

      <div className="border-t border-white/10 pt-3 mt-3">
        <p className="text-accent font-semibold">
          🎯 {prediction.market} — {prediction.selection}
          {prediction.double_chance && " 🛡️DC"}
        </p>
        <div className="flex flex-wrap gap-4 mt-2 text-sm">
          <span>Cote min : {prediction.min_odds.toFixed(2)}</span>
          <span>Confiance : {prediction.confidence}%</span>
          <span>Risque : {prediction.risk}</span>
          <span>Value : {(prediction.value * 100).toFixed(1)}%</span>
          <span>Consensus : {prediction.consensus_pct}%</span>
        </div>
      </div>

      {isAvoid && (
        <p className="mt-3 text-xs text-white/50">
          Match déconseillé — ne pas inclure dans un combiné.
        </p>
      )}
    </article>
  );
}

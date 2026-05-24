"use client";

import type { ExpressCombo } from "@/types/agent3.types";

export function ComboBuilder({ combos }: { combos: ExpressCombo[] }) {
  if (!combos.length) {
    return (
      <p className="text-white/60 text-center py-8">
        Aucun combiné disponible — lancez le pipeline d&apos;abord.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {combos.map((combo) => (
        <div key={combo.target_multiplier} className="glass p-5">
          <h3 className="text-lg font-bold text-accent mb-1">
            🎟️ EXPRESS ×{combo.target_multiplier}
          </h3>
          <p className="text-sm text-white/60 mb-4">
            {combo.legs.length} matchs · Prob. coupon ~{combo.coupon_probability_pct}%
          </p>

          <ol className="space-y-3 mb-4">
            {combo.legs.map((leg, i) => (
              <li key={i} className="text-sm border-l-2 border-accent/50 pl-3">
                <span className="font-medium">{i + 1}. {leg.match_label}</span>
                <br />
                <span className="text-white/80">
                  ➤ {leg.selection}
                  {leg.double_chance ? " 🛡️DC" : ""}
                </span>
                <br />
                <span className="text-white/50">
                  Cote {leg.odds.toFixed(2)} · Confiance {leg.confidence}%
                </span>
              </li>
            ))}
          </ol>

          <div className="border-t border-white/10 pt-3 text-sm space-y-1">
            <p>
              <strong>Cote totale :</strong> ×{combo.total_odds.toFixed(2)}
            </p>
            {combo.stake_1000_gain != null && (
              <p>Mise 1 000 F → Gain : {combo.stake_1000_gain.toLocaleString("fr-FR")} F</p>
            )}
            {combo.stake_5000_gain != null && (
              <p>Mise 5 000 F → Gain : {combo.stake_5000_gain.toLocaleString("fr-FR")} F</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

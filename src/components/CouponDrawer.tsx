"use client";

import React, { useState, useCallback } from "react";
import {
  ChevronDown,
  X,
  TrendingUp,
  Zap,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────
export interface CouponLeg {
  id: string;
  league: string;
  match: string;
  pick: string;
  odds: number;
}

interface CouponDrawerProps {
  legs: CouponLeg[];
  onRemove: (id: string) => void;
  onClear: () => void;
}

// ─── Component ─────────────────────────────────────────────
export function CouponDrawer({ legs, onRemove, onClear }: CouponDrawerProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [stake, setStake] = useState(1000);

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  const totalOdds = legs.length > 0
    ? legs.reduce((acc, leg) => acc * leg.odds, 1)
    : 0;

  const potentialGain = Math.floor(stake * totalOdds);

  return (
    <>
      {/* Backdrop */}
      {isOpen && legs.length > 0 && (
        <div
          className="fixed inset-0 bg-black/60 z-40 transition-opacity duration-300"
          onClick={toggle}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 flex flex-col max-h-[75vh] bg-surface-deep border-t border-ia-gold/30 rounded-t-xl shadow-[0_-10px_40px_rgba(0,0,0,0.8)] transition-transform duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isOpen ? "translate-y-0" : "translate-y-[calc(100%-64px)]"
        }`}
        style={{ transition: "transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)" }}
      >
        {/* Handle & Header */}
        <div className="flex flex-col items-center pt-2">
          <button
            type="button"
            onClick={toggle}
            className="w-12 h-1 bg-surface-container-highest rounded-full mb-4"
            aria-label={isOpen ? "Réduire le coupon" : "Ouvrir le coupon"}
          />
          <div className="flex items-center justify-between w-full px-margin-mobile pb-stack-md border-b border-outline-variant/30">
            <div className="flex items-center gap-2">
              <h2 className="font-headline-sm text-headline-sm text-text-primary">Mon Coupon</h2>
              {legs.length > 0 && (
                <span className="bg-ia-gold text-surface-deep px-2 py-0.5 rounded-sm font-label-caps text-label-caps">
                  {legs.length}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={toggle}
              className="h-touch-target-min w-touch-target-min flex items-center justify-end text-on-surface-variant hover:text-text-primary transition-colors active:scale-95"
              aria-label={isOpen ? "Fermer le coupon" : "Ouvrir le coupon"}
            >
              <ChevronDown className={`w-6 h-6 transition-transform duration-300 ${isOpen ? "" : "rotate-180"}`} />
            </button>
          </div>
        </div>

        {/* Empty state */}
        {legs.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center py-12 px-margin-mobile text-center">
            <p className="font-body-md text-on-surface-variant">
              Aucun match ajouté au coupon.
            </p>
            <p className="text-sm text-on-surface-variant/50 mt-2">
              Ajoutez des matchs depuis le dashboard pour construire votre combiné.
            </p>
            {legs.length === 0 && isOpen && (
              <button
                type="button"
                onClick={toggle}
                className="mt-6 px-6 py-2 bg-surface-container-high border border-outline-variant text-on-surface rounded font-label-caps text-label-caps hover:bg-surface-container-highest transition-colors"
              >
                RETOURNER AU DASHBOARD
              </button>
            )}
          </div>
        )}

        {/* Selection List */}
        {legs.length > 0 && (
          <div className="flex-1 overflow-y-auto hide-scrollbar px-margin-mobile py-stack-md space-y-stack-md">
            {legs.map((leg) => (
              <div
                key={leg.id}
                className="flex flex-col gap-stack-sm p-stack-md bg-surface-raised border border-outline-variant rounded-lg"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="font-label-caps text-label-caps text-text-secondary uppercase">
                      {leg.league}
                    </p>
                    <p className="font-body-lg text-body-lg text-text-primary">{leg.match}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(leg.id)}
                    className="text-on-surface-variant hover:text-error transition-colors p-1"
                    aria-label={`Retirer ${leg.match} du coupon`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex justify-between items-end mt-2">
                  <div className="flex flex-col">
                    <span className="font-label-caps text-label-caps text-ia-gold">IA PICK</span>
                    <div className="flex items-center gap-1">
                      <span className="font-body-md text-body-md text-text-primary">{leg.pick}</span>
                    </div>
                  </div>
                  <div className="bg-surface-container-high px-3 py-1 border border-outline-variant rounded">
                    <span className="font-stat-value text-stat-value text-ia-gold">
                      {leg.odds.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary & CTA Section */}
        {legs.length > 0 && (
          <div className="bg-surface-container-lowest p-margin-mobile border-t border-outline-variant/50 space-y-stack-md">
            {/* Metrics Row */}
            <div className="grid grid-cols-2 gap-stack-md">
              <div className="flex flex-col">
                <span className="font-label-caps text-label-caps text-text-secondary">COTE TOTALE</span>
                <span className="font-stat-value text-stat-value text-text-primary">
                  {totalOdds.toFixed(2)}
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-label-caps text-label-caps text-text-secondary text-right uppercase">
                  Gains Potentiels (1 000F)
                </span>
                <span className="font-stat-value text-stat-value text-ia-gold">
                  {potentialGain.toLocaleString("fr-FR")} FCFA
                </span>
              </div>
            </div>

            {/* Stake Display */}
            <div className="flex items-center justify-between bg-surface-raised border border-outline-variant px-4 py-2 rounded">
              <span className="font-body-md text-body-md text-text-secondary">Mise:</span>
              <div className="flex items-center gap-2">
                <span className="font-headline-sm text-headline-sm text-text-primary">1 000</span>
                <span className="font-label-caps text-label-caps text-text-secondary">FCFA</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-stack-sm pt-stack-sm">
              <button
                type="button"
                className="flex-1 h-touch-target-min bg-primary-container text-text-primary font-label-caps text-label-caps rounded flex items-center justify-center gap-2 hover:bg-ia-gold hover:text-surface-deep transition-all active:scale-[0.98]"
                onClick={() => window.open("https://1xbet.com", "_blank", "noopener")}
              >
                PARIER SUR 1XBET
                <TrendingUp className="w-[18px] h-[18px]" />
              </button>
              <button
                type="button"
                className="flex-1 h-touch-target-min bg-surface-container-high border border-outline-variant text-text-primary font-label-caps text-label-caps rounded flex items-center justify-center gap-2 hover:bg-surface-container-highest transition-all active:scale-[0.98]"
                onClick={() => window.open("https://betclic.com", "_blank", "noopener")}
              >
                PARIER SUR BETCLIC
                <Zap className="w-[18px] h-[18px]" />
              </button>
            </div>

            {/* Clear button */}
            <button
              type="button"
              onClick={onClear}
              className="w-full text-center text-[10px] font-label-caps text-on-surface-variant/40 hover:text-error transition-colors py-1"
            >
              VIDER LE COUPON
            </button>
          </div>
        )}
      </div>
    </>
  );
}
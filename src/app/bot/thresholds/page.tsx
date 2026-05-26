"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Minus,
  Plus,
  BarChart3,
  ScrollText,
  Medal,
  User,
  Save,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────
type AllocationSize = 1 | 2 | 3 | 5;

// ─── Main Page ─────────────────────────────────────────────
const ALLOCATIONS: AllocationSize[] = [1, 2, 3, 5];

export default function BotThresholdsPage() {
  const router = useRouter();

  // Sliders
  const [minOdds, setMinOdds] = useState(2.1);
  const [maxVolatility, setMaxVolatility] = useState(15);
  const [minConfidence, setMinConfidence] = useState(75);

  // Allocation
  const [allocation, setAllocation] = useState<AllocationSize>(2);

  const handleSave = useCallback(() => {
    const config = { minOdds, maxVolatility, minConfidence, allocation };
    if (typeof window !== "undefined") {
      localStorage.setItem("fasobet_bot_thresholds", JSON.stringify(config));
    }
    router.back();
  }, [minOdds, maxVolatility, minConfidence, allocation, router]);

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen pb-32">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-background border-b border-outline-variant flex justify-between items-center h-14 px-margin-mobile">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-12 h-12 flex items-center justify-center hover:bg-surface-container-high transition-colors active:scale-95"
            aria-label="Retour"
          >
            <ArrowLeft className="w-5 h-5 text-primary" />
          </button>
          <h1 className="font-headline-sm text-headline-sm text-on-background">
            Seuils Stratégiques
          </h1>
        </div>
        <span className="font-headline-sm text-headline-sm text-ia-gold font-bold tracking-tight">
          5,400 FCFA
        </span>
      </header>

      <main className="pt-20 pb-8 px-margin-mobile max-w-2xl mx-auto space-y-stack-lg">
        {/* Seuil de Cote Minimale */}
        <section className="space-y-stack-md">
          <h2 className="font-label-caps text-label-caps text-outline uppercase tracking-widest">
            Seuil de Cote Minimale
          </h2>
          <div className="bg-surface-deep border border-outline-variant p-stack-md space-y-4 rounded-lg">
            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={() => setMinOdds((prev) => Math.max(1.1, prev - 0.05))}
                className="w-10 h-10 border border-outline-variant flex items-center justify-center hover:bg-surface-container-high active:scale-95 rounded"
                aria-label="Diminuer"
              >
                <Minus className="w-5 h-5" />
              </button>
              <span className="font-stat-value text-stat-value text-ia-gold">
                {minOdds.toFixed(2)}
              </span>
              <button
                type="button"
                onClick={() => setMinOdds((prev) => Math.min(5.0, prev + 0.05))}
                className="w-10 h-10 border border-outline-variant flex items-center justify-center hover:bg-surface-container-high active:scale-95 rounded"
                aria-label="Augmenter"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <input
              type="range"
              min={1.1}
              max={5.0}
              step={0.05}
              value={minOdds}
              onChange={(e) => setMinOdds(Number(e.target.value))}
              className="w-full h-2 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-ia-gold"
              aria-label="Seuil de cote minimale"
            />
          </div>
        </section>

        {/* Volatilité IA Max */}
        <section className="space-y-stack-md">
          <h2 className="font-label-caps text-label-caps text-outline uppercase tracking-widest">
            Volatilité IA Max
          </h2>
          <div className="bg-surface-deep border border-outline-variant p-stack-md space-y-4 rounded-lg">
            <div className="flex justify-between items-end">
              <span className="font-stat-value text-stat-value text-ia-gold">
                {maxVolatility}%
              </span>
              <span className="text-[12px] text-on-surface-variant font-medium">
                RISQUE MODÉRÉ
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={50}
              step={1}
              value={maxVolatility}
              onChange={(e) => setMaxVolatility(Number(e.target.value))}
              className="w-full h-2 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-ia-gold"
              aria-label="Volatilité IA maximum"
            />
          </div>
        </section>

        {/* Indice de Confiance Min */}
        <section className="space-y-stack-md">
          <h2 className="font-label-caps text-label-caps text-outline uppercase tracking-widest">
            Indice de Confiance Min
          </h2>
          <div className="bg-surface-deep border border-outline-variant p-stack-md space-y-4 rounded-lg">
            <div className="flex justify-between items-end">
              <span
                className={`font-stat-value text-stat-value ${
                  minConfidence >= 80
                    ? "text-ia-gold"
                    : minConfidence >= 70
                      ? "text-primary"
                      : "text-on-surface-variant"
                }`}
              >
                {minConfidence}%
              </span>
            </div>
            <input
              type="range"
              min={60}
              max={95}
              step={5}
              value={minConfidence}
              onChange={(e) => setMinConfidence(Number(e.target.value))}
              className="w-full h-2 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-ia-gold"
              aria-label="Indice de confiance minimum"
            />
          </div>
        </section>

        {/* Allocation par Ordre */}
        <section className="space-y-stack-md">
          <h2 className="font-label-caps text-label-caps text-outline uppercase tracking-widest">
            Allocation par Ordre
          </h2>
          <div className="grid grid-cols-4 gap-2">
            {ALLOCATIONS.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setAllocation(size)}
                className={`h-12 border flex items-center justify-center transition-all active:scale-95 rounded ${
                  allocation === size
                    ? "border-ia-gold bg-ia-gold/10 text-ia-gold"
                    : "border-outline-variant bg-surface-deep text-on-surface-variant"
                }`}
              >
                {size}%
              </button>
            ))}
          </div>
          <p className="text-[12px] text-on-surface-variant italic">
            Pourcentage du capital suggéré par trade.
          </p>
        </section>

        {/* Validate CTA */}
        <button
          type="button"
          onClick={handleSave}
          className="w-full h-14 bg-primary-container text-text-primary font-label-caps text-label-caps uppercase tracking-widest border border-primary/20 hover:bg-primary-container/80 transition-all active:scale-95 mt-8 rounded flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          VALIDER LES PARAMÈTRES
        </button>
      </main>

      {/* BottomNavBar */}
      <nav className="fixed bottom-0 w-full z-50 bg-surface-deep border-t border-outline-variant flex justify-around items-center h-[72px] px-base">
        <Link
          href="/dashboard"
          className="flex flex-col items-center justify-center text-on-surface-variant gap-1 hover:text-on-surface transition-colors active:opacity-80"
        >
          <BarChart3 className="w-6 h-6" />
          <span className="font-label-caps text-label-caps uppercase">ANALYSES</span>
        </Link>
        <Link
          href="#"
          className="flex flex-col items-center justify-center text-on-surface-variant gap-1 hover:text-on-surface transition-colors active:opacity-80"
        >
          <ScrollText className="w-6 h-6" />
          <span className="font-label-caps text-label-caps uppercase">COUPON</span>
        </Link>
        <Link
          href="/premium"
          className="flex flex-col items-center justify-center text-on-surface-variant gap-1 hover:text-on-surface transition-colors active:opacity-80"
        >
          <Medal className="w-6 h-6" />
          <span className="font-label-caps text-label-caps uppercase">PRÉMIUM</span>
        </Link>
        <Link
          href="/profile"
          className="flex flex-col items-center justify-center text-ia-gold gap-1 active:opacity-80"
        >
          <User className="w-6 h-6" />
          <span className="font-label-caps text-label-caps uppercase">COMPTE</span>
        </Link>
      </nav>
    </div>
  );
}
"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Star,
  TrendingUp,
  ShieldCheck,
  XCircle,
  Bell,
  Headphones,
  BarChart3,
  ScrollText,
  Medal,
  User,
} from "lucide-react";

// ─── Feature rows ─────────────────────────────────────────
const FEATURES = [
  {
    label: "Prédictions",
    free: "3 prédictions / jour",
    premium: "Illimitées",
  },
  {
    label: "Confiance",
    free: "Données Limitées",
    freeItalic: true,
    premium: "Analyse Profonde",
    premiumSub: "Collector / Statistician",
  },
  {
    label: "Alertes",
    free: "Indisponible",
    freeIcon: XCircle,
    freeDimmed: true,
    premium: "Temps Réel",
    premiumSub: "Push instantané",
  },
  {
    label: "Support",
    free: "Standard",
    premium: "Prioritaire",
    premiumSub: "Conciergerie 24/7",
  },
];

export default function PremiumPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-screen bg-surface-deep text-on-surface font-body-md">
      {/* Top Navigation */}
      <header className="fixed top-0 w-full z-50 border-b border-outline-variant bg-background flex justify-between items-center h-14 px-margin-mobile">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-stack-sm active:scale-95 transition-transform"
          aria-label="Retour"
          type="button"
        >
          <ArrowLeft className="w-5 h-5 text-on-surface" />
          <h1 className="font-headline-sm text-headline-sm text-on-background">
            Premium Access
          </h1>
        </button>
        <span className="font-headline-lg text-headline-lg font-bold text-ia-gold tracking-tight">
          FASOBET
        </span>
      </header>

      {/* Main Content */}
      <main className="flex-1 mt-14 mb-[72px] overflow-y-auto px-margin-mobile py-stack-lg space-y-stack-lg">
        {/* Value Proposition Hero */}
        <section className="relative h-48 rounded-lg overflow-hidden flex items-end p-stack-md border border-outline-variant">
          <div className="absolute inset-0 bg-gradient-to-t from-surface-deep via-surface-deep/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-br from-ia-gold/10 via-transparent to-primary-container/20" />
          <div className="relative z-10 space-y-base">
            <div className="inline-flex items-center px-base py-1 bg-ia-gold text-surface-deep rounded text-[10px] font-bold tracking-widest uppercase">
              Analyste Elite
            </div>
            <h2 className="font-headline-lg text-headline-lg text-white leading-tight">
              Libérez la puissance de l'IA
            </h2>
            <p className="text-on-surface-variant font-body-md">
              Dominez le marché avec des algorithmes prédictifs de niveau institutionnel.
            </p>
          </div>
        </section>

        {/* Pricing Card */}
        <section className="ia-highlight bg-surface-raised rounded-lg p-stack-lg flex flex-col items-center text-center space-y-stack-md">
          <div className="space-y-base">
            <span className="font-label-caps text-label-caps text-ia-gold uppercase tracking-[0.2em]">
              Offre Exclusive
            </span>
            <h3 className="font-headline-md text-headline-md text-white">
              PASS ANALYSTE
            </h3>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-[42px] font-stat-value text-ia-gold">5,000</span>
            <span className="font-label-caps text-label-caps text-on-surface-variant">
              FCFA / MOIS
            </span>
          </div>
          <p className="text-on-surface-variant font-body-md max-w-[280px]">
            Accès complet aux terminaux de données et signaux en temps réel.
          </p>
          <button
            type="button"
            className="w-full h-touch-target-min bg-ia-gold text-surface-deep font-headline-sm font-bold rounded flex items-center justify-center active:scale-[0.98] transition-all"
          >
            ACTIVER L'ACCÈS PREMIUM
          </button>
          <p className="text-[10px] text-outline font-medium tracking-wide">
            Paiement sécurisé par Mobile Money
          </p>
        </section>

        {/* Comparison Matrix */}
        <section className="space-y-stack-md">
          <h4 className="font-label-caps text-label-caps text-on-surface-variant px-base">
            MATRICE DE CAPACITÉS
          </h4>
          <div className="border border-outline-variant rounded divide-y divide-outline-variant bg-surface-container-lowest">
            {FEATURES.map((feat, i) => (
              <div key={i} className="grid grid-cols-2 p-stack-md gap-gutter">
                {/* Free */}
                <div className={`space-y-base ${feat.freeDimmed ? "opacity-40" : ""}`}>
                  <p className="font-body-md text-on-surface font-bold">{feat.label}</p>
                  <div className="flex items-center gap-1">
                    {feat.freeIcon && <feat.freeIcon className="w-4 h-4 text-on-surface-variant" />}
                    <p className={`text-xs text-on-surface-variant ${feat.freeItalic ? "italic" : ""}`}>
                      {feat.free}
                    </p>
                  </div>
                </div>
                {/* Premium */}
                <div className="space-y-base text-right border-l border-outline-variant pl-gutter">
                  <p className="font-body-md text-ia-gold font-bold">{feat.label}</p>
                  <p className="text-xs text-ia-gold">{feat.premium}</p>
                  {feat.premiumSub && (
                    <p className="text-xs text-ia-gold/70">{feat.premiumSub}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Trust Signals */}
        <section className="grid grid-cols-2 gap-stack-md">
          <div className="bg-surface-container rounded p-stack-md border border-outline-variant space-y-base">
            <TrendingUp className="w-5 h-5 text-ia-gold" />
            <p className="font-headline-sm text-on-surface">24/7</p>
            <p className="text-xs text-on-surface-variant">
              Analyses en continu sans interruption
            </p>
          </div>
          <div className="bg-surface-container rounded p-stack-md border border-outline-variant space-y-base">
            <ShieldCheck className="w-5 h-5 text-success-green" />
            <p className="font-headline-sm text-on-surface">84%</p>
            <p className="text-xs text-on-surface-variant">
              Taux moyen de réussite stratégique
            </p>
          </div>
        </section>

        {/* Footer Note */}
        <footer className="text-center pb-stack-lg">
          <p className="text-outline text-xs leading-relaxed max-w-xs mx-auto">
            FasoBet utilise des modèles mathématiques avancés. Jouez de manière responsable.
            L'abonnement est sans engagement et peut être annulé à tout moment.
          </p>
        </footer>
      </main>

      {/* BottomNavBar */}
      <nav className="fixed bottom-0 w-full z-50 bg-surface-deep border-t border-outline-variant flex justify-around items-center h-[72px] px-base">
        <Link
          href="/dashboard"
          className="flex flex-col items-center justify-center text-on-surface-variant gap-1 hover:text-on-surface transition-colors active:opacity-80"
        >
          <BarChart3 className="w-6 h-6" />
          <span className="font-label-caps text-[10px] uppercase">ANALYSES</span>
        </Link>
        <Link
          href="#"
          className="flex flex-col items-center justify-center text-on-surface-variant gap-1 hover:text-on-surface transition-colors active:opacity-80"
        >
          <ScrollText className="w-6 h-6" />
          <span className="font-label-caps text-[10px] uppercase">COUPON</span>
        </Link>
        <Link
          href="/premium"
          className="flex flex-col items-center justify-center text-ia-gold gap-1 hover:text-on-surface transition-colors active:opacity-80"
        >
          <Medal className="w-6 h-6" />
          <span className="font-label-caps text-[10px] uppercase">PRÉMIUM</span>
        </Link>
        <Link
          href="/profile"
          className="flex flex-col items-center justify-center text-on-surface-variant gap-1 hover:text-on-surface transition-colors active:opacity-80"
        >
          <User className="w-6 h-6" />
          <span className="font-label-caps text-[10px] uppercase">COMPTE</span>
        </Link>
      </nav>
    </div>
  );
}
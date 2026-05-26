"use client";

import React from "react";
import Link from "next/link";
import {
  TrendingUp,
  Database,
  BrainCircuit,
  ShieldCheck,
  Gauge,
  Microscope,
  Eye,
  FileOutput,
  CheckCircle2,
  XCircle,
  Star,
  BarChart3,
  ScrollText,
  Award,
  User,
} from "lucide-react";

export default function LandingPage() {
  return (
    <>
      {/* ═══════════════════════════════════════════════════
          TopAppBar
          ═══════════════════════════════════════════════════ */}
      <nav className="bg-background border-b border-outline-variant flex justify-between items-center w-full px-margin-mobile h-touch-target-min sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <span className="font-headline-md text-headline-md font-bold text-ia-gold tracking-tighter">
            FASOBET
          </span>
        </div>
        <div className="flex items-center gap-stack-md">
          <span className="font-label-caps text-label-caps text-primary-fixed-dim bg-primary-container/20 px-2 py-1 rounded">
            CRÉDITS: 250
          </span>
          <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center border border-outline-variant overflow-hidden">
            <User className="w-5 h-5 text-on-surface-variant" />
          </div>
        </div>
      </nav>

      <main className="pb-24 lg:pb-0">
        {/* ═══════════════════════════════════════════════════
            Hero Section
            ═══════════════════════════════════════════════════ */}
        <section className="px-margin-mobile pt-12 pb-8 max-w-5xl mx-auto">
          <div className="flex flex-col gap-stack-lg items-center text-center">
            <span className="font-label-caps text-label-caps text-ia-gold border border-ia-gold px-3 py-1 uppercase tracking-widest">
              Technologie IA Avancée
            </span>
            <h1 className="font-headline-lg text-headline-lg text-text-primary leading-tight max-w-2xl">
              Dominez le terrain avec l'intelligence artificielle
            </h1>
            <p className="font-body-lg text-body-lg text-text-secondary max-w-xl">
              Plus de 10 000 points de données analysés en temps réel pour vous offrir un avantage stratégique incontestable sur chaque match.
            </p>
            <div className="w-full max-w-md mt-4">
              <Link
                href="/dashboard"
                className="w-full h-touch-target-min bg-primary-container text-text-primary font-bold rounded flex items-center justify-center gap-2 uppercase tracking-wide hover:opacity-90 active:scale-95 transition-all"
              >
                <span>Commencer l'analyse</span>
                <TrendingUp className="w-5 h-5" />
              </Link>
            </div>

            {/* Winning Prediction Card */}
            <div className="ia-highlight bg-surface-raised w-full max-w-lg p-stack-md flex flex-col gap-stack-sm text-left mt-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-1 bg-ia-gold text-surface-deep text-[10px] font-bold uppercase px-2">
                Résultat IA
              </div>
              <div className="flex justify-between items-center font-label-caps text-label-caps text-text-secondary">
                <span>PRÉDICTION RÉCENTE</span>
                <span className="text-success-green">GAGNANT</span>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-text-primary">
                    ASFA Yennenga vs Wydad AC
                  </h3>
                  <p className="font-body-md text-body-md text-ia-gold">
                    Verdict IA: Victoire 1
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-stat-value text-stat-value text-ia-gold">82%</span>
                  <span className="text-[10px] font-label-caps text-text-secondary uppercase">
                    Confiance
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            Stats Grid
            ═══════════════════════════════════════════════════ */}
        <section className="bg-surface-container py-12 px-margin-mobile">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-stack-md">
            <div className="etched-border p-stack-md flex flex-col gap-base">
              <span className="font-stat-value text-stat-value text-primary">78%</span>
              <span className="font-label-caps text-label-caps text-text-secondary uppercase">
                Taux de réussite
              </span>
            </div>
            <div className="etched-border p-stack-md flex flex-col gap-base">
              <span className="font-stat-value text-stat-value text-primary">+5 000</span>
              <span className="font-label-caps text-label-caps text-text-secondary uppercase">
                Analyses / Mois
              </span>
            </div>
            <div className="etched-border p-stack-md flex flex-col gap-base">
              <span className="font-stat-value text-stat-value text-primary">12k</span>
              <span className="font-label-caps text-label-caps text-text-secondary uppercase">
                Membres Actifs
              </span>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            How it Works (Bento Pattern)
            ═══════════════════════════════════════════════════ */}
        <section className="px-margin-mobile py-16 max-w-5xl mx-auto">
          <h2 className="font-headline-md text-headline-md text-text-primary mb-12 flex items-center gap-3">
            <span className="w-8 h-1 bg-ia-gold" />
            Processus de Décision
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            {/* Step 1 */}
            <div className="etched-border p-stack-lg flex flex-col gap-stack-md bg-surface-container-low hover:border-primary transition-colors">
              <div className="w-12 h-12 bg-primary-container/20 flex items-center justify-center text-primary">
                <Database className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-headline-sm text-headline-sm text-text-primary mb-2">
                  01. Collecte
                </h4>
                <p className="font-body-md text-body-md text-text-secondary">
                  Extraction massive de données historiques, conditions météo et états de forme.
                </p>
              </div>
            </div>
            {/* Step 2 */}
            <div className="etched-border p-stack-lg flex flex-col gap-stack-md bg-surface-container-low hover:border-primary transition-colors">
              <div className="w-12 h-12 bg-primary-container/20 flex items-center justify-center text-primary">
                <BrainCircuit className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-headline-sm text-headline-sm text-text-primary mb-2">
                  02. Analyse IA
                </h4>
                <p className="font-body-md text-body-md text-text-secondary">
                  Traitement par réseaux de neurones pour identifier les patterns invisibles à l'œil nu.
                </p>
              </div>
            </div>
            {/* Step 3 */}
            <div className="etched-border p-stack-lg flex flex-col gap-stack-md bg-surface-container-low border-ia-gold/30 hover:border-ia-gold transition-colors">
              <div className="w-12 h-12 bg-ia-gold/20 flex items-center justify-center text-ia-gold">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-headline-sm text-headline-sm text-ia-gold mb-2">
                  03. Verdict
                </h4>
                <p className="font-body-md text-body-md text-text-secondary">
                  Génération d'un score de confiance précis et d'une recommandation finale.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            Benefits Grid
            ═══════════════════════════════════════════════════ */}
        <section className="bg-surface-deep py-16 px-margin-mobile border-y border-outline-variant">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-stack-lg">
            <div className="flex gap-stack-md items-start">
              <Gauge className="w-6 h-6 text-primary mt-1 shrink-0" />
              <div>
                <h5 className="font-headline-sm text-headline-sm text-text-primary">
                  Gain de temps
                </h5>
                <p className="font-body-md text-body-md text-text-secondary">
                  Évitez des heures de recherche manuelle. L'IA fait le travail en millisecondes.
                </p>
              </div>
            </div>
            <div className="flex gap-stack-md items-start">
              <Microscope className="w-6 h-6 text-primary mt-1 shrink-0" />
              <div>
                <h5 className="font-headline-sm text-headline-sm text-text-primary">
                  Précision chirurgicale
                </h5>
                <p className="font-body-md text-body-md text-text-secondary">
                  Des probabilités basées sur la science des données, pas sur l'intuition.
                </p>
              </div>
            </div>
            <div className="flex gap-stack-md items-start">
              <Eye className="w-6 h-6 text-primary mt-1 shrink-0" />
              <div>
                <h5 className="font-headline-sm text-headline-sm text-text-primary">
                  Lecture instantanée
                </h5>
                <p className="font-body-md text-body-md text-text-secondary">
                  Interface optimisée pour comprendre les enjeux en un coup d'œil.
                </p>
              </div>
            </div>
            <div className="flex gap-stack-md items-start">
              <FileOutput className="w-6 h-6 text-primary mt-1 shrink-0" />
              <div>
                <h5 className="font-headline-sm text-headline-sm text-text-primary">
                  Export direct
                </h5>
                <p className="font-body-md text-body-md text-text-secondary">
                  Générez des coupons compatibles 1xBet et Betclic en un clic.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            Pricing Section
            ═══════════════════════════════════════════════════ */}
        <section className="px-margin-mobile py-20 max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-headline-lg text-headline-lg text-text-primary uppercase">
              Plans d'Accès
            </h2>
            <p className="font-body-md text-body-md text-text-secondary">
              Choisissez votre niveau d'analyse stratégique
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter max-w-3xl mx-auto">
            {/* Free Plan */}
            <div className="etched-border p-stack-lg bg-surface-container-low flex flex-col gap-stack-md">
              <div className="flex justify-between items-center">
                <span className="font-label-caps text-label-caps text-text-secondary uppercase">
                  Gratuit
                </span>
                <span className="font-headline-md text-headline-md text-text-primary">0 FCFA</span>
              </div>
              <ul className="flex flex-col gap-stack-sm font-body-md text-body-md text-text-secondary">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-[18px] h-[18px] text-success-green shrink-0" />
                  2 analyses/jour
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-[18px] h-[18px] text-success-green shrink-0" />
                  Cotes standard
                </li>
                <li className="flex items-center gap-2 text-on-surface-variant/40">
                  <XCircle className="w-[18px] h-[18px] shrink-0" />
                  Score de confiance restreint
                </li>
              </ul>
              <button
                type="button"
                className="mt-auto w-full h-touch-target-min border border-outline-variant text-text-primary font-bold rounded uppercase tracking-wide hover:bg-surface-bright/10 transition-all"
              >
                S'inscrire
              </button>
            </div>

            {/* Premium Plan */}
            <div className="ia-highlight p-stack-lg bg-primary-container/10 flex flex-col gap-stack-md relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-ia-gold text-surface-deep px-3 py-0.5 text-[10px] font-bold uppercase rounded-full">
                Recommandé
              </div>
              <div className="flex justify-between items-center">
                <span className="font-label-caps text-label-caps text-ia-gold uppercase">
                  Premium
                </span>
                <span className="font-headline-md text-headline-md text-ia-gold">
                  5.000 FCFA
                  <span className="text-[12px] text-text-secondary">/mois</span>
                </span>
              </div>
              <ul className="flex flex-col gap-stack-sm font-body-md text-body-md text-text-primary">
                <li className="flex items-center gap-2">
                  <Star className="w-[18px] h-[18px] text-ia-gold shrink-0" />
                  Accès total prédictions IA
                </li>
                <li className="flex items-center gap-2">
                  <Star className="w-[18px] h-[18px] text-ia-gold shrink-0" />
                  Confidence Rings avancés
                </li>
                <li className="flex items-center gap-2">
                  <Star className="w-[18px] h-[18px] text-ia-gold shrink-0" />
                  Historique complet IA
                </li>
                <li className="flex items-center gap-2">
                  <Star className="w-[18px] h-[18px] text-ia-gold shrink-0" />
                  Alertes Temps Réel
                </li>
              </ul>
              <button
                type="button"
                className="mt-auto w-full h-touch-target-min bg-ia-gold text-surface-deep font-bold rounded uppercase tracking-wide hover:opacity-90 active:scale-95 transition-all"
              >
                Passer au Premium
              </button>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            Final CTA
            ═══════════════════════════════════════════════════ */}
        <section className="px-margin-mobile py-20 bg-primary-container/20 border-t border-primary-container">
          <div className="max-w-xl mx-auto text-center flex flex-col gap-stack-md">
            <h2 className="font-headline-lg text-headline-lg text-text-primary">
              Rejoindre l'élite de l'analyse
            </h2>
            <p className="font-body-lg text-body-lg text-text-secondary mb-4">
              Rejoignez 12 000 parieurs stratégiques et transformez votre approche dès aujourd'hui.
            </p>
            <div className="flex flex-col sm:flex-row gap-stack-md justify-center">
              <button
                type="button"
                className="h-touch-target-min px-8 bg-primary-container text-text-primary font-bold rounded uppercase tracking-wide hover:opacity-90 transition-all"
              >
                Créer un compte
              </button>
              <button
                type="button"
                className="h-touch-target-min px-8 border border-outline-variant text-text-primary font-bold rounded uppercase tracking-wide hover:bg-surface-bright/10 transition-all"
              >
                Voir les démos
              </button>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            Footer
            ═══════════════════════════════════════════════════ */}
        <footer className="px-margin-mobile py-8 border-t border-outline-variant text-center pb-32">
          <p className="font-label-caps text-label-caps text-on-surface-variant">
            FASOBET ANALYTICS TERMINAL v2.4.0
          </p>
          <p className="text-[10px] text-on-surface-variant/40 mt-2">
            © 2024 FASOBET. Jouez de manière responsable.
          </p>
        </footer>
      </main>

      {/* ═══════════════════════════════════════════════════
          BottomNavBar (mobile)
          ═══════════════════════════════════════════════════ */}
      <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-base py-stack-sm bg-surface-container-lowest border-t border-primary-container z-50 md:hidden h-[72px]">
        <Link
          href="/dashboard"
          className="flex flex-col items-center justify-center text-ia-gold font-bold transition-all duration-200"
        >
          <BarChart3 className="w-6 h-6" />
          <span className="font-label-caps text-label-caps">ANALYSES</span>
        </Link>
        <Link
          href="#"
          className="flex flex-col items-center justify-center text-on-surface-variant transition-all duration-200 hover:bg-surface-bright/10"
        >
          <ScrollText className="w-6 h-6" />
          <span className="font-label-caps text-label-caps">COUPON</span>
        </Link>
        <Link
          href="#"
          className="flex flex-col items-center justify-center text-on-surface-variant transition-all duration-200 hover:bg-surface-bright/10"
        >
          <Award className="w-6 h-6" />
          <span className="font-label-caps text-label-caps">PRÉMIUM</span>
        </Link>
        <Link
          href="#"
          className="flex flex-col items-center justify-center text-on-surface-variant transition-all duration-200 hover:bg-surface-bright/10"
        >
          <User className="w-6 h-6" />
          <span className="font-label-caps text-label-caps">COMPTE</span>
        </Link>
      </nav>
    </>
  );
}
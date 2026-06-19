"use client";

import React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  TrendingUp,
  BarChart3,
  Gauge,
  Star,
  Droplets,
  Search,
  CheckCircle2,
  ShoppingCart,
  Timer,
  Shield,
  ScrollText,
  Medal,
  User,
  ReceiptText,
  Lightbulb,
  History,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────
interface ExecutionData {
  id: string;
  status: "executed" | "refused" | "cancelled" | "live";
  statusLabel: string;
  league: string;
  home: string;
  away: string;
  score: string;
  isLive: boolean;
  liveMinute?: string;
  roi: string;
  netProfit: string;
  prediction: string;
  odds: number;
  stake: string;
  capitalPct: number;
  pattern: string;
  confidence: number;
  volatility: number;
  logicItems: {
    icon: React.ReactNode;
    label: string;
    value: string;
    valueColor?: string;
    badge?: string;
    bar?: number;
  }[];
  timeline: {
    time: string;
    text: string;
    icon: React.ReactNode;
    color: string;
    highlight?: boolean;
  }[];
}

// ─── Data sets ─────────────────────────────────────────────
const EXECUTIONS: Record<string, ExecutionData> = {
  "raja-as-far": {
    id: "raja-as-far",
    status: "executed",
    statusLabel: "OK - EXÉCUTÉ",
    league: "LIGUE MAROCAINE (BOTOLA)",
    home: "Raja CA",
    away: "AS FAR",
    score: "1 - 0",
    isLive: false,
    roi: "+115%",
    netProfit: "+575 FCFA",
    prediction: "Raja ou Nul",
    odds: 2.15,
    stake: "500 FCFA",
    capitalPct: 2,
    pattern: "Raja_Strong_Home_Form",
    confidence: 82,
    volatility: 12,
    logicItems: [
      { icon: <BarChart3 className="w-5 h-5 text-ia-gold" />, label: "Pattern identifié", value: "Raja_Strong_Home_Form", valueColor: "text-primary" },
      { icon: <Gauge className="w-5 h-5 text-success-green" />, label: "Volatilité à l'entrée", value: "12%", valueColor: "text-primary", badge: "STABLE" },
      { icon: <Star className="w-5 h-5 text-ia-gold" />, label: "Indice de Confiance", value: "82%", valueColor: "text-ia-gold", bar: 82 },
      { icon: <Droplets className="w-5 h-5 text-on-surface-variant" />, label: "Liquidité Marché", value: "HAUTE (>5M FCFA)", valueColor: "text-primary" },
    ],
    timeline: [
      { time: "19:55:00", text: "Market Scanning... Primary targets localized.", icon: <Search className="w-[14px] h-[14px] text-on-surface-variant" />, color: "text-on-surface-variant opacity-70" },
      { time: "19:57:12", text: "Criteria Validated: Odds 2.15 >= Threshold 2.10", icon: <CheckCircle2 className="w-[14px] h-[14px] text-success-green" />, color: "text-success-green" },
      { time: "19:59:45", text: "Order Placed: Risk Exposure 2.0% Bankroll", icon: <ShoppingCart className="w-[14px] h-[14px] text-ia-gold" />, color: "text-ia-gold" },
      { time: "20:00:00", text: "Match Start: Active monitoring engaged...", icon: <Timer className="w-[14px] h-[14px] text-on-surface-variant" />, color: "text-on-surface" },
      { time: "21:50:31", text: "Order Settled: SUCCESSFUL_SETTLEMENT", icon: <CheckCircle2 className="w-[16px] h-[16px] text-primary" />, color: "text-primary font-bold", highlight: true },
    ],
  },
  "wydad-al-ahly": {
    id: "wydad-al-ahly",
    status: "live",
    statusLabel: "EN COURS",
    league: "CAF Champions League",
    home: "Wydad AC",
    away: "Al Ahly",
    score: "0 - 0",
    isLive: true,
    liveMinute: "12'",
    roi: "+85%",
    netProfit: "EN ATTENTE",
    prediction: "Over 0.5 HT",
    odds: 2.25,
    stake: "500 FCFA",
    capitalPct: 2,
    pattern: "Wydad_Dominance_Home",
    confidence: 78,
    volatility: 11,
    logicItems: [
      { icon: <BarChart3 className="w-5 h-5 text-ia-gold" />, label: "Pattern identifié", value: "Wydad_Dominance_Home", valueColor: "text-primary" },
      { icon: <Gauge className="w-5 h-5 text-success-green" />, label: "Volatilité à l'entrée", value: "11%", valueColor: "text-primary", badge: "STABLE" },
      { icon: <Star className="w-5 h-5 text-ia-gold" />, label: "Indice de Confiance", value: "78%", valueColor: "text-ia-gold", bar: 78 },
      { icon: <Droplets className="w-5 h-5 text-on-surface-variant" />, label: "Liquidité Marché", value: "HAUTE", valueColor: "text-primary" },
    ],
    timeline: [
      { time: "14:15:00", text: "Scan du marché en temps réel... Cible identifiée sur l'over 0.5 HT.", icon: <Search className="w-[14px] h-[14px] text-on-surface-variant" />, color: "text-on-surface-variant" },
      { time: "14:15:10", text: "Critères de profitabilité validés : Cote 2.25 supérieur au Seuil de risque 2.10.", icon: <CheckCircle2 className="w-[14px] h-[14px] text-success-green" />, color: "text-on-surface" },
      { time: "14:15:12", text: "ORDRE EXÉCUTÉ : Exposition 2.0% de la Bankroll totale.", icon: <CheckCircle2 className="w-[14px] h-[14px] text-success-green shadow-[0_0_8px_rgba(34,197,94,0.4)]" />, color: "text-success-green", highlight: true },
      { time: "14:15:15", text: "Confirmation partenaire reçue via API. Hash de transaction stocké.", icon: <CheckCircle2 className="w-[14px] h-[14px] text-on-surface-variant" />, color: "text-on-surface-variant" },
    ],
  },
};

const DEFAULT_ID = "raja-as-far";

export default function BotExecutionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const executionId = (params.id as string) || DEFAULT_ID;
  const data = EXECUTIONS[executionId] || EXECUTIONS[DEFAULT_ID];

  return (
    <div className="bg-surface-deep overflow-x-hidden pb-24 font-body-md text-on-surface min-h-screen">
      {/* Terminal grid background */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.1] z-0"
        style={{
          backgroundImage: "radial-gradient(#1B4332 0.5px, transparent 0.5px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-background border-b border-outline-variant flex justify-between items-center h-14 px-margin-mobile">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            type="button"
            aria-label="Retour"
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-surface-container-high transition-colors active:scale-95"
          >
            <ArrowLeft className="w-5 h-5 text-on-surface" />
          </button>
          <h1 className="font-headline-sm text-headline-sm text-on-background">Détail d'Exécution</h1>
        </div>
        <div className={`px-3 py-1 rounded-lg font-label-caps text-[10px] flex items-center gap-1.5 border ${
          data.status === "executed" ? "bg-primary-container text-primary border-primary/20" :
          data.status === "live" ? "bg-surface-container-highest text-primary border-outline-variant" :
          "bg-error-container text-error border-error/30"
        }`}>
          {data.status === "live" ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" />
              EN COURS - {data.liveMinute}
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-success-green animate-pulse" />
              {data.statusLabel}
            </>
          )}
        </div>
      </header>

      <main className="mt-20 px-margin-mobile space-y-4 relative z-10 max-w-2xl mx-auto">
        {/* Match Header Card */}
        <section className={`bg-surface-raised border border-outline-variant p-stack-md rounded-lg relative overflow-hidden ${
          data.isLive ? "border-primary-container glow-gold" : ""
        }`}>
          {data.isLive && <div className="scanline" />}
          <div className="flex justify-between items-center mb-stack-md">
            <span className="font-label-caps text-on-surface-variant">{data.league}</span>
            <span className="font-label-caps text-on-surface-variant">ID: #{data.id}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col items-center gap-2 flex-1">
              <div className="w-16 h-16 bg-surface-container flex items-center justify-center rounded-full border border-outline-variant overflow-hidden p-2">
                <Shield className="w-8 h-8 text-on-surface-variant" />
              </div>
              <span className="font-headline-sm text-center">{data.home}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-stat-value text-[32px] text-ia-gold">{data.score}</span>
              <span className={`px-2 py-0.5 font-label-caps text-[10px] rounded border mt-2 ${
                data.isLive
                  ? "bg-surface-container text-error border-error/30"
                  : "bg-primary-container text-success-green border-success-green/30"
              }`}>
                {data.isLive ? `EN COURS - ${data.liveMinute}` : "TERMINÉ"}
              </span>
            </div>
            <div className="flex flex-col items-center gap-2 flex-1">
              <div className={`w-16 h-16 bg-surface-container flex items-center justify-center rounded-full border border-outline-variant overflow-hidden p-2 ${
                data.isLive ? "" : "opacity-50"
              }`}>
                <Shield className={`w-8 h-8 text-on-surface-variant ${data.isLive ? "" : "opacity-50"}`} />
              </div>
              <span className={`font-headline-sm text-center ${data.isLive ? "" : "opacity-50"}`}>{data.away}</span>
            </div>
          </div>
        </section>

        {/* Performance Bento Grid */}
        <div className="grid grid-cols-2 gap-stack-md">
          {/* ROI */}
          <div className="col-span-2 bg-primary-container/10 border border-ia-gold p-stack-md rounded-lg relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <TrendingUp className="w-[120px] h-[120px]" />
            </div>
            <div className="flex justify-between items-start">
              <div>
                <p className="font-label-caps text-ia-gold mb-1">ROI {data.isLive ? "PRÉVISIONNEL" : "SUR TRANSACTION"}</p>
                <p className="font-stat-value text-headline-lg text-primary">{data.roi}</p>
              </div>
              <div className="text-right">
                <p className="font-label-caps text-on-surface-variant mb-1">BÉNÉFICE NET</p>
                <p className="font-stat-value text-headline-md text-success-green">{data.netProfit}</p>
              </div>
            </div>
          </div>

          {/* Prediction */}
          <div className="bg-surface-raised border border-outline-variant p-stack-md rounded-lg">
            <p className="font-label-caps text-on-surface-variant mb-2">PRONOSTIC</p>
            <p className="font-body-lg text-primary mb-1">{data.prediction}</p>
            <p className="font-stat-value text-ia-gold">@ {data.odds}</p>
          </div>

          {/* Stake */}
          <div className="bg-surface-raised border border-outline-variant p-stack-md rounded-lg">
            <p className="font-label-caps text-on-surface-variant mb-2">MISE EXÉCUTÉE</p>
            <p className="font-body-lg text-primary mb-1">Stake IA</p>
            <p className="font-stat-value text-on-surface">{data.stake}</p>
            <p className="text-[10px] text-text-secondary mt-1">{data.capitalPct}% du capital</p>
          </div>
        </div>

        {/* IA Execution Logic */}
        <section className="space-y-stack-sm">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-ia-gold" />
            <h2 className="font-headline-sm text-on-background">Logique d'Exécution IA</h2>
          </div>
          <div className="bg-surface-raised border border-outline-variant p-stack-md rounded space-y-4">
            <div className="flex justify-between items-center border-b border-outline-variant pb-3">
              <span className="font-body-md text-text-secondary">Pattern Détecté</span>
              <span className="font-body-lg text-primary-fixed-dim font-mono tracking-tight bg-primary-container/20 px-2 rounded">{data.pattern}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-1">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-label-caps text-label-caps text-text-secondary">CONFIANCE</span>
                  <span className="font-label-caps text-label-caps text-ia-gold">{data.confidence}%</span>
                </div>
                <div className="h-1 bg-surface-container rounded-full">
                  <div className="h-full bg-ia-gold rounded-full" style={{ width: `${data.confidence}%` }} />
                </div>
                <span className="text-[10px] text-success-green font-bold uppercase">Stabilité Élevée</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-label-caps text-label-caps text-text-secondary">VOLATILITÉ</span>
                  <span className="font-label-caps text-label-caps text-on-surface">{data.volatility}%</span>
                </div>
                <div className="h-1 bg-surface-container rounded-full">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${data.volatility}%` }} />
                </div>
                <span className="text-[10px] text-primary font-bold uppercase">Signal Stable</span>
              </div>
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="space-y-stack-sm">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-text-secondary" />
            <h2 className="font-headline-sm text-on-background">Journal d'Exécution</h2>
          </div>
          <div className="bg-surface-deep border border-outline-variant p-stack-md rounded-lg font-mono text-[13px] leading-relaxed relative">
            <div className="absolute left-4 top-4 bottom-4 w-px bg-outline-variant" />
            <div className="space-y-4 ml-6">
              {data.timeline.map((entry, i) => (
                <div
                  key={i}
                  className={`relative ${
                    entry.highlight ? "bg-primary-container/20 -mx-4 px-4 py-1 border-y border-primary/10" : ""
                  }`}
                >
                  {!entry.highlight && (
                    <div className="absolute -left-[21px] top-1 w-[11px] h-[11px] rounded-full bg-outline-variant border-2 border-surface-deep" />
                  )}
                  {entry.highlight && (
                    <div className="absolute -left-[21px] top-1 w-[11px] h-[11px] rounded-full bg-success-green border-2 border-surface-deep shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                  )}
                  <span className={`font-label-caps text-label-caps ${entry.color.split(" ")[0]}`}>{entry.time}</span>
                  <p className={`font-body-md text-sm ${entry.color}`}>{entry.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="space-y-stack-md mb-8">
          <button
            type="button"
            className="w-full h-touch-target-min bg-ia-gold text-surface-deep font-bold font-label-caps rounded flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            <ReceiptText className="w-5 h-5" />
            VOIR REÇU DE TRANSACTION
          </button>
          <Link
            href="/dashboard"
            className="w-full h-touch-target-min bg-surface-container-high text-on-surface font-bold font-label-caps rounded flex items-center justify-center gap-2 active:scale-[0.98] transition-transform border border-outline-variant"
          >
            <BarChart3 className="w-5 h-5" />
            RETOUR AU DASHBOARD
          </Link>
        </section>
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
          href="/bankroll"
          className="flex flex-col items-center justify-center text-ia-gold gap-1 hover:text-on-surface transition-colors active:opacity-80"
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
          className="flex flex-col items-center justify-center text-on-surface-variant gap-1 hover:text-on-surface transition-colors active:opacity-80"
        >
          <User className="w-6 h-6" />
          <span className="font-label-caps text-label-caps uppercase">COMPTE</span>
        </Link>
      </nav>
    </div>
  );
}
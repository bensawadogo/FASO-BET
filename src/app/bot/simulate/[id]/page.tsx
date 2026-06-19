import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Shield,
  CheckCircle2,
  Terminal,
  BarChart3,
  ScrollText,
  Medal,
  User,
} from "lucide-react";

export async function generateStaticParams() {
  return [
    { id: "wydad-al-ahly" },
    { id: "asfa-etoile" },
    { id: "tp-mazembe-sundowns" },
  ];
}

// ─── Types ──────────────────────────────────────────────────
interface SimulationData {
  home: string;
  away: string;
  homeFlag: string;
  awayFlag: string;
  league: string;
  confidence: number;
  odds: string;
  confidenceThreshold: string;
  volatility: string;
  volatilityThreshold: string;
}

// ─── Simulations disponibles ────────────────────────────────
const SIMULATIONS: Record<string, SimulationData> = {
  "wydad-al-ahly": {
    home: "Wydad AC",
    away: "Al Ahly SC",
    homeFlag: "🇲🇦",
    awayFlag: "🇪🇬",
    league: "CAF Champions League",
    confidence: 78,
    odds: "2.25",
    confidenceThreshold: "(Min: 75%)",
    volatility: "11%",
    volatilityThreshold: "(Max: 15%)",
  },
  "asfa-etoile": {
    home: "ASFA Yennenga",
    away: "Étoile Filante",
    homeFlag: "🇧🇫",
    awayFlag: "🇧🇫",
    league: "Ligue 1 Burkina Faso",
    confidence: 82,
    odds: "1.65",
    confidenceThreshold: "(Min: 75%)",
    volatility: "8%",
    volatilityThreshold: "(Max: 15%)",
  },
  "tp-mazembe-sundowns": {
    home: "TP Mazembe",
    away: "Mamelodi Sundowns",
    homeFlag: "🇨🇩",
    awayFlag: "🇿🇦",
    league: "CAF Champions League",
    confidence: 65,
    odds: "2.80",
    confidenceThreshold: "(Min: 60%)",
    volatility: "18%",
    volatilityThreshold: "(Max: 20%)",
  },
};

export default function BotSimulateByIdPage({ params }: { params: { id: string } }) {
  const sim = SIMULATIONS[params.id];

  if (!sim) {
    notFound();
  }

  const criteria = [
    { label: "COTE ACTUELLE", value: sim.odds, threshold: "(Seuil: 2.10)" },
    { label: "CONFIANCE", value: `${sim.confidence}%`, threshold: sim.confidenceThreshold },
    { label: "VOLATILITÉ", value: sim.volatility, threshold: sim.volatilityThreshold },
  ];

  return (
    <div className="bg-surface-deep text-on-surface font-body-md antialiased overflow-hidden min-h-screen selection:bg-ia-gold/30">
      {/* Decorative Grid Background */}
      <div className="fixed inset-0 pointer-events-none -z-10 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(#414844 1px, transparent 1px), linear-gradient(90deg, #414844 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
      </div>

      {/* Top Navigation */}
      <header className="fixed top-0 w-full z-50 bg-background border-b border-outline-variant flex justify-between items-center h-14 px-margin-mobile">
        <Link href="/dashboard" className="flex items-center gap-stack-sm">
          <span className="font-headline-lg text-headline-lg font-bold text-ia-gold tracking-tight">
            fasobet<br /><span className="text-xs text-ia-gold/60 font-normal tracking-normal">by ben rachid sawadogo</span>
          </span>
        </Link>
        <div className="flex items-center bg-surface-container-high rounded px-3 py-1 border border-outline-variant">
          <span className="font-label-caps text-label-caps text-on-surface-variant mr-2">CREDIT</span>
          <span className="font-stat-value text-[16px] text-ia-gold">5,400 FCFA</span>
        </div>
      </header>

      <main className="pt-14 pb-[72px] h-screen flex flex-col overflow-y-auto">
        {/* Simulation Pulsing Banner */}
        <div className="w-full bg-ia-gold/10 border-b border-ia-gold/30 py-2 px-margin-mobile flex items-center justify-center gap-2 animate-pulse">
          <Terminal className="w-4 h-4 text-ia-gold" />
          <span className="font-label-caps text-label-caps text-ia-gold">
            SIMULATION EN COURS : {sim.league.toUpperCase()}
          </span>
        </div>

        {/* Match Display */}
        <section className="px-margin-mobile py-stack-lg flex flex-col items-center">
          <div className="w-full flex justify-between items-center bg-surface-raised border border-outline-variant p-stack-md rounded-lg mb-stack-lg relative overflow-hidden">
            {/* Home */}
            <div className="flex flex-col items-center flex-1">
              <div className="w-12 h-12 bg-surface-container flex items-center justify-center rounded-full border border-outline-variant mb-2">
                <span className="text-2xl">{sim.homeFlag}</span>
              </div>
              <span className="font-headline-sm text-headline-sm text-center">{sim.home.toUpperCase()}</span>
            </div>

            {/* VS */}
            <div className="flex flex-col items-center px-stack-md">
              <span className="font-label-caps text-label-caps text-ia-gold">VS</span>
              <span className="font-body-md text-text-secondary text-xs">{sim.league.split(" ").slice(0, 2).join(" ")}</span>
            </div>

            {/* Away */}
            <div className="flex flex-col items-center flex-1">
              <div className="w-12 h-12 bg-surface-container flex items-center justify-center rounded-full border border-outline-variant mb-2">
                <span className="text-2xl">{sim.awayFlag}</span>
              </div>
              <span className="font-headline-sm text-headline-sm text-center">{sim.away.toUpperCase()}</span>
            </div>
          </div>
        </section>

        {/* Confidence Ring & Scan Animation */}
        <section className="flex flex-col items-center justify-center py-stack-md flex-1">
          <div className="relative w-48 h-48 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" fill="none" r="45" stroke="#374151" strokeWidth="2" />
              <circle
                cx="50" cy="50" fill="none" r="45"
                stroke="#F59E0B"
                strokeLinecap="round"
                strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - sim.confidence / 100)}`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-label-caps text-label-caps text-text-secondary mb-0">CONFIANCE IA</span>
              <span className="font-stat-value text-[48px] text-ia-gold leading-none">{sim.confidence}%</span>
              <span className="font-label-caps text-label-caps text-ia-gold tracking-widest mt-1">
                {sim.confidence >= 75 ? "OPTIMAL" : sim.confidence >= 60 ? "MODÉRÉ" : "RISQUÉ"}
              </span>
            </div>
            {/* Scan Line */}
            <div className="absolute inset-0 overflow-hidden rounded-full opacity-40 pointer-events-none">
              <div className="scan-line" />
            </div>
          </div>

          {/* Liquidity Progress Bar */}
          <div className="w-64 mt-stack-lg">
            <div className="flex justify-between items-center mb-1">
              <span className="font-label-caps text-[10px] text-text-secondary">ANALYSE DE LIQUIDITÉ...</span>
              <span className="font-label-caps text-[10px] text-ia-gold">89%</span>
            </div>
            <div className="h-1 bg-surface-container rounded-full overflow-hidden">
              <div className="h-full bg-ia-gold transition-all duration-700" style={{ width: "89%" }} />
            </div>
          </div>
        </section>

        {/* Strategy Verification Section */}
        <section className="px-margin-mobile pb-stack-lg space-y-stack-sm">
          <h3 className="font-label-caps text-label-caps text-text-secondary px-base">
            VÉRIFICATION DES CRITÈRES
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {criteria.map((criterion) => (
              <div
                key={criterion.label}
                className="flex items-center justify-between bg-surface-raised border border-outline-variant p-3 rounded h-[64px]"
              >
                <div className="flex flex-col">
                  <span className="font-label-caps text-[10px] text-text-secondary">
                    {criterion.label}
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-headline-sm text-headline-sm">{criterion.value}</span>
                    <span className="text-[10px] text-on-surface-variant">{criterion.threshold}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-primary-container px-3 py-1.5 border border-primary/20 rounded">
                  <CheckCircle2 className="w-[18px] h-[18px] text-ia-gold" />
                  <span className="font-label-caps text-ia-gold text-[10px]">VALIDÉ</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Primary CTA */}
        <div className="px-margin-mobile mt-auto pb-stack-lg">
          <button
            type="button"
            className="w-full font-headline-sm text-[16px] font-bold h-touch-target-min flex items-center justify-center gap-3 rounded-lg active:scale-95 transition-all duration-150 shadow-lg bg-ia-gold text-surface-deep shadow-ia-gold/10"
          >
            <Terminal className="w-5 h-5" />
            EXÉCUTER L'ORDRE SIMULÉ
          </button>
        </div>
      </main>

      {/* BottomNavBar */}
      <nav className="fixed bottom-0 w-full z-50 bg-surface-deep border-t border-outline-variant flex justify-around items-center h-[72px] px-base">
        <Link href="/dashboard" className="flex flex-col items-center justify-center text-ia-gold gap-1">
          <BarChart3 className="w-6 h-6" />
          <span className="font-label-caps text-label-caps uppercase">ANALYSES</span>
        </Link>
        <Link href="/bankroll" className="flex flex-col items-center justify-center text-on-surface-variant gap-1">
          <ScrollText className="w-6 h-6" />
          <span className="font-label-caps text-label-caps uppercase">COUPON</span>
        </Link>
        <Link href="/premium" className="flex flex-col items-center justify-center text-on-surface-variant gap-1">
          <Medal className="w-6 h-6" />
          <span className="font-label-caps text-label-caps uppercase">PRÉMIUM</span>
        </Link>
        <Link href="/profile" className="flex flex-col items-center justify-center text-on-surface-variant gap-1">
          <User className="w-6 h-6" />
          <span className="font-label-caps text-label-caps uppercase">COMPTE</span>
        </Link>
      </nav>
    </div>
  );
}
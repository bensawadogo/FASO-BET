import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Flag, Shield, Star, TrendingUp, LineChart, Trophy, Lightbulb, Calendar, User, Terminal, Zap } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { BottomNavBar } from "@/components/ui/BottomNavBar";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  return {
    title: `Ligue — FasoBet`,
    description: "Analyse IA et prédictions pour cette ligue",
  };
}

export async function generateStaticParams() {
  return [{ id: "ligue1-bf" }, { id: "botola-pro" }, { id: "caf-champions" }, { id: "chan" }];
}

// ─── Types ─────────────────────────────────────────────────
interface LeagueData {
  id: string;
  name: string;
  flag: React.ReactNode;
  season: string;
  winRate: number;
  avgOdds: number;
  profit: string;
  chartBars: { height: number; color: string; opacity?: number }[];
  powerRankings: {
    rank: number;
    name: string;
    tag: string;
    tagColor: string;
    form: ("W" | "D" | "L")[];
  }[];
  insightHtml: React.ReactNode;
  featuredMatch?: {
    home: string;
    away: string;
    homeIcon: React.ReactNode;
    awayIcon: React.ReactNode;
    time: string;
    prediction: string;
    odds: number;
    market: string;
  };
  logs: { status: "SUCCESS" | "PENDING"; message: string }[];
  isStable: boolean;
}

// ─── Form badge ────────────────────────────────────────────
function FormBadge({ letter }: { letter: "W" | "D" | "L" }) {
  const config = {
    W: "bg-success-green text-[10px] font-bold text-black rounded-sm",
    D: "bg-outline text-[10px] font-bold text-black rounded-sm",
    L: "bg-error text-[10px] font-bold text-black rounded-sm",
  };
  return <span className={`w-5 h-5 flex items-center justify-center ${config[letter]}`}>{letter}</span>;
}

// ─── Mock data (fallback si API indisponible en dev) ──────
function getMockLeague(leagueId: string): LeagueData | null {
  const LEAGUES: Record<string, LeagueData> = {
  "ligue1-bf": {
    id: "ligue1-bf",
    name: "Ligue 1 Burkina",
    flag: <Flag className="w-8 h-8 text-ia-gold" />,
    season: "SAISON 2023-2024 • TERMINAL ANALYTIQUE",
    winRate: 68,
    avgOdds: 1.92,
    profit: "+24.5K FCFA",
    chartBars: [30, 45, 35, 60, 55, 75, 85, 70, 90, 80, 85, 95, 92, 98, 100].map((h) => ({
      height: h,
      color: h >= 90 ? "bg-ia-gold/40" : "bg-primary-container/20",
    })),
    powerRankings: [
      { rank: 1, name: "ASFA Yennenga", tag: "Dominant Domicile", tagColor: "bg-primary-container text-primary", form: ["W", "W", "D", "W", "W"] },
      { rank: 2, name: "Étoile Filante", tag: "Solidité Défensive", tagColor: "bg-surface-container text-on-surface-variant", form: ["D", "W", "W", "L", "W"] },
      { rank: 3, name: "Majestic SC", tag: "Surprise tactique", tagColor: "bg-surface-container text-on-surface-variant", form: ["W", "L", "W", "D", "D"] },
    ],
    insightHtml: (
      <>
        La <span className="text-on-surface font-bold">Ligue 1 Burkina</span> est caractérisée par une forte dominance à domicile (
        <span className="text-ia-gold">62% home wins</span>). Les moyennes de buts restent structurellement basses. Le marché{" "}
        <span className="text-on-surface font-bold">Under 2.5</span> est statistiquement fréquent sur les 5 dernières journées.
      </>
    ),
    featuredMatch: {
      home: "ASFA YENNENGA",
      away: "ÉTOILE FILANTE",
      homeIcon: <Shield className="w-8 h-8 text-ia-gold" />,
      awayIcon: <Star className="w-8 h-8 text-primary" />,
      time: "DIM. 16:00",
      prediction: "ASFA Yennenga ou Nul & -2.5 Buts",
      odds: 1.85,
      market: "Double Chance & Under",
    },
    logs: [
      { status: "SUCCESS", message: "Salitas vs Rahimo FC → BET: W1 @1.90" },
      { status: "SUCCESS", message: "Majestic SC vs Vitesse FC → BET: Under 1.5 @2.10" },
      { status: "SUCCESS", message: "AS Douanes vs RCK → BET: DNB W1 @1.65" },
      { status: "PENDING", message: "Scanning market liquidity for upcoming match..." },
    ],
    isStable: true,
  },
  "botola-pro": {
    id: "botola-pro",
    name: "Botola Pro (Maroc)",
    flag: <Shield className="w-8 h-8 text-ia-gold" />,
    season: "SAISON 2023/24 • ALGORITHME ELITE V4.1",
    winRate: 64,
    avgOdds: 1.88,
    profit: "+38.2K",
    chartBars: [
      { height: 60, color: "bg-success-green", opacity: 40 },
      { height: 75, color: "bg-success-green", opacity: 60 },
      { height: 90, color: "bg-success-green", opacity: 90 },
      { height: 30, color: "bg-error", opacity: 70 },
      { height: 100, color: "bg-success-green", opacity: 100 },
      { height: 50, color: "bg-success-green", opacity: 50 },
      { height: 45, color: "bg-outline", opacity: 40 },
      { height: 82, color: "bg-success-green", opacity: 80 },
      { height: 88, color: "bg-success-green", opacity: 90 },
      { height: 20, color: "bg-error", opacity: 50 },
      { height: 95, color: "bg-success-green", opacity: 100 },
      { height: 70, color: "bg-success-green", opacity: 60 },
      { height: 55, color: "bg-success-green", opacity: 40 },
      { height: 40, color: "bg-outline", opacity: 30 },
      { height: 100, color: "bg-success-green", opacity: 100 },
    ],
    powerRankings: [
      { rank: 1, name: "Raja Casablanca", tag: "FORME IMPÉRIALE", tagColor: "text-ia-gold font-bold tracking-tighter", form: ["W", "W", "D", "W", "W"] },
      { rank: 2, name: "AS FAR", tag: "ATTAQUE DÉCHAÎNÉE", tagColor: "text-primary font-bold tracking-tighter", form: ["W", "L", "W", "W", "D"] },
      { rank: 3, name: "RS Berkane", tag: "MUR DÉFENSIF", tagColor: "text-on-surface-variant font-bold tracking-tighter", form: ["D", "W", "D", "D", "W"] },
    ],
    insightHtml: (
      <>
        La Botola Pro se caractérise par une <strong className="text-primary">discipline tactique rigoureuse</strong> et une moyenne de buts historiquement basse lors des derbies.{" "}
        <strong className="text-ia-gold">Raja Casablanca est invaincu à domicile</strong> cette saison (82% de clean sheets). Privilégiez les marchés "Under 2.5" pour les matchs à haute tension.
      </>
    ),
    featuredMatch: {
      home: "Raja",
      away: "AS FAR",
      homeIcon: <Shield className="w-8 h-8 text-on-surface" />,
      awayIcon: <Zap className="w-8 h-8 text-on-surface" />,
      time: "DEMAIN • 20:00",
      prediction: "Raja ou Nul",
      odds: 1.75,
      market: "Double Chance",
    },
    logs: [
      { status: "SUCCESS", message: "Maghreb Fès vs Wydad AC → Draw (Cote 3.10)" },
      { status: "SUCCESS", message: "Mouloudia Oujda vs RSB → Under 2.5 (Cote 1.55)" },
      { status: "PENDING", message: "Hassania Agadir vs JSM → Analysis in progress..." },
    ],
    isStable: true,
  },
};
  return LEAGUES[leagueId] ?? null;
}

function normalizeLeague(maybe: LeagueData | null): LeagueData | null {
  if (!maybe) return null;

  return {
    ...maybe,
    chartBars: Array.isArray(maybe.chartBars) ? maybe.chartBars : [],
    powerRankings: Array.isArray(maybe.powerRankings) ? maybe.powerRankings : [],
    logs: Array.isArray(maybe.logs) ? maybe.logs : [],
    season: typeof maybe.season === "string" ? maybe.season : "",
    profit: typeof maybe.profit === "string" ? maybe.profit : "",
    avgOdds: typeof maybe.avgOdds === "number" ? maybe.avgOdds : 0,
    winRate: typeof maybe.winRate === "number" ? maybe.winRate : 0,
    insightHtml: maybe.insightHtml ?? <></>,
  };
}

// ─── Main Page ─────────────────────────────────────────────
export default async function LeagueDetailPage({ params }: { params: { id: string } }) {
  const { id: leagueId } = params;
  let league: LeagueData | null = null;

  try {
    const res = await apiClient.controlApi.getLeagueById(leagueId);
    if (res.success && res.data) {
      // Adapter la réponse API au format LeagueData si nécessaire
      league = normalizeLeague(res.data as unknown as LeagueData);
    }
  } catch {
    // Silently fail — fallback handled below
  }

  // Fallback en mode développement uniquement
  if (!league && process.env.NODE_ENV === "development") {
    league = normalizeLeague(getMockLeague(leagueId) ?? getMockLeague("ligue1-bf")!);
  }

  league = normalizeLeague(league);

  if (!league) {
    notFound();
  }

  const seasonParts = league.season.split("•");
  const seasonLeft = seasonParts[0] ?? "";
  const seasonRight = seasonParts[1] ?? "";

  return (
    <div className="bg-surface-deep font-body-md overflow-x-hidden min-h-screen pb-28">
      {/* Top Navigation */}
      <header className="fixed top-0 w-full z-50 bg-background border-b border-outline-variant flex justify-between items-center h-14 px-margin-mobile">
        <Link href="/dashboard" className="flex items-center gap-3">
          <Terminal className="w-5 h-5 text-ia-gold" />
          <span className="font-headline-lg text-headline-lg font-bold text-ia-gold tracking-tight">fasobet<br /><span className="text-xs text-ia-gold/60 font-normal tracking-normal">by ben rachid sawadogo</span></span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="font-headline-sm text-headline-sm text-on-background px-3 py-1 bg-surface-container rounded-lg border border-outline-variant">5,400 FCFA</span>
          <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center border border-primary">
            <User className="w-5 h-5 text-primary" />
          </div>
        </div>
      </header>

      <main className="mt-14 px-margin-mobile py-stack-lg flex flex-col gap-stack-lg max-w-2xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col gap-base">
          <div className="flex items-center gap-2 text-ia-gold">
            <Shield className="w-4 h-4" />
            <span className="font-label-caps text-label-caps uppercase tracking-widest">ANALYST TERMINAL v2.4</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">{league.name}</h1>
          <p className="font-body-md text-on-surface-variant flex items-center gap-2">
            {seasonLeft} <span className="w-1 h-1 rounded-full bg-outline" /> {seasonRight}
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-stack-sm">
          <div className="bg-surface-raised border border-outline-variant p-stack-sm flex flex-col gap-1 rounded-lg">
            <span className="font-label-caps text-[10px] text-on-surface-variant uppercase">Win Rate</span>
            <span className="font-stat-value text-stat-value text-success-green">{league.winRate}%</span>
          </div>
          <div className="bg-surface-raised border border-outline-variant p-stack-sm flex flex-col gap-1 rounded-lg">
            <span className="font-label-caps text-[10px] text-on-surface-variant uppercase">Avg Odds</span>
            <span className="font-stat-value text-stat-value text-primary">{league.avgOdds}</span>
          </div>
          <div className="bg-surface-raised border border-outline-variant p-stack-sm flex flex-col gap-1 rounded-lg">
            <span className="font-label-caps text-[10px] text-on-surface-variant uppercase">Profit Net</span>
            <span className="font-stat-value text-stat-value text-ia-gold">{league.profit}</span>
          </div>
        </div>

        {/* Volatility Chart */}
        <div className="bg-surface-raised border border-outline-variant p-stack-md rounded-lg">
          <div className="flex justify-between items-center mb-stack-md">
            <h3 className="font-label-caps text-label-caps text-on-surface-variant">VOLATILITÉ DES 15 DERNIÈRES JOURNÉES</h3>
            <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${league.isStable ? "bg-primary-container text-primary" : "bg-error-container text-error"}`}>
              STABLE
            </span>
          </div>
          <div className="flex items-end justify-between h-24 gap-1">
            {league.chartBars.map((bar, i) => (
              <div
                key={i}
                className={`w-full ${bar.color} ${bar.opacity != null ? `opacity-${bar.opacity}` : ""} rounded-t-sm ${
                  i === league.chartBars.length - 1 ? "ia-highlight" : ""
                }`}
                style={{ height: `${bar.height}%`, opacity: bar.opacity != null ? bar.opacity / 100 : undefined }}
              />
            ))}
          </div>
        </div>

        {/* Power Rankings */}
        <div className="flex flex-col gap-stack-sm">
          <h3 className="font-label-caps text-label-caps text-on-surface-variant px-1 uppercase">TOP 3 : ANALYSE DE FORME</h3>
          {league.powerRankings.map((team) => (
            <div
              key={team.rank}
              className="bg-surface-container border border-outline-variant p-stack-md flex items-center justify-between rounded-lg"
            >
              <div className="flex items-center gap-stack-md">
                <span className={`font-stat-value ${team.rank === 1 ? "text-ia-gold" : "text-on-surface-variant"}`}>
                  {String(team.rank).padStart(2, "0")}
                </span>
                <div className="flex flex-col">
                  <span className="font-headline-sm text-on-surface">{team.name}</span>
                  <span className={`text-[10px] tracking-tighter ${team.tagColor}`}>{team.tag}</span>
                </div>
              </div>
              <div className="flex gap-1">
                {team.form.map((letter, i) => (
                  <FormBadge key={i} letter={letter} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Analyst Insight */}
        <div className="bg-primary-container/20 border border-primary/30 p-stack-md relative overflow-hidden rounded-lg">
          <div className="absolute -right-4 -top-4 opacity-10">
            <Lightbulb className="w-20 h-20" />
          </div>
          <div className="flex items-center gap-2 mb-2 text-primary">
            <Lightbulb className="w-4 h-4" />
            <span className="font-label-caps text-label-caps uppercase">Note Stratégique</span>
          </div>
          <p className="font-body-md text-on-surface leading-relaxed">{league.insightHtml}</p>
        </div>

        {/* Featured Match */}
        {league.featuredMatch && (
          <div className="ia-highlight bg-surface-deep p-stack-md flex flex-col gap-stack-md rounded-lg">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 bg-ia-gold text-surface-deep px-2 py-0.5 rounded-sm font-bold text-[10px]">
                <Zap className="w-3 h-3" /> IA PRÉDICTION
              </div>
              <span className="text-xs font-label-caps text-on-surface-variant">{league.featuredMatch.time}</span>
            </div>
            <div className="text-center py-stack-sm flex flex-col gap-2">
              <span className="font-label-caps text-[11px] text-on-surface-variant tracking-widest uppercase">
                LE CLASSICO
              </span>
              <div className="flex justify-between items-center px-gutter">
                <div className="flex flex-col items-center gap-1 w-24">
                  <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center border border-outline-variant">
                    {league.featuredMatch.homeIcon}
                  </div>
                  <span className="font-headline-sm text-on-surface text-center leading-tight">{league.featuredMatch.home}</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs font-bold text-ia-gold">VS</span>
                  <div className="h-[1px] w-12 bg-outline-variant" />
                </div>
                <div className="flex flex-col items-center gap-1 w-24">
                  <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center border border-outline-variant">
                    {league.featuredMatch.awayIcon}
                  </div>
                  <span className="font-headline-sm text-on-surface text-center leading-tight">{league.featuredMatch.away}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-stack-sm">
              <div className="bg-surface-raised border border-outline-variant p-stack-sm flex flex-col items-center gap-1 rounded">
                <span className="font-label-caps text-[10px] text-on-surface-variant">OFFRE IA</span>
                <span className="font-stat-value text-primary text-sm">{league.featuredMatch.prediction}</span>
                <span className="font-label-caps text-[10px] text-ia-gold">COTE {league.featuredMatch.odds}</span>
              </div>
              <button
                type="button"
                className="bg-primary hover:bg-primary-fixed transition-colors text-on-primary font-bold uppercase py-stack-sm flex flex-col items-center justify-center h-full rounded active:scale-95"
              >
                <span className="font-label-caps text-[10px]">AJOUTER AU</span>
                <span className="font-headline-sm">COUPON</span>
              </button>
            </div>
          </div>
        )}

        {/* System Logs */}
        <div className="flex flex-col gap-stack-sm opacity-80">
          <h3 className="font-label-caps text-label-caps text-on-surface-variant px-1 uppercase flex items-center gap-2">
            <Terminal className="w-4 h-4" /> LOGS DU SYSTÈME
          </h3>
          <div className="flex flex-col gap-1 font-mono text-[11px] bg-surface-deep p-stack-sm border border-outline-variant rounded">
            {league.logs.map((log, i) => (
              <div key={i} className="flex gap-2">
                <span className={log.status === "SUCCESS" ? "text-success-green shrink-0" : "text-primary shrink-0"}>
                  [{log.status}]
                </span>
                <span className="text-on-surface-variant">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* BottomNavBar */}
      <BottomNavBar />
    </div>
  );
}
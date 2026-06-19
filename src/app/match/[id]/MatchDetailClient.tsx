"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield,
  Swords,
  TrendingUp,
  BarChart3,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { MatchActions } from "@/components/match/MatchActions";
import { TeamLogo } from "@/components/ui/TeamLogo";
import { BottomNavBar } from "@/components/ui/BottomNavBar";
import { getMockMatchDetail, MatchDetail } from "@/lib/match-mock";

// ─── Types (exportés pour page.tsx) ───────────────────────
export interface AgentInsight {
  agent: "collector" | "statistician" | "strategist";
  title: string;
  text: string;
}

export interface H2HRow {
  match: string;
  score: string;
  date: string;
  winner?: "home" | "away" | "draw";
}

// ─── Confidence Ring ───────────────────────────────────────
function ConfidenceRing({ percent }: { percent: number }) {
  const ref = useRef<SVGCircleElement>(null);
  const radius = 88;
  const circumference = 2 * Math.PI * radius;
  const targetOffset = circumference * (1 - percent / 100);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.strokeDasharray = `${circumference}`;
    el.style.transition = "stroke-dashoffset 1s ease-out";
    requestAnimationFrame(() => {
      el.style.strokeDashoffset = `${targetOffset}`;
    });
  }, [circumference, targetOffset]);

  return (
    <div className="relative w-48 h-48 flex items-center justify-center mb-stack-lg">
      <svg className="absolute inset-0 w-full h-full">
        <circle cx="96" cy="96" r={radius} fill="transparent" stroke="#374151" strokeWidth="8" />
        <circle
          ref={ref}
          cx="96" cy="96" r={radius} fill="transparent"
          stroke="#F59E0B" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          className="confidence-ring"
          style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
        />
      </svg>
      <div className="flex flex-col items-center z-10">
        <span className="font-stat-value text-[32px] text-ia-gold">{percent}%</span>
        <span className="font-label-caps text-label-caps text-on-surface-variant">CONFIANCE</span>
      </div>
    </div>
  );
}

// ─── Fade-in card ─────────────────────────────────────────
function FadeInCard({ children, delay }: { children: React.ReactNode; delay: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.opacity = "0";
    el.style.transform = "translateY(10px)";
    const timer = setTimeout(() => {
      el.style.transition = "all 0.4s ease-out";
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);
  return <div ref={ref} className="bg-surface-raised">{children}</div>;
}

// ─── H2H Winner color ──────────────────────────────────────
function getH2HWinnerColor(row: H2HRow, side: "home" | "away"): string {
  if (!row.winner) return "text-on-surface";
  if (row.winner === "draw") return "text-amber-400";
  if (row.winner === side) return "text-success-green";
  return "text-on-surface";
}

// ─── Main Client Component ─────────────────────────────────
interface MatchDetailClientProps {
  matchId: string;
  initialData: MatchDetail | null;
}

export function MatchDetailClient({ matchId, initialData }: MatchDetailClientProps) {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => setIsClient(true), []);

  // Fallback dev : données mock si API indisponible
  const detail: MatchDetail = initialData ?? getMockMatchDetail(matchId);

  // C6 — H2H peuplé avec fallback mock
  const h2hData: H2HRow[] = detail.h2h && detail.h2h.length > 0
    ? detail.h2h
    : [
        { match: `${detail.home} vs ${detail.away}`, score: "2-1", date: "12/01/2025", winner: "home" },
        { match: `${detail.away} vs ${detail.home}`, score: "0-0", date: "05/08/2024", winner: "draw" },
        { match: `${detail.home} vs ${detail.away}`, score: "1-3", date: "15/03/2024", winner: "away" },
      ];

  const timeStr = isClient
    ? new Date(detail.date).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      })
    : new Date(detail.date).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      });

  const agentConfig: Record<AgentInsight["agent"], { border: string; titleColor: string; icon: React.ReactNode }> = {
    collector: { border: "border-l-2 border-primary", titleColor: "text-primary", icon: <TrendingUp className="w-4 h-4 text-primary" /> },
    statistician: { border: "border-l-2 border-ia-gold", titleColor: "text-ia-gold", icon: <BarChart3 className="w-4 h-4 text-ia-gold" /> },
    strategist: { border: "border-l-2 border-success-green", titleColor: "text-success-green", icon: <Lightbulb className="w-4 h-4 text-success-green" /> },
  };

  return (
    <div className="bg-background text-on-background font-body-md overflow-x-hidden pb-32 min-h-screen">
      {/* TopAppBar */}
      <nav className="fixed top-0 w-full z-50 bg-background border-b border-outline-variant flex justify-between items-center h-14 px-margin-mobile">
        <button onClick={() => router.back()} className="flex items-center gap-stack-md" type="button" aria-label="Retour">
          <ArrowLeft className="w-5 h-5 text-ia-gold" />
          <span className="font-headline-sm text-headline-sm text-on-background">Analyse de Match</span>
        </button>
        <div className="flex items-center gap-stack-sm bg-surface-container px-3 py-1 rounded-lg">
          <span className="font-label-caps text-label-caps text-ia-gold">5,400 FCFA</span>
        </div>
      </nav>

      <main className="mt-14 px-margin-mobile">
        {/* Header Match Section */}
        <section className="py-stack-lg border-b border-outline-variant">
          <div className="flex justify-between items-center mb-stack-md">
            <div className="flex flex-col items-center gap-2 flex-1">
              <TeamLogo teamName={detail.home} size={64} />
              <span className="font-headline-sm text-headline-sm text-center text-text-primary">{detail.home}</span>
            </div>
            <div className="flex flex-col items-center justify-center gap-1 flex-none px-stack-lg">
              <span className="font-label-caps text-label-caps text-on-surface-variant">{timeStr}</span>
              <span className="font-stat-value text-stat-value text-ia-gold">VS</span>
              <span className="font-label-caps text-label-caps text-on-surface-variant">AUJOURD&apos;HUI</span>
            </div>
            <div className="flex flex-col items-center gap-2 flex-1">
              <TeamLogo teamName={detail.away} size={64} />
              <span className="font-headline-sm text-headline-sm text-center text-text-primary">{detail.away}</span>
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="font-label-caps text-label-caps text-primary uppercase">{detail.competition}</span>
            <span className="font-body-md text-on-surface-variant text-sm flex items-center gap-1">
              <MapPin className="w-4 h-4" /> {detail.venue}
            </span>
          </div>
        </section>

        {/* AI Verdict */}
        <section className="py-stack-lg flex flex-col items-center">
          <ConfidenceRing percent={detail.confidence} />
          <div className="grid grid-cols-2 gap-stack-md w-full mb-stack-md">
            <div className="bg-surface-raised border border-outline-variant p-stack-md flex flex-col items-center gap-1">
              <span className="font-label-caps text-label-caps text-on-surface-variant">STABILITÉ</span>
              <span className="font-headline-sm text-headline-sm text-success-green">{detail.stability}</span>
            </div>
            <div className="bg-surface-raised border border-outline-variant p-stack-md flex flex-col items-center gap-1">
              <span className="font-label-caps text-label-caps text-on-surface-variant">VOLATILITÉ</span>
              <span className="font-headline-sm text-headline-sm text-success-green">{detail.volatility}</span>
            </div>
          </div>
          <div className="bg-tertiary-container border border-on-tertiary-fixed-variant w-full py-2 px-4 flex items-center justify-center gap-2 rounded">
            <AlertTriangle className="w-4 h-4 text-on-tertiary-container" />
            <span className="font-label-caps text-label-caps text-on-tertiary-container">RISQUE: {detail.risk}</span>
          </div>
        </section>

        {/* Probabilities */}
        <section className="py-stack-lg border-y border-outline-variant">
          <h3 className="font-label-caps text-label-caps text-on-surface-variant mb-stack-md">PROBABILITÉS ALGORITHMIQUES</h3>
          <div className="grid grid-cols-3 gap-1 h-12 rounded overflow-hidden">
            <div className="bg-primary-container flex items-center justify-center">
              <div className="flex flex-col items-center"><span className="font-label-caps text-[10px] text-on-primary-container">DOMICILE</span><span className="font-stat-value text-sm text-white">{detail.prob_home}%</span></div>
            </div>
            <div className="bg-surface-variant flex items-center justify-center">
              <div className="flex flex-col items-center"><span className="font-label-caps text-[10px] text-on-surface-variant">NUL</span><span className="font-stat-value text-sm text-white">{detail.prob_draw}%</span></div>
            </div>
            <div className="bg-surface-container-highest flex items-center justify-center">
              <div className="flex flex-col items-center"><span className="font-label-caps text-[10px] text-on-surface-variant">EXTÉRIEUR</span><span className="font-stat-value text-sm text-white">{detail.prob_away}%</span></div>
            </div>
          </div>
        </section>

        {/* AI Agent Breakdown */}
        <section className="py-stack-lg space-y-stack-md">
          <h3 className="font-label-caps text-label-caps text-on-surface-variant mb-4">AI AGENT BREAKDOWN</h3>
          {detail.agent_insights.map((insight, i) => {
            const cfg = agentConfig[insight.agent];
            return (
              <FadeInCard key={i} delay={100 * (i + 1)}>
                <div className={`p-stack-md ${cfg.border}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {cfg.icon}
                    <span className={`font-label-caps text-label-caps ${cfg.titleColor}`}>{insight.title}</span>
                  </div>
                  <p className="font-body-md text-on-surface text-sm">{insight.text}</p>
                </div>
              </FadeInCard>
            );
          })}
        </section>

        {/* Key Insights */}
        <section className="py-stack-lg mb-8">
          <h3 className="font-label-caps text-label-caps text-on-surface-variant mb-stack-md">POINTS CLÉS</h3>
          <ul className="space-y-stack-sm">
            {detail.reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-stack-md">
                <CheckCircle2 className="w-5 h-5 text-success-green shrink-0 mt-0.5" />
                <span className="font-body-md text-on-surface">{r}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* H2H History — C6 */}
        <section className="mb-8">
          <h3 className="font-label-caps text-label-caps text-on-surface-variant mb-stack-md px-base">H2H HISTORY</h3>
          <div className="bg-surface-container-lowest border border-outline-variant overflow-hidden rounded-lg">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-high font-label-caps text-[10px] text-outline uppercase">
                <tr>
                  <th className="p-stack-sm">Match</th>
                  <th className="p-stack-sm text-center">Score</th>
                  <th className="p-stack-sm text-right">Date</th>
                </tr>
              </thead>
              <tbody className="font-body-md text-on-surface">
                {h2hData.map((row, i) => {
                  const parts = row.match.split(" vs ");
                  const homeTeam = parts[0] ?? "";
                  const awayTeam = parts[1] ?? "";
                  return (
                    <tr key={i} className="border-b border-outline-variant last:border-0">
                      <td className="p-stack-sm text-[13px]">
                        <span className={getH2HWinnerColor(row, "home")}>{homeTeam}</span>
                        <span className="text-on-surface-variant"> vs </span>
                        <span className={getH2HWinnerColor(row, "away")}>{awayTeam}</span>
                      </td>
                      <td className="p-stack-sm text-center font-bold">{row.score}</td>
                      <td className="p-stack-sm text-right text-outline text-[12px]">{row.date}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* CTA — C3 */}
        <div className="fixed bottom-[72px] left-0 w-full p-margin-mobile bg-background/80 backdrop-blur-sm z-30">
          <div className="flex gap-stack-sm max-w-2xl mx-auto">
            <MatchActions
              matchId={matchId}
              homeTeam={detail.home}
              awayTeam={detail.away}
              league={detail.competition}
              prediction={detail.prediction}
              odds={undefined}
            />
            <button
              type="button"
              onClick={() => window.open("https://1xbet.com/fr/live/", "_blank", "noopener")}
              className="flex-1 h-touch-target-min bg-ia-gold text-surface-deep font-label-caps text-label-caps rounded-lg flex items-center justify-center gap-base active:scale-95 transition-transform uppercase"
            >
              Parier sur 1xBet
              <ExternalLink className="w-5 h-5" />
            </button>
          </div>
        </div>
      </main>

      {/* BottomNavBar — C7/C11 */}
      <BottomNavBar />
    </div>
  );
}

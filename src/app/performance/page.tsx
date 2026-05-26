"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  User,
  Wallet,
  TrendingUp,
  Shield,
  BarChart3,
  ScrollText,
  Medal,
  Trophy,
} from "lucide-react";

type TimeframeKey = "30d" | "90d";

const SPORTS = [
  { name: "Football", winRate: 72, barColor: "bg-success-green", textColor: "text-success-green" },
  { name: "Tennis", winRate: 58, barColor: "bg-ia-gold", textColor: "text-ia-gold" },
  { name: "Basketball", winRate: 45, barColor: "bg-error", textColor: "text-error" },
];

const LEAGUES = [
  { code: "PL", name: "Premier League", pnl: "+12,400", positive: true },
  { code: "L1", name: "Ligue 1", pnl: "+8,200", positive: true },
  { code: "SA", name: "Serie A", pnl: "-2,100", positive: false },
];

const LOGS = [
  { time: "14:22:04", type: "BET_EXECUTED", color: "text-primary", message: "Liverpool vs Arsenal - O2.5 @ 1.85 (STAKE: 5,000)" },
  { time: "12:45:12", type: "WIN_CONFIRMED", color: "text-success-green", message: "Real Madrid AH-1 @ 1.92 (+4,600 FCFA)" },
  { time: "09:10:55", type: "SYNC_COMPLETE", color: "text-on-surface-variant", message: "1xBet API connection stable. Market liquidity high." },
];

export default function PerformancePage() {
  const [timeframe, setTimeframe] = useState<TimeframeKey>("90d");

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen pb-32">
      {/* Terminal grid background */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-5"
        style={{ backgroundImage: "radial-gradient(circle, #1B4332 1px, transparent 1px)", backgroundSize: "24px 24px" }}
      />

      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-background border-b border-outline-variant flex justify-between items-center h-14 px-margin-mobile">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center overflow-hidden border border-ia-gold/30">
            <User className="w-5 h-5 text-primary" />
          </div>
          <h1 className="font-headline-lg text-headline-lg font-bold text-ia-gold tracking-tight">FASOBET</h1>
        </Link>
        <div className="flex items-center gap-2 px-3 py-1 bg-surface-container rounded-lg border border-outline-variant">
          <Wallet className="w-[18px] h-[18px] text-ia-gold" />
          <span className="font-label-caps text-label-caps text-on-background">5,400 FCFA</span>
        </div>
      </header>

      <main className="pt-20 pb-8 px-margin-mobile max-w-4xl mx-auto relative z-10">
        {/* KPI Header */}
        <div className="grid grid-cols-3 gap-3 mb-stack-lg">
          <div className="bg-surface-container-low p-4 rounded-lg border border-outline-variant hover:border-ia-gold/50 transition-colors hover:-translate-y-0.5 duration-200">
            <p className="font-label-caps text-label-caps text-on-surface-variant mb-1">ROI</p>
            <div className="flex items-end gap-1">
              <span className="font-stat-value text-stat-value text-success-green">+14.2%</span>
              <TrendingUp className="w-4 h-4 text-success-green mb-1" />
            </div>
          </div>
          <div className="bg-surface-container-low p-4 rounded-lg border border-outline-variant hover:border-ia-gold/50 transition-colors hover:-translate-y-0.5 duration-200">
            <p className="font-label-caps text-label-caps text-on-surface-variant mb-1">YIELD</p>
            <div className="flex items-end gap-1">
              <span className="font-stat-value text-stat-value text-ia-gold">6.8%</span>
            </div>
          </div>
          <div className="bg-surface-container-low p-4 rounded-lg border border-outline-variant hover:border-ia-gold/50 transition-colors hover:-translate-y-0.5 duration-200">
            <p className="font-label-caps text-label-caps text-on-surface-variant mb-1">NET PROFIT</p>
            <div className="flex items-center gap-1">
              <span className="font-stat-value text-stat-value text-on-surface truncate">124.5K</span>
            </div>
          </div>
        </div>

        {/* Equity Growth Chart */}
        <section className="bg-surface-deep border border-outline-variant rounded-lg p-stack-md mb-stack-lg relative overflow-hidden">
          <div className="flex justify-between items-center mb-stack-lg">
            <div>
              <h2 className="font-headline-sm text-headline-sm text-on-background uppercase tracking-wider">Equity Growth</h2>
              <p className="text-xs text-on-surface-variant">Last 90 Days Portfolio Analysis</p>
            </div>
            <div className="flex gap-2">
              {(["30d", "90d"] as const).map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setTimeframe(tf)}
                  className={`px-3 py-1 rounded font-label-caps text-[10px] transition-colors ${
                    timeframe === tf ? "bg-primary-container text-primary" : "hover:bg-surface-container text-on-surface-variant"
                  }`}
                >
                  {tf.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Chart Area */}
          <div className="h-64 w-full relative">
            <svg className="w-full h-full" viewBox="0 0 400 150" preserveAspectRatio="none">
              <defs>
                <linearGradient id="footballFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="tennisFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#22C55E" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#22C55E" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Football curve */}
              <path d="M0,130 Q40,110 80,115 T160,95 T240,105 T320,60 T400,20 V150 H0 Z" fill="url(#footballFill)" />
              <path d="M0,130 Q40,110 80,115 T160,95 T240,105 T320,60 T400,20" fill="none" stroke="#F59E0B" strokeWidth="2" />
              {/* Tennis curve */}
              <path d="M0,135 Q50,140 100,120 T200,125 T300,90 T400,45 V150 H0 Z" fill="url(#tennisFill)" />
              <path d="M0,135 Q50,140 100,120 T200,125 T300,90 T400,45" fill="none" stroke="#22C55E" strokeWidth="2" />
              <circle cx="400" cy="20" r="3" fill="#F59E0B" />
              <circle cx="400" cy="45" r="3" fill="#22C55E" />
            </svg>
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-5">
              <div className="border-t border-on-surface-variant w-full" />
              <div className="border-t border-on-surface-variant w-full" />
              <div className="border-t border-on-surface-variant w-full" />
              <div className="border-t border-on-surface-variant w-full" />
            </div>
            <div className="absolute top-2 left-2 flex gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-ia-gold" />
                <span className="text-[10px] font-label-caps text-on-surface-variant">Football</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-success-green" />
                <span className="text-[10px] font-label-caps text-on-surface-variant">Tennis</span>
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-between text-[10px] font-label-caps text-on-surface-variant">
            <span>01 AUG</span><span>01 SEP</span><span>01 OCT</span><span>30 OCT</span>
          </div>
        </section>

        {/* Sports & Leagues Allocation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-lg">
          {/* Sport Accuracy */}
          <section className="bg-surface-container-low border border-outline-variant rounded-lg p-stack-md">
            <div className="flex items-center gap-2 mb-stack-md">
              <Trophy className="w-5 h-5 text-ia-gold" />
              <h3 className="font-headline-sm text-headline-sm text-on-background uppercase tracking-tight">Sport Accuracy</h3>
            </div>
            <div className="space-y-stack-md">
              {SPORTS.map((sport) => (
                <div key={sport.name}>
                  <div className="flex justify-between mb-1">
                    <span className="font-body-md text-on-surface">{sport.name}</span>
                    <span className="font-label-caps text-ia-gold">{sport.winRate}% Win Rate</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
                    <div className={`h-full ${sport.barColor} transition-all`} style={{ width: `${sport.winRate}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* League Performance */}
          <section className="bg-surface-container-low border border-outline-variant rounded-lg p-stack-md">
            <div className="flex items-center gap-2 mb-stack-md">
              <Shield className="w-5 h-5 text-ia-gold" />
              <h3 className="font-headline-sm text-headline-sm text-on-background uppercase tracking-tight">League Performance</h3>
            </div>
            <ul className="space-y-3">
              {LEAGUES.map((league) => (
                <li key={league.code} className="flex items-center justify-between p-2 bg-surface-deep rounded border border-outline-variant/30">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-primary-container rounded flex items-center justify-center text-xs font-bold">{league.code}</div>
                    <span className="text-body-md">{league.name}</span>
                  </div>
                  <span className={`font-label-caps ${league.positive ? "text-success-green" : "text-error"}`}>
                    {league.pnl}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* System Logs */}
        <section className="mt-stack-lg bg-surface-container-low border border-outline-variant rounded-lg p-stack-md">
          <h3 className="font-headline-sm text-headline-sm text-on-background uppercase tracking-tight mb-stack-md">System Logs</h3>
          <div className="font-mono text-[11px] space-y-1.5 opacity-80">
            {LOGS.map((log, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-ia-gold shrink-0">[{log.time}]</span>
                <span className={`${log.color} shrink-0`}>{log.type}:</span>
                <span className="truncate">{log.message}</span>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* BottomNavBar */}
      <nav className="fixed bottom-0 w-full z-50 bg-surface-deep border-t border-outline-variant flex justify-around items-center h-[72px] px-base">
        <Link href="/dashboard" className="flex flex-col items-center justify-center text-on-surface-variant gap-1 hover:text-on-surface transition-colors active:opacity-80">
          <BarChart3 className="w-6 h-6" /><span className="font-label-caps text-label-caps uppercase">ANALYSES</span>
        </Link>
        <Link href="#" className="flex flex-col items-center justify-center text-on-surface-variant gap-1 hover:text-on-surface transition-colors active:opacity-80">
          <ScrollText className="w-6 h-6" /><span className="font-label-caps text-label-caps uppercase">COUPON</span>
        </Link>
        <Link href="/premium" className="flex flex-col items-center justify-center text-on-surface-variant gap-1 hover:text-on-surface transition-colors active:opacity-80">
          <Medal className="w-6 h-6" /><span className="font-label-caps text-label-caps uppercase">PRÉMIUM</span>
        </Link>
        <Link href="/profile" className="flex flex-col items-center justify-center text-ia-gold gap-1 hover:text-on-surface transition-colors active:opacity-80">
          <User className="w-6 h-6" /><span className="font-label-caps text-label-caps uppercase">COMPTE</span>
        </Link>
      </nav>
    </div>
  );
}
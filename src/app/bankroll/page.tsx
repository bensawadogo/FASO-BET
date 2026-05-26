"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  CreditCard,
  Shield,
  Scale,
  Zap,
  PlusCircle,
  BarChart3,
  ScrollText,
  Medal,
  User,
  Wallet,
  Star,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────
interface Transaction {
  id: string;
  label: string;
  date: string;
  amount: number;
  type: "win" | "stake" | "bonus";
}

const TRANSACTIONS: Transaction[] = [
  { id: "t1", label: "Pari Gagné - Ligue 1", date: "12 Oct, 14:20", amount: 4500, type: "win" },
  { id: "t2", label: "Mise de Jeu", date: "12 Oct, 10:05", amount: -2000, type: "stake" },
  { id: "t3", label: "Bonus Fidélité", date: "11 Oct, 09:00", amount: 500, type: "bonus" },
];

const txIcons: Record<Transaction["type"], React.ReactNode> = {
  win: <CreditCard className="w-5 h-5 text-success-green" />,
  stake: <Wallet className="w-5 h-5 text-on-surface-variant" />,
  bonus: <Star className="w-5 h-5 text-ia-gold" />,
};

const txBadges: Record<Transaction["type"], { label: string; className: string }> = {
  win: { label: "WIN", className: "bg-primary-container text-on-primary-container" },
  stake: { label: "STAKE", className: "bg-surface-variant text-on-surface-variant" },
  bonus: { label: "BONUS", className: "bg-ia-gold text-surface-deep" },
};

type RiskLevel = "sage" | "modere" | "ose";
type UnitSize = 2000 | 5000 | "custom";

const riskIcons: Record<RiskLevel, React.ReactNode> = {
  sage: <Shield className="w-[18px] h-[18px]" />,
  modere: <Scale className="w-[18px] h-[18px]" />,
  ose: <Zap className="w-[18px] h-[18px]" />,
};

export default function BankrollPage() {
  const router = useRouter();
  const [unitSize, setUnitSize] = useState<UnitSize>(2000);
  const [risk, setRisk] = useState<RiskLevel>("sage");

  return (
    <div className="bg-background text-on-background min-h-screen font-body-md">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-background border-b border-outline-variant flex justify-between items-center h-14 px-margin-mobile">
        <Link href="/profile" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center overflow-hidden border border-primary">
            <User className="w-5 h-5 text-primary" />
          </div>
          <span className="font-headline-lg text-headline-lg font-bold text-ia-gold tracking-tight">
            FASOBET
          </span>
        </Link>
        <div className="flex items-center gap-2 px-3 py-1 bg-surface-container rounded-lg border border-outline-variant">
          <span className="font-label-caps text-label-caps text-on-surface-variant">SOLDE</span>
          <span className="font-headline-sm text-headline-sm text-ia-gold">25,400 FCFA</span>
        </div>
      </header>

      <main className="pt-14 pb-[100px] px-margin-mobile">
        {/* Hero: Balance Overview */}
        <section className="mt-stack-lg bg-surface-deep border border-outline-variant rounded-lg p-gutter overflow-hidden relative">
          <div className="flex justify-between items-start mb-stack-sm">
            <div>
              <h2 className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-1">
                Banque Totale
              </h2>
              <div className="flex items-baseline gap-2">
                <span className="font-stat-value text-stat-value text-text-primary">
                  25,400 FCFA
                </span>
                <div className="flex items-center text-success-green text-sm font-bold">
                  <TrendingUp className="w-[18px] h-[18px]" />
                  <span>+12.4%</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              aria-label="Recharger"
              className="w-touch-target-min h-touch-target-min flex items-center justify-center bg-primary-container text-primary rounded-lg active:scale-95 transition-transform"
            >
              <CreditCard className="w-6 h-6" />
            </button>
          </div>

          {/* Simplified Performance Chart */}
          <div className="w-full h-32 mt-gutter">
            <svg
              className="w-full h-full"
              viewBox="0 0 400 120"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0,100 L40,95 L80,105 L120,80 L160,85 L200,60 L240,65 L280,40 L320,45 L360,20 L400,30 L400,120 L0,120 Z"
                fill="url(#chartGradient)"
              />
              <path
                d="M0,100 L40,95 L80,105 L120,80 L160,85 L200,60 L240,65 L280,40 L320,45 L360,20 L400,30"
                fill="none"
                stroke="#F59E0B"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="200" cy="60" r="4" fill="#F59E0B" />
              <circle cx="400" cy="30" r="4" fill="#F59E0B" />
            </svg>
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[10px] text-on-surface-variant font-label-caps uppercase">
              Il y a 30 jours
            </span>
            <span className="text-[10px] text-on-surface-variant font-label-caps uppercase">
              Aujourd'hui
            </span>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="grid grid-cols-3 gap-base mt-stack-md">
          <div className="bg-surface-container border border-outline-variant p-stack-sm rounded-lg flex flex-col items-center">
            <span className="font-label-caps text-[10px] text-on-surface-variant">PROFIT</span>
            <span className="font-headline-sm text-headline-sm text-success-green">+8.2k</span>
          </div>
          <div className="bg-surface-container border border-outline-variant p-stack-sm rounded-lg flex flex-col items-center">
            <span className="font-label-caps text-[10px] text-on-surface-variant">ROI</span>
            <span className="font-headline-sm text-headline-sm text-ia-gold">14.2%</span>
          </div>
          <div className="bg-surface-container border border-outline-variant p-stack-sm rounded-lg flex flex-col items-center">
            <span className="font-label-caps text-[10px] text-on-surface-variant">YIELD</span>
            <span className="font-headline-sm text-headline-sm text-primary">6.8%</span>
          </div>
        </section>

        {/* Transaction History */}
        <section className="mt-stack-lg">
          <div className="flex justify-between items-center mb-stack-md">
            <h3 className="font-headline-sm text-headline-sm text-on-background">
              Transactions Récentes
            </h3>
            <button type="button" className="text-primary text-sm font-bold hover:underline">
              Voir tout
            </button>
          </div>
          <div className="space-y-base">
            {TRANSACTIONS.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-stack-md bg-surface-container-low border border-outline-variant rounded-lg"
              >
                <div className="flex items-center gap-stack-md">
                  <div className={`w-10 h-10 rounded flex items-center justify-center ${
                    tx.type === "win" ? "bg-primary-container/20" : tx.type === "bonus" ? "bg-ia-gold/10" : "bg-surface-container-high"
                  }`}>
                    {txIcons[tx.type]}
                  </div>
                  <div>
                    <p className="font-body-lg text-body-lg text-on-surface">{tx.label}</p>
                    <p className="text-xs text-on-surface-variant">{tx.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-headline-sm text-headline-sm ${
                    tx.amount > 0 ? "text-success-green" : "text-on-surface"
                  }`}>
                    {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString()} FCFA
                  </p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${txBadges[tx.type].className}`}>
                    {txBadges[tx.type].label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Bankroll Settings */}
        <section className="mt-stack-lg p-gutter bg-surface-container rounded-lg border border-outline-variant">
          <h3 className="font-headline-sm text-headline-sm text-ia-gold mb-stack-md">
            Paramètres de Gestion
          </h3>

          {/* Unit Size */}
          <div className="mb-gutter">
            <label className="font-label-caps text-label-caps text-on-surface-variant mb-2 block">
              Taille de l'Unité (Stake Standard)
            </label>
            <div className="flex items-center bg-surface-container-highest rounded border border-outline-variant p-1">
              {([2000, 5000, "custom"] as const).map((size) => (
                <button
                  key={size.toString()}
                  type="button"
                  onClick={() => setUnitSize(size)}
                  className={`h-10 flex-1 rounded font-bold transition-colors ${
                    unitSize === size
                      ? "bg-primary-container text-on-primary-container"
                      : "text-on-surface-variant"
                  }`}
                >
                  {size === "custom" ? "Perso" : `${size.toLocaleString()} FCFA`}
                </button>
              ))}
            </div>
          </div>

          {/* Monthly Limit */}
          <div className="mb-gutter">
            <div className="flex justify-between items-center mb-2">
              <label className="font-label-caps text-label-caps text-on-surface-variant">
                Limite Mensuelle
              </label>
              <span className="text-sm font-bold text-text-primary">15,000 / 50,000 FCFA</span>
            </div>
            <div className="h-3 w-full bg-surface-container-highest rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: "30%" }} />
            </div>
          </div>

          {/* Risk Selector */}
          <div>
            <label className="font-label-caps text-label-caps text-on-surface-variant mb-3 block">
              Niveau de Risque
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { key: "sage" as RiskLevel, label: "SAGE" },
                { key: "modere" as RiskLevel, label: "MODÉRÉ" },
                { key: "ose" as RiskLevel, label: "OSÉ" },
              ]).map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRisk(key)}
                  className={`py-2 border rounded flex flex-col items-center transition-all ${
                    risk === key
                      ? "border-primary bg-primary-container"
                      : "border-outline-variant opacity-60"
                  }`}
                >
                  {riskIcons[key]}
                  <span className="text-[10px] font-bold mt-1">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="mt-stack-lg">
          <button
            type="button"
            className="w-full h-touch-target-min bg-primary-container border border-primary text-text-primary font-headline-sm rounded-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          >
            <PlusCircle className="w-5 h-5" />
            RECHARGER LA BANQUE
          </button>
        </div>
      </main>

      {/* BottomNavBar */}
      <nav className="fixed bottom-0 w-full z-50 bg-surface-deep border-t border-outline-variant flex justify-around items-center h-[72px] px-base">
        <Link
          href="/dashboard"
          className="flex flex-col items-center justify-center text-on-surface-variant gap-1 hover:text-on-surface transition-colors"
        >
          <BarChart3 className="w-6 h-6" />
          <span className="font-label-caps text-label-caps uppercase">ANALYSES</span>
        </Link>
        <Link
          href="#"
          className="flex flex-col items-center justify-center text-on-surface-variant gap-1 hover:text-on-surface transition-colors"
        >
          <ScrollText className="w-6 h-6" />
          <span className="font-label-caps text-label-caps uppercase">COUPON</span>
        </Link>
        <Link
          href="/premium"
          className="flex flex-col items-center justify-center text-on-surface-variant gap-1 hover:text-on-surface transition-colors"
        >
          <Medal className="w-6 h-6" />
          <span className="font-label-caps text-label-caps uppercase">PRÉMIUM</span>
        </Link>
        <Link
          href="/profile"
          className="flex flex-col items-center justify-center text-ia-gold gap-1 hover:text-on-surface transition-colors"
        >
          <User className="w-6 h-6" />
          <span className="font-label-caps text-label-caps uppercase">COMPTE</span>
        </Link>
      </nav>
    </div>
  );
}
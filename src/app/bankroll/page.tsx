"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  TrendingUp,
  CreditCard,
  User,
  Wallet,
} from "lucide-react";
import { BottomNavBar } from "@/components/ui/BottomNavBar";
import { apiClient } from "@/lib/api-client";
import { generateMockBankroll } from "@/lib/mock-predictions";
import { BankrollControls } from "./BankrollControls";

function CurrencyFormatter({ value }: { value: number }) {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);
  
  const formatted = isClient 
    ? Math.round(value).toLocaleString('fr-FR') 
    : Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return <>{formatted} FCFA</>;
}

export default function BankrollPage() {
  const [bankroll, setBankroll] = useState<{
    bankroll_initial: number;
    bankroll_current: number;
    currency: string;
    stake_default: number;
    roi: number;
    total_predictions: number;
    correct_predictions: number;
  } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiClient.djangoApiClient.getBankroll();
        if (res.success && res.data) {
          setBankroll(res.data);
        } else {
          throw new Error("Failed");
        }
      } catch {
        setBankroll(generateMockBankroll());
      }
    }
    load();
  }, []);

  if (!bankroll) return null;

  const profit = bankroll.bankroll_current - bankroll.bankroll_initial;
  const roi = bankroll.roi;
  const bankrollCurrent = bankroll.bankroll_current;
  const totalPredictions = bankroll.total_predictions;
  const correctPredictions = bankroll.correct_predictions;

  return (
    <div className="bg-background text-on-background min-h-screen font-body-md">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-background border-b border-outline-variant flex justify-between items-center h-14 px-margin-mobile">
        <Link href="/profile" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center overflow-hidden border border-primary">
            <User className="w-5 h-5 text-primary" />
          </div>
          <span className="font-headline-lg text-headline-lg font-bold text-ia-gold tracking-tight">
            fasobet<br /><span className="text-xs text-ia-gold/60 font-normal tracking-normal">by ben rachid sawadogo</span>
          </span>
        </Link>
        <div className="flex items-center gap-2 px-3 py-1 bg-surface-container rounded-lg border border-outline-variant">
          <span className="font-label-caps text-label-caps text-on-surface-variant">SOLDE</span>
          <span className="font-headline-sm text-headline-sm text-ia-gold"><CurrencyFormatter value={bankrollCurrent} /></span>
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
                  <CurrencyFormatter value={bankrollCurrent} />
                </span>
                <div className="flex items-center text-success-green text-sm font-bold">
                  <TrendingUp className="w-[18px] h-[18px]" />
                  <span>{roi >= 0 ? "+" : ""}{roi}%</span>
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
        </section>

        {/* Stats Grid */}
        <section className="grid grid-cols-3 gap-base mt-stack-md">
          <div className="bg-surface-container border border-outline-variant p-stack-sm rounded-lg flex flex-col items-center">
            <span className="font-label-caps text-[10px] text-on-surface-variant">PROFIT</span>
            <span className="font-headline-sm text-headline-sm text-success-green">
              {profit >= 0 ? "+" : ""}{(profit / 1000).toFixed(1)}k
            </span>
          </div>
          <div className="bg-surface-container border border-outline-variant p-stack-sm rounded-lg flex flex-col items-center">
            <span className="font-label-caps text-[10px] text-on-surface-variant">ROI</span>
            <span className="font-headline-sm text-headline-sm text-ia-gold">{roi}%</span>
          </div>
          <div className="bg-surface-container border border-outline-variant p-stack-sm rounded-lg flex flex-col items-center">
            <span className="font-label-caps text-[10px] text-on-surface-variant">YIELD</span>
            <span className="font-headline-sm text-headline-sm text-primary">
              {totalPredictions > 0 ? ((correctPredictions / totalPredictions) * 100).toFixed(1) : "0.0"}%
            </span>
          </div>
        </section>

        {/* Bankroll Settings */}
        <section className="mt-stack-lg p-gutter bg-surface-container rounded-lg border border-outline-variant">
          <h3 className="font-headline-sm text-headline-sm text-ia-gold mb-stack-md">
            Paramètres de Gestion
          </h3>
          <BankrollControls
            initialStake={bankroll.stake_default ?? 2000}
            initialRisk="modere"
          />
        </section>
      </main>

      {/* BottomNavBar */}
      <BottomNavBar />
    </div>
  );
}

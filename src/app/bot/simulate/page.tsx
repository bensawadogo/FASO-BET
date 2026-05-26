"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  Shield,
  CheckCircle2,
  Terminal,
  BarChart3,
  ScrollText,
  Medal,
  User,
} from "lucide-react";

export default function BotSimulatePage() {
  const ringRef = useRef<SVGCircleElement>(null);
  const [liquidity, setLiquidity] = useState(89);
  const [isExecuting, setIsExecuting] = useState(false);

  // ─── Confidence ring animation ───────────────────────────
  useEffect(() => {
    const el = ringRef.current;
    if (!el) return;
    const circumference = 2 * Math.PI * 45; // ≈ 282.74
    el.style.strokeDasharray = `${circumference}`;
    el.style.strokeDashoffset = `${circumference}`;
    requestAnimationFrame(() => {
      el.style.transition = "stroke-dashoffset 2s ease-out";
      el.style.strokeDashoffset = `${circumference * (1 - 0.78)}`;
    });
  }, []);

  // ─── Liquidity progress ─────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setLiquidity((prev) => {
        if (prev >= 99) return prev;
        return prev + Math.floor(Math.random() * 2);
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // ─── Execute handler ─────────────────────────────────────
  const handleExecute = useCallback(() => {
    if (isExecuting) return;
    setIsExecuting(true);
    setTimeout(() => {
      setIsExecuting(false);
    }, 2000);
  }, [isExecuting]);

  const criteria = [
    { label: "COTE ACTUELLE", value: "2.25", threshold: "(Seuil: 2.10)" },
    { label: "CONFIANCE", value: "78%", threshold: "(Min: 75%)" },
    { label: "VOLATILITÉ", value: "11%", threshold: "(Max: 15%)" },
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
            FASOBET
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
            SIMULATION EN COURS : TERMINAL STRATÉGIQUE
          </span>
        </div>

        {/* Match Display */}
        <section className="px-margin-mobile py-stack-lg flex flex-col items-center">
          <div className="w-full flex justify-between items-center bg-surface-raised border border-outline-variant p-stack-md rounded-lg mb-stack-lg relative overflow-hidden">
            {/* Home */}
            <div className="flex flex-col items-center flex-1">
              <div className="w-12 h-12 bg-surface-container flex items-center justify-center rounded-full border border-outline-variant mb-2">
                <Shield className="w-8 h-8 text-on-surface-variant" />
              </div>
              <span className="font-headline-sm text-headline-sm text-center">WYDAD AC</span>
            </div>

            {/* VS */}
            <div className="flex flex-col items-center px-stack-md">
              <span className="font-label-caps text-label-caps text-ia-gold">VS</span>
              <span className="font-body-md text-text-secondary text-xs">CAF CL</span>
            </div>

            {/* Away */}
            <div className="flex flex-col items-center flex-1">
              <div className="w-12 h-12 bg-surface-container flex items-center justify-center rounded-full border border-outline-variant mb-2">
                <Shield className="w-8 h-8 text-on-surface-variant" />
              </div>
              <span className="font-headline-sm text-headline-sm text-center">AL AHLY</span>
            </div>
          </div>
        </section>

        {/* Confidence Ring & Scan Animation */}
        <section className="flex flex-col items-center justify-center py-stack-md flex-1">
          <div className="relative w-48 h-48 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" fill="none" r="45" stroke="#374151" strokeWidth="2" />
              <circle
                ref={ringRef}
                cx="50" cy="50" fill="none" r="45"
                stroke="#F59E0B"
                strokeLinecap="round"
                strokeWidth="4"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-label-caps text-label-caps text-text-secondary mb-0">CONFIANCE IA</span>
              <span className="font-stat-value text-[48px] text-ia-gold leading-none">78%</span>
              <span className="font-label-caps text-label-caps text-ia-gold tracking-widest mt-1">OPTIMAL</span>
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
              <span className="font-label-caps text-[10px] text-ia-gold">{liquidity}%</span>
            </div>
            <div className="h-1 bg-surface-container rounded-full overflow-hidden">
              <div className="h-full bg-ia-gold transition-all duration-700" style={{ width: `${liquidity}%` }} />
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
            onClick={handleExecute}
            disabled={isExecuting}
            className={`w-full font-headline-sm text-[16px] font-bold h-touch-target-min flex items-center justify-center gap-3 rounded-lg active:scale-95 transition-all duration-150 shadow-lg ${
              isExecuting
                ? "bg-primary text-on-primary shadow-none"
                : "bg-ia-gold text-surface-deep shadow-ia-gold/10"
            }`}
          >
            <Terminal className="w-5 h-5" />
            {isExecuting ? "ORDRE TRANSMIS..." : "EXÉCUTER L'ORDRE SIMULÉ"}
          </button>
        </div>
      </main>

      {/* BottomNavBar */}
      <nav className="fixed bottom-0 w-full z-50 bg-surface-deep border-t border-outline-variant flex justify-around items-center h-[72px] px-base">
        <Link
          href="/dashboard"
          className="flex flex-col items-center justify-center text-ia-gold gap-1"
        >
          <BarChart3 className="w-6 h-6" />
          <span className="font-label-caps text-label-caps uppercase">ANALYSES</span>
        </Link>
        <Link href="#" className="flex flex-col items-center justify-center text-on-surface-variant gap-1">
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
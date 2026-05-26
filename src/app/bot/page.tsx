"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  User,
  BarChart3,
  ScrollText,
  Medal,
  Shield,
  CheckCircle2,
  Terminal,
  ListTodo,
  XCircle,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────
interface Criteria {
  label: string;
  value: string;
  status: "valid" | "stable" | "high";
  detail: string;
}

interface LogEntry {
  id: number;
  time: string;
  prefix: string;
  prefixColor: string;
  message: string;
}

// ─── Main Page ─────────────────────────────────────────────
const LOG_TEMPLATES = [
  { prefix: "[OK]", color: "text-primary" },
  { prefix: "[IA]", color: "text-ia-gold" },
  { prefix: "[OK]", color: "text-primary" },
  { prefix: "[RUN]", color: "text-success-green" },
  { prefix: "[LOG]", color: "text-on-surface-variant" },
  { prefix: "[LOG]", color: "text-on-surface-variant" },
  { prefix: "[IA]", color: "text-ia-gold" },
  { prefix: "[OK]", color: "text-primary" },
  { prefix: "[RUN]", color: "text-success-green" },
  { prefix: "[LOG]", color: "text-on-surface-variant" },
  { prefix: "[OK]", color: "text-primary" },
  { prefix: "[RUN]", color: "text-success-green" },
];

const LOG_MESSAGES = [
  "Connection secure via SSL_V3_1xBet",
  "Pattern Match: \"Raja_Strong_Home_Form\"",
  "Market depth verified: >5M FCFA",
  "Handshaking with exchange server...",
  "Calculating risk-adjusted variance...",
  "Checking odds delta shift...",
  "Sentiment analysis: High confidence detected.",
  "Token validation success.",
  "Executing API callback for 1xBet.",
  "Latency: 12ms optimal.",
  "Odds locked at 2.15.",
  "Finalizing transactional handshake...",
];

export default function BotExecutionPage() {
  // Progress bar
  const [progress, setProgress] = useState(65);
  const progressRef = useRef(65);

  // Countdown
  const [timeLeft, setTimeLeft] = useState(3);
  const [cancelled, setCancelled] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // Logs
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: 0, time: "14:22:04", prefix: "[OK]", prefixColor: "text-primary", message: "Connection secure via SSL_V3_1xBet" },
    { id: 1, time: "14:22:05", prefix: "[IA]", prefixColor: "text-ia-gold", message: "Pattern Match: Raja_Strong_Home_Form" },
    { id: 2, time: "14:22:05", prefix: "[OK]", prefixColor: "text-primary", message: "Market depth verified: >5M FCFA" },
    { id: 3, time: "14:22:06", prefix: "[RUN]", prefixColor: "text-success-green", message: "Handshaking with exchange server..." },
    { id: 4, time: "14:22:06", prefix: "[LOG]", prefixColor: "text-on-surface-variant", message: "Calculating risk-adjusted variance..." },
  ]);
  const logIndexRef = useRef(5);
  const nextIdRef = useRef(5);

  const criteria: Criteria[] = [
    { label: "COTE", value: "2.15", status: "valid", detail: "/ Seuil 2.10" },
    { label: "VOLATILITÉ", value: "12%", status: "stable", detail: "/ Seuil 15%" },
    { label: "LIQUIDITÉ DU MARCHÉ", value: "HAUTE", status: "high", detail: "" },
  ];

  const statusIcons: Record<Criteria["status"], React.ReactNode> = {
    valid: <CheckCircle2 className="w-[18px] h-[18px] text-success-green" />,
    stable: <CheckCircle2 className="w-[18px] h-[18px] text-success-green" />,
    high: <CheckCircle2 className="w-[18px] h-[18px] text-success-green" />,
  };

  const statusLabels: Record<Criteria["status"], string> = {
    valid: "VALIDE",
    stable: "STABLE",
    high: "VALIDE",
  };

  // ─── Progress animation ──────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      if (progressRef.current < 98 && !cancelled) {
        progressRef.current += Math.random() * 2;
        if (progressRef.current > 98) progressRef.current = 98;
        setProgress(progressRef.current);
      }
    }, 800);
    return () => clearInterval(interval);
  }, [cancelled]);

  // ─── Countdown ───────────────────────────────────────────
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  // ─── Dynamic logs ────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const template = LOG_TEMPLATES[logIndexRef.current % LOG_TEMPLATES.length];
      const message = LOG_MESSAGES[logIndexRef.current % LOG_MESSAGES.length];

      setLogs((prev) => {
        const next = [
          ...prev,
          { id: nextIdRef.current++, time, prefix: template.prefix, prefixColor: template.color, message },
        ];
        if (next.length > 8) return next.slice(next.length - 8);
        return next;
      });
      logIndexRef.current++;
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const handleCancel = useCallback(() => {
    clearInterval(timerRef.current);
    setCancelled(true);
    setTimeLeft(0);
    setProgress(0);
  }, []);

  return (
    <div className="bg-surface-deep text-on-background font-body-md min-h-screen overflow-hidden">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-background border-b border-outline-variant flex justify-between items-center h-14 px-margin-mobile">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center border border-primary">
            <User className="w-5 h-5 text-primary" />
          </div>
          <span className="font-headline-lg text-headline-lg font-bold text-ia-gold tracking-tight">FASOBET</span>
        </Link>
        <div className="flex items-center gap-2 px-3 py-1 bg-surface-container rounded-lg border border-outline-variant">
          <span className="font-label-caps text-label-caps text-on-surface-variant">SOLDE</span>
          <span className="font-stat-value text-body-lg font-bold text-primary">5,400 FCFA</span>
        </div>
      </header>

      <main className="pt-20 pb-24 px-margin-mobile max-w-lg mx-auto h-screen flex flex-col overflow-y-auto">
        {/* Bot Status Badge */}
        <div className="flex justify-center mb-stack-md">
          <div className={`inline-flex items-center gap-2 px-3 py-1 border rounded-full ${
            cancelled
              ? "bg-error-container/20 border-error/30"
              : "bg-primary-container/20 border-primary/30 animate-pulse"
          }`}>
            <span className={`w-2 h-2 rounded-full ${cancelled ? "bg-error" : "bg-success-green"}`} />
            <span className={`font-label-caps text-label-caps ${cancelled ? "text-error" : "text-success-green"}`}>
              {cancelled ? "ORDRE ANNULÉ" : "BOT ACTIF : EXÉCUTION STRATÉGIQUE"}
            </span>
          </div>
        </div>

        {/* 1. ANALYSE DES CRITÈRES */}
        <section className="bg-surface-raised border border-outline-variant p-stack-md rounded-lg mb-stack-md">
          <div className="flex items-center justify-between mb-stack-sm border-b border-outline-variant pb-2">
            <h2 className="font-headline-sm text-headline-sm text-ia-gold">ANALYSE DES CRITÈRES</h2>
            <BarChart3 className="w-5 h-5 text-ia-gold" />
          </div>
          <div className="grid grid-cols-1 gap-stack-sm">
            {criteria.map((criterion) => (
              <div key={criterion.label} className="flex justify-between items-center p-3 bg-surface-deep rounded border border-outline-variant">
                <div>
                  <p className="text-on-surface-variant font-label-caps text-label-caps">{criterion.label}</p>
                  <p className="font-stat-value text-stat-value text-text-primary">
                    {criterion.value}
                    {criterion.detail && <span className="text-body-md font-normal text-on-surface-variant">{criterion.detail}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-success-green">
                  {statusIcons[criterion.status]}
                  <span className="font-label-caps text-label-caps">{statusLabels[criterion.status]}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 2. EXÉCUTION DE L'ORDRE */}
        <section className="bg-surface-deep border-2 border-ia-gold p-stack-md rounded-lg mb-stack-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-8 h-8 bg-ia-gold flex items-center justify-center" style={{ transform: "rotate(45deg) translate(16px, -16px)" }} />
          <div className="flex items-center gap-2 mb-stack-md">
            <Terminal className="w-5 h-5 text-ia-gold" />
            <h2 className="font-headline-sm text-headline-sm text-on-surface">EXÉCUTION DE L'ORDRE</h2>
          </div>
          <div className="space-y-stack-md mb-stack-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-label-caps text-label-caps text-on-surface-variant mb-1">ÉVÉNEMENT</p>
                <p className="font-headline-sm text-headline-sm text-primary">Raja CA vs AS FAR</p>
              </div>
              <div className="text-right">
                <p className="font-label-caps text-label-caps text-on-surface-variant mb-1">TYPE</p>
                <p className="font-body-lg text-body-lg font-bold">Raja ou Nul</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-primary-container rounded border border-primary/20">
              <div>
                <p className="font-label-caps text-label-caps text-on-primary-container">MONTANT DE LA MISE</p>
                <p className="font-stat-value text-stat-value text-on-primary-fixed">1,080 FCFA</p>
              </div>
              <div className="text-right">
                <p className="font-label-caps text-label-caps text-on-primary-container">GESTION RISQUE</p>
                <p className="font-body-lg text-body-lg font-bold text-on-primary-fixed">2% BANKROLL</p>
              </div>
            </div>
          </div>

          {/* Progress Terminal */}
          <div className="space-y-2">
            <div className="flex justify-between items-center font-label-caps text-label-caps">
              <span className={cancelled ? "text-error tracking-widest" : "text-success-green tracking-widest"}>
                {cancelled ? "TRANSMISSION ANNULÉE" : "TRANSMISSION EN COURS..."}
              </span>
              <span className="text-on-surface">{Math.floor(progress)}%</span>
            </div>
            <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden border border-outline-variant">
              <div
                className={`h-full transition-all duration-300 ease-out ${cancelled ? "bg-error" : "bg-success-green"}`}
                style={{ width: `${progress}%`, boxShadow: cancelled ? "none" : "0 0 12px rgba(34, 197, 94, 0.4)" }}
              />
            </div>
          </div>
        </section>

        {/* 3. SYSTEM LOGS */}
        <section className="flex-grow flex flex-col min-h-[120px]">
          <div className="flex items-center gap-2 mb-2 px-1">
            <ListTodo className="w-[14px] h-[14px] text-on-surface-variant" />
            <p className="font-label-caps text-[10px] text-on-surface-variant tracking-tighter">SYSLOG // IA_CORE_KERNEL</p>
          </div>
          <div className="flex-grow bg-surface-container-lowest border border-outline-variant rounded p-3 font-mono text-[11px] leading-relaxed overflow-hidden"
            style={{ maskImage: "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)" }}>
            <div className="space-y-1 text-on-surface-variant">
              {logs.map((log) => (
                <p key={log.id}>
                  <span className="text-on-surface-variant/40">{log.time}</span>{" "}
                  <span className={log.prefixColor}>{log.prefix}</span>{" "}
                  {log.message}
                </p>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Action */}
        <div className="mt-stack-md pb-stack-lg">
          <button
            type="button"
            onClick={handleCancel}
            disabled={cancelled || timeLeft === 0}
            className={`w-full h-touch-target-min border rounded flex items-center justify-center gap-3 active:scale-95 transition-all duration-150 group ${
              cancelled || timeLeft === 0
                ? "bg-surface-container text-on-surface-variant border-outline-variant opacity-50"
                : "bg-error-container text-on-error border-error"
            }`}
          >
            <span className="font-label-caps text-label-caps">ANNULER L'ORDRE</span>
            <div className="w-8 h-8 rounded bg-on-error/20 flex items-center justify-center">
              <span className="font-stat-value text-headline-sm">{timeLeft}s</span>
            </div>
          </button>
        </div>
      </main>

      {/* BottomNavBar */}
      <nav className="fixed bottom-0 w-full z-50 bg-surface-deep border-t border-outline-variant h-[72px] flex justify-around items-center">
        <Link href="/dashboard" className="flex flex-col items-center justify-center text-on-surface-variant gap-1 hover:text-on-surface transition-colors">
          <BarChart3 className="w-6 h-6" />
          <span className="font-label-caps text-label-caps uppercase">ANALYSES</span>
        </Link>
        <Link href="#" className="flex flex-col items-center justify-center text-ia-gold gap-1 hover:text-on-surface transition-colors active:opacity-80">
          <ScrollText className="w-6 h-6" />
          <span className="font-label-caps text-label-caps uppercase">COUPON</span>
        </Link>
        <Link href="/premium" className="flex flex-col items-center justify-center text-on-surface-variant gap-1 hover:text-on-surface transition-colors">
          <Medal className="w-6 h-6" />
          <span className="font-label-caps text-label-caps uppercase">PRÉMIUM</span>
        </Link>
        <Link href="/profile" className="flex flex-col items-center justify-center text-on-surface-variant gap-1 hover:text-on-surface transition-colors">
          <User className="w-6 h-6" />
          <span className="font-label-caps text-label-caps uppercase">COMPTE</span>
        </Link>
      </nav>
    </div>
  );
}
"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  LineChart,
  MessageSquare,
  Send,
  Zap,
  CheckCircle2,
  RefreshCw,
  BarChart3,
  ScrollText,
  Medal,
  User,
  Shield,
  Swords,
  Wallet,
  Bot,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────
type Channel = "push" | "whatsapp" | "telegram";

// ─── ToggleSwitch ──────────────────────────────────────────
function ToggleSwitch({ checked, onChange, ariaLabel }: { checked: boolean; onChange: (v: boolean) => void; ariaLabel: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 ${
        checked ? "bg-success-green" : "bg-surface-container-highest"
      }`}
    >
      <span className={`inline-block h-5 w-5 rounded-full bg-white transition-transform duration-300 ${checked ? "translate-x-5" : "translate-x-[2px]"}`} />
    </button>
  );
}

// ─── Main Page ─────────────────────────────────────────────
export default function AlertConfigPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.id as string;

  // Toggles
  const [liveScore, setLiveScore] = useState(true);
  const [probabilityDrop, setProbabilityDrop] = useState(false);
  const [marketMovement, setMarketMovement] = useState(true);

  // Sliders
  const [oddsThreshold, setOddsThreshold] = useState(2.1);
  const [volatilityThreshold, setVolatilityThreshold] = useState(15);

  // Auto stake
  const [autoStake, setAutoStake] = useState(true);
  const [capitalAllocation, setCapitalAllocation] = useState(2);
  const [strategyMode, setStrategyMode] = useState<"prudent" | "equilibre" | "agressif">("equilibre");

  // Channel
  const [channel, setChannel] = useState<Channel>("whatsapp");

  // CTA state
  const [activateState, setActivateState] = useState<"idle" | "loading" | "done">("idle");

  const handleActivate = useCallback(() => {
    if (activateState !== "idle") return;
    setActivateState("loading");
    setTimeout(() => {
      setActivateState("done");
      setTimeout(() => setActivateState("idle"), 2000);
    }, 1500);
  }, [activateState]);

  const channels: { key: Channel; label: string; icon: React.ReactNode }[] = [
    { key: "push", label: "PUSH", icon: <Bell className="w-5 h-5 text-text-primary" /> },
    { key: "whatsapp", label: "WHATSAPP", icon: <MessageSquare className="w-5 h-5" /> },
    { key: "telegram", label: "TELEGRAM", icon: <Send className="w-5 h-5 text-text-primary" /> },
  ];

  return (
    <div className="font-body-md text-body-md overflow-x-hidden bg-background text-on-surface min-h-screen">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-background border-b border-outline-variant flex justify-between items-center h-14 px-margin-mobile">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} type="button" aria-label="Retour" className="text-on-background active:scale-95 duration-150">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-headline-sm text-headline-sm text-on-background">Configuration Alerte</span>
        </div>
        <span className="font-headline-lg text-headline-lg font-bold text-ia-gold tracking-tight">FASOBET</span>
      </header>

      <main className="pt-20 pb-32 px-margin-mobile max-w-md mx-auto">
        {/* Match Header Section */}
        <section className="mb-stack-lg">
          <div className="border border-primary-container bg-surface-deep p-stack-md flex flex-col items-center justify-center relative overflow-hidden rounded-lg">
            <div className="absolute top-0 right-0 p-1 bg-primary-container text-primary text-[10px] font-bold uppercase tracking-widest rounded-bl">
              Le Classico
            </div>
            <div className="flex justify-between items-center w-full mb-stack-sm">
              <div className="flex flex-col items-center flex-1">
                <div className="w-16 h-16 bg-surface-container rounded-lg flex items-center justify-center mb-2 border border-outline-variant">
                  <Shield className="w-10 h-10 text-primary" />
                </div>
                <span className="font-label-caps text-label-caps text-center">Raja CA</span>
              </div>
              <div className="flex flex-col items-center px-stack-sm">
                <span className="font-headline-md text-headline-md text-ia-gold">VS</span>
                <div className="mt-1 flex flex-col items-center">
                  <span className="text-[10px] text-text-secondary uppercase font-bold tracking-tighter">Botola Pro</span>
                  <span className="font-label-caps text-label-caps text-on-surface">20:00 • 12 MAR</span>
                </div>
              </div>
              <div className="flex flex-col items-center flex-1">
                <div className="w-16 h-16 bg-surface-container rounded-lg flex items-center justify-center mb-2 border border-outline-variant">
                  <Swords className="w-10 h-10 text-secondary" />
                </div>
                <span className="font-label-caps text-label-caps text-center">AS FAR</span>
              </div>
            </div>
          </div>
        </section>

        {/* Alert Configuration */}
        <section className="space-y-stack-md">
          <h2 className="font-label-caps text-label-caps text-ia-gold mb-stack-sm border-l-2 border-ia-gold pl-2">
            PARAMÈTRES STRATÉGIQUES
          </h2>

          {/* Live Score Update */}
          <div className="bg-surface-raised border border-outline-variant p-stack-md flex justify-between items-center rounded-lg">
            <div className="flex items-center gap-3 flex-1 pr-4">
              <Bell className="w-5 h-5 text-ia-gold shrink-0" />
              <div>
                <div className="font-body-lg text-body-lg text-text-primary">Mises à jour Live Score</div>
                <div className="text-[11px] text-text-secondary">Notifications instantanées de buts et cartons</div>
              </div>
            </div>
            <ToggleSwitch checked={liveScore} onChange={setLiveScore} ariaLabel="Mises à jour Live Score" />
          </div>

          {/* Minimum Odds Slider */}
          <div className="bg-surface-raised border border-outline-variant p-stack-md rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-ia-gold shrink-0" />
                <div className="font-body-lg text-body-lg text-text-primary">Seuil de Cotes Minimum</div>
              </div>
              <span className="font-stat-value text-stat-value text-ia-gold">{oddsThreshold.toFixed(2)}</span>
            </div>
            <input
              className="w-full h-1 bg-surface-container-highest appearance-none cursor-pointer accent-ia-gold [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-[#F59E0B] [&::-webkit-slider-thumb]:rounded-sm [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-surface-deep"
              type="range"
              min={1.1}
              max={5.0}
              step={0.05}
              value={oddsThreshold}
              onChange={(e) => setOddsThreshold(Number(e.target.value))}
              aria-label="Seuil de cotes minimum"
            />
            <div className="flex justify-between mt-2 text-[10px] text-text-secondary font-bold uppercase">
              <span>Value 1.10</span>
              <span>High Risk 5.00</span>
            </div>
          </div>

          {/* Volatility Threshold Slider */}
          <div className="bg-surface-raised border border-outline-variant p-stack-md rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-ia-gold shrink-0" />
                <div className="flex flex-col">
                  <div className="font-body-lg text-body-lg text-text-primary">Seuil de Volatilité IA</div>
                  <div className="text-[11px] text-text-secondary">
                    Alerte si l'indice de volatilité dépasse le seuil défini
                  </div>
                </div>
              </div>
              <span className="font-stat-value text-stat-value text-ia-gold">{volatilityThreshold}%</span>
            </div>
            <input
              className="w-full h-1 bg-surface-container-highest appearance-none cursor-pointer accent-ia-gold [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-[#F59E0B] [&::-webkit-slider-thumb]:rounded-sm [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-surface-deep"
              type="range"
              min={5}
              max={40}
              step={1}
              value={volatilityThreshold}
              onChange={(e) => setVolatilityThreshold(Number(e.target.value))}
              aria-label="Seuil de volatilité IA"
            />
            <div className="flex justify-between mt-2 text-[10px] text-text-secondary font-bold uppercase">
              <span>STABLE 5%</span>
              <span>VOLATILE 40%</span>
            </div>
          </div>

          {/* Probability Shift Alert */}
          <div className="bg-surface-raised border border-outline-variant p-stack-md flex flex-col gap-4 rounded-lg">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3 flex-1 pr-4">
                <Lightbulb className="w-5 h-5 text-ia-gold shrink-0" />
                <div>
                  <div className="font-body-lg text-body-lg text-text-primary">Chute Probabilité IA</div>
                  <div className="text-[11px] text-text-secondary">{'Alerte si Raja win chute de > 10%'}</div>
                </div>
              </div>
              <ToggleSwitch checked={probabilityDrop} onChange={setProbabilityDrop} ariaLabel="Chute Probabilité IA" />
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-primary-container text-white text-[10px] font-bold rounded">STABLE</span>
              <span className="text-[10px] text-text-secondary">Confiance Actuelle IA: 64%</span>
            </div>
          </div>

          {/* Market Movement */}
          <div className="bg-surface-raised border border-outline-variant p-stack-md flex justify-between items-center rounded-lg">
            <div className="flex items-center gap-3 flex-1 pr-4">
              <LineChart className="w-5 h-5 text-ia-gold shrink-0" />
              <div>
                <div className="font-body-lg text-body-lg text-text-primary">Mouvement du Marché</div>
                <div className="text-[11px] text-text-secondary">Liquidité anormale détectée</div>
              </div>
            </div>
            <ToggleSwitch checked={marketMovement} onChange={setMarketMovement} ariaLabel="Mouvement du Marché" />
          </div>
        </section>

        {/* Automated Management */}
        <section className="space-y-stack-md mt-stack-lg">
          <h2 className="font-label-caps text-label-caps text-ia-gold mb-stack-sm border-l-2 border-ia-gold pl-2">
            GESTION AUTOMATISÉE
          </h2>

          {/* Auto Stake Toggle */}
          <div className="bg-surface-raised border border-outline-variant p-stack-md flex justify-between items-center rounded-lg">
            <div className="flex items-center gap-3 flex-1 pr-4">
              <Bot className="w-5 h-5 text-ia-gold shrink-0" />
              <div>
                <div className="font-body-lg text-body-lg text-text-primary">Mise Automatique</div>
                <div className="text-[11px] text-text-secondary">Placer le pari automatiquement si les critères sont validés</div>
              </div>
            </div>
            <ToggleSwitch checked={autoStake} onChange={setAutoStake} ariaLabel="Mise Automatique" />
          </div>

          {/* Capital Allocation Slider */}
          {autoStake && (
            <div className="bg-surface-raised border border-outline-variant p-stack-md rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <Wallet className="w-5 h-5 text-ia-gold shrink-0" />
                  <div className="font-body-lg text-body-lg text-text-primary">Allocation du Capital</div>
                </div>
                <span className="font-stat-value text-stat-value text-ia-gold">{capitalAllocation}%</span>
              </div>
              <input
                className="w-full h-1 bg-surface-container-highest appearance-none cursor-pointer accent-ia-gold [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-[#F59E0B] [&::-webkit-slider-thumb]:rounded-sm [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-surface-deep"
                type="range"
                min={1}
                max={5}
                step={0.5}
                value={capitalAllocation}
                onChange={(e) => setCapitalAllocation(Number(e.target.value))}
                aria-label="Allocation du capital"
              />
              <div className="flex justify-between mt-2 text-[10px] text-text-secondary font-bold uppercase">
                <span>Min 1%</span>
                <span>Max 5%</span>
              </div>
            </div>
          )}

          {/* Strategy Selector */}
          <div className="bg-surface-raised border border-outline-variant p-stack-md flex flex-col gap-3 rounded-lg">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-ia-gold shrink-0" />
              <div className="font-body-lg text-body-lg text-text-primary">Mode Stratégique</div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([
                { key: "prudent" as const, label: "PRUDENT" },
                { key: "equilibre" as const, label: "ÉQUILIBRÉ" },
                { key: "agressif" as const, label: "AGRESSIF" },
              ]).map((mode) => (
                <button
                  key={mode.key}
                  type="button"
                  onClick={() => setStrategyMode(mode.key)}
                  className={`px-2 py-2 border rounded text-[10px] font-bold transition-all ${
                    strategyMode === mode.key
                      ? "border-ia-gold bg-primary-container text-text-primary"
                      : "border-outline-variant bg-surface-container-low text-text-secondary"
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Notification Channels */}
        <section className="mt-stack-lg">
          <h2 className="font-label-caps text-label-caps text-ia-gold mb-stack-sm border-l-2 border-ia-gold pl-2">
            CANAUX DE RÉCEPTION
          </h2>
          <div className="grid grid-cols-3 gap-stack-sm">
            {channels.map((ch) => (
              <button
                key={ch.key}
                type="button"
                onClick={() => setChannel(ch.key)}
                className={`flex flex-col items-center justify-center gap-2 p-stack-md border rounded-lg transition-all active:scale-95 ${
                  channel === ch.key
                    ? "border-ia-gold bg-primary-container"
                    : "border-outline-variant bg-surface-raised hover:bg-surface-container-high opacity-50"
                }`}
              >
                {ch.icon}
                <span className="text-[10px] font-bold text-text-primary">{ch.label}</span>
              </button>
            ))}
          </div>
        </section>
      </main>

      {/* Fixed Primary CTA */}
      <div className="fixed bottom-0 w-full p-margin-mobile bg-background/80 backdrop-blur-lg border-t border-outline-variant z-50">
        <button
          type="button"
          onClick={handleActivate}
          disabled={activateState !== "idle"}
          className={`w-full h-touch-target-min font-bold uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg border rounded-lg ${
            activateState === "idle"
              ? "bg-primary-container text-text-primary border-primary hover:bg-primary-container/80"
              : activateState === "loading"
                ? "bg-ia-gold text-surface-deep border-ia-gold"
                : "bg-success-green text-surface-deep border-success-green"
          }`}
        >
          {activateState === "idle" && (
            <>
              <Zap className="w-5 h-5" />
              Activer l'Alerte Stratégique
            </>
          )}
          {activateState === "loading" && (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Activation...
            </>
          )}
          {activateState === "done" && (
            <>
              <CheckCircle2 className="w-5 h-5" />
              Alerte Activée
            </>
          )}
        </button>
      </div>

      {/* BottomNavBar */}
      <nav className="fixed bottom-0 w-full z-40 bg-surface-deep border-t border-outline-variant flex justify-around items-center h-[72px] px-base">
        <Link href="/dashboard" className="flex flex-col items-center justify-center text-on-surface-variant gap-1 hover:text-on-surface transition-colors active:opacity-80">
          <BarChart3 className="w-6 h-6" />
          <span className="font-label-caps text-label-caps uppercase">ANALYSES</span>
        </Link>
        <Link href="#" className="flex flex-col items-center justify-center text-on-surface-variant gap-1 hover:text-on-surface transition-colors active:opacity-80">
          <ScrollText className="w-6 h-6" />
          <span className="font-label-caps text-label-caps uppercase">COUPON</span>
        </Link>
        <Link href="/premium" className="flex flex-col items-center justify-center text-on-surface-variant gap-1 hover:text-on-surface transition-colors active:opacity-80">
          <Medal className="w-6 h-6" />
          <span className="font-label-caps text-label-caps uppercase">PRÉMIUM</span>
        </Link>
        <Link href="/profile" className="flex flex-col items-center justify-center text-on-surface-variant gap-1 hover:text-on-surface transition-colors active:opacity-80">
          <User className="w-6 h-6" />
          <span className="font-label-caps text-label-caps uppercase">COMPTE</span>
        </Link>
      </nav>
    </div>
  );
}
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Bell,
  Mail,
  MessageSquare,
  BarChart3,
  ScrollText,
  Medal,
  User,
} from "lucide-react";
import { ToggleSwitch } from "@/components/ToggleSwitch";

// ─── Types ─────────────────────────────────────────────────
interface ToggleItem {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  hasSlider?: boolean;
}

interface NotificationChannel {
  key: string;
  label: string;
  checked: boolean;
}

// ─── Main Page ─────────────────────────────────────────────
export default function BankrollNotificationsPage() {
  const router = useRouter();

  // Strategy toggles
  const [drawdownAlert, setDrawdownAlert] = useState(true);
  const [drawdownThreshold, setDrawdownThreshold] = useState(10);
  const [profitTarget, setProfitTarget] = useState(false);

  // Risk management toggles
  const [maxStakeAlert, setMaxStakeAlert] = useState(true);
  const [sessionLimit, setSessionLimit] = useState(false);

  // Reporting toggles
  const [weeklyReport, setWeeklyReport] = useState(true);
  const [txConfirmation, setTxConfirmation] = useState(true);

  // Channels
  const [channels, setChannels] = useState<NotificationChannel[]>([
    { key: "push", label: "Push Mobile", checked: true },
    { key: "email", label: "E-mail", checked: false },
    { key: "whatsapp", label: "WhatsApp Business", checked: true },
  ]);

  const toggleChannel = (index: number) => {
    setChannels((prev) =>
      prev.map((c, i) => (i === index ? { ...c, checked: !c.checked } : c)),
    );
  };

  const channelIcons: Record<string, React.ReactNode> = {
    push: <Bell className="w-5 h-5 text-ia-gold" />,
    email: <Mail className="w-5 h-5 text-ia-gold" />,
    whatsapp: <MessageSquare className="w-5 h-5 text-ia-gold" />,
  };

  const drawdownColor = drawdownThreshold > 25 ? "text-error" : "text-ia-gold";

  const handleSave = () => {
    const config = {
      drawdownAlert,
      drawdownThreshold,
      profitTarget,
      maxStakeAlert,
      sessionLimit,
      weeklyReport,
      txConfirmation,
      channels: channels.filter((c) => c.checked).map((c) => c.key),
    };
    if (typeof window !== "undefined") {
      localStorage.setItem("fasobet by ben rachid sawadogo_bankroll_notifications", JSON.stringify(config));
    }
    router.back();
  };

  return (
    <div className="font-body-md text-body-md pb-24 bg-surface-deep text-on-surface min-h-screen">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-background border-b border-outline-variant flex justify-between items-center h-14 px-margin-mobile">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            type="button"
            aria-label="Retour"
            className="text-on-surface-variant active:scale-95 duration-150 p-2 -ml-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-headline-sm text-headline-sm text-on-background">
            Notifications Banque
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-label-caps text-label-caps text-ia-gold">SOLDE</span>
          <span className="font-headline-sm text-headline-sm text-ia-gold">25,400 FCFA</span>
        </div>
      </header>

      <main className="pt-20 px-margin-mobile max-w-md mx-auto space-y-4">
        {/* Strategy Section */}
        <section className="space-y-stack-md">
          <h2 className="font-label-caps text-label-caps text-text-secondary uppercase">
            Stratégie d'Alerte
          </h2>
          <div className="bg-surface-raised border border-outline-variant rounded-lg overflow-hidden">
            {/* Drawdown Alert Toggle */}
            <div className="p-4 flex items-center justify-between border-b border-outline-variant">
              <div className="flex flex-col gap-1 flex-1 pr-4">
                <span className="font-body-lg text-body-lg">Alertes de Drawdown</span>
                <span className="text-xs text-text-secondary">
                  Notifié si le capital chute de X%
                </span>
              </div>
              <ToggleSwitch
                checked={drawdownAlert}
                onChange={setDrawdownAlert}
                ariaLabel="Alertes de Drawdown"
              />
            </div>

            {/* Drawdown Slider */}
            {drawdownAlert && (
              <div className="p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-label-caps">SEUIL DE PERTE</span>
                  <span className={`font-stat-value text-stat-value ${drawdownColor}`}>
                    {drawdownThreshold}%
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={50}
                  value={drawdownThreshold}
                  onChange={(e) => setDrawdownThreshold(Number(e.target.value))}
                  className="w-full h-1 bg-outline-variant rounded-full appearance-none cursor-pointer accent-ia-gold [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#F59E0B] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-surface-deep"
                  aria-label="Seuil de drawdown"
                />
              </div>
            )}

            {/* Profit Target */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex flex-col gap-1 flex-1 pr-4">
                <span className="font-body-lg text-body-lg">Objectif de Profit</span>
                <span className="text-xs text-text-secondary">
                  Alerte lors de l'atteinte du ROI journalier
                </span>
              </div>
              <ToggleSwitch
                checked={profitTarget}
                onChange={setProfitTarget}
                ariaLabel="Objectif de Profit"
              />
            </div>
          </div>
        </section>

        {/* Risk Management */}
        <section className="space-y-stack-md">
          <h2 className="font-label-caps text-label-caps text-text-secondary uppercase">
            Gestion du Risque
          </h2>
          <div className="bg-surface-raised border border-outline-variant rounded-lg overflow-hidden">
            <div className="p-4 flex items-center justify-between border-b border-outline-variant">
              <div className="flex flex-col gap-1 flex-1 pr-4">
                <span className="font-body-lg text-body-lg">Alerte Mise Maximum</span>
                <span className="text-xs text-text-secondary">
                  Dépassement de l'unité recommandée
                </span>
              </div>
              <ToggleSwitch
                checked={maxStakeAlert}
                onChange={setMaxStakeAlert}
                ariaLabel="Alerte Mise Maximum"
              />
            </div>
            <div className="p-4 flex items-center justify-between">
              <div className="flex flex-col gap-1 flex-1 pr-4">
                <span className="font-body-lg text-body-lg">Limites de Session</span>
                <span className="text-xs text-text-secondary">
                  Notification après 5 paris consécutifs
                </span>
              </div>
              <ToggleSwitch
                checked={sessionLimit}
                onChange={setSessionLimit}
                ariaLabel="Limites de Session"
              />
            </div>
          </div>
        </section>

        {/* Reporting & Logs */}
        <section className="space-y-stack-md">
          <h2 className="font-label-caps text-label-caps text-text-secondary uppercase">
            Rapports & Logs
          </h2>
          <div className="bg-surface-raised border border-outline-variant rounded-lg overflow-hidden">
            <div className="p-4 flex items-center justify-between border-b border-outline-variant">
              <div className="flex flex-col gap-1 flex-1 pr-4">
                <span className="font-body-lg text-body-lg">Rapport Hebdomadaire ROI</span>
                <span className="text-xs text-text-secondary">
                  Synthèse PDF de l'évolution du capital
                </span>
              </div>
              <ToggleSwitch
                checked={weeklyReport}
                onChange={setWeeklyReport}
                ariaLabel="Rapport Hebdomadaire ROI"
              />
            </div>
            <div className="p-4 flex items-center justify-between">
              <div className="flex flex-col gap-1 flex-1 pr-4">
                <span className="font-body-lg text-body-lg">Confirmation de Transaction</span>
                <span className="text-xs text-text-secondary">
                  Notification push à chaque mouvement
                </span>
              </div>
              <ToggleSwitch
                checked={txConfirmation}
                onChange={setTxConfirmation}
                ariaLabel="Confirmation de Transaction"
              />
            </div>
          </div>
        </section>

        {/* Notification Channels */}
        <section className="space-y-stack-md">
          <h2 className="font-label-caps text-label-caps text-text-secondary uppercase">
            Canaux de Diffusion
          </h2>
          <div className="space-y-2">
            {channels.map((channel, i) => (
              <label
                key={channel.key}
                className="flex items-center gap-4 p-4 bg-surface-container rounded-lg border border-transparent hover:border-outline-variant transition-all cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={channel.checked}
                  onChange={() => toggleChannel(i)}
                  className="w-5 h-5 rounded border-outline-variant bg-surface-deep accent-ia-gold cursor-pointer"
                />
                <div className="flex-1 flex items-center gap-3">
                  {channelIcons[channel.key]}
                  <span className="font-body-lg text-body-lg">{channel.label}</span>
                </div>
              </label>
            ))}
          </div>
        </section>
      </main>

      {/* Fixed Action Button */}
      <div className="fixed bottom-0 w-full p-margin-mobile bg-gradient-to-t from-background via-background/95 to-transparent z-40">
        <button
          type="button"
          onClick={handleSave}
          className="w-full h-touch-target-min bg-primary-container text-text-primary rounded-lg font-headline-sm uppercase tracking-wider flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg shadow-black/50 border border-success-green/20"
        >
          <span>Enregistrer les préférences</span>
          <Save className="w-4 h-4" />
        </button>
      </div>

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
          className="flex flex-col items-center justify-center text-on-surface-variant gap-1 hover:text-on-surface transition-colors active:opacity-80"
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
          className="flex flex-col items-center justify-center text-ia-gold gap-1 hover:text-on-surface transition-colors active:opacity-80"
        >
          <User className="w-6 h-6" />
          <span className="font-label-caps text-label-caps uppercase">COMPTE</span>
        </Link>
      </nav>
    </div>
  );
}
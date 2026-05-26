"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Info,
  CheckCircle2,
  BarChart3,
  ScrollText,
  Medal,
  User,
  Save,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────
interface League {
  name: string;
  active: boolean;
}

interface ToggleSetting {
  key: string;
  label: string;
  description?: string;
  enabled: boolean;
}

interface BetType {
  label: string;
  checked: boolean;
}

// ─── Toggle Component ─────────────────────────────────────
function ToggleSwitch({
  checked,
  onChange,
  label,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-12 items-center rounded-full transition-all duration-300 ${
        checked ? "bg-primary-container" : "bg-surface-container-highest"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full transition-transform duration-300 ${
          checked ? "translate-x-7 bg-primary" : "translate-x-1 bg-outline"
        }`}
      />
    </button>
  );
}

// ─── Main Page ─────────────────────────────────────────────
const LEAGUES_INITIAL: League[] = [
  { name: "Ligue 1 Burkina", active: true },
  { name: "CAF Champions League", active: false },
  { name: "Premier League", active: true },
  { name: "La Liga", active: false },
  { name: "Serie A", active: false },
  { name: "Bundesliga", active: false },
  { name: "Ligue 1", active: false },
  { name: "Primeira Liga", active: false },
];

const BET_TYPES_INITIAL: BetType[] = [
  { label: "Résultat (1N2)", checked: true },
  { label: "Plus/Moins de buts", checked: true },
  { label: "Les deux marquent", checked: false },
  { label: "Handicap", checked: false },
  { label: "Double chance", checked: false },
  { label: "Score exact", checked: false },
];

export default function SettingsPage() {
  const router = useRouter();

  // Toggles
  const [priorizeRecent, setPriorizeRecent] = useState(true);
  const [includeWeather, setIncludeWeather] = useState(false);
  const [includeInjuries, setIncludeInjuries] = useState(true);

  // Confidence slider
  const [confidence, setConfidence] = useState(70);

  // Leagues
  const [leagues, setLeagues] = useState<League[]>(LEAGUES_INITIAL);

  const toggleLeague = useCallback((index: number) => {
    setLeagues((prev) =>
      prev.map((l, i) => (i === index ? { ...l, active: !l.active } : l)),
    );
  }, []);

  // Bet types
  const [betTypes, setBetTypes] = useState<BetType[]>(BET_TYPES_INITIAL);

  const toggleBetType = useCallback((index: number) => {
    setBetTypes((prev) =>
      prev.map((b, i) => (i === index ? { ...b, checked: !b.checked } : b)),
    );
  }, []);

  // Notification toggles
  const [alertVolatility, setAlertVolatility] = useState(true);
  const [dailyReport, setDailyReport] = useState(false);

  // Confidence color
  const confidenceColor =
    confidence >= 80 ? "text-ia-gold" : confidence >= 70 ? "text-primary" : "text-on-surface-variant";

  const handleSave = () => {
    const config = {
      priorizeRecent,
      includeWeather,
      includeInjuries,
      confidence,
      leagues: leagues.filter((l) => l.active).map((l) => l.name),
      betTypes: betTypes.filter((b) => b.checked).map((b) => b.label),
      alertVolatility,
      dailyReport,
    };
    if (typeof window !== "undefined") {
      localStorage.setItem("fasobet_settings", JSON.stringify(config));
    }
    router.back();
  };

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen pb-32">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-background border-b border-outline-variant flex justify-between items-center h-14 px-margin-mobile">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="w-12 h-12 flex items-center justify-center hover:bg-surface-container-high transition-colors active:scale-95"
            type="button"
            aria-label="Retour"
          >
            <ArrowLeft className="w-5 h-5 text-primary" />
          </button>
          <h1 className="font-headline-sm text-headline-sm text-on-background">
            Paramètres d'Analyse
          </h1>
        </div>
        <span className="font-headline-sm text-headline-sm text-ia-gold font-bold tracking-tight">
          5,400 FCFA
        </span>
      </header>

      <main className="pt-20 pb-8 px-margin-mobile max-w-2xl mx-auto space-y-stack-lg">
        {/* Préférences de Calcul */}
        <section className="space-y-stack-md">
          <h2 className="font-label-caps text-label-caps text-outline uppercase tracking-widest">
            Préférences de Calcul
          </h2>
          <div className="bg-surface-deep border border-outline-variant rounded-lg divide-y divide-outline-variant">
            <div className="flex items-center justify-between p-stack-md min-h-[72px]">
              <div className="flex-1 pr-4">
                <p className="font-body-lg text-body-lg text-on-surface">
                  Prioriser la forme récente
                </p>
                <p className="text-xs text-on-surface-variant mt-1">
                  Analyse basée sur les 5 derniers matchs
                </p>
              </div>
              <ToggleSwitch
                checked={priorizeRecent}
                onChange={setPriorizeRecent}
                label="Prioriser la forme récente"
                ariaLabel="Prioriser la forme récente"
              />
            </div>
            <div className="flex items-center justify-between p-stack-md min-h-[72px]">
              <div className="flex-1 pr-4">
                <p className="font-body-lg text-body-lg text-on-surface">
                  Inclure les données météo
                </p>
              </div>
              <ToggleSwitch
                checked={includeWeather}
                onChange={setIncludeWeather}
                label="Inclure les données météo"
                ariaLabel="Inclure les données météo"
              />
            </div>
            <div className="flex items-center justify-between p-stack-md min-h-[72px]">
              <div className="flex-1 pr-4">
                <p className="font-body-lg text-body-lg text-on-surface">
                  Analyse des blessures critiques
                </p>
              </div>
              <ToggleSwitch
                checked={includeInjuries}
                onChange={setIncludeInjuries}
                label="Analyse des blessures critiques"
                ariaLabel="Analyse des blessures critiques"
              />
            </div>
          </div>
        </section>

        {/* Seuil de Confiance */}
        <section className="space-y-stack-md">
          <h2 className="font-label-caps text-label-caps text-outline uppercase tracking-widest">
            Seuil de Confiance
          </h2>
          <div className="bg-surface-deep border border-outline-variant rounded-lg p-stack-md space-y-6">
            <div className="flex justify-between items-end">
              <span className={`text-stat-value font-stat-value ${confidenceColor}`}>
                {confidence}%
              </span>
              <span className="text-xs text-on-surface-variant font-medium">
                MINIMUM RECOMMANDÉ
              </span>
            </div>
            <input
              className="w-full h-2 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-ia-gold"
              type="range"
              min={50}
              max={95}
              step={5}
              value={confidence}
              onChange={(e) => setConfidence(Number(e.target.value))}
              aria-label="Seuil de confiance minimum"
            />
            <div className="flex items-start gap-3 p-3 bg-primary-container/20 border-l-2 border-ia-gold rounded-r">
              <Info className="w-4 h-4 text-ia-gold shrink-0 mt-0.5" />
              <p className="font-body-md text-on-surface-variant italic text-sm">
                L'IA ne recommandera que les matchs dépassant ce pourcentage.
              </p>
            </div>
          </div>
        </section>

        {/* Ligues Favorites */}
        <section className="space-y-stack-md">
          <div className="flex justify-between items-center">
            <h2 className="font-label-caps text-label-caps text-outline uppercase tracking-widest">
              Ligues Favorites
            </h2>
            <button
              type="button"
              className="text-primary text-xs font-bold uppercase tracking-wider hover:underline"
            >
              Gérer mes ligues
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {leagues.map((league, i) => (
              <button
                key={league.name}
                type="button"
                onClick={() => toggleLeague(i)}
                className={`h-10 px-4 flex items-center gap-2 transition-all active:scale-95 rounded ${
                  league.active
                    ? "border border-ia-gold bg-ia-gold/10 text-ia-gold"
                    : "border border-outline-variant bg-surface-deep text-on-surface-variant hover:border-outline"
                }`}
              >
                <span className="text-sm font-body-lg">{league.name}</span>
                {league.active && <CheckCircle2 className="w-[18px] h-[18px]" />}
              </button>
            ))}
          </div>
        </section>

        {/* Types de Paris */}
        <section className="space-y-stack-md">
          <h2 className="font-label-caps text-label-caps text-outline uppercase tracking-widest">
            Types de Paris
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {betTypes.map((bet, i) => (
              <label
                key={bet.label}
                className="flex items-center justify-between p-4 bg-surface-deep border border-outline-variant rounded-lg cursor-pointer hover:bg-surface-container-low transition-colors"
              >
                <span className="font-body-lg text-on-surface select-none">
                  {bet.label}
                </span>
                <input
                  type="checkbox"
                  checked={bet.checked}
                  onChange={() => toggleBetType(i)}
                  className="w-5 h-5 border-2 border-outline-variant bg-transparent text-primary rounded-sm accent-primary cursor-pointer"
                />
              </label>
            ))}
          </div>
        </section>

        {/* Notifications IA */}
        <section className="space-y-stack-md">
          <h2 className="font-label-caps text-label-caps text-outline uppercase tracking-widest">
            Notifications IA
          </h2>
          <div className="bg-surface-raised border border-ia-gold/30 rounded-lg overflow-hidden">
            <div className="p-stack-md border-b border-outline-variant flex items-center justify-between">
              <div className="flex-1 pr-4">
                <p className="font-body-lg text-on-surface">Alertes haute volatilité</p>
                <p className="text-xs text-on-surface-variant mt-1">
                  Notifications pour les changements de cotes brusques
                </p>
              </div>
              <ToggleSwitch
                checked={alertVolatility}
                onChange={setAlertVolatility}
                label="Alertes haute volatilité"
                ariaLabel="Alertes haute volatilité"
              />
            </div>
            <div className="p-stack-md flex items-center justify-between">
              <div className="flex-1 pr-4">
                <p className="font-body-lg text-on-surface">Rapport quotidien matinal</p>
                <p className="text-xs text-on-surface-variant mt-1">
                  Résumé des meilleures opportunités à 08:00 GMT
                </p>
              </div>
              <ToggleSwitch
                checked={dailyReport}
                onChange={setDailyReport}
                label="Rapport quotidien matinal"
                ariaLabel="Rapport quotidien matinal"
              />
            </div>
          </div>
        </section>

        {/* Save CTA */}
        <button
          type="button"
          onClick={handleSave}
          className="w-full h-14 bg-primary-container text-text-primary font-label-caps text-label-caps uppercase tracking-widest border border-primary/20 hover:bg-primary-container/80 transition-all active:scale-95 mt-8 rounded flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          Sauvegarder les configurations
        </button>
      </main>

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
          href="#"
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
          className="flex flex-col items-center justify-center text-ia-gold gap-1 active:opacity-80"
        >
          <User className="w-6 h-6" />
          <span className="font-label-caps text-label-caps uppercase">COMPTE</span>
        </Link>
      </nav>
    </div>
  );
}
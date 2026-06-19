"use client";
import { useState, useEffect } from "react";
import { Shield, Scale, Zap, PlusCircle } from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface BankrollControlsProps {
  initialStake: number;
  initialRisk: string;
}

export function BankrollControls({
  initialStake,
  initialRisk,
}: BankrollControlsProps) {
  const [stake, setStake] = useState(initialStake);
  const [risk, setRisk] = useState(initialRisk);
  const [loading, setLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleStake = async (value: number) => {
    setLoading(true);
    try {
      // Mock de l'API en attendant que le endpoint soit disponible dans apiClient
      await new Promise(r => setTimeout(r, 500));
      setStake(value);
    } finally {
      setLoading(false);
    }
  };

  const handleRisk = (value: string) => setRisk(value);

  const riskIcons: Record<string, React.ReactNode> = {
    sage: <Shield className="w-[18px] h-[18px]" />,
    modere: <Scale className="w-[18px] h-[18px]" />,
    ose: <Zap className="w-[18px] h-[18px]" />,
  };

  return (
    <div className="space-y-4">
      {/* Unit Size */}
      <div className="mb-gutter">
        <label className="font-label-caps text-label-caps text-on-surface-variant mb-2 block">
          Taille de l'Unité (Stake Standard)
        </label>
        <div className="flex items-center bg-surface-container-highest rounded border border-outline-variant p-1">
          {[2000, 5000].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => handleStake(val)}
              disabled={loading}
              className={`h-10 flex-1 rounded font-bold transition-all active:scale-95 ${
                stake === val
                  ? "bg-ia-gold text-surface-deep"
                  : "text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              {isClient ? val.toLocaleString('fr-FR') : val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} FCFA
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              const custom = prompt("Montant personnalisé (FCFA):");
              if (custom && !isNaN(Number(custom))) handleStake(Number(custom));
            }}
            disabled={loading}
            className="h-10 flex-1 rounded font-bold text-on-surface-variant hover:bg-surface-container transition-all active:scale-95"
          >
            Perso
          </button>
        </div>
      </div>

      {/* Risk Selector */}
      <div>
        <label className="font-label-caps text-label-caps text-on-surface-variant mb-3 block">
          Niveau de Risque
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(["sage", "modere", "ose"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => handleRisk(key)}
              className={`py-2 border rounded flex flex-col items-center gap-1 transition-all active:scale-95 ${
                risk === key
                  ? "border-ia-gold bg-primary-container text-on-primary-container"
                  : "border-outline-variant opacity-60 hover:opacity-100"
              }`}
            >
              {riskIcons[key]}
              <span className="text-[10px] font-bold mt-1">{key.toUpperCase()}</span>
            </button>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="mt-stack-lg">
        <button
          type="button"
          onClick={() => handleStake(stake)}
          className="w-full h-touch-target-min bg-primary-container border border-primary text-text-primary font-headline-sm rounded-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
        >
          <PlusCircle className="w-5 h-5" />
          SAUVEGARDER
        </button>
      </div>
    </div>
  );
}

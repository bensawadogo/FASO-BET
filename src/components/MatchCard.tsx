"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useTeamLogo } from "@/hooks/useTeamLogo";
import { SignalBadge } from "./SignalBadge";

function TeamLogoCell({ team, logo }: { team: string; logo: string }) {
  const [failed, setFailed] = useState(false);
  if (failed || logo.includes('/logos/default.png')) {
    return (
      <div className="flex flex-col items-center text-center">
        <div className="w-12 h-12 mb-2 flex items-center justify-center bg-surface-container rounded-full">
          <span className="text-xs font-black text-ia-gold">{team.slice(0, 2).toUpperCase()}</span>
        </div>
        <div className="text-sm font-bold leading-tight">{team}</div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-12 h-12 mb-2 flex items-center justify-center bg-surface-container rounded-full">
        <img
          src={logo}
          alt={team}
          width={48}
          height={48}
          className="max-w-full max-h-full object-contain p-1"
          onError={() => setFailed(true)}
        />
      </div>
      <div className="text-sm font-bold leading-tight">{team}</div>
    </div>
  );
}

export interface MatchCardPrediction {
  match_id: string;
  home_team: string;
  away_team: string;
  competition: string;
  recommended_bet: string;
  min_odds: number;
  signal?: string;
}

interface MatchCardProps {
  prediction: MatchCardPrediction;
  onAdd: (prediction: MatchCardPrediction) => void;
}

export function MatchCard({ prediction, onAdd }: MatchCardProps) {
  const router = useRouter();
  const homeLogo = useTeamLogo(prediction.home_team);
  const awayLogo = useTeamLogo(prediction.away_team);

  return (
    <div 
      onClick={() => router.push(`/match/${prediction.match_id}`)}
      className="bg-surface-raised rounded-xl p-4 border border-outline-variant shadow-sm hover:border-ia-gold transition-colors cursor-pointer"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
          {prediction.competition}
        </div>
        <SignalBadge signal={prediction.signal || ""} />
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 mb-4">
        <TeamLogoCell team={prediction.home_team} logo={homeLogo} />
        <div className="text-xs font-black text-outline">VS</div>
        <TeamLogoCell team={prediction.away_team} logo={awayLogo} />
      </div>

      <div className="bg-surface-container-low rounded-lg p-3 flex justify-between items-center">
        <div>
          <div className="text-[10px] text-text-secondary uppercase font-bold">Pronostic</div>
          <div className="text-sm font-black text-ia-gold">{prediction.recommended_bet}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-text-secondary uppercase font-bold">Cote</div>
          <div className="text-sm font-black text-white">{prediction.min_odds.toFixed(2)}</div>
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onAdd(prediction);
        }}
        className="mt-3 w-full bg-primary hover:bg-primary-container text-surface-deep py-2 rounded-lg font-black text-xs uppercase tracking-widest transition-all active:scale-95"
      >
        Ajouter au Coupon
      </button>
    </div>
  );
}

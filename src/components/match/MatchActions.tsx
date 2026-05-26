"use client";

import { useState } from "react";
import { PlusSquare, CheckCircle2 } from "lucide-react";
import { CouponDrawer, type CouponLeg } from "@/components/CouponDrawer";

interface MatchActionsProps {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  prediction: string;
  odds?: number;
}

export function MatchActions({
  matchId,
  homeTeam,
  awayTeam,
  league,
  prediction,
  odds,
}: MatchActionsProps) {
  const [legs, setLegs] = useState<CouponLeg[]>([]);
  const isInCoupon = legs.some((l) => l.id === matchId);

  const handleAdd = () => {
    if (isInCoupon) return;
    setLegs((prev) => [
      ...prev,
      {
        id: matchId,
        league,
        match: `${homeTeam} vs ${awayTeam}`,
        pick: prediction,
        odds: odds ?? 1.85,
      },
    ]);
  };

  const handleRemove = (id: string) => {
    setLegs((prev) => prev.filter((l) => l.id !== id));
  };

  return (
    <>
      <button
        type="button"
        onClick={handleAdd}
        disabled={isInCoupon}
        className={`flex-1 h-touch-target-min font-label-caps text-label-caps rounded-lg flex items-center justify-center gap-base active:scale-95 transition-transform uppercase ${
          isInCoupon
            ? "bg-success-green/20 text-success-green border border-success-green/30 cursor-default"
            : "bg-primary-container text-white"
        }`}
        aria-label={isInCoupon ? "Match déjà dans le coupon" : "Ajouter au coupon"}
      >
        {isInCoupon ? (
          <>
            <CheckCircle2 className="w-5 h-5" /> DANS LE COUPON
          </>
        ) : (
          <>
            <PlusSquare className="w-5 h-5" /> AJOUTER AU COUPON
          </>
        )}
      </button>

      <CouponDrawer
        legs={legs}
        onRemove={handleRemove}
        onClear={() => setLegs([])}
      />
    </>
  );
}

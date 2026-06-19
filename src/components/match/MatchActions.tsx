'use client'

import { couponStore } from '@/lib/coupon-store'

interface MatchActionsProps {
  matchId: string
  homeTeam: string
  awayTeam: string
  league: string
  prediction: string
  odds?: number
}

export function MatchActions({ matchId, homeTeam, awayTeam, prediction, odds }: MatchActionsProps) {
  const handleAdd = () => {
    couponStore.add({
      id: matchId,
      homeTeam,
      awayTeam,
      competition: '',
      prediction,
      odds: odds || 1.85,
    })
  }

  return (
    <button
      onClick={handleAdd}
      className="w-full py-4 bg-amber-500 text-black font-bold rounded-xl text-lg tracking-wide active:scale-95 transition-transform"
    >
      AJOUTER AU COUPON
    </button>
  )
}

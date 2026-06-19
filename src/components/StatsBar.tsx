'use client'
import { useEffect, useState } from 'react'

interface Stats {
  total_predictions: number
  correct: number
  wrong: number
  accuracy_display: string
  upcoming_matches: number
}

export default function StatsBar() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8002'
    fetch(`${apiUrl}/api/public/stats/`)
      .then(r => r.json())
      .then(setStats)
      .catch(() => {})
  }, [])

  if (!stats) return null

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '2rem',
      padding: '8px 16px',
      background: 'rgba(255,255,255,0.03)',
      borderBottom: '0.5px solid rgba(255,255,255,0.06)',
      fontSize: '12px',
      flexWrap: 'wrap'
    }}>
      <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
        <span style={{color:'rgba(255,255,255,0.4)'}}>Matchs prédits</span>
        <span style={{fontWeight:600,color:'#fff'}}>{stats.total_predictions}</span>
      </div>
      <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
        <span style={{color:'rgba(255,255,255,0.4)'}}>Corrects</span>
        <span style={{fontWeight:600,color:'#34d399'}}>
          ✓ {stats.correct}
        </span>
      </div>
      <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
        <span style={{color:'rgba(255,255,255,0.4)'}}>Incorrects</span>
        <span style={{fontWeight:600,color:'#f87171'}}>
          ✗ {stats.wrong}
        </span>
      </div>
      <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
        <span style={{color:'rgba(255,255,255,0.4)'}}>Précision</span>
        <span style={{
          fontWeight:700,
          color:'#a78bfa',
          background:'rgba(167,139,250,0.1)',
          padding:'1px 6px',
          borderRadius:'4px'
        }}>
          {stats.accuracy_display}
        </span>
      </div>
      <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
        <span style={{color:'rgba(255,255,255,0.4)'}}>À venir</span>
        <span style={{fontWeight:600,color:'#fbbf24'}}>{stats.upcoming_matches} matchs</span>
      </div>
    </div>
  )
}

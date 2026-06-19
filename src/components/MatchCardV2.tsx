'use client';
import React, { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * MatchCard — carte de match FasoBet v3.
 *
 * Changements vs version actuelle :
 * 1. Marchés secondaires (BTTS, O/U, Double Chance/DNB) repliés par défaut.
 *    Une ligne résumée affiche le nombre de marchés + s'il y a un value bet dedans.
 *    Clic → accordéon, pas de redirection de page.
 * 2. "Ajouter au coupon" devient une checkbox intégrée à la bordure gauche de la
 *    carte (la même bordure qui sert déjà de highlight H/N/A) — plus de bouton
 *    vert néon détaché. Coché = la bordure s'épaissit légèrement + icône check.
 * 3. Le badge "Favori IA" garde sa fonction mais perd l'emoji 🏆 → remplacé par
 *    un simple point plein coloré (cohérent avec le reste du design system).
 */

type Outcome = 'home' | 'draw' | 'away';

interface SecondaryMarket {
  label: string;
  lines: { outcomeLabel: string; probability: number }[];
  hasValueBet?: boolean;
}

interface MatchCardProps {
  competition: string;
  date: string;
  homeTeam: { name: string; flagUrl?: string; odds: number; probability: number };
  draw: { odds: number; probability: number };
  awayTeam: { name: string; flagUrl?: string; odds: number; probability: number };
  predictedOutcome: Outcome;
  edgePercent: number;
  kellyStakeFcfa: number;
  kellyFractionPercent: number;
  impliedProbabilityPercent: number;
  modelProbabilityPercent: number;
  secondaryMarkets: SecondaryMarket[];
  topScores?: { score: string; probability: number }[];
  isSelectedForCoupon?: boolean;
  onToggleCoupon?: () => void;
  markets?: any;
  extendedMarkets?: any;
}

const outcomeColor: Record<Outcome, string> = {
  home: 'var(--color-positive)',
  draw: 'var(--color-neutral-accent)',
  away: 'var(--color-negative)',
};

function OddsColumn({
  label,
  odds,
  probability,
  highlighted,
  accentColor,
  isPredicted,
  flagUrl,
}: {
  label: string;
  odds: number;
  probability: number;
  highlighted: boolean;
  accentColor: string;
  isPredicted?: boolean;
  flagUrl?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div
      className="flex flex-1 flex-col items-center gap-1 py-3"
      style={{
        background: highlighted ? 'rgba(16,185,129,0.12)' : 'transparent',
      }}
    >
      {isPredicted && (
        <span
          className="inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase mb-1"
          style={{
            background: highlighted ? 'rgba(16,185,129,0.25)' : 'rgba(251,191,36,0.2)',
            color: highlighted ? '#6ee7b7' : '#fcd34d',
          }}
        >
          Favori IA
        </span>
      )}
      {!failed && flagUrl && !flagUrl.includes('/logos/default.png') ? (
        <div className="w-9 h-9 flex items-center justify-center rounded-full" style={{background:'rgba(255,255,255,0.04)'}}>
          <img src={flagUrl} alt={label} width={36} height={36} className="max-w-full max-h-full object-contain" onError={() => setFailed(true)} />
        </div>
      ) : (
        <div className="w-9 h-9 rounded-full" style={{background:'rgba(255,255,255,0.04)'}} />
      )}
      <span className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
        {label}
      </span>
      <span className="font-mono text-2xl font-semibold tabular-nums text-[var(--color-text-primary)]">
        {odds.toFixed(2)}
      </span>
      <span className="font-mono text-xs tabular-nums text-[var(--color-text-secondary)]">
        {probability}%
      </span>
    </div>
  );
}

export function MatchCard({
  competition,
  date,
  homeTeam,
  draw,
  awayTeam,
  predictedOutcome,
  edgePercent,
  kellyStakeFcfa,
  kellyFractionPercent,
  impliedProbabilityPercent,
  modelProbabilityPercent,
  secondaryMarkets,
  topScores,
  isSelectedForCoupon = false,
  onToggleCoupon,
  markets: mk,
  extendedMarkets: em,
}: MatchCardProps) {
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  const hasValueBet = edgePercent > 0;

  return (
    <article
      className="relative overflow-hidden rounded-lg border bg-[var(--color-surface)] transition-transform duration-150 hover:-translate-y-0.5"
      style={{
        borderColor: 'var(--color-border)',
        borderLeftWidth: isSelectedForCoupon ? '4px' : '3px',
        borderLeftColor: outcomeColor[predictedOutcome],
      }}
    >
      {/* En-tête : compétition, date, checkbox coupon */}
      <header className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-2">
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
          <span className="font-bold uppercase tracking-wider">{competition}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono">{date}</span>
        </div>
        <button
          type="button"
          onClick={onToggleCoupon}
          aria-pressed={isSelectedForCoupon}
          aria-label={
            isSelectedForCoupon ? 'Retirer du coupon' : 'Ajouter au coupon'
          }
          className="flex h-6 w-6 items-center justify-center rounded border transition-colors"
          style={{
            borderColor: isSelectedForCoupon
              ? 'var(--color-positive)'
              : 'var(--color-border)',
            backgroundColor: isSelectedForCoupon
              ? 'var(--color-positive)'
              : 'transparent',
          }}
        >
          {isSelectedForCoupon && (
            <Check size={14} strokeWidth={3} color="var(--color-bg)" />
          )}
        </button>
      </header>

      {/* Cotes 1X2 — colonnes alignées, ancrage visuel principal */}
      <div className="flex divide-x divide-[var(--color-border)]">
        <OddsColumn
          label={homeTeam.name}
          odds={homeTeam.odds}
          probability={homeTeam.probability}
          highlighted={predictedOutcome === 'home'}
          accentColor={outcomeColor.home}
          isPredicted={predictedOutcome === 'home'}
          flagUrl={homeTeam.flagUrl}
        />
        <OddsColumn
          label="Nul"
          odds={draw.odds}
          probability={draw.probability}
          highlighted={predictedOutcome === 'draw'}
          accentColor={outcomeColor.draw}
          isPredicted={predictedOutcome === 'draw'}
        />
        <OddsColumn
          label={awayTeam.name}
          odds={awayTeam.odds}
          probability={awayTeam.probability}
          highlighted={predictedOutcome === 'away'}
          accentColor={outcomeColor.away}
          isPredicted={predictedOutcome === 'away'}
          flagUrl={awayTeam.flagUrl}
        />
      </div>

      {/* Bandeau Edge — seulement si value bet détecté, sinon rien (pas de bruit visuel) */}
      {hasValueBet && (
        <div
          className="flex items-center justify-between px-4 py-1.5 text-xs font-medium"
          style={{
            backgroundColor: 'rgba(31, 184, 112, 0.08)',
            color: 'var(--color-positive)',
          }}
        >
          <span>Value +{edgePercent.toFixed(1)}%</span>
          <span className="font-mono tabular-nums">
            Kelly : {kellyStakeFcfa} FCFA ({kellyFractionPercent.toFixed(1)}%)
          </span>
        </div>
      )}

      {/* 6 MARCHÉS — lisibles avec noms d'équipes */}
      <div style={{
        borderTop:'0.5px solid rgba(255,255,255,0.06)',
        padding:'12px 14px',
        display:'grid',
        gridTemplateColumns:'1fr 1fr',
        gap:'8px'
      }}>

        {/* 1. BTTS */}
        <div style={{background:'rgba(255,255,255,0.03)',borderRadius:'8px',padding:'8px 10px'}}>
          <div style={{fontSize:'9px',color:'rgba(255,255,255,0.35)',marginBottom:'4px',textTransform:'uppercase',letterSpacing:'0.05em'}}>
            Les deux équipes marquent
          </div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:'13px',color:'#34d399',fontWeight:600}}>
              Oui {mk?.btts_yes ? Math.round(mk.btts_yes * 100) : 0}%
            </span>
            <span style={{fontSize:'11px',color:'rgba(255,255,255,0.4)'}}>
              Non {mk?.btts_yes ? Math.round((1 - mk.btts_yes) * 100) : 0}%
            </span>
          </div>
        </div>

        {/* 2. Over/Under 2.5 */}
        <div style={{background:'rgba(255,255,255,0.03)',borderRadius:'8px',padding:'8px 10px'}}>
          <div style={{fontSize:'9px',color:'rgba(255,255,255,0.35)',marginBottom:'4px',textTransform:'uppercase',letterSpacing:'0.05em'}}>
            Total buts (2.5)
          </div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:'13px',color:'#34d399',fontWeight:600}}>
              Over {mk?.over_2_5 ? Math.round(mk.over_2_5 * 100) : 0}%
            </span>
            <span style={{fontSize:'11px',color:'#f87171'}}>
              Under {mk?.over_2_5 ? Math.round((1 - mk.over_2_5) * 100) : 0}%
            </span>
          </div>
        </div>

        {/* 3. Draw No Bet */}
        <div style={{background:'rgba(255,255,255,0.03)',borderRadius:'8px',padding:'8px 10px'}}>
          <div style={{fontSize:'9px',color:'rgba(255,255,255,0.35)',marginBottom:'4px',textTransform:'uppercase',letterSpacing:'0.05em'}}>
            Remboursé si nul
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:'2px'}}>
            <div style={{display:'flex',justifyContent:'space-between'}}>
              <span style={{fontSize:'11px',color:'rgba(255,255,255,0.8)'}}>
                {homeTeam.name?.split(' ').slice(0,1).join(' ')}
              </span>
              <span style={{fontSize:'12px',fontWeight:600,color:'#fff'}}>
                {em?.draw_no_bet?.home ? Math.round(em.draw_no_bet.home * 100) : 0}%
              </span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between'}}>
              <span style={{fontSize:'11px',color:'rgba(255,255,255,0.8)'}}>
                {awayTeam.name?.split(' ').slice(0,1).join(' ')}
              </span>
              <span style={{fontSize:'12px',fontWeight:600,color:'#fff'}}>
                {em?.draw_no_bet?.away ? Math.round(em.draw_no_bet.away * 100) : 0}%
              </span>
            </div>
          </div>
        </div>

        {/* 4. Double Chance */}
        <div style={{background:'rgba(255,255,255,0.03)',borderRadius:'8px',padding:'8px 10px'}}>
          <div style={{fontSize:'9px',color:'rgba(255,255,255,0.35)',marginBottom:'4px',textTransform:'uppercase',letterSpacing:'0.05em'}}>
            Double chance
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:'2px'}}>
            <div style={{display:'flex',justifyContent:'space-between'}}>
              <span style={{fontSize:'11px',color:'rgba(255,255,255,0.8)'}}>
                {homeTeam.name?.split(' ')[0]} ou Nul
              </span>
              <span style={{fontSize:'12px',fontWeight:600,color:'#fff'}}>
                {mk?.double_chance_1x ? Math.round(mk.double_chance_1x * 100) : 0}%
              </span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between'}}>
              <span style={{fontSize:'11px',color:'rgba(255,255,255,0.8)'}}>
                {awayTeam.name?.split(' ')[0]} ou Nul
              </span>
              <span style={{fontSize:'12px',fontWeight:600,color:'#fff'}}>
                {em?.double_chance?.X2 ? Math.round(em.double_chance.X2 * 100) : 0}%
              </span>
            </div>
          </div>
        </div>

        {/* 5. O/U 1.5 */}
        <div style={{background:'rgba(255,255,255,0.03)',borderRadius:'8px',padding:'8px 10px'}}>
          <div style={{fontSize:'9px',color:'rgba(255,255,255,0.35)',marginBottom:'4px',textTransform:'uppercase',letterSpacing:'0.05em'}}>
            Total buts (1.5)
          </div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:'13px',color:'#34d399',fontWeight:600}}>
              Over {em?.over_under_1_5?.over ? Math.round(em.over_under_1_5.over * 100) : 0}%
            </span>
            <span style={{fontSize:'11px',color:'#f87171'}}>
              Under {em?.over_under_1_5?.under ? Math.round(em.over_under_1_5.under * 100) : 0}%
            </span>
          </div>
        </div>

        {/* 6. Top scores */}
        <div style={{background:'rgba(255,255,255,0.03)',borderRadius:'8px',padding:'8px 10px'}}>
          <div style={{fontSize:'9px',color:'rgba(255,255,255,0.35)',marginBottom:'4px',textTransform:'uppercase',letterSpacing:'0.05em'}}>
            Scores les plus probables
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:'2px'}}>
            {(topScores || []).slice(0,3).map((s, i) => (
              <div key={i} style={{display:'flex',justifyContent:'space-between'}}>
                <span style={{fontSize:'12px',fontWeight:600,color:'#fff'}}>{s.score}</span>
                <span style={{fontSize:'11px',color:'rgba(255,255,255,0.5)'}}>
                  {s.probability}%
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
      {/* Détails & recommandation Kelly — repliable, inchangé dans l'esprit */}
      {hasValueBet && (
        <>
          <button
            type="button"
            onClick={() => setDetailsExpanded((v) => !v)}
            className="flex w-full items-center justify-between border-t border-[var(--color-border)] px-4 py-2.5 text-left text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)]"
            aria-expanded={detailsExpanded}
          >
            <span>Détails &amp; recommandation</span>
            <ChevronDown
              size={16}
              style={{ transform: detailsExpanded ? 'rotate(180deg)' : 'none' }}
            />
          </button>
          {detailsExpanded && (
            <div className="border-t border-[var(--color-border)] px-4 py-3 text-xs text-[var(--color-text-secondary)]">
              <div className="mb-2 flex justify-between font-mono tabular-nums">
                <span>Fraction bankroll</span>
                <span className="text-[var(--color-text-primary)]">
                  {kellyFractionPercent.toFixed(1)}%
                </span>
              </div>
              <div className="mb-2 flex justify-between font-mono tabular-nums">
                <span>Prob. implicite cote</span>
                <span className="text-[var(--color-text-primary)]">
                  {impliedProbabilityPercent}%
                </span>
              </div>
              <div className="mb-3 flex justify-between font-mono tabular-nums">
                <span>Prob. modèle</span>
                <span className="text-[var(--color-text-primary)]">
                  {modelProbabilityPercent}%
                </span>
              </div>
              <p className="leading-relaxed">
                Ne jamais miser plus que vous ne pouvez perdre. Cette
                recommandation est mathématique, pas une garantie. À 1/4 Kelly,
                le risque de ruine est très faible mais non nul sur le long
                terme.
              </p>
            </div>
          )}
        </>
      )}
    </article>
  );
}

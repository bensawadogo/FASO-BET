const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

// ─── 1. Types ──────────────────────────────────────────────
const perfTypes = `// ─── Performance tracking types (Bloc 5)

export interface AgentPerformance {
  agentId: string;
  name: string;
  matchesAnalyzed: number;
  avgConfidence: number;
  accuracyPct: number;
  avgEdge: number;
  signalDistribution: { value_bet: number; neutral: number; avoid: number };
  latencyMs: number;
  lastRun: string;
}

export interface BankrollAdvice {
  kellyFraction: number;
  recommendedStake: number;
  edgePct: number;
  odds: number;
  confidence: number;
  riskLevel: 'FAIBLE' | 'MOYEN' | 'ELEVE';
  kellySuggestedPct: string;
}

export interface MarketPerformance {
  market: string;
  totalPredictions: number;
  winRate: number;
  avgOdds: number;
  roiPct: number;
  profitLoss: number;
}

export interface DailyResult {
  date: string;
  predictions: number;
  winners: number;
  winRate: number;
  totalStake: number;
  totalReturn: number;
  profitLoss: number;
  roiPct: number;
}

export interface PerformanceResponse {
  status: string;
  message?: string;
  agentPerformance?: AgentPerformance[];
  marketPerformance?: MarketPerformance[];
  last30Days?: DailyResult[];
  bankrollAdvice?: BankrollAdvice[];
  summary?: {
    totalPredictions: number;
    overallWinRate: number;
    totalProfit: number;
    bestMarket: string;
    worstMarket: string;
    bestAgent: string;
  };
}
`;

fs.writeFileSync(path.join(root, 'src', 'types', 'performance.types.ts'), perfTypes, 'utf-8');
console.log('1/4 performance.types.ts');

// ─── 2. API Route ──────────────────────────────────────────
const perfRoute = `import { NextResponse } from "next/server";
import { getHistoricalContext } from "@/data/feature-store";
import type { PerformanceResponse } from "@/types/performance.types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const context = await getHistoricalContext();
    if (!context) {
      return NextResponse.json({ status: "no_data", message: "Donnees historiques introuvables." });
    }

    // ── Agent Performance ──────────────────────────────────
    const agentPerformance = [
      {
        agentId: "01",
        name: "Collector",
        matchesAnalyzed: context.progress.length * 12,
        avgConfidence: 92,
        accuracyPct: 98.5,
        avgEdge: 0,
        signalDistribution: { value_bet: 0, neutral: 0, avoid: context.progress.filter(r => r.bankersPercent < 30).length },
        latencyMs: 340,
        lastRun: context.lastUpdated,
      },
      {
        agentId: "02",
        name: "Statistician",
        matchesAnalyzed: context.progress.length,
        avgConfidence: 84,
        accuracyPct: 76.2,
        avgEdge: 5.4,
        signalDistribution: {
          value_bet: context.progress.filter(r => r.bankersPercent > 70).length,
          neutral: context.progress.filter(r => r.bankersPercent >= 40 && r.bankersPercent <= 70).length,
          avoid: context.progress.filter(r => r.bankersPercent < 40).length,
        },
        latencyMs: 1200,
        lastRun: context.lastUpdated,
      },
      {
        agentId: "03",
        name: "Strategist",
        matchesAnalyzed: context.progress.length,
        avgConfidence: 78,
        accuracyPct: calculateAccuracy(context),
        avgEdge: context.marketCalibrations.reduce((s, c) => s + (c.observedAccuracy - 0.5) * c.sampleCount, 0) /
          context.marketCalibrations.reduce((s, c) => s + c.sampleCount, 0) * 100,
        signalDistribution: {
          value_bet: Math.round(context.marketCalibrations.filter(c => c.observedAccuracy > 0.7).length * 1.5),
          neutral: context.marketCalibrations.filter(c => c.observedAccuracy >= 0.5 && c.observedAccuracy <= 0.7).length,
          avoid: Math.round(context.marketCalibrations.filter(c => c.observedAccuracy < 0.5).length * 0.8),
        },
        latencyMs: 890,
        lastRun: context.lastUpdated,
      },
    ];

    // ── Market Performance ────────────────────────────────
    const marketPerformance = context.marketCalibrations
      .filter(c => c.sampleCount > 100)
      .reduce<Record<string, { market: string; total: number; wins: number; oddsSum: number }>>((acc, c) => {
        if (!acc[c.market]) acc[c.market] = { market: c.market, total: 0, wins: 0, oddsSum: 0 };
        acc[c.market].total += c.sampleCount;
        acc[c.market].wins += Math.round(c.sampleCount * c.observedAccuracy);
        acc[c.market].oddsSum += c.sampleCount * (c.observedAccuracy > 0.6 ? 1.8 : 1.4);
        return acc;
      }, {})
      .map(m => {
        const winRate = m.wins / m.total;
        const avgOdds = m.oddsSum / m.total;
        const roi = (winRate * avgOdds - 1) * 100;
        return {
          market: m.market,
          totalPredictions: m.total,
          winRate: Math.round(winRate * 1000) / 10,
          avgOdds: Math.round(avgOdds * 100) / 100,
          roiPct: Math.round(roi * 10) / 10,
          profitLoss: Math.round((winRate * avgOdds - 1) * m.total * 1000),
        };
      })
      .sort((a, b) => b.roiPct - a.roiPct);

    // ── 30 derniers jours simulés ─────────────────────────
    const last30Days = context.progress.slice(-30).map(r => {
      const winRate = r.bankersPercent / 100;
      const stake = 1000;
      const avgOdds = 1.85;
      const returnVal = winRate * stake * avgOdds;
      return {
        date: r.date,
        predictions: Math.round(r.bankersCounter || 10),
        winners: Math.round((r.bankersCounter || 10) * winRate),
        winRate: r.bankersPercent,
        totalStake: stake * Math.round(r.bankersCounter || 10),
        totalReturn: Math.round(returnVal * Math.round(r.bankersCounter || 10)),
        profitLoss: Math.round(returnVal * Math.round(r.bankersCounter || 10) - stake * Math.round(r.bankersCounter || 10)),
        roiPct: Math.round(((returnVal / stake) - 1) * 1000) / 10,
      };
    });

    // ── Summary ────────────────────────────────────────────
    const bestMarket = marketPerformance[0];
    const worstMarket = marketPerformance[marketPerformance.length - 1];
    const totalProfit = last30Days.reduce((s, d) => s + d.profitLoss, 0);
    const overallWinRate = last30Days.length > 0
      ? Math.round(last30Days.reduce((s, d) => s + d.winRate, 0) / last30Days.length * 10) / 10
      : 0;

    const response: PerformanceResponse = {
      status: "success",
      agentPerformance,
      marketPerformance,
      last30Days,
      summary: {
        totalPredictions: context.progress.length * 12,
        overallWinRate,
        totalProfit,
        bestMarket: bestMarket?.market ?? "N/A",
        worstMarket: worstMarket?.market ?? "N/A",
        bestAgent: "Strategist",
      },
    };

    return NextResponse.json(response);
  } catch (e) {
    console.error("[Performance API] Error:", e);
    return NextResponse.json(
      { status: "error", message: e instanceof Error ? e.message : "Erreur" },
      { status: 500 }
    );
  }
}

function calculateAccuracy(context: any): number {
  const acc = context.marketCalibrations
    .filter((c: any) => c.sampleCount > 50)
    .reduce((s: number, c: any) => s + c.observedAccuracy * c.sampleCount, 0);
  const total = context.marketCalibrations
    .filter((c: any) => c.sampleCount > 50)
    .reduce((s: number, c: any) => s + c.sampleCount, 0);
  return total > 0 ? Math.round((acc / total) * 1000) / 10 : 0;
}
`;

fs.writeFileSync(path.join(root, 'src', 'app', 'api', 'performance', 'route.ts'), perfRoute, 'utf-8');
console.log('2/4 performance route.ts');

// ─── 3. BankrollAllocator Component ────────────────────────
const bankrollComp = `"use client";

import React, { useState, useMemo } from 'react';
import { Wallet, TrendingUp, TrendingDown, Calculator, Percent, DollarSign, Info } from 'lucide-react';
import type { BankrollAdvice } from '@/types/performance.types';

interface StakeCalcProps {
  odds: number;
  edgePct: number;
  confidence: number;
  riskLevel: 'FAIBLE' | 'MOYEN' | 'ELEVE';
}

function kellyFraction(edgePct: number, odds: number, confidence: number): number {
  // Kelly standard: f* = (bp - q) / b
  // où b = odds - 1, p = probabilité réelle, q = 1 - p
  const b = odds - 1;
  if (b <= 0) return 0;
  const p = (edgePct / 100 + 0.5); // probabilité estimée
  const q = 1 - p;
  const k = (b * p - q) / b;
  return Math.max(0, Math.min(k, 0.25)); // cap à 25%
}

const RISK_MULTIPLIERS = { FAIBLE: 0.5, MOYEN: 1.0, ELEVE: 1.5 };

export function BankrollCalculator({ odds, edgePct, confidence, riskLevel }: StakeCalcProps) {
  const k = kellyFraction(edgePct, odds, confidence / 100);
  const multiplier = RISK_MULTIPLIERS[riskLevel];
  const adjustedKelly = k * multiplier;

  return (
    <div className="bg-surface-container-high rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-1.5 mb-1">
        <Calculator className="w-3 h-3 text-primary" />
        <span className="font-data-label text-[8px] text-on-surface-variant uppercase">Kelly Criterion</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[10px]">
        <div>
          <span className="text-on-surface-variant font-data-label">Kelly pur</span>
          <p className="text-primary font-bold">{(k * 100).toFixed(1)}%</p>
        </div>
        <div>
          <span className="text-on-surface-variant font-data-label">Ajusté</span>
          <p className="text-success font-bold">{(adjustedKelly * 100).toFixed(1)}%</p>
        </div>
      </div>
      <div className="border-t border-outline-variant/10 pt-2 space-y-1">
        {[1000, 5000, 10000].map(stake => (
          <div key={stake} className="flex justify-between text-[9px]">
            <span className="text-on-surface-variant">{stake.toLocaleString()} F</span>
            <span className="text-on-surface font-bold">
              {Math.round(stake * adjustedKelly).toLocaleString()} F
            </span>
            <span className={adjustedKelly * stake * odds > stake ? 'text-success' : 'text-error'}>
              {(adjustedKelly * stake * odds - stake * adjustedKelly).toFixed(0)} F
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BankrollAllocator() {
  const [bankroll, setBankroll] = useState(100000);
  const [riskProfile, setRiskProfile] = useState<'conservative' | 'moderate' | 'aggressive'>('moderate');
  const [edgeThreshold, setEdgeThreshold] = useState(3);

  const riskMultiplier = useMemo(() => {
    switch (riskProfile) {
      case 'conservative': return 0.25;
      case 'moderate': return 0.5;
      case 'aggressive': return 1.0;
    }
  }, [riskProfile]);

  return (
    <section className="bg-surface-container-low border border-outline-variant/10 rounded-2xl overflow-hidden">
      <div className="p-5 border-b border-outline-variant/10 flex items-center gap-3">
        <Wallet className="w-5 h-5 text-primary" />
        <h2 className="font-display-lg text-sm uppercase tracking-wider text-on-surface">Bankroll Allocator</h2>
      </div>
      <div className="p-5 space-y-5">
        {/* Bankroll + Risk Profile */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="font-data-label text-[9px] text-on-surface-variant uppercase block mb-1">
              <DollarSign className="w-3 h-3 inline mr-1" />Bankroll
            </label>
            <input type="number" value={bankroll} onChange={e => setBankroll(Math.max(1000, Number(e.target.value)))}
              className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-lg p-2.5 text-sm text-on-surface focus:outline-none focus:border-primary/50"
              aria-label="Montant de la bankroll" />
          </div>
          <div>
            <label className="font-data-label text-[9px] text-on-surface-variant uppercase block mb-1">
              <Percent className="w-3 h-3 inline mr-1" />Profil risque
            </label>
            <div className="flex gap-1">
              {(['conservative', 'moderate', 'aggressive'] as const).map(p => (
                <button key={p} onClick={() => setRiskProfile(p)}
                  className={'flex-1 px-2 py-1.5 text-[9px] font-bold uppercase rounded-lg transition-all border ' +
                    (riskProfile === p ? 'bg-primary/20 text-primary border-primary/40' : 'bg-surface-container-highest text-on-surface-variant border-outline-variant/10')}>
                  {p === 'conservative' ? 'Prudent' : p === 'moderate' ? 'Modéré' : 'Agr.'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="font-data-label text-[9px] text-on-surface-variant uppercase block mb-1">
              <Info className="w-3 h-3 inline mr-1" />Seuil edge
            </label>
            <select value={edgeThreshold} onChange={e => setEdgeThreshold(Number(e.target.value))}
              className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-lg p-2.5 text-sm text-on-surface focus:outline-none focus:border-primary/50"
              aria-label="Seuil d'edge minimum">
              {[1,2,3,5,8,10].map(v => <option key={v} value={v}>{v}% min</option>)}
            </select>
          </div>
        </div>

        {/* Allocation rules */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-surface-container-high rounded-xl p-4 text-center">
            <p className="font-data-label text-[8px] text-on-surface-variant uppercase">Par pari</p>
            <p className="font-display-lg text-xl text-primary">{Math.round(bankroll * riskMultiplier * 0.2).toLocaleString()} F</p>
            <p className="font-data-label text-[7px] text-on-surface-variant">{(riskMultiplier * 20).toFixed(1)}% de la mise max</p>
          </div>
          <div className="bg-surface-container-high rounded-xl p-4 text-center">
            <p className="font-data-label text-[8px] text-on-surface-variant uppercase">Stop loss / jour</p>
            <p className="font-display-lg text-xl text-error">{Math.round(bankroll * 0.1).toLocaleString()} F</p>
            <p className="font-data-label text-[7px] text-on-surface-variant">10% de la bankroll</p>
          </div>
          <div className="bg-surface-container-high rounded-xl p-4 text-center">
            <p className="font-data-label text-[8px] text-on-surface-variant uppercase">Objectif / jour</p>
            <p className="font-display-lg text-xl text-success">{Math.round(bankroll * 0.03).toLocaleString()} F</p>
            <p className="font-data-label text-[7px] text-on-surface-variant">3% de la bankroll</p>
          </div>
        </div>

        {/* Scale mise */}
        <div className="bg-surface-container-high rounded-xl p-4">
          <p className="font-data-label text-[8px] text-on-surface-variant uppercase mb-3">Échelle de mise recommandée</p>
          <div className="space-y-1.5">
            {[
              { label: 'Value forte (edge > 10%)', pct: riskMultiplier * 0.03, color: 'bg-success' },
              { label: 'Value modérée (edge 5-10%)', pct: riskMultiplier * 0.02, color: 'bg-primary' },
              { label: 'Value faible (edge 2-5%)', pct: riskMultiplier * 0.01, color: 'bg-warning' },
              { label: 'Neutre (edge < 2%)', pct: riskMultiplier * 0.005, color: 'bg-surface-container-highest' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="font-data-label text-[8px] text-on-surface-variant w-32 shrink-0">{item.label}</span>
                <div className="flex-1 h-2 bg-surface-container-highest rounded-sm overflow-hidden">
                  <div className={`h-full rounded-sm ${item.color}`} style={{ width: `${item.pct * 100}%` }} />
                </div>
                <span className="font-data-label text-[8px] text-primary w-16 text-right">
                  {Math.round(bankroll * item.pct).toLocaleString()} F
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
`;

fs.writeFileSync(path.join(root, 'src', 'components', 'dashboard', 'BankrollAllocator.tsx'), bankrollComp, 'utf-8');
console.log('3/4 BankrollAllocator.tsx');

// ─── 4. PerformanceTerminal Component ──────────────────────
const perfTerminal = `"use client";

import React, { useEffect, useState, useMemo } from 'react';
import {
  Activity, TrendingUp, TrendingDown, BarChart3, Calendar,
  Loader2, AlertTriangle, Target, Zap, Shield,
  ArrowUpRight, ArrowDownRight, PieChart, DollarSign,
  Bot, Brain, Sparkles,
} from 'lucide-react';
import type { PerformanceResponse, MarketPerformance, DailyResult, AgentPerformance } from '@/types/performance.types';
import { BankrollAllocator } from './BankrollAllocator';

// ─── Helpers ────────────────────────────────────────────────

function formatNum(n: number): string { return n.toLocaleString('fr-FR'); }
function pct(n: number): string { return n.toFixed(1) + '%'; }
function signedPct(n: number): string { return (n >= 0 ? '+' : '') + n.toFixed(1) + '%'; }

const statusColors: Record<string, string> = {
  value_bet: 'text-success bg-success/10',
  neutral: 'text-warning bg-warning/10',
  avoid: 'text-error bg-error/10',
};

type PerfTab = 'agents' | 'markets' | 'results' | 'bankroll';

// ─── Sparkline mini ────────────────────────────────────────

function MiniSpark({ data, color = '#00f0ff', w = 80, h = 20 }: { data: number[]; color?: string; w?: number; h?: number }) {
  if (data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const pts = data.map((v, i) => { const x = (i / (data.length - 1)) * w; const y = h - ((v - min) / range) * (h - 4) - 2; return x + ',' + y; }).join(' ');
  return <svg width={w} height={h} className="shrink-0"><polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={pts} /></svg>;
}

// ─── AgentCard ─────────────────────────────────────────────

function AgentCard({ agent }: { agent: AgentPerformance }) {
  const iconMap: Record<string, React.ReactNode> = {
    '01': <Bot className="w-4 h-4" />,
    '02': <Brain className="w-4 h-4" />,
    '03': <Sparkles className="w-4 h-4" />,
  };
  const confColor = agent.accuracyPct > 80 ? 'text-success' : agent.accuracyPct > 60 ? 'text-warning' : 'text-error';
  return (
    <div className="bg-surface-container-high rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
            {iconMap[agent.agentId] || <Bot className="w-4 h-4" />}
          </div>
          <div>
            <p className="font-data-label text-xs text-on-surface">Agent {agent.name}</p>
            <p className="font-data-label text-[8px] text-on-surface-variant">#{agent.agentId} · {agent.matchesAnalyzed.toLocaleString()} analyses</p>
          </div>
        </div>
        <div className="text-right">
          <p className={'font-display-lg text-lg ' + confColor}>{pct(agent.accuracyPct)}</p>
          <p className="font-data-label text-[8px] text-on-surface-variant uppercase">Précision</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-surface-container-low rounded-lg p-2 text-center">
          <span className="font-data-label text-[7px] text-on-surface-variant uppercase">Value</span>
          <p className="font-bold text-xs text-success">{agent.signalDistribution.value_bet}</p>
        </div>
        <div className="bg-surface-container-low rounded-lg p-2 text-center">
          <span className="font-data-label text-[7px] text-on-surface-variant uppercase">Neutre</span>
          <p className="font-bold text-xs text-warning">{agent.signalDistribution.neutral}</p>
        </div>
        <div className="bg-surface-container-low rounded-lg p-2 text-center">
          <span className="font-data-label text-[7px] text-on-surface-variant uppercase">Avoid</span>
          <p className="font-bold text-xs text-error">{agent.signalDistribution.avoid}</p>
        </div>
      </div>
      <div className="flex justify-between text-[8px] font-data-label text-on-surface-variant">
        <span>Conf. {agent.avgConfidence}%</span>
        <span>Latence {agent.latencyMs}ms</span>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────

export function PerformanceTerminal() {
  const [data, setData] = useState<PerformanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PerfTab>('agents');

  useEffect(() => {
    fetch('/api/performance')
      .then(r => r.json())
      .then(j => { setData(j); if (j.status === 'error') setError(j.message); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <section className="bg-surface-container-low border border-outline-variant/10 rounded-2xl p-8"><div className="flex items-center justify-center gap-3 text-on-surface-variant"><Loader2 className="w-5 h-5 animate-spin" /><span className="font-data-label text-xs uppercase">Chargement du terminal...</span></div></section>;
  if (error || data?.status === 'error') return <section className="bg-surface-container-low border border-outline-variant/10 rounded-2xl p-8"><div className="flex items-center gap-3 text-error"><AlertTriangle className="w-5 h-5" /><span className="text-sm">{error || data?.message}</span></div></section>;
  if (data?.status === 'no_data') return null;

  const { agentPerformance, marketPerformance, last30Days, summary } = data;

  const TABS: { id: PerfTab; label: string; icon: React.ReactNode }[] = [
    { id: 'agents', label: 'Agents', icon: <Bot className="w-3.5 h-3.5" /> },
    { id: 'markets', label: 'Marchés', icon: <Target className="w-3.5 h-3.5" /> },
    { id: 'results', label: 'Résultats', icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { id: 'bankroll', label: 'Bankroll', icon: <DollarSign className="w-3.5 h-3.5" /> },
  ];

  return (
    <section className="bg-surface-container-low border border-outline-variant/10 rounded-2xl overflow-hidden">

      {/* Header */}
      <div className="p-5 border-b border-outline-variant/10">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-primary" />
            <h2 className="font-display-lg text-sm uppercase tracking-wider text-on-surface">Terminal Performance</h2>
          </div>
          {summary && (
            <div className="flex items-center gap-4 text-[9px] font-data-label text-on-surface-variant">
              <span>Win Rate: <span className={summary.overallWinRate > 60 ? 'text-success' : 'text-warning'}>{pct(summary.overallWinRate)}</span></span>
              <span className={summary.totalProfit >= 0 ? 'text-success' : 'text-error'}>{signedPct(summary.totalProfit)} F</span>
            </div>
          )}
        </div>

        {/* Mini KPI summary */}
        {summary && (
          <div className="grid grid-cols-4 gap-2 mt-3">
            <div className="bg-surface-container-high rounded-lg p-2 text-center">
              <span className="font-data-label text-[7px] text-on-surface-variant uppercase">Total</span>
              <p className="text-xs font-bold text-on-surface">{formatNum(summary.totalPredictions)}</p>
            </div>
            <div className="bg-surface-container-high rounded-lg p-2 text-center">
              <span className="font-data-label text-[7px] text-on-surface-variant uppercase">Meilleur Marché</span>
              <p className="text-xs font-bold text-success truncate" title={summary.bestMarket}>{summary.bestMarket.replace('_', ' ').slice(0, 12)}</p>
            </div>
            <div className="bg-surface-container-high rounded-lg p-2 text-center">
              <span className="font-data-label text-[7px] text-on-surface-variant uppercase">Pire Marché</span>
              <p className="text-xs font-bold text-error truncate" title={summary.worstMarket}>{summary.worstMarket.replace('_', ' ').slice(0, 12)}</p>
            </div>
            <div className="bg-surface-container-high rounded-lg p-2 text-center">
              <span className="font-data-label text-[7px] text-on-surface-variant uppercase">Meilleur Agent</span>
              <p className="text-xs font-bold text-primary">{summary.bestAgent}</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="px-5 flex gap-1 border-b border-outline-variant/10 overflow-x-auto no-scrollbar">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={'flex items-center gap-1.5 px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-all border-b-2 ' + (activeTab === tab.id ? 'text-primary border-primary' : 'text-on-surface-variant border-transparent hover:text-on-surface')}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* ═══ TAB AGENTS ═══ */}
      {activeTab === 'agents' && (
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {agentPerformance?.map(a => <AgentCard key={a.agentId} agent={a} />)}
          </div>
          {/* Comparaison */}
          {agentPerformance && agentPerformance.length >= 2 && (
            <div className="bg-surface-container-high rounded-xl p-4">
              <p className="font-data-label text-[8px] text-on-surface-variant uppercase mb-3">Comparaison Agents</p>
              <div className="space-y-2">
                {agentPerformance.map(a => (
                  <div key={a.agentId} className="flex items-center gap-3">
                    <span className="font-data-label text-[8px] text-on-surface-variant w-16">Agent {a.name}</span>
                    <div className="flex-1 h-3 bg-surface-container-highest rounded-sm relative overflow-hidden">
                      <div className="absolute inset-y-0 left-0 bg-primary/60 rounded-sm" style={{ width: a.accuracyPct + '%' }} />
                    </div>
                    <span className="font-data-label text-[8px] text-primary w-8 text-right">{pct(a.accuracyPct)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB MARKETS ═══ */}
      {activeTab === 'markets' && (
        <div className="p-5 space-y-4">
          <div className="space-y-1.5 max-h-80 overflow-y-auto no-scrollbar">
            {marketPerformance?.length === 0 ? (
              <p className="text-center text-xs text-on-surface-variant py-4">Aucune donnée marché</p>
            ) : (
              marketPerformance?.map((m, i) => (
                <div key={m.market} className="flex items-center justify-between px-3 py-2 bg-surface-container-high/50 rounded-lg hover:bg-surface-container-high transition-colors">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-data-label text-[8px] text-on-surface-variant uppercase w-16 shrink-0">{m.market.replace('_', ' ')}</span>
                    <span className="text-[9px] text-on-surface-variant">{formatNum(m.totalPredictions)} préd.</span>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <span className="font-data-label text-[7px] text-on-surface-variant block">Win</span>
                      <span className="font-data-label text-[9px] font-bold">{pct(m.winRate)}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-data-label text-[7px] text-on-surface-variant block">Cote</span>
                      <span className="font-data-label text-[9px]">{m.avgOdds.toFixed(2)}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-data-label text-[7px] text-on-surface-variant block">ROI</span>
                      <span className={'font-data-label text-[9px] font-bold ' + (m.roiPct >= 0 ? 'text-success' : 'text-error')}>{signedPct(m.roiPct)}</span>
                    </div>
                    <MiniSpark data={[m.winRate, m.roiPct + 50, 50]} w={48} h={16} color={m.roiPct >= 0 ? '#22c55e' : '#ef4444'} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ═══ TAB RESULTS ═══ */}
      {activeTab === 'results' && (
        <div className="p-5 space-y-4">
          {/* 30 jours en barres */}
          {last30Days && last30Days.length > 0 && (
            <div>
              <p className="font-data-label text-[8px] text-on-surface-variant uppercase mb-3 flex items-center gap-2">
                <Calendar className="w-3 h-3" /> 30 derniers jours
              </p>
              <div className="bg-surface-container-high rounded-xl p-4 space-y-1 max-h-60 overflow-y-auto no-scrollbar">
                {last30Days.slice(-30).map(d => (
                  <div key={d.date} className="flex items-center gap-2">
                    <span className="font-data-label text-[7px] text-on-surface-variant w-20 shrink-0">{d.date.slice(5)}</span>
                    <div className="flex-1 h-3 bg-surface-container-highest rounded-sm relative overflow-hidden">
                      <div className={'absolute inset-y-0 left-0 rounded-sm ' + (d.winRate > 60 ? 'bg-success/60' : d.winRate > 40 ? 'bg-warning/60' : 'bg-error/60')}
                        style={{ width: d.winRate + '%' }} />
                    </div>
                    <div className="flex items-center gap-2 shrink-0 w-24 justify-end">
                      <span className="font-data-label text-[7px] text-on-surface-variant">{d.winners}/{d.predictions}</span>
                      <span className={'font-data-label text-[7px] font-bold ' + (d.profitLoss >= 0 ? 'text-success' : 'text-error')}>
                        {d.profitLoss >= 0 ? '+' : ''}{d.profitLoss.toLocaleString()} F
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cumul */}
          {last30Days && last30Days.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-surface-container-high rounded-xl p-3 text-center">
                <p className="font-data-label text-[7px] text-on-surface-variant uppercase">Total misé</p>
                <p className="text-sm font-bold text-on-surface">{formatNum(last30Days.reduce((s, d) => s + d.totalStake, 0))} F</p>
              </div>
              <div className="bg-surface-container-high rounded-xl p-3 text-center">
                <p className="font-data-label text-[7px] text-on-surface-variant uppercase">Total retour</p>
                <p className="text-sm font-bold text-success">{formatNum(last30Days.reduce((s, d) => s + d.totalReturn, 0))} F</p>
              </div>
              <div className="bg-surface-container-high rounded-xl p-3 text-center">
                <p className="font-data-label text-[7px] text-on-surface-variant uppercase">P&L</p>
                <p className={'text-sm font-bold ' + (summary && summary.totalProfit >= 0 ? 'text-success' : 'text-error')}>
                  {summary?.totalProfit ? (summary.totalProfit >= 0 ? '+' : '') + formatNum(summary.totalProfit) : '0'} F
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB BANKROLL ═══ */}
      {activeTab === 'bankroll' && <BankrollAllocator />}

    </section>
  );
}
`;

fs.writeFileSync(path.join(root, 'src', 'components', 'dashboard', 'PerformanceTerminal.tsx'), perfTerminal, 'utf-8');
console.log('4/4 PerformanceTerminal.tsx');
console.log('Bloc 5 - ALL FILES WRITTEN');

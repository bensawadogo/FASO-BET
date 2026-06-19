"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ScrollText, ArrowLeft, TrendingUp, Zap, X } from "lucide-react";
import { BottomNavBar } from "@/components/ui/BottomNavBar";
import { couponStore, type CouponMatch } from "@/lib/coupon-store";

function CouponContent() {
  const [legs, setLegs] = useState<CouponMatch[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    const update = () => setLegs(couponStore.get())
    update()
    window.addEventListener('coupon-updated', update)
    return () => window.removeEventListener('coupon-updated', update)
  }, [])

  useEffect(() => { setIsClient(true); }, []);

  const totalOdds = legs.reduce((acc, leg) => acc * leg.odds, 1);
  const potentialGain = 1000 * totalOdds;

  if (legs.length === 0) {
    return (
      <div className="text-center py-20" style={{background:'rgba(255,255,255,0.03)', borderRadius:'24px', border:'1px dashed rgba(255,255,255,0.08)'}}>
        <ScrollText className="w-10 h-10 mx-auto mb-4" style={{color:'rgba(255,255,255,0.25)'}} />
        <p className="text-sm mb-2 font-bold uppercase tracking-widest" style={{color:'rgba(255,255,255,0.6)'}}>
          Aucun match dans le coupon
        </p>
        <p className="text-xs mb-6" style={{color:'rgba(255,255,255,0.3)'}}>
          Ajoutez des matchs depuis le dashboard pour construire votre combiné.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all hover:opacity-90"
          style={{background:'linear-gradient(135deg, #a78bfa, #60a5fa)', color:'#ffffff'}}
        >
          Retour aux analyses
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-stack-md">
        {legs.map((leg) => (
          <div key={leg.id} style={{background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.08)', borderRadius:'12px', padding:'12px'}}>
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="font-label-caps text-label-caps uppercase" style={{color:'rgba(255,255,255,0.6)'}}>{leg.competition}</p>
                <p className="font-body-lg text-body-lg" style={{color:'#ffffff'}}>{leg.homeTeam} vs {leg.awayTeam}</p>
              </div>
              <button type="button" onClick={() => couponStore.remove(leg.id)} className="p-1" style={{color:'rgba(255,255,255,0.4)'}} aria-label={`Retirer ${leg.homeTeam} vs ${leg.awayTeam} du coupon`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex justify-between items-end mt-2">
              <div className="flex flex-col">
                <span className="font-label-caps text-label-caps" style={{color:'#a78bfa'}}>IA PICK</span>
                <div className="flex items-center gap-1">
                  <span className="font-body-md text-body-md" style={{color:'#ffffff'}}>{leg.prediction}</span>
                </div>
              </div>
              <div style={{background:'rgba(255,255,255,0.06)', padding:'4px 12px', borderRadius:'8px', border:'0.5px solid rgba(255,255,255,0.08)'}}>
                <span style={{color:'#a78bfa', fontWeight:800}}>{leg.odds.toFixed(2)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{background:'rgba(255,255,255,0.02)', padding:'16px', borderRadius:'12px', border:'0.5px solid rgba(255,255,255,0.06)', marginTop:'24px'}}>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col">
            <span className="font-label-caps text-label-caps" style={{color:'rgba(255,255,255,0.6)'}}>COTE TOTALE</span>
            <span style={{fontSize:'24px', fontWeight:800, color:'#ffffff'}}>{totalOdds.toFixed(2)}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="font-label-caps text-label-caps text-right uppercase" style={{color:'rgba(255,255,255,0.6)'}}>Gains Potentiels (1 000F)</span>
            <span style={{fontSize:'24px', fontWeight:800, color:'#a78bfa'}}>{isClient ? potentialGain.toLocaleString("fr-FR") : potentialGain.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} FCFA</span>
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-2 rounded mt-4" style={{background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.06)'}}>
          <span style={{color:'rgba(255,255,255,0.6)'}}>Mise:</span>
          <div className="flex items-center gap-2">
            <span style={{fontSize:'20px', fontWeight:700, color:'#ffffff'}}>1 000</span>
            <span style={{color:'rgba(255,255,255,0.6)'}}>FCFA</span>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button type="button" className="flex-1 h-touch-target-min rounded flex items-center justify-center gap-2 transition-all active:scale-[0.98]" style={{background:'linear-gradient(135deg, #a78bfa, #60a5fa)', color:'#ffffff', fontWeight:700, fontSize:'11px', textTransform:'uppercase', letterSpacing:'0.05em', border:'none', cursor:'pointer'}} onClick={() => window.open("https://1xbet.com/fr/live/", "_blank", "noopener")}>
            PARIER SUR 1XBET <TrendingUp className="w-[18px] h-[18px]" />
          </button>
          <button type="button" className="flex-1 h-touch-target-min rounded flex items-center justify-center gap-2 transition-all active:scale-[0.98]" style={{background:'rgba(255,255,255,0.06)', color:'#ffffff', fontWeight:700, fontSize:'11px', textTransform:'uppercase', letterSpacing:'0.05em', border:'0.5px solid rgba(255,255,255,0.08)', cursor:'pointer'}} onClick={() => window.open("https://betclic.com", "_blank", "noopener")}>
            PARIER SUR BETCLIC <Zap className="w-[18px] h-[18px]" />
          </button>
        </div>

        <button type="button" onClick={() => couponStore.clear()} className="w-full text-center text-[10px] py-1" style={{color:'rgba(255,255,255,0.25)'}}>
          VIDER LE COUPON
        </button>
      </div>
    </>
  );
}

export default function CouponPage() {
  return (
    <div className="font-body-md antialiased pb-24 bg-surface-deep text-text-primary min-h-screen">
      <main className="max-w-md mx-auto">
        <div className="px-margin-mobile pt-8 pb-6 flex items-center gap-4">
          <Link href="/" className="text-text-secondary hover:text-text-primary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="font-headline-sm text-white leading-none mb-1">Mon Coupon</h2>
            <p className="text-[10px] text-text-secondary uppercase font-bold tracking-widest">Combiné de paris</p>
          </div>
        </div>
        <div className="px-margin-mobile">
          <CouponContent />
        </div>
      </main>
      <BottomNavBar />
    </div>
  );
}

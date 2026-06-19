"use client";

import React, { useState } from "react";
import Link from "next/link";
import { User, Menu, X, Globe, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { AnimatedStats } from "@/hooks/usePerformanceStats";

export default function Header() {
  const { user, isLoading, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="bg-background border-b border-outline-variant sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo — nouveau design */}
        <Link href="/" style={{display:'flex',alignItems:'center',gap:'10px',textDecoration:'none'}}>
          <div style={{
            width:'32px', height:'32px',
            borderRadius:'8px',
            background:'linear-gradient(135deg,#7c3aed,#1d4ed8)',
            display:'flex', alignItems:'center',
            justifyContent:'center',
            fontSize:'18px', boxShadow:'0 0 12px rgba(124,58,237,0.4)'
          }}>⚡</div>
          <span style={{
            fontSize:'20px', fontWeight:800,
            letterSpacing:'-0.5px',
            background:'linear-gradient(135deg,#a78bfa 0%,#818cf8 50%,#60a5fa 100%)',
            WebkitBackgroundClip:'text',
            WebkitTextFillColor:'transparent',
            lineHeight:1
          }}>
            Faso<span style={{fontStyle:'italic'}}>Bet</span>
          </span>
          <span style={{
            fontSize:'10px', padding:'3px 8px',
            borderRadius:'20px',
            background:'rgba(16,185,129,0.15)',
            border:'0.5px solid rgba(16,185,129,0.3)',
            color:'#34d399', fontWeight:500
          }}>
            53.87% ✓
          </span>
          <AnimatedStats />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/" className="font-label-caps text-label-caps text-on-surface-variant hover:text-ia-gold transition-colors">
            Accueil
          </Link>
          <Link href="/history" className="font-label-caps text-label-caps text-on-surface-variant hover:text-ia-gold transition-colors">
            Coupe du Monde
          </Link>
          <Link href="/bankroll" className="font-label-caps text-label-caps text-on-surface-variant hover:text-ia-gold transition-colors">
            Mon Coupon
          </Link>
          {!isLoading && (
            user ? (
              <div className="flex items-center gap-3">
                <Link href="/profile" className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-high hover:bg-surface-container-higher transition-colors">
                  <div className="w-6 h-6 rounded-full bg-ia-gold/20 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-ia-gold" />
                  </div>
                  <span className="text-xs font-bold text-text-primary">{user.username || "Profil"}</span>
                </Link>
                <button onClick={logout} className="p-2 text-on-surface-variant hover:text-error transition-colors" title="Déconnexion">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login" className="px-4 py-1.5 text-xs font-bold text-text-primary border border-outline-variant rounded-full hover:bg-surface-raised transition-colors">
                  Connexion
                </Link>
                <Link href="/register" className="px-4 py-1.5 text-xs font-bold text-surface-deep bg-ia-gold rounded-full hover:opacity-90 transition-opacity">
                  Inscription
                </Link>
              </div>
            )
          )}
        </nav>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 text-on-surface-variant"
          aria-label="Menu"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-outline-variant bg-surface-deep">
          <nav className="flex flex-col px-4 py-4 gap-3">
            <Link href="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 py-2 text-on-surface-variant hover:text-ia-gold transition-colors">
              <Globe className="w-4 h-4" />
              <span className="font-label-caps text-label-caps">Accueil</span>
            </Link>
            <Link href="/history" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 py-2 text-on-surface-variant hover:text-ia-gold transition-colors">
              <Globe className="w-4 h-4" />
              <span className="font-label-caps text-label-caps">Coupe du Monde</span>
            </Link>
            <Link href="/bankroll" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 py-2 text-on-surface-variant hover:text-ia-gold transition-colors">
              <Globe className="w-4 h-4" />
              <span className="font-label-caps text-label-caps">Mon Coupon</span>
            </Link>
            <div className="border-t border-outline-variant/50 my-2" />
            {user ? (
              <>
                <Link href="/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 py-2 text-ia-gold">
                  <User className="w-4 h-4" />
                  <span className="font-label-caps text-label-caps">{user.username || "Profil"}</span>
                </Link>
                <button onClick={() => { logout(); setMobileOpen(false); }} className="flex items-center gap-3 py-2 text-error">
                  <LogOut className="w-4 h-4" />
                  <span className="font-label-caps text-label-caps">Déconnexion</span>
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileOpen(false)} className="py-2 text-center font-bold text-sm text-text-primary border border-outline-variant rounded-full">
                  Connexion
                </Link>
                <Link href="/register" onClick={() => setMobileOpen(false)} className="py-2 text-center font-bold text-sm text-surface-deep bg-ia-gold rounded-full">
                  Inscription
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
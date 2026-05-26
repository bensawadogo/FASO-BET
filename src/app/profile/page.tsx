"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Star,
  Lightbulb,
  ScrollText,
  Wallet,
  SlidersHorizontal,
  ShieldCheck,
  Bell,
  MessageCircle,
  LogOut,
  ChevronRight,
  ChartBar,
  Medal,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";

const SETTINGS_ITEMS = [
  { icon: SlidersHorizontal, label: "Paramètres d'Analyse", href: "#" },
  { icon: ShieldCheck, label: "Sécurité & 2FA", href: "#", hasNotification: false },
  { icon: Bell, label: "Notifications", href: "#", hasNotification: true },
  { icon: MessageCircle, label: "Support Technique", href: "#" },
];

export default function ProfilePage() {
  const router = useRouter();

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
    }
    apiClient.clearAuthToken();
    router.push("/login");
  };

  return (
    <div className="font-body-md text-on-surface min-h-screen selection:bg-primary-container bg-surface-deep">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-background border-b border-outline-variant flex justify-between items-center h-14 px-margin-mobile">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-surface-container-highest overflow-hidden border border-outline-variant flex items-center justify-center">
            <User className="w-5 h-5 text-on-surface-variant" />
          </div>
          <span className="font-headline-lg text-headline-lg font-bold text-ia-gold tracking-tight">
            FASOBET
          </span>
        </Link>
        <div className="flex items-center gap-2 bg-primary-container px-3 py-1.5 rounded-lg border border-primary/20">
          <span className="font-headline-sm text-headline-sm text-on-background">
            5,400 FCFA
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 pb-32 px-margin-mobile max-w-2xl mx-auto space-y-stack-lg">
        {/* User Header Section */}
        <section className="flex flex-col items-center text-center space-y-stack-sm pt-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-surface-container border-2 border-ia-gold p-1 shadow-[0_0_15px_-5px_rgba(245,158,11,0.3)] flex items-center justify-center">
              <User className="w-12 h-12 text-ia-gold" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-ia-gold text-surface-deep font-label-caps text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">
              PREMIUM
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="font-headline-md text-headline-md text-on-surface">
              Expert Analyst
            </h1>
            <p className="text-on-surface-variant font-body-md">ID: 9928347</p>
          </div>
        </section>

        {/* Subscription Card */}
        <section className="bg-surface-container-low border border-outline-variant rounded-lg p-stack-md flex flex-col space-y-stack-md">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h2 className="font-label-caps text-label-caps text-ia-gold uppercase">
                ABONNEMENT PREMIUM
              </h2>
              <p className="font-body-lg text-body-lg">Actif jusqu'au 15 Juin 2024</p>
            </div>
            <Star className="w-6 h-6 text-ia-gold" />
          </div>
          <button
            type="button"
            className="w-full h-[48px] bg-surface-container-high border border-outline-variant text-on-surface font-label-caps uppercase tracking-wider rounded-lg hover:bg-surface-variant transition-colors active:scale-[0.98]"
          >
            Gérer mon forfait
          </button>
        </section>

        {/* Performance Metrics Grid */}
        <section className="grid grid-cols-2 gap-stack-md">
          <div className="bg-surface-container-low border border-outline-variant p-stack-md rounded-lg flex flex-col justify-between aspect-square">
            <Lightbulb className="w-6 h-6 text-primary" />
            <div className="space-y-0">
              <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                Success Rate
              </p>
              <p className="font-stat-value text-stat-value text-success-green">78%</p>
            </div>
          </div>
          <div className="bg-surface-container-low border border-outline-variant p-stack-md rounded-lg flex flex-col justify-between aspect-square">
            <ScrollText className="w-6 h-6 text-secondary" />
            <div className="space-y-0">
              <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                Suivies
              </p>
              <p className="font-stat-value text-stat-value">342</p>
            </div>
          </div>
        </section>

        {/* Credits Wide Card */}
        <section className="bg-surface-container-low border border-outline-variant p-stack-md rounded-lg flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary-container flex items-center justify-center">
              <Wallet className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                Total Credits
              </p>
              <p className="font-stat-value text-stat-value">5,400 FCFA</p>
            </div>
          </div>
          <button
            type="button"
            className="h-touch-target-min px-4 bg-primary text-on-primary font-label-caps uppercase rounded hover:opacity-90 transition-opacity"
          >
            Recharger
          </button>
        </section>

        {/* Settings List */}
        <section className="space-y-base">
          <h3 className="font-label-caps text-label-caps text-on-surface-variant uppercase px-1 pb-1">
            PARAMÈTRES DU COMPTE
          </h3>
          <div className="bg-surface-container-low border border-outline-variant rounded-lg divide-y divide-outline-variant overflow-hidden">
            {SETTINGS_ITEMS.map((item, index) => (
              <Link
                key={index}
                href={item.href}
                className="w-full h-touch-target-min flex items-center justify-between px-stack-md hover:bg-surface-variant transition-colors active:bg-surface-container-high"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-5 h-5 text-on-surface-variant" />
                  <span className="font-body-lg text-body-lg">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.hasNotification && (
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  )}
                  <ChevronRight className="w-5 h-5 text-outline" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Logout */}
        <section className="pt-stack-lg">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full h-touch-target-min flex items-center justify-center gap-2 text-error font-label-caps border border-error/30 rounded-lg hover:bg-error/10 transition-colors active:scale-[0.98]"
          >
            <LogOut className="w-5 h-5" />
            DÉCONNEXION
          </button>
          <p className="text-center text-[10px] text-on-surface-variant mt-8 uppercase tracking-widest opacity-50">
            Fasobet Terminal v2.4.1 | 2024
          </p>
        </section>
      </main>

      {/* BottomNavBar */}
      <nav className="fixed bottom-0 w-full z-50 bg-surface-deep border-t border-outline-variant flex justify-around items-center h-[72px] px-base">
        <Link
          href="/dashboard"
          className="flex flex-col items-center justify-center text-on-surface-variant gap-1 hover:text-on-surface transition-colors active:opacity-80"
        >
          <ChartBar className="w-6 h-6" />
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
          href="#"
          className="flex flex-col items-center justify-center text-on-surface-variant gap-1 hover:text-on-surface transition-colors active:opacity-80"
        >
          <Medal className="w-6 h-6" />
          <span className="font-label-caps text-label-caps uppercase">PRÉMIUM</span>
        </Link>
        <Link
          href="/profile"
          className="flex flex-col items-center justify-center text-ia-gold gap-1 hover:text-on-surface transition-colors active:opacity-80"
        >
          <User className="w-6 h-6" />
          <span className="font-label-caps text-label-caps uppercase">COMPTE</span>
        </Link>
      </nav>
    </div>
  );
}
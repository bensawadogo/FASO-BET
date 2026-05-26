"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface FormData {
  first_name: string;
  email: string;
  phone: string;
  password: string;
  terms: boolean;
}

interface FormErrors {
  first_name?: string;
  email?: string;
  phone?: string;
  password?: string;
  terms?: string;
}

type SubmitStatus = "idle" | "loading" | "success" | "error";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>({
    first_name: "",
    email: "",
    phone: "",
    password: "",
    terms: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [serverError, setServerError] = useState("");

  const validate = useCallback((): boolean => {
    const errs: FormErrors = {};
    if (!form.first_name.trim() || form.first_name.trim().length < 2) {
      errs.first_name = "Le prénom doit contenir au moins 2 caractères";
    }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = "Adresse email invalide";
    }
    if (!form.phone.trim() || form.phone.replace(/\s/g, "").length < 8) {
      errs.phone = "Numéro de téléphone invalide (min. 8 chiffres)";
    }
    if (!form.password || form.password.length < 8) {
      errs.password = "Minimum 8 caractères";
    }
    if (!form.terms) {
      errs.terms = "Vous devez accepter les conditions d'utilisation";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form]);

  const updateField = useCallback(
    <K extends keyof FormData>(field: K, value: FormData[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      if (errors[field as keyof FormErrors]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[field as keyof FormErrors];
          return next;
        });
      }
    },
    [errors],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;

      setStatus("loading");
      setServerError("");

      try {
        const response = await apiClient.djangoApiClient.register({
          first_name: form.first_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          password: form.password,
        });

        if (response.success) {
          setStatus("success");
          setTimeout(() => {
            router.push("/login");
          }, 1500);
        } else {
          setStatus("error");
          setServerError(response.error || "Erreur lors de l'inscription");
        }
      } catch (err) {
        setStatus("error");
        setServerError(
          err instanceof Error ? err.message : "Erreur réseau — vérifiez votre connexion",
        );
      }
    },
    [form, validate, router],
  );

  return (
    <>
      {/* ═══════════════════════════════════════════════
          Header
          ═══════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 bg-surface-deep px-margin-mobile h-touch-target-min flex items-center justify-between border-b border-outline-variant/30">
        <Link
          href="/"
          aria-label="Retour"
          className="w-10 h-10 flex items-center justify-start text-on-surface hover:text-ia-gold transition-colors active:scale-95"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <span className="text-ia-gold font-headline-sm font-bold tracking-tighter">
          FASOBET
        </span>
        <div className="w-10" />
      </header>

      <main className="max-w-md mx-auto px-margin-mobile py-stack-lg flex flex-col min-h-[calc(100vh-48px)]">
        {/* Hero Branding */}
        <div className="mb-stack-lg">
          <div className="inline-flex items-center gap-base mb-stack-sm py-1 px-2 bg-primary-container/20 border border-primary-container rounded">
            <ShieldCheck className="w-[14px] h-[14px] text-primary" />
            <span className="font-label-caps text-label-caps text-primary uppercase">
              Accès Stratégique Elite
            </span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-text-primary mb-base">
            Créer mon compte
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Rejoignez l'élite de l'analyse stratégique et accédez aux
            terminaux de données en temps réel.
          </p>
        </div>

        {/* Success state */}
        {status === "success" && (
          <div className="p-6 bg-primary-container/10 border border-primary rounded text-center space-y-3 mb-stack-lg">
            <ShieldCheck className="w-10 h-10 text-primary mx-auto" />
            <p className="font-headline-sm text-headline-sm text-primary">
              Compte créé avec succès !
            </p>
            <p className="text-sm text-on-surface-variant">
              Redirection vers la connexion…
            </p>
          </div>
        )}

        {/* Server error */}
        {status === "error" && serverError && (
          <div className="p-4 bg-error-container/10 border border-error/30 rounded text-center mb-stack-lg">
            <p className="text-sm text-error">{serverError}</p>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-stack-md flex-grow" noValidate>
          {/* Field: Prénom */}
          <div className="flex flex-col gap-base">
            <label className="font-label-caps text-label-caps text-on-surface ml-1" htmlFor="first_name">
              PRÉNOM
            </label>
            <input
              className={`w-full h-touch-target-min bg-surface-container-low border rounded px-4 text-text-primary placeholder:text-outline-variant transition-all font-body-md focus:border-ia-gold focus:shadow-[0_0_0_1px_#F59E0B] ${errors.first_name ? "border-error" : "border-outline-variant"}`}
              id="first_name"
              name="first_name"
              placeholder="Ex: Adama"
              type="text"
              value={form.first_name}
              onChange={(e) => updateField("first_name", e.target.value)}
              autoComplete="given-name"
            />
            {errors.first_name && (
              <p className="text-[11px] text-error ml-1">{errors.first_name}</p>
            )}
          </div>

          {/* Field: Email */}
          <div className="flex flex-col gap-base">
            <label className="font-label-caps text-label-caps text-on-surface ml-1" htmlFor="email">
              EMAIL ANALYSTE
            </label>
            <input
              className={`w-full h-touch-target-min bg-surface-container-low border rounded px-4 text-text-primary placeholder:text-outline-variant transition-all font-body-md focus:border-ia-gold focus:shadow-[0_0_0_1px_#F59E0B] ${errors.email ? "border-error" : "border-outline-variant"}`}
              id="email"
              name="email"
              placeholder="nom@exemple.bf"
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              autoComplete="email"
            />
            {errors.email && (
              <p className="text-[11px] text-error ml-1">{errors.email}</p>
            )}
          </div>

          {/* Field: Téléphone */}
          <div className="flex flex-col gap-base">
            <label className="font-label-caps text-label-caps text-on-surface ml-1" htmlFor="phone">
              NUMÉRO MOBILE
            </label>
            <div className="flex h-touch-target-min">
              <div className="flex items-center justify-center px-3 bg-surface-container border border-r-0 border-outline-variant rounded-l text-on-surface-variant font-stat-value text-sm">
                +226
              </div>
              <input
                className={`flex-grow bg-surface-container-low border rounded-r px-4 text-text-primary placeholder:text-outline-variant transition-all font-body-md focus:border-ia-gold focus:shadow-[0_0_0_1px_#F59E0B] ${errors.phone ? "border-error" : "border-outline-variant"}`}
                id="phone"
                name="phone"
                placeholder="00 00 00 00"
                type="tel"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                autoComplete="tel-national"
              />
            </div>
            {errors.phone && (
              <p className="text-[11px] text-error ml-1">{errors.phone}</p>
            )}
          </div>

          {/* Field: Mot de passe */}
          <div className="flex flex-col gap-base">
            <label className="font-label-caps text-label-caps text-on-surface ml-1" htmlFor="password">
              MOT DE PASSE
            </label>
            <div className="relative">
              <input
                className={`w-full h-touch-target-min bg-surface-container-low border rounded px-4 pr-12 text-text-primary placeholder:text-outline-variant transition-all font-body-md focus:border-ia-gold focus:shadow-[0_0_0_1px_#F59E0B] ${errors.password ? "border-error" : "border-outline-variant"}`}
                id="password"
                name="password"
                placeholder="••••••••"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
                autoComplete="new-password"
              />
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 text-outline-variant hover:text-ia-gold transition-colors"
                onClick={() => setShowPassword((prev) => !prev)}
                type="button"
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-outline ml-1">
              Minimum 8 caractères, incluant un symbole spécial.
            </p>
            {errors.password && (
              <p className="text-[11px] text-error ml-1">{errors.password}</p>
            )}
          </div>

          {/* Terms & Consent */}
          <div className="flex items-start gap-stack-sm mt-base">
            <div className="flex items-center h-5">
              <input
                className={`h-5 w-5 rounded border-outline-variant bg-surface-container accent-primary-container focus:ring-ia-gold cursor-pointer ${errors.terms ? "border-error" : ""}`}
                id="terms"
                name="terms"
                type="checkbox"
                checked={form.terms}
                onChange={(e) => updateField("terms", e.target.checked)}
              />
            </div>
            <div className="text-sm">
              <label className="font-body-md text-on-surface-variant leading-tight cursor-pointer" htmlFor="terms">
                J'accepte les{" "}
                <span className="text-primary hover:underline cursor-pointer">
                  Protocoles de Confidentialité
                </span>{" "}
                et les conditions d'utilisation du terminal.
              </label>
              {errors.terms && (
                <p className="text-[11px] text-error mt-1">{errors.terms}</p>
              )}
            </div>
          </div>

          {/* CTA Section */}
          <div className="mt-stack-lg flex flex-col gap-stack-md pb-stack-lg">
            <button
              className="w-full h-[56px] bg-primary-container text-text-primary font-label-caps tracking-widest text-base rounded flex items-center justify-center gap-stack-sm active:scale-[0.98] transition-all hover:bg-on-primary-fixed-variant group shadow-lg shadow-black/20 disabled:opacity-50 disabled:cursor-not-allowed"
              type="submit"
              disabled={status === "loading" || status === "success"}
            >
              {status === "loading" ? (
                <>
                  <span className="inline-block w-5 h-5 border-2 border-t-transparent border-text-primary rounded-full animate-spin" />
                  CRÉATION EN COURS…
                </>
              ) : (
                <>
                  CRÉER MON COMPTE
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
            <Link
              href="/login"
              className="w-full h-touch-target-min flex items-center justify-center border border-outline-variant/50 rounded text-on-surface hover:border-ia-gold transition-all"
            >
              <span className="font-body-md text-sm">
                Déjà inscrit ?{" "}
                <span className="text-ia-gold font-bold">Se connecter</span>
              </span>
            </Link>
          </div>
        </form>

        {/* Aesthetic Branding Element */}
        <div className="flex flex-col items-center justify-center opacity-40 grayscale pointer-events-none mt-auto py-8">
          <div className="flex gap-4 mb-2">
            <div className="w-1 h-1 bg-outline rounded-full" />
            <div className="w-1 h-1 bg-outline rounded-full" />
            <div className="w-1 h-1 bg-outline rounded-full" />
          </div>
          <span className="font-label-caps text-label-caps text-[10px] tracking-[0.2em] text-outline">
            TERMINAL VERSION 4.2.0 - SECURE NODE
          </span>
        </div>
      </main>
    </>
  );
}
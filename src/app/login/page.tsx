"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  User,
  ShieldCheck,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface FormData {
  username: string;
  password: string;
}

interface FormErrors {
  username?: string;
  password?: string;
}

type SubmitStatus = "idle" | "loading" | "success" | "error";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>({
    username: "",
    password: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [serverError, setServerError] = useState("");

  const validate = useCallback((): boolean => {
    const errs: FormErrors = {};
    if (!form.username.trim()) {
      errs.username = "Email ou numéro de mobile requis";
    }
    if (!form.password || form.password.length < 8) {
      errs.password = "Mot de passe requis (min. 8 caractères)";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form]);

  const updateField = useCallback(
    <K extends keyof FormData>(field: K, value: FormData[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      if (errors[field]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[field];
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
        const response = await apiClient.djangoApiClient.login(
          form.username.trim(),
          form.password,
        );

        if (response.success && response.data) {
          const { access, refresh, user } = response.data;
          // Stocker les tokens
          if (typeof window !== "undefined") {
            localStorage.setItem("access_token", access);
            localStorage.setItem("refresh_token", refresh);
            if (user) {
              localStorage.setItem("user", JSON.stringify(user));
            }
          }
          // Mettre le token dans l'API client
          apiClient.setAuthToken(access);

          setStatus("success");
          setTimeout(() => {
            router.push("/dashboard");
          }, 1000);
        } else {
          setStatus("error");
          setServerError(
            response.error || "Identifiants invalides. Veuillez réessayer.",
          );
        }
      } catch (err) {
        setStatus("error");
        setServerError(
          err instanceof Error
            ? err.message
            : "Erreur réseau — vérifiez votre connexion",
        );
      }
    },
    [form, validate, router],
  );

  return (
    <div className="flex flex-col min-h-screen bg-surface-deep text-on-surface">
      {/* ═══════════════════════════════════════════
          Top Navigation
          ═══════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 flex justify-between items-center w-full px-margin-mobile h-touch-target-min bg-background border-b border-outline-variant">
        <Link
          href="/"
          aria-label="Retour"
          className="flex items-center justify-center w-touch-target-min h-touch-target-min hover:bg-primary-container/20 active:scale-95 transition-all"
        >
          <ArrowLeft className="w-5 h-5 text-primary" />
        </Link>
        <h1 className="text-headline-md font-headline-md font-bold text-ia-gold tracking-tighter">
          FASOBET
        </h1>
        <div className="w-touch-target-min" />
      </header>

      <main className="flex-grow flex flex-col px-margin-mobile pt-stack-lg max-w-md mx-auto w-full">
        {/* Hero Section */}
        <section className="mb-stack-lg">
          <h2 className="font-headline-lg text-headline-lg text-text-primary mb-stack-sm">
            Connexion Analyste
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Accédez à vos terminaux de données et prédictions IA en temps réel.
          </p>
        </section>

        {/* Success state */}
        {status === "success" && (
          <div className="p-6 bg-primary-container/10 border border-primary rounded text-center space-y-3 mb-stack-lg">
            <ShieldCheck className="w-10 h-10 text-primary mx-auto" />
            <p className="font-headline-sm text-headline-sm text-primary">
              Connexion réussie !
            </p>
            <p className="text-sm text-on-surface-variant">
              Redirection vers le dashboard…
            </p>
          </div>
        )}

        {/* Server error */}
        {status === "error" && serverError && (
          <div className="p-4 bg-error-container/10 border border-error/30 rounded text-center mb-stack-lg">
            <p className="text-sm text-error">{serverError}</p>
          </div>
        )}

        {/* Login Form */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-stack-md"
          noValidate
        >
          {/* Email ou Mobile */}
          <div className="flex flex-col gap-base">
            <label
              className="font-label-caps text-label-caps text-on-surface-variant"
              htmlFor="username"
            >
              EMAIL OU MOBILE
            </label>
            <div className="relative">
              <input
                className={`w-full h-touch-target-min bg-surface-container border rounded pl-4 pr-12 text-body-lg font-body-lg text-text-primary placeholder:text-outline-variant focus:border-ia-gold transition-colors ${errors.username ? "border-error" : "border-outline-variant"}`}
                id="username"
                name="username"
                placeholder="nom@exemple.bf ou +226..."
                type="text"
                value={form.username}
                onChange={(e) => updateField("username", e.target.value)}
                autoComplete="username"
              />
              <User className="absolute right-4 top-3.5 w-5 h-5 text-outline-variant" />
            </div>
            {errors.username && (
              <p className="text-[11px] text-error ml-1">{errors.username}</p>
            )}
          </div>

          {/* Mot de passe */}
          <div className="flex flex-col gap-base">
            <label
              className="font-label-caps text-label-caps text-on-surface-variant"
              htmlFor="password"
            >
              MOT DE PASSE
            </label>
            <div className="relative">
              <input
                className={`w-full h-touch-target-min bg-surface-container border rounded pl-4 pr-12 text-body-lg font-body-lg text-text-primary placeholder:text-outline-variant focus:border-ia-gold transition-colors ${errors.password ? "border-error" : "border-outline-variant"}`}
                id="password"
                name="password"
                placeholder="••••••••"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
                autoComplete="current-password"
              />
              <button
                className="absolute right-4 top-3.5 text-outline-variant hover:text-ia-gold transition-colors"
                onClick={() => setShowPassword((prev) => !prev)}
                type="button"
                aria-label={
                  showPassword
                    ? "Masquer le mot de passe"
                    : "Afficher le mot de passe"
                }
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-[11px] text-error ml-1">{errors.password}</p>
            )}
          </div>

          {/* Forgot Password Link */}
          <div className="flex justify-end">
            <Link
              href="#"
              className="font-label-caps text-label-caps text-ia-gold hover:underline"
            >
              Mot de passe oublié ?
            </Link>
          </div>

          {/* Main CTA */}
          <button
            className="mt-base w-full h-touch-target-min bg-primary-container text-on-primary font-bold text-label-caps flex items-center justify-center gap-2 rounded border border-ia-gold/30 hover:bg-primary-container/80 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-black/20"
            type="submit"
            disabled={status === "loading" || status === "success"}
          >
            {status === "loading" ? (
              <>
                <span className="inline-block w-5 h-5 border-2 border-t-transparent border-ia-gold rounded-full animate-spin" />
                CONNEXION EN COURS…
              </>
            ) : (
              <>
                ACCÉDER AUX PRÉDICTIONS
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        {/* Secondary CTA */}
        <div className="mt-stack-lg flex flex-col gap-stack-sm items-center">
          <p className="font-body-md text-body-md text-on-surface-variant">
            Nouveau ici ?
          </p>
          <Link
            href="/register"
            className="w-full h-touch-target-min flex items-center justify-center border border-outline-variant rounded font-label-caps text-label-caps text-text-primary hover:bg-surface-container transition-colors"
          >
            CRÉER UN COMPTE ANALYSTE
          </Link>
        </div>

        {/* Atmospheric Background Decoration */}
        <div className="fixed bottom-0 left-0 w-full h-64 -z-10 opacity-10 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-primary-container to-transparent" />
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[200%] h-1 border-t border-ia-gold/20" />
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-[200%] h-1 border-t border-ia-gold/10" />
        </div>
      </main>

      {/* Footer Security Tag */}
      <footer className="mt-auto py-stack-md flex justify-center items-center">
        <div className="flex items-center gap-2 text-[10px] tracking-[0.2em] font-label-caps text-outline-variant">
          <ShieldCheck className="w-3 h-3" />
          TERMINAL SECURE NODE v4.2.0
        </div>
      </footer>
    </div>
  );
}
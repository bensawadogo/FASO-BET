"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, LogIn } from "lucide-react"
import { setTokens } from "@/lib/auth"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const username = email.trim().toLowerCase().split("@")[0]
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_DJANGO_URL}/api/token/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || data.detail || "Email ou mot de passe incorrect")
        return
      }
      const data = await res.json()
      setTokens(data.access, data.refresh)
      window.location.href = "/"
    } catch {
      setError("Erreur de connexion au serveur")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <section
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "3rem 1.5rem",
          gap: "1.5rem",
        }}
      >
        <div
          style={{
            fontSize: "2rem",
            fontWeight: 500,
            color: "var(--color-text-primary)",
            textAlign: "center",
          }}
        >
          FasoBet
        </div>
        <p
          style={{
            fontSize: "1.1rem",
            color: "var(--color-text-secondary)",
            textAlign: "center",
            maxWidth: "420px",
            lineHeight: 1.6,
          }}
        >
          Connectez-vous pour accéder à vos analyses.
        </p>

        <form
          onSubmit={handleSubmit}
          style={{
            width: "100%",
            maxWidth: "360px",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: "var(--border-radius-md)",
              border: "0.5px solid var(--color-border-secondary)",
              background: "var(--color-background-primary)",
              color: "var(--color-text-primary)",
              fontSize: "15px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />

          <div style={{ position: "relative", width: "100%" }}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "12px 16px",
                paddingRight: "44px",
                borderRadius: "var(--border-radius-md)",
                border: "0.5px solid var(--color-border-secondary)",
                background: "var(--color-background-primary)",
                color: "var(--color-text-primary)",
                fontSize: "15px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "var(--color-text-tertiary)",
                cursor: "pointer",
                padding: "4px",
              }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && (
            <p
              style={{
                color: "var(--color-error, #ef4444)",
                fontSize: "13px",
                textAlign: "center",
                margin: 0,
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              width: "100%",
              padding: "12px 24px",
              borderRadius: "var(--border-radius-md)",
              border: "none",
              background: loading
                ? "var(--color-primary-muted, #3b82f6)"
                : "var(--color-primary, #2563eb)",
              color: "#fff",
              fontSize: "15px",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            <LogIn size={18} />
            {loading ? "Connexion..." : "Se connecter"}
          </button>

          <p
            style={{
              textAlign: "center",
              fontSize: "13px",
              color: "var(--color-text-secondary)",
            }}
          >
            Pas encore de compte ?{" "}
            <Link
              href="/register"
              style={{
                color: "var(--color-primary, #2563eb)",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Créer un compte
            </Link>
          </p>
        </form>
      </section>

      <footer
        style={{
          padding: "1rem",
          textAlign: "center",
          borderTop: "0.5px solid var(--color-border-tertiary)",
          fontSize: "11px",
          color: "var(--color-text-tertiary)",
        }}
      >
        18+ · Jouer comporte des risques · Jeu responsable ·
        <a href="/cgu" style={{ color: "inherit" }}>
          CGU
        </a>{" "}
        ·{" "}
        <a href="/confidentialite" style={{ color: "inherit" }}>
          Confidentialité
        </a>
      </footer>
    </main>
  )
}

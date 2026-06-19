import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-surface-deep flex items-center justify-center p-8 text-center">
      <div>
        <h1 className="font-headline-lg text-headline-lg text-ia-gold mb-4">
          Mot de passe oublié
        </h1>
        <p className="text-on-surface-variant font-body-md mb-6">
          Fonctionnalité bientôt disponible.
        </p>
        <Link
          href="/login"
          className="text-ia-gold font-label-caps hover:underline"
        >
          Retour à la connexion
        </Link>
      </div>
    </div>
  );
}
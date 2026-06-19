import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="bg-gray-950 min-h-screen flex flex-col items-center justify-center px-4">
      <p className="text-amber-400 text-6xl font-bold">404</p>
      <h1 className="text-white text-2xl font-bold mt-4">Page introuvable</h1>
      <p className="text-gray-400 text-sm mt-2 text-center max-w-xs">
        Cette page n'existe pas ou a été déplacée.
      </p>
      <Link
        href="/"
        className="mt-8 px-6 py-3 bg-amber-500 text-black font-bold rounded-lg hover:bg-amber-400 transition-colors"
      >
        Retour au dashboard
      </Link>
    </div>
  );
}
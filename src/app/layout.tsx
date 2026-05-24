import type { Metadata } from "next";
import { Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FASO BET — Prédictions Football IA",
  description:
    "FASO BET by BEN-SAWADOGO — Prédictions sportives IA, pipeline multi-agents et value bets football",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="fr"
      className={`${hankenGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <body className="font-sans relative overflow-x-hidden">
        <div className="orb w-96 h-96 bg-cyan-500 -top-32 -left-32" />
        <div className="orb w-80 h-80 bg-purple-600 top-1/2 -right-20" />
        <main className="relative z-10">{children}</main>
      </body>
    </html>
  );
}
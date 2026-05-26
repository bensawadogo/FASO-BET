import type { Metadata } from "next";
import { Space_Grotesk, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ApiErrorBoundary } from "@/components/error-boundary";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FASOBET | Analyse Stratégique Sportive",
  description:
    "Dominez le terrain avec l'intelligence artificielle. Plus de 10 000 points de données analysés en temps réel pour un avantage stratégique incontestable.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="fr"
      className={`dark ${spaceGrotesk.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="font-body-md bg-surface-deep text-on-surface">
        <ApiErrorBoundary serviceName="layout">
          {children}
        </ApiErrorBoundary>
      </body>
    </html>
  );
}
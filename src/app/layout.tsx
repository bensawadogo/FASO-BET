import type { Metadata } from "next";
import { Space_Grotesk, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ApiErrorBoundary } from "@/components/error-boundary";
import { AuthProvider } from "@/context/AuthContext";
import Header from "@/components/Header";
import { AmbientSurface } from "@/components/ui/AmbientSurface";
import { SiteStructuredData } from "@/components/StructuredData";
import StatsBar from "@/components/StatsBar";

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
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL ?? 'https://fasobet.com'),
  title: {
    default: 'FasoBet — Prédictions IA Coupe du Monde 2026',
    template: '%s | FasoBet',
  },
  description:
    'Analyses et prédictions IA pour la Coupe du Monde 2026. '
    + 'Probabilités 1X2, BTTS, Over/Under calculées par intelligence artificielle pour la FIFA World Cup. Gratuit.',
  keywords: [
    'prédictions Coupe du Monde 2026',
    'analyse IA football',
    'value bet CdM 2026',
    'pronostics FIFA World Cup',
    'paris sportifs Afrique',
    'fasobet',
    'prédiction football IA',
    'World Cup 2026 predictions',
    'Coupe du Monde analyse',
  ],
  authors: [{ name: 'FasoBet' }],
  openGraph: {
    type:        'website',
    locale:      'fr_FR',
    url:         'https://fasobet.com',
    siteName:    'FasoBet',
    title:       'FasoBet — Prédictions IA Coupe du Monde 2026',
    description: 'Analyses IA en temps réel pour tous les matchs de la CdM 2026',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card:        'summary_large_image',
    title:       'FasoBet — Prédictions IA CdM 2026',
    description: 'Analyses IA pour chaque match de la Coupe du Monde 2026',
    images:      ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://fasobet.com',
  },
};

export const viewport = {
  themeColor: '#0a0a0a',
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
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var theme = localStorage.getItem('theme');
                if (theme === 'light') {
                  document.documentElement.classList.remove('dark');
                }
              })();
            `,
          }}
        />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <SiteStructuredData />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
              }
            `,
          }}
        />
      </head>
      <body className="font-body-md bg-surface-deep text-on-surface">
        <AmbientSurface />
        <AuthProvider>
          <ApiErrorBoundary serviceName="layout">
            <Header />
            <StatsBar />
            {children}
          </ApiErrorBoundary>
        </AuthProvider>
      </body>
    </html>
  );
}
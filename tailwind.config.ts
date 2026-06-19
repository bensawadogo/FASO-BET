import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // Le thème est forcé en dark via <html className="dark"> dans layout.tsx.
  // Pour un futur toggle light/dark, changer 'class' en 'media' ou implémenter le toggle.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ─── Palette FasoBet (spec antigravity) ──────────────
        primary: {
          DEFAULT: '#1B4332',
          container: '#1b4332',
          'fixed-dim': '#a5d0b9',
          fixed: '#c1ecd4',
        },
        'ia-gold': {
          DEFAULT: '#F59E0B',
        },
        accent: {
          DEFAULT: '#F59E0B',
        },
        danger: {
          DEFAULT: '#DC2626',
        },
        surface: {
          deep: '#0A0A0A',
          DEFAULT: '#131313',
          dim: '#131313',
          bright: '#3a3939',
          raised: '#111827',
          'container-lowest': '#0e0e0e',
          'container-low': '#1c1b1b',
          'container': '#201f1f',
          'container-high': '#2a2a2a',
          'container-highest': '#353534',
        },
        on: {
          surface: '#F9FAFB',
          'surface-variant': '#9CA3AF',
          primary: '#0e3727',
          'primary-container': '#86af99',
          'primary-fixed': '#002114',
          'primary-fixed-variant': '#274e3d',
          secondary: '#472a00',
          'secondary-container': '#5b3800',
          'secondary-fixed': '#2a1700',
          'secondary-fixed-variant': '#653e00',
          tertiary: '#690005',
          'tertiary-container': '#ff8074',
          'tertiary-fixed': '#410002',
          'tertiary-fixed-variant': '#93000b',
          error: '#690005',
          'error-container': '#ffdad6',
          background: '#e5e2e1',
        },
        'text-primary': {
          DEFAULT: '#F9FAFB',
        },
        'text-secondary': {
          DEFAULT: '#9CA3AF',
        },
        outline: {
          DEFAULT: '#8b938d',
          variant: '#414844',
        },
        error: {
          DEFAULT: '#ffb4ab',
          container: '#93000a',
        },
        'success-green': {
          DEFAULT: '#22C55E',
        },
        warning: '#ffb74d',
        success: '#22c55e',
        secondary: {
          DEFAULT: '#ffb95f',
          container: '#ee9800',
          'fixed-dim': '#ffb95f',
          fixed: '#ffddb8',
        },
        tertiary: {
          DEFAULT: '#ffb4ab',
          container: '#7e0008',
          'fixed-dim': '#ffb4ab',
          fixed: '#ffdad6',
        },
        'inverse-primary': '#3f6653',
        'inverse-surface': '#e5e2e1',
        'inverse-on-surface': '#313030',
        background: '#131313',
      },
      fontFamily: {
        'label-caps': ['var(--font-space-grotesk)', 'Space Grotesk', 'system-ui', 'sans-serif'],
        'headline-sm': ['var(--font-space-grotesk)', 'Space Grotesk', 'system-ui', 'sans-serif'],
        'headline-lg': ['var(--font-space-grotesk)', 'Space Grotesk', 'system-ui', 'sans-serif'],
        'headline-md': ['var(--font-space-grotesk)', 'Space Grotesk', 'system-ui', 'sans-serif'],
        'body-lg': ['var(--font-plus-jakarta)', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        'stat-value': ['var(--font-space-grotesk)', 'Space Grotesk', 'system-ui', 'sans-serif'],
        'body-md': ['var(--font-plus-jakarta)', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        display: ['var(--font-space-grotesk)', 'Space Grotesk', 'system-ui', 'sans-serif'],
        'display-lg': ['var(--font-space-grotesk)', 'Space Grotesk', 'system-ui', 'sans-serif'],
        data: ['var(--font-jetbrains)', 'JetBrains Mono', 'monospace'],
        'data-label': ['var(--font-jetbrains)', 'JetBrains Mono', 'monospace'],
        sans: ['var(--font-plus-jakarta)', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'label-caps': ['12px', { lineHeight: '16px', letterSpacing: '0.05em', fontWeight: '700' }],
        'headline-sm': ['18px', { lineHeight: '24px', fontWeight: '600' }],
        'headline-lg': ['30px', { lineHeight: '36px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-md': ['22px', { lineHeight: '28px', fontWeight: '600' }],
        'body-lg': ['16px', { lineHeight: '24px', fontWeight: '500' }],
        'stat-value': ['24px', { lineHeight: '30px', fontWeight: '700' }],
        'body-md': ['15px', { lineHeight: '22px', fontWeight: '400' }],
      },
      borderRadius: {
        DEFAULT: '0.125rem',
        lg: '0.25rem',
        xl: '0.5rem',
        full: '0.75rem',
      },
      spacing: {
        'stack-lg': '24px',
        'stack-sm': '8px',
        'margin-mobile': '16px',
        gutter: '16px',
        'stack-md': '16px',
        base: '4px',
        'touch-target-min': '48px',
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'spin-slower': 'spin 6s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      maxWidth: {
        'max-width': '1280px',
      },
      screens: {
        xs: '375px',
      },
    },
  },
  plugins: [],
};
export default config;
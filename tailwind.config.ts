import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Core Theme Tokens (Apex Predictor)
        primary: {
          DEFAULT: '#00f0ff',
          foreground: '#120e31',
        },
        secondary: {
          DEFAULT: '#7c4dff',
          foreground: '#ffffff',
        },
        surface: {
          DEFAULT: '#120e31',
          dim: '#120e31',
          bright: '#39355a',
          'container-lowest': '#0d082c',
          'container-low': '#1b163a',
          'container-high': '#252044',
          'container-highest': '#2f2a50',
        },
        on: {
          surface: '#ffffff',
          'surface-variant': '#a09dbd',
        },
        'on-error': '#ffffff',
        outline: {
          variant: '#39355a',
        },
        error: {
          DEFAULT: '#ff5454',
          container: '#3b1010',
        },
        warning: '#ffb74d',
        success: '#22c55e',
        card: 'rgba(255,255,255,0.06)',
      },
      fontFamily: {
        display: ['var(--font-hanken)', 'Hanken Grotesk', 'system-ui', 'sans-serif'],
        'display-lg': ['var(--font-hanken)', 'Hanken Grotesk', 'system-ui', 'sans-serif'],
        data: ['var(--font-jetbrains)', 'JetBrains Mono', 'monospace'],
        'data-label': ['var(--font-jetbrains)', 'JetBrains Mono', 'monospace'],
        sans: ['var(--font-hanken)', 'Hanken Grotesk', 'system-ui', 'sans-serif'],
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
      },
      maxWidth: {
        'max-width': '1280px',
      },
      padding: {
        'margin-desktop': '2rem',
        'margin-mobile': '1rem',
      },
      screens: {
        xs: '375px',
      },
    },
  },
  plugins: [],
};
export default config;
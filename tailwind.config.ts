import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'color-bg': '#0A0F1E',
        'color-surface': '#111827',
        'color-border': '#1E2A3A',
        'color-accent': '#2563EB',
        'color-text': '#F9FAFB',
        'color-text-sec': '#9CA3AF',
        'color-text-muted': '#6B7280',
      },
      keyframes: {
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(calc(-100% - var(--gap, 1rem)))' },
        },
        'marquee-vertical': {
          from: { transform: 'translateY(0)' },
          to: { transform: 'translateY(calc(-100% - var(--gap, 1rem)))' },
        },
      },
      animation: {
        marquee: 'marquee var(--duration, 40s) infinite linear',
        'marquee-vertical': 'marquee-vertical var(--duration, 40s) linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;

import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        'bg-card': 'var(--bg-card)',
        'bg-input': 'var(--bg-input)',
        'bg-hover': 'var(--bg-hover)',
        border: 'var(--border)',
        'border-focus': 'var(--border-focus)',
        text: 'var(--text)',
        'text-2': 'var(--text-2)',
        'text-3': 'var(--text-3)',
        accent: 'var(--accent)',
        'accent-l': 'var(--accent-l)',
        'accent-d': 'var(--accent-d)',
        green: 'var(--green)',
        'green-l': 'var(--green-l)',
        amber: 'var(--amber)',
        'amber-l': 'var(--amber-l)',
        red: 'var(--red)',
        'red-l': 'var(--red-l)',
        purple: 'var(--purple)',
        'purple-l': 'var(--purple-l)',
      },
      fontFamily: {
        sans: ['Noto Sans SC', 'Inter', '-apple-system', 'sans-serif'],
        mono: ['Inter', 'monospace'],
      },
      borderRadius: {
        R: 'var(--R)',
      },
    },
  },
  plugins: [],
}

export default config

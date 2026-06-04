import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary:      '#0D5C8A',
        accent:       '#1B9ED6',
        surface:      '#F4F6F8',
        card:         '#FFFFFF',
        sidebar:      '#1A2B3C',
        muted:        '#4A5568',
        border:       '#D1D5DB',
        error:        '#D32F2F',
        'error-bg':   '#FDECEA',
        success:      '#2E9E5C',
        'success-bg': '#E8F8F0',
        warning:      '#F9A825',
        'warning-bg': '#FFFDE7',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '20px',
      },
    },
  },
  plugins: [],
}

export default config

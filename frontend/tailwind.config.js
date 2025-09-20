/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      colors: {
        primary: {
          50: '#f8f7ff',
          100: '#f0edff',
          200: '#d9d3ff',
          300: '#b8adff',
          400: '#8f7bff',
          500: '#6b5aff',
          600: '#6334E5',
          700: '#5a2ed4',
          800: '#4e28b3',
          900: '#3f2192',
        }
      },
      maxWidth: {
        '1200': '1200px',
      },
      lineHeight: {
        'relaxed': '1.5',
      },
      gridTemplateRows: {
        '4': 'repeat(4, minmax(0, 1fr))',
        '6': 'repeat(6, minmax(0, 1fr))',
      },
      gridRow: {
        'span-2': 'span 2 / span 2',
        'span-3': 'span 3 / span 3',
      },
      gridColumn: {
        'span-2': 'span 2 / span 2',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
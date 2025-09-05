/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',  
          800: '#075985',
          900: '#0c4a6e',
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
  plugins: [],
}
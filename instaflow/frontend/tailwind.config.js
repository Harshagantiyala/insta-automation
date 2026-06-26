/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          50: '#F6F7FB',
          100: '#ECEEF5',
          200: '#D9DCE8',
          800: '#262A3D',
          900: '#171A26',
        },
        flow: {
          400: '#8B7CF6',
          500: '#6C4CF1',
          600: '#5536D6',
        },
        spark: {
          400: '#FF8A5B',
          500: '#FF6B3D',
        },
        live: {
          500: '#2BB673',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      fontSize: {
        xxs: ['10px', { lineHeight: '14px' }],
      },
    },
  },
  plugins: [],
};

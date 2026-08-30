/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'aviator-red': '#e71a23',
        'aviator-green': '#39ff14',
        'aviator-lime': '#7cff00',
        'cyber-green': '#00ff66',
        'cyber-neon': '#39ff14',
        'cyber-darkgreen': '#0d381e',
        'cyber-black': '#030704',
        'cyber-surface': '#061009',
      },
      fontFamily: {
        'stencil': ['"Black Ops One"', 'cursive', 'sans-serif'],
        'chakra': ['"Chakra Petch"', 'sans-serif'],
        'orbitron': ['"Orbitron"', 'sans-serif'],
        'mono': ['"Share Tech Mono"', 'monospace', 'Courier New'],
        'rajdhani': ['"Rajdhani"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

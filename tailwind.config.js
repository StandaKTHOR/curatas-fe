/** @type {import('tailwindcss').Config} */
export default {
  // DŮLEŽITÉ: Zde musí být cesty ke všem tvým komponentám
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Volitelně pro muzejní pocit (pokud máš fonty)
        serif: ['Playfair Display', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
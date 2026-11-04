// Shared theme for the store and the admin panel.
// Tailwind 3.4 is pinned on purpose: the original pages used the Tailwind 3 CDN.
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './admin/index.html', './src/**/*.js'],
  theme: {
    extend: {
      colors: {
        cream: '#FBF6F3',
        blush: '#EBD6D5',
        blushL: '#F6E9E8',
        mauve: '#9A5C6D',
        mauveD: '#7A4455',
        ink: '#3B2A2F',
      },
      fontFamily: {
        body: ['Cairo', 'sans-serif'],
        script: ['"Great Vibes"', 'cursive'],
      },
    },
  },
};

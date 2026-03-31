import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2D6A4F',
          dark: '#1B4332',
          light: '#D8F3DC',
        },
        sand: {
          DEFAULT: '#FAF3E8',
          dark: '#E8DCC8',
        },
        ocean: {
          DEFAULT: '#2B6777',
          light: '#52AB98',
        },
      },
      fontFamily: {
        heading: ['"DM Serif Display"', 'serif'],
        body: ['"IBM Plex Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;

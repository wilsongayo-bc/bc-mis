/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      fontSize: {
        'xs-plus': '0.8125rem',
        'sm-plus': '0.9375rem',
        'base-plus': '1.0625rem',
        'lg-plus': '1.1875rem',
        'xl-plus': '1.3125rem',
        '2xl-plus': '1.5625rem',
        '3xl-plus': '1.9375rem',
      },
      transitionProperty: {
        'font-size': 'font-size',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

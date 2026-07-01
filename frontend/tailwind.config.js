module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'base-100': 'var(--color-base-100)',
        'base-200': 'var(--color-base-200)',
        'base-300': 'var(--color-base-300)',
        'primary': 'var(--color-primary)',
        'secondary': 'var(--color-secondary)',
        'accent': 'var(--color-accent)',
        'neutral': 'var(--color-neutral)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
}

// Theme definitions - only dark and light
const lightTheme = {
  '--color-base-100': '#ffffff',
  '--color-base-200': '#f9fafb',
  '--color-base-300': '#f3f4f6',
  '--color-primary': '#3b82f6',
  '--color-secondary': '#ec4899',
  '--color-accent': '#10b981',
  '--color-neutral': '#374151',
  '--color-base-content': '#1f2937',
}

const darkTheme = {
  '--color-base-100': '#111827',
  '--color-base-200': '#1f2937',
  '--color-base-300': '#374151',
  '--color-primary': '#60a5fa',
  '--color-secondary': '#f472b6',
  '--color-accent': '#34d399',
  '--color-neutral': '#e5e7eb',
  '--color-base-content': '#f9fafb',
}

module.exports.theme.extend = {
  ...module.exports.theme.extend,
  dark: darkTheme,
}
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--color-bg) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        'surface-raised': 'rgb(var(--color-surface-raised) / <alpha-value>)',
        content: 'rgb(var(--color-content) / <alpha-value>)',
        'content-muted': 'rgb(var(--color-content-muted) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        'accent-content': 'rgb(var(--color-accent-content) / <alpha-value>)',
        success: 'rgb(var(--color-success) / <alpha-value>)',
        danger: 'rgb(var(--color-danger) / <alpha-value>)',
        warning: 'rgb(var(--color-warning) / <alpha-value>)',
        // Família Editorial (Reader) · §17.1
        'reader-paper': 'rgb(var(--color-reader-paper) / <alpha-value>)',
        'reader-paper-2': 'rgb(var(--color-reader-paper-2) / <alpha-value>)',
        'reader-ink': 'rgb(var(--color-reader-ink) / <alpha-value>)',
        'reader-ink-2': 'rgb(var(--color-reader-ink-2) / <alpha-value>)',
        'reader-muted': 'rgb(var(--color-reader-muted) / <alpha-value>)',
        'reader-rule': 'rgb(var(--color-reader-rule) / <alpha-value>)',
        'reader-mark': 'rgb(var(--color-reader-mark) / <alpha-value>)',
        'reader-accent': 'rgb(var(--color-reader-editorial-accent) / <alpha-value>)',
        'reader-ok': 'rgb(var(--color-reader-ok) / <alpha-value>)',
        'reader-bad': 'rgb(var(--color-reader-bad) / <alpha-value>)',
        'reader-ok-bg': 'rgb(var(--color-reader-ok-bg) / <alpha-value>)',
        'reader-bad-bg': 'rgb(var(--color-reader-bad-bg) / <alpha-value>)',
        'reader-kbd-bg': 'rgb(var(--color-reader-kbd-bg) / <alpha-value>)',
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        serif: ['Newsreader', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'Menlo', 'Consolas', 'monospace'],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      },
      boxShadow: {
        soft: 'var(--shadow-soft)',
        raised: 'var(--shadow-raised)',
      },
      maxWidth: {
        'content-read': '48rem',
        'content-list': '72rem',
      },
      transitionDuration: {
        fast: 'var(--duration-fast)',
        base: 'var(--duration-base)',
        slow: 'var(--duration-slow)',
      },
      transitionTimingFunction: {
        standard: 'var(--ease-standard)',
        enter: 'var(--ease-enter)',
        exit: 'var(--ease-exit)',
        emphasized: 'var(--ease-emphasized)',
      },
    },
  },
  plugins: [],
};

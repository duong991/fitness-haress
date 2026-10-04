/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        /* Surfaces — warm paper canvas, pure white cards */
        canvas: '#f6f5f4',
        surface: '#ffffff',
        hairline: {
          DEFAULT: '#e6e6e6',
          soft: '#f1f1ef',
        },
        /* The single structural accent */
        primary: {
          DEFAULT: '#0075de',
          active: '#005bab',
          soft: '#eaf3fd',
        },
        /* The one inverted band */
        night: {
          DEFAULT: '#213183',
          deep: '#1a2769',
        },
        /* Ink ramp */
        ink: {
          DEFAULT: '#1a1a19',
          secondary: '#31302e',
          muted: '#615d59',
          faint: '#6f6a64',
        },
        /* Status ink — deltas, validation, destructive. Never a CTA. */
        ok: {
          DEFAULT: '#157a2b',
          surface: '#edf7ef',
          line: '#b7ddc0',
        },
        bad: {
          DEFAULT: '#a03333',
          surface: '#fdf3f3',
          line: '#f0c9c9',
        },
        /* Decorative sticker palette — never structural */
        sticker: {
          sky: '#62aef0',
          /* Legible-on-white cuts of the sticker hues. The sticker tones
             themselves are too light for text, so tints and label ink are
             separated: the tint carries `-soft`, the label carries `-ink`. */
          'sky-ink': '#1f6ea8',
          'sky-soft': '#eaf4fd',
          purple: '#d6b6f6',
          'purple-deep': '#391c57',
          'purple-soft': '#f4ecfd',
          pink: '#ff64c8',
          'pink-ink': '#a81f7c',
          'pink-soft': '#fdeef8',
          orange: '#dd5b00',
          'orange-deep': '#793400',
          'orange-soft': '#fdf1e8',
          teal: '#2a9d99',
          'teal-ink': '#1c6f6c',
          'teal-soft': '#e8f5f4',
          green: '#1aae39',
          'green-ink': '#157a2b',
          'green-soft': '#edf7ef',
          brown: '#523410',
          'brown-soft': '#f4efe9',
        },
      },
      fontFamily: {
        sans: [
          'var(--font-inter)',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
      fontSize: {
        /* DESIGN-notion.md type ladder, verbatim */
        'display-1': ['64px', { lineHeight: '1', letterSpacing: '-2.125px', fontWeight: '700' }],
        'display-2': ['54px', { lineHeight: '1.04', letterSpacing: '-1.875px', fontWeight: '700' }],
        'heading-1': ['40px', { lineHeight: '1.1', letterSpacing: '-1px', fontWeight: '700' }],
        'heading-2': ['26px', { lineHeight: '1.23', letterSpacing: '-0.625px', fontWeight: '700' }],
        'heading-3': ['22px', { lineHeight: '1.27', letterSpacing: '-0.25px', fontWeight: '700' }],
        title: ['20px', { lineHeight: '1.4', letterSpacing: '-0.125px', fontWeight: '600' }],
        'body-md': ['16px', { lineHeight: '1.5', letterSpacing: '0' }],
        'body-sm': ['15px', { lineHeight: '1.33', letterSpacing: '0' }],
        button: ['16px', { lineHeight: '1.5', letterSpacing: '0', fontWeight: '500' }],
        caption: ['14px', { lineHeight: '1.43', letterSpacing: '0' }],
        eyebrow: ['12px', { lineHeight: '1.33', letterSpacing: '0.125px', fontWeight: '600' }],
      },
      maxWidth: {
        container: '1180px',
        doc: '1180px',
      },
      spacing: {
        xxs: '4px',
        xs: '8px',
        sm: '12px',
        md: '16px',
        lg: '24px',
        xl: '28px',
        xxl: '32px',
      },
      boxShadow: {
        'elev-1':
          'rgba(0,0,0,0.01) 0 0.175px 1.041px, rgba(0,0,0,0.02) 0 0.8px 2.925px, rgba(0,0,0,0.027) 0 2.025px 7.847px, rgba(0,0,0,0.04) 0 4px 18px',
        'elev-2':
          'rgba(0,0,0,0.01) 0 0.175px 1.041px, rgba(0,0,0,0.02) 0 0.8px 2.925px, rgba(0,0,0,0.027) 0 2.025px 7.847px, rgba(0,0,0,0.04) 0 5px 24px, rgba(0,0,0,0.05) 0 23px 52px',
      },
      /* Deliberately NO `borderRadius` extension.
         Radii live in six named classes in globals.css (`r-well`, `r-card`,
         `r-utility`, `r-row`, `r-input`, `r-chip`) so the radius lock cannot be
         bypassed by reaching for `rounded-md`, whose 6px contradicts the scale
         this product uses. Verified: no file uses a Tailwind `rounded-*` class. */
    },
  },
  plugins: [],
};

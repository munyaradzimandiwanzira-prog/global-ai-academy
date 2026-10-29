import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: { DEFAULT: '1rem', sm: '1.5rem', lg: '2rem' }, screens: { '2xl': '1280px' } },
    extend: {
      fontFamily: {
        // Headings: Manrope. Body and UI: Source Sans 3. Code only: IBM Plex Mono. Two UI families, one code face.
        display: ['"Manrope Variable"', 'system-ui', 'sans-serif'],
        sans: ['"Source Sans 3 Variable"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        // Kids Zone keeps the same families (no third display face); it differs by scale and colour, not novelty type.
        kids: ['"Manrope Variable"', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: { DEFAULT: '#142B52', 700: '#1C3866', 600: '#284A80', 900: '#0C1C38' },
        // Granite: the low-chroma grey of Great Zimbabwe's dry-stone walls (replaces the old cream ground).
        sand: { DEFAULT: '#F3F2EE', 200: '#E8E6E0', 300: '#D9D6CE', 50: '#FAF9F7' },
        granite: { DEFAULT: '#F3F2EE', 100: '#E8E6E0', 200: '#D9D6CE', 400: '#9A968C', 600: '#5E5A52' },
        teal: { DEFAULT: '#23807F', 600: '#1C6B6A', 400: '#3FA3A1', 100: '#DCEFEE' },
        gold: { DEFAULT: '#D4A64A', 600: '#B88A2E', 100: '#F7ECD3' },
        // Stone is the cool slate of weathered granite (no orange or brown anywhere in the palette).
        stone: { DEFAULT: '#3D4A5C', 400: '#5B6878', 100: '#E6E9EE' },
        night: { DEFAULT: '#0E1A30', 800: '#13233F', 700: '#1B2E50' },
        border: 'hsl(var(--border))',
        muted: 'hsl(var(--muted))',
        'muted-fg': 'hsl(var(--muted-fg))',
        bg: 'hsl(var(--bg))',
        fg: 'hsl(var(--fg))',
        card: 'hsl(var(--card))',
      },
      borderRadius: { xl: '0.875rem', '2xl': '1.125rem' },
      // Shadows are reserved for things that float (menus, dialogs, toasts) — never resting cards.
      boxShadow: {
        lift: 'none',
        float: '0 12px 32px -12px rgba(12,28,56,0.35), 0 2px 6px rgba(12,28,56,0.08)',
        inset: 'inset 0 1px 0 rgba(255,255,255,0.06)',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(.22,1,.36,1)',
        expo: 'cubic-bezier(.16,1,.3,1)',
        'in-out': 'cubic-bezier(.76,0,.24,1)',
      },
      letterSpacing: { display: '-0.03em' },
      keyframes: {
        'pop-in': { '0%': { transform: 'scale(.6)', opacity: '0' }, '70%': { transform: 'scale(1.08)' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        wiggle: { '0%,100%': { transform: 'rotate(-4deg)' }, '50%': { transform: 'rotate(4deg)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        rise: { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'none' } },
        'line-up': { '0%': { transform: 'translateY(105%)' }, '100%': { transform: 'none' } },
      },
      animation: {
        'pop-in': 'pop-in .45s cubic-bezier(.2,.9,.3,1.3) both',
        rise: 'rise .7s cubic-bezier(.22,1,.36,1) both',
        'line-up': 'line-up .9s cubic-bezier(.16,1,.3,1) both',
        float: 'float 4s ease-in-out infinite',
        wiggle: 'wiggle .6s ease-in-out infinite',
      },
    },
  },
  plugins: [typography],
} satisfies Config;

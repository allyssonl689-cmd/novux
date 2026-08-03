/* Novux Finance — fragmento de tema Tailwind.
 * GERADO por scripts/brand/build.mjs — não editar à mão.
 * Uso:  const brand = require('./brand/tokens/tailwind.tokens.cjs')
 *       theme: { extend: { colors: brand.colors, fontFamily: brand.fontFamily } }
 */
module.exports = {
  colors: {
    'background': 'hsl(var(--background))',
    'foreground': 'hsl(var(--foreground))',
    'card': { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
    'popover': { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
    'secondary': { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
    'muted': { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
    'border': 'hsl(var(--border))',
    'input': 'hsl(var(--input))',
    'primary': { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
    'accent': { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
    'success': { DEFAULT: 'hsl(var(--success))', foreground: 'hsl(var(--success-foreground))' },
    'warning': { DEFAULT: 'hsl(var(--warning))', foreground: 'hsl(var(--warning-foreground))' },
    'destructive': { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
    'ring': 'hsl(var(--ring))',
    'primary-text': 'hsl(var(--primary-text))',
    'accent-text': 'hsl(var(--accent-text))',
    'success-text': 'hsl(var(--success-text))',
    'warning-text': 'hsl(var(--warning-text))',
    'destructive-text': 'hsl(var(--destructive-text))',
  },
  fontFamily: {
    sans:    ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
    display: ['Syne', 'Poppins', 'sans-serif'],
    numeric: ['Outfit', 'Poppins', 'sans-serif'],
    mono:    ['Fira Code', 'Courier New', 'monospace'],
  },
  backgroundImage: {
    'brand-gradient': 'linear-gradient(135deg, #16C7FF, #8B5CF6)',
  },
}

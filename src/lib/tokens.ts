/**
 * Novux Design System — Tokens Centralizados
 * Fonte: Brand Book Novux (2026)
 *
 * Use estes tokens em componentes para garantir consistência visual.
 * CSS vars são a fonte de verdade; estes tokens são helpers para
 * valores usados diretamente em props de style ou bibliotecas (Recharts, etc.)
 */

/* ─────────────────────────────────────────
   CORES — valores hex do brand book
   Para uso em props de style (recharts, svg, canvas)
───────────────────────────────────────── */
export const COLORS = {
  /* Primárias */
  primary:   '#16C7FF',
  primary700:'#0099FF',
  primary900:'#081226',

  /* Backgrounds */
  bg:        '#050816',
  surface:   '#0B1020',
  card:      '#121933',
  elevated:  '#1A2342',

  /* Status */
  success:   '#19D38A',
  warning:   '#F59E0B',
  danger:    '#FF5A5F',
  info:      '#3B82F6',
  accent:    '#8B5CF6',

  /* Texto */
  textPrimary:   '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted:     '#64748B',
} as const;

/* ─────────────────────────────────────────
   GRADIENTES
───────────────────────────────────────── */
export const GRADIENTS = {
  primary:  'linear-gradient(135deg, #16C7FF 0%, #8B5CF6 100%)',
  success:  'linear-gradient(135deg, #19D38A 0%, #16C7FF 100%)',
  premium:  'linear-gradient(135deg, #0F1735 0%, #081226 100%)',
  ia:       'linear-gradient(135deg, #16C7FF 0%, #8B5CF6 60%, #FF5A5F 100%)',
  danger:   'linear-gradient(135deg, #FF5A5F 0%, #F59E0B 100%)',
  warm:     'linear-gradient(135deg, #F59E0B 0%, #FF5A5F 100%)',
} as const;

/* ─────────────────────────────────────────
   CHART COLORS — paleta para Recharts
───────────────────────────────────────── */
export const CHART = {
  income:      '#19D38A',   /* receita   — verde growth  */
  expense:     '#FF5A5F',   /* despesa   — vermelho alert */
  investment:  '#16C7FF',   /* invest.   — azul primary   */
  goal:        '#8B5CF6',   /* metas     — roxo insight   */
  warning:     '#F59E0B',   /* atenção   — âmbar warning  */
  neutral:     '#64748B',   /* neutro    — texto muted    */
  pie: [
    '#19D38A', '#8B5CF6', '#F59E0B', '#16C7FF',
    '#FF5A5F', '#3B82F6', '#06B6D4', '#F97316',
  ],
} as const;

/* ─────────────────────────────────────────
   ANIMAÇÕES — durations (Framer Motion)
───────────────────────────────────────── */
export const MOTION = {
  fast:   { duration: 0.15 },
  normal: { duration: 0.25, ease: 'easeOut' },
  slow:   { duration: 0.35, ease: 'easeOut' },

  /* Stagger para listas */
  stagger: (i: number) => ({ delay: i * 0.06 }),

  /* Fade + slide padrão de cards */
  card: {
    initial:   { opacity: 0, y: 16 },
    animate:   { opacity: 1, y: 0  },
    transition:{ type: 'spring', stiffness: 320, damping: 26 },
  },

  /* Fade simples */
  fade: {
    initial:   { opacity: 0 },
    animate:   { opacity: 1 },
    exit:      { opacity: 0 },
    transition:{ duration: 0.2 },
  },
} as const;

/* ─────────────────────────────────────────
   ESPAÇAMENTOS / RADIUS
───────────────────────────────────────── */
export const RADIUS = {
  sm:   '8px',
  md:   '12px',
  lg:   '16px',    /* padrão brand book */
  xl:   '20px',
  '2xl':'24px',
  full: '9999px',
} as const;

/* ─────────────────────────────────────────
   TIPOGRAFIA
───────────────────────────────────────── */
export const FONTS = {
  body:   "'Poppins', 'Inter', system-ui, sans-serif",
  brand:  "'Poppins', sans-serif",
  kpi:    "'Outfit', 'Poppins', sans-serif",
  mono:   "'Fira Code', 'Courier New', monospace",
} as const;

/* ─────────────────────────────────────────
   HELPERS — gera estilo de ícone colorido
───────────────────────────────────────── */
export function iconBg(color: string, opacity = 0.14) {
  return { background: `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}` };
}

/* Helper para sombra glow de um card */
export function glowShadow(color: string, intensity: 'sm' | 'md' | 'lg' = 'md') {
  const alpha = intensity === 'sm' ? '1f' : intensity === 'md' ? '33' : '4d';
  return { boxShadow: `0 0 24px ${color}${alpha}, 0 0 1px ${color}1a` };
}

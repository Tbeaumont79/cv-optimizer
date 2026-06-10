/**
 * Mapping variante/taille → classes Tailwind du bouton.
 * Logique pure (sans Vue) pour rester testable en environnement `node`,
 * comme `utils/health-label.ts`. Consomme uniquement les design tokens.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-control font-semibold transition-all duration-200 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ' +
  'active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white shadow-brand hover:bg-brand-700 hover:shadow-card-hover',
  secondary:
    'bg-surface text-ink-800 shadow-xs ring-1 ring-border-strong hover:bg-surface-muted hover:ring-ink-400',
  ghost: 'bg-transparent text-ink-600 hover:bg-surface-warm hover:text-ink-800',
  danger: 'bg-danger-600 text-white shadow-xs hover:bg-danger-700',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
}

export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md'): string {
  return [BASE, VARIANTS[variant], SIZES[size]].join(' ')
}

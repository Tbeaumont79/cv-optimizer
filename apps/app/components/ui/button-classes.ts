/**
 * Mapping variante/taille → classes Tailwind du bouton.
 * Logique pure (sans Vue) pour rester testable en environnement `node`,
 * comme `utils/health-label.ts`. Consomme uniquement les design tokens.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-control font-medium transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ' +
  'disabled:cursor-not-allowed disabled:opacity-50'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-brand-50 hover:bg-brand-700',
  secondary: 'bg-surface text-ink-900 ring-1 ring-border hover:bg-surface-muted',
  ghost: 'bg-transparent text-ink-700 hover:bg-surface-muted',
  danger: 'bg-danger-500 text-surface hover:bg-danger-500/90',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
}

export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md'): string {
  return [BASE, VARIANTS[variant], SIZES[size]].join(' ')
}

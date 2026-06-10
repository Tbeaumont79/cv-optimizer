/**
 * Toasts globaux — feedback non bloquant (succès/erreur/info) après une action.
 * État partagé via useState (SSR-safe) ; le rendu est assuré par <UiToaster />
 * monté une seule fois dans app.vue.
 */
export interface ToastItem {
  id: number
  variant: 'success' | 'error' | 'info'
  title: string
  description?: string
}

export interface ToastOptions {
  /** Durée d'affichage en ms ; 0 = persistant (fermeture manuelle). */
  duration?: number
}

let nextId = 1

export function useToast() {
  const toasts = useState<ToastItem[]>('ui-toasts', () => [])

  function dismiss(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  function push(toast: Omit<ToastItem, 'id'>, options?: ToastOptions): number {
    const id = nextId++
    toasts.value = [...toasts.value, { id, ...toast }]
    const duration = options?.duration ?? (toast.variant === 'error' ? 6000 : 4000)
    if (import.meta.client && duration > 0) {
      setTimeout(() => dismiss(id), duration)
    }
    return id
  }

  return {
    toasts,
    dismiss,
    success: (title: string, description?: string, options?: ToastOptions) =>
      push({ variant: 'success', title, description }, options),
    error: (title: string, description?: string, options?: ToastOptions) =>
      push({ variant: 'error', title, description }, options),
    info: (title: string, description?: string, options?: ToastOptions) =>
      push({ variant: 'info', title, description }, options),
  }
}

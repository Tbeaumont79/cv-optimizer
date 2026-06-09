import { computed, useId, type ComputedRef } from 'vue'

export interface FieldAria {
  /** id stable et SSR-safe, partagé entre le label et le contrôle. */
  id: string
  /** aria-describedby pointant vers l'erreur (prioritaire) ou l'aide. */
  describedBy: ComputedRef<string | undefined>
}

/** Câblage accessibilité commun aux champs de formulaire (label ↔ contrôle ↔ message). */
export function useField(state: { error?: string; hint?: string }): FieldAria {
  const id = useId()
  const describedBy = computed(() =>
    state.error ? `${id}-error` : state.hint ? `${id}-hint` : undefined,
  )
  return { id, describedBy }
}

<script setup lang="ts">
// État transversal d'une zone de contenu : chargement, erreur ou vide.
// Le slot par défaut accueille une action (ex. bouton « Réessayer »).
withDefaults(
  defineProps<{
    variant?: 'loading' | 'error' | 'empty'
    title?: string
    description?: string
  }>(),
  { variant: 'empty' },
)
</script>

<template>
  <div
    class="flex flex-col items-center justify-center gap-3 rounded-card bg-surface-muted px-6 py-12 text-center"
    role="status"
  >
    <UiSpinner v-if="variant === 'loading'" class="h-8 w-8 text-brand-600" />
    <div
      v-else
      class="flex h-12 w-12 items-center justify-center rounded-full text-xl font-semibold"
      :class="variant === 'error' ? 'bg-danger-500/10 text-danger-500' : 'bg-ink-100 text-ink-500'"
      aria-hidden="true"
    >
      {{ variant === 'error' ? '!' : '∅' }}
    </div>
    <p v-if="title" class="font-medium text-ink-900">{{ title }}</p>
    <p v-if="description" class="max-w-sm text-sm text-ink-500">{{ description }}</p>
    <slot />
  </div>
</template>

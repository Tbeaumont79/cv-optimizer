<script setup lang="ts">
// État transversal d'une zone de contenu : chargement, erreur ou vide.
// Le slot par défaut accueille une action (ex. bouton « Réessayer »).
import { CircleAlert, Inbox } from '@lucide/vue'

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
      class="flex h-12 w-12 items-center justify-center rounded-full"
      :class="variant === 'error' ? 'bg-danger-50 text-danger-600' : 'bg-ink-100 text-ink-400'"
      aria-hidden="true"
    >
      <CircleAlert v-if="variant === 'error'" class="h-6 w-6" :stroke-width="1.75" />
      <Inbox v-else class="h-6 w-6" :stroke-width="1.75" />
    </div>
    <p v-if="title" class="font-semibold text-ink-900">{{ title }}</p>
    <p v-if="description" class="max-w-sm text-sm text-ink-500">{{ description }}</p>
    <slot />
  </div>
</template>

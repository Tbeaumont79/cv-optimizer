<script setup lang="ts">
// Pastille de statut/catégorie (ex. « Recommandé », niveau de compétence, score).
const props = withDefaults(
  defineProps<{ variant?: 'brand' | 'success' | 'warning' | 'danger' | 'neutral' }>(),
  { variant: 'neutral' },
)

const VARIANTS = {
  brand: 'bg-brand-50 text-brand-700 ring-brand-200',
  success: 'bg-success-50 text-success-700 ring-success-200',
  warning: 'bg-warning-50 text-warning-700 ring-warning-200',
  danger: 'bg-danger-50 text-danger-700 ring-danger-200',
  neutral: 'bg-ink-100 text-ink-600 ring-ink-200',
} as const

const classes = computed(() => VARIANTS[props.variant])
</script>

<template>
  <span
    class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1"
    :class="classes"
  >
    <slot />
  </span>
</template>

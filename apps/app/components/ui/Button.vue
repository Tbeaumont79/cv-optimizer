<script setup lang="ts">
import { buttonClasses, type ButtonVariant, type ButtonSize } from './button-classes'

const props = withDefaults(
  defineProps<{
    variant?: ButtonVariant
    size?: ButtonSize
    type?: 'button' | 'submit' | 'reset'
    loading?: boolean
    disabled?: boolean
  }>(),
  { variant: 'primary', size: 'md', type: 'button', loading: false, disabled: false },
)

// `computed` est auto-importé par Nuxt.
const classes = computed(() => buttonClasses(props.variant, props.size))
</script>

<template>
  <button
    :type="type"
    :class="classes"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
  >
    <UiSpinner v-if="loading" class="h-4 w-4" />
    <slot />
  </button>
</template>

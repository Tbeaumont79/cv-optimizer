<script setup lang="ts">
// Boîte de dialogue de confirmation (suppressions, actions irréversibles).
// Usage : <UiDialog v-model:open="..." title="..." variant="danger" @confirm="..." />
import { nextTick, ref, useId, watch } from 'vue'
import { TriangleAlert } from '@lucide/vue'

const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    confirmLabel?: string
    cancelLabel?: string
    variant?: 'default' | 'danger'
    /** Spinner sur le bouton de confirmation pendant l'action. */
    loading?: boolean
  }>(),
  { confirmLabel: 'Confirmer', cancelLabel: 'Annuler', variant: 'default', loading: false },
)

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ confirm: [] }>()

const titleId = useId()
const panel = ref<HTMLElement | null>(null)
const cancelButton = ref<{ $el: HTMLElement } | null>(null)

function close() {
  if (!props.loading) open.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.stopPropagation()
    close()
    return
  }
  // Piège de focus minimal : Tab reste dans le panneau.
  if (event.key === 'Tab' && panel.value) {
    const focusables = panel.value.querySelectorAll<HTMLElement>(
      'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
    )
    if (focusables.length === 0) return
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }
}

watch(open, (isOpen) => {
  if (isOpen) {
    // Focus initial sur « Annuler » : l'action destructrice ne doit pas être le défaut.
    nextTick(() => cancelButton.value?.$el?.focus())
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-150"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/40 p-4 backdrop-blur-sm sm:items-center"
        @click.self="close"
        @keydown="onKeydown"
      >
        <div
          ref="panel"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          class="w-full max-w-md animate-toast-in rounded-card bg-surface p-6 shadow-pop"
        >
          <div class="flex items-start gap-4">
            <div
              v-if="variant === 'danger'"
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger-50 text-danger-600"
              aria-hidden="true"
            >
              <TriangleAlert class="h-5 w-5" :stroke-width="2" />
            </div>
            <div class="min-w-0 flex-1">
              <h2 :id="titleId" class="text-base font-semibold text-ink-900">{{ title }}</h2>
              <p v-if="description" class="mt-1.5 text-sm leading-relaxed text-ink-500">
                {{ description }}
              </p>
              <slot />
            </div>
          </div>
          <div class="mt-6 flex justify-end gap-3">
            <UiButton ref="cancelButton" variant="secondary" :disabled="loading" @click="close">
              {{ cancelLabel }}
            </UiButton>
            <UiButton
              :variant="variant === 'danger' ? 'danger' : 'primary'"
              :loading="loading"
              @click="emit('confirm')"
            >
              {{ confirmLabel }}
            </UiButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

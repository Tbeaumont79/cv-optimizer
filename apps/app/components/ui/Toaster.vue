<script setup lang="ts">
// Pile de toasts (coin bas-droit). Monté UNE fois dans app.vue — les pages
// déclenchent via useToast().success(...) / .error(...) / .info(...).
import { CircleAlert, CircleCheck, Info, X } from '@lucide/vue'

const { toasts, dismiss } = useToast()

const ICONS = { success: CircleCheck, error: CircleAlert, info: Info } as const
const ICON_CLASSES = {
  success: 'text-success-600',
  error: 'text-danger-600',
  info: 'text-brand-600',
} as const
</script>

<template>
  <Teleport to="body">
    <div
      class="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6"
      aria-live="polite"
      aria-atomic="false"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto flex w-full max-w-sm animate-toast-in items-start gap-3 rounded-card bg-surface p-4 shadow-pop ring-1 ring-border"
        role="status"
      >
        <component
          :is="ICONS[toast.variant]"
          class="mt-0.5 h-5 w-5 shrink-0"
          :class="ICON_CLASSES[toast.variant]"
          :stroke-width="2"
          aria-hidden="true"
        />
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-ink-900">{{ toast.title }}</p>
          <p v-if="toast.description" class="mt-0.5 text-sm text-ink-500">
            {{ toast.description }}
          </p>
        </div>
        <button
          type="button"
          class="-m-1 shrink-0 rounded-control p-2 text-ink-500 transition-colors hover:bg-surface-warm hover:text-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          aria-label="Fermer la notification"
          @click="dismiss(toast.id)"
        >
          <X class="h-4 w-4" :stroke-width="2" aria-hidden="true" />
        </button>
      </div>
    </div>
  </Teleport>
</template>

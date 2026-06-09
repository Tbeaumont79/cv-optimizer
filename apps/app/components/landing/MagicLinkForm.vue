<script setup lang="ts">
import { ref, computed } from 'vue'
import { useLanding } from '~/composables/useLanding'

/**
 * Formulaire d'inscription magic-link : champ e-mail + écran « lien envoyé ».
 * Microcopy conforme au doc validé (THI-128).
 *
 * Périmètre de CETTE issue = l'UI du flux. L'envoi réel du lien (génération de
 * token + e-mail) relève du WS auth/magic-link : on l'appelle via la prop
 * `onSubmit`, à brancher sur l'endpoint quand il existera. Par défaut le flux
 * affiche l'écran de confirmation sans prétendre avoir envoyé un e-mail.
 */
const props = defineProps<{
  /** Identifiant pour relier le label au champ (a11y). */
  id?: string
  /** Brancher l'envoi réel du lien ici (WS auth). */
  onSubmit?: (email: string) => Promise<void>
}>()

const { m } = useLanding()

const email = ref('')
const status = ref<'idle' | 'pending' | 'sent'>('idle')
const error = ref<string | null>(null)

const fieldId = computed(() => props.id ?? 'magiclink-email')
// Validation volontairement permissive (pas de regex exotique qui rejette des
// e-mails valides) : présence d'un « @ » entouré de caractères, point ensuite.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function submit() {
  error.value = null
  const value = email.value.trim()
  if (!EMAIL_RE.test(value)) {
    error.value = m.signup.errorInvalid
    return
  }
  status.value = 'pending'
  try {
    await props.onSubmit?.(value)
    status.value = 'sent'
  } catch {
    status.value = 'idle'
    error.value = m.signup.errorNetwork
  }
}
</script>

<template>
  <div class="w-full max-w-md">
    <form v-if="status !== 'sent'" class="flex flex-col gap-3" novalidate @submit.prevent="submit">
      <label :for="fieldId" class="sr-only">{{ m.signup.emailLabel }}</label>
      <div class="flex flex-col gap-3 sm:flex-row">
        <input
          :id="fieldId"
          v-model="email"
          type="email"
          inputmode="email"
          autocomplete="email"
          :placeholder="m.signup.emailPlaceholder"
          :aria-invalid="error ? 'true' : undefined"
          aria-describedby="magiclink-error"
          class="flex-1 rounded-card border border-ink-500/30 bg-surface px-4 py-3 text-ink-900 shadow-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
        />
        <button
          type="submit"
          :disabled="status === 'pending'"
          class="rounded-card bg-brand-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:opacity-60"
        >
          {{ m.signup.submit }}
        </button>
      </div>
      <p id="magiclink-error" role="alert" class="min-h-5 text-sm text-danger-500">
        {{ error }}
      </p>
    </form>

    <div
      v-else
      role="status"
      class="rounded-card border border-success-500/30 bg-success-500/5 px-5 py-4 text-center"
    >
      <p class="font-semibold text-ink-900">{{ m.signup.sentTitle }}</p>
      <p class="mt-1 text-sm text-ink-700">{{ m.signup.sentBody }}</p>
    </div>
  </div>
</template>

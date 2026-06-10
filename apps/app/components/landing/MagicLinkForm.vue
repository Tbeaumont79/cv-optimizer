<script setup lang="ts">
import { ref, useId } from 'vue'
import { MailCheck } from '@lucide/vue'
import { useLanding } from '~/composables/useLanding'

/**
 * Formulaire d'inscription magic-link : champ e-mail + écran « lien envoyé ».
 * Microcopy conforme au doc validé (THI-128).
 *
 * Monté plusieurs fois sur la landing (hero + CTA final) : les ids champ/erreur
 * sont générés via useId() pour rester uniques dans le DOM (a11y).
 *
 * Périmètre de CETTE issue = l'UI du flux. L'envoi réel du lien (génération de
 * token + e-mail) relève du WS auth/magic-link : on l'appelle via la prop
 * `onSubmit`, à brancher sur l'endpoint quand il existera. Par défaut le flux
 * affiche l'écran de confirmation sans prétendre avoir envoyé un e-mail.
 */
const props = defineProps<{
  /** Brancher l'envoi réel du lien ici (WS auth). */
  onSubmit?: (email: string) => Promise<void>
}>()

const { m } = useLanding()

const uid = useId()
const fieldId = `${uid}-email`
const errorId = `${uid}-error`

const email = ref('')
const status = ref<'idle' | 'pending' | 'sent'>('idle')
const error = ref<string | null>(null)

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
    <form v-if="status !== 'sent'" novalidate @submit.prevent="submit">
      <label :for="fieldId" class="sr-only">{{ m.signup.emailLabel }}</label>
      <div
        class="flex flex-col gap-2 rounded-control bg-surface p-1.5 shadow-card ring-1 transition-shadow duration-300 ease-out focus-within:ring-2 focus-within:ring-brand-500 sm:flex-row sm:items-center"
        :class="error ? 'ring-danger-500' : 'ring-border'"
      >
        <input
          :id="fieldId"
          v-model="email"
          type="email"
          inputmode="email"
          autocomplete="email"
          :placeholder="m.signup.emailPlaceholder"
          :aria-invalid="error ? 'true' : undefined"
          :aria-describedby="error ? errorId : undefined"
          class="h-10 w-full min-w-0 flex-1 rounded-control bg-transparent px-3 text-sm text-ink-900 placeholder:text-ink-500 focus:outline-none"
        />
        <UiButton type="submit" :loading="status === 'pending'" class="sm:shrink-0">
          {{ m.signup.submit }}
        </UiButton>
      </div>
      <p
        v-if="error"
        :id="errorId"
        role="alert"
        class="mt-2 text-left text-sm font-medium text-danger-600"
      >
        {{ error }}
      </p>
    </form>

    <div
      v-else
      role="status"
      class="flex animate-fade-up items-start gap-3 rounded-card bg-success-50 px-5 py-4 text-left ring-1 ring-success-200"
    >
      <MailCheck
        class="mt-0.5 h-5 w-5 shrink-0 text-success-600"
        :stroke-width="2"
        aria-hidden="true"
      />
      <div>
        <p class="font-semibold text-ink-900">{{ m.signup.sentTitle }}</p>
        <p class="mt-1 text-sm text-ink-700">{{ m.signup.sentBody }}</p>
      </div>
    </div>
  </div>
</template>

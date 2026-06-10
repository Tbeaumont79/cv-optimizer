<script setup lang="ts">
import { ArrowLeft, MailCheck } from '@lucide/vue'
import { BRAND } from '~/config/brand'

definePageMeta({ layout: false }) // page plein-écran, pas de nav connectée

const { signIn, pending, error } = useAuth()
const toast = useToast()

const email = ref('')
const sent = ref(false)

// En dev sans SMTP, l'email n'est jamais envoyé : le lien magique est loggé
// dans le terminal du serveur. On l'affiche pour ne pas chercher en vain.
const isDev = import.meta.dev

async function handleSubmit() {
  if (!email.value) return
  const ok = await signIn(email.value)
  if (ok) sent.value = true
}

async function handleResend() {
  if (!email.value) return
  const ok = await signIn(email.value)
  if (ok) toast.success('Lien renvoyé', `Jette un œil à ta boîte ${email.value}.`)
}

function changeEmail() {
  sent.value = false
  email.value = ''
}
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center bg-surface-muted px-4 py-10">
    <NuxtLink
      to="/"
      class="mb-8 flex items-center gap-2 rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      :aria-label="`${BRAND} — retour à l'accueil`"
    >
      <span
        class="flex h-9 w-9 items-center justify-center rounded-control bg-brand-600 text-base font-bold text-white"
        aria-hidden="true"
      >
        T
      </span>
      <span class="text-xl font-bold tracking-tight text-ink-900">{{ BRAND }}</span>
    </NuxtLink>

    <UiCard class="w-full max-w-md">
      <template v-if="!sent">
        <div class="mb-6 space-y-1.5 text-center">
          <h1 class="text-xl font-semibold text-ink-900">Content de te revoir</h1>
          <p class="text-sm text-ink-600">
            Entre ton email, on t'envoie un lien magique. Pas de mot de passe à retenir.
          </p>
        </div>

        <form class="space-y-4" novalidate @submit.prevent="handleSubmit">
          <UiInput
            v-model="email"
            type="email"
            label="Email"
            placeholder="toi@exemple.fr"
            required
            :disabled="pending"
            :error="error ?? undefined"
          />

          <UiButton type="submit" class="w-full" :loading="pending" :disabled="!email">
            Recevoir mon lien de connexion
          </UiButton>
        </form>

        <p class="mt-4 text-center text-xs text-ink-500">
          Le lien est valable 10 minutes. Rien à installer, rien à retenir.
        </p>
      </template>

      <div v-else class="animate-fade-up space-y-5 text-center">
        <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-50">
          <MailCheck class="h-6 w-6 text-success-600" :stroke-width="1.75" aria-hidden="true" />
        </div>

        <div class="space-y-1.5">
          <h1 class="text-xl font-semibold text-ink-900">Vérifie ta boîte mail</h1>
          <p class="text-sm text-ink-600">
            On vient d'envoyer un lien de connexion à
            <strong class="font-semibold text-ink-900">{{ email }}</strong
            >. Clique dessus pour continuer — il est valable 10 minutes.
          </p>
        </div>

        <p
          v-if="isDev"
          class="rounded-control bg-warning-50 px-3 py-2 text-left text-xs leading-relaxed text-warning-700 ring-1 ring-warning-200"
        >
          Mode dev sans SMTP : aucun email n'est réellement envoyé. Le lien de connexion est affiché
          dans le <strong>terminal du serveur</strong> (<code>[DEV] Magic-link…</code>) — copie-le
          dans le navigateur.
        </p>

        <div class="flex flex-col items-center gap-2">
          <UiButton variant="ghost" size="sm" :loading="pending" @click="handleResend">
            Renvoyer le lien
          </UiButton>
          <button
            type="button"
            class="rounded-control text-sm text-brand-700 underline-offset-4 transition-colors duration-300 ease-out hover:text-brand-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            @click="changeEmail"
          >
            Utiliser une autre adresse
          </button>
        </div>
      </div>
    </UiCard>

    <NuxtLink
      to="/"
      class="mt-8 inline-flex items-center gap-1.5 rounded-control text-sm text-ink-600 transition-colors duration-300 ease-out hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      <ArrowLeft class="h-4 w-4" :stroke-width="2" aria-hidden="true" />
      Retour à l'accueil
    </NuxtLink>
  </div>
</template>

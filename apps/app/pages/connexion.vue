<script setup lang="ts">
definePageMeta({ layout: false }) // page plein-écran, pas de nav connectée

const { signIn, pending, error } = useAuth()

const email = ref('')
const sent = ref(false)

async function handleSubmit() {
  if (!email.value) return
  const ok = await signIn(email.value)
  if (ok) sent.value = true
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-surface-muted px-4">
    <div class="w-full max-w-sm bg-surface rounded-card shadow p-8 space-y-6">
      <div class="text-center space-y-1">
        <h1 class="text-xl font-semibold text-ink-900">Connexion</h1>
        <p class="text-sm text-ink-500">CV Optimizer</p>
      </div>

      <template v-if="!sent">
        <form class="space-y-4" @submit.prevent="handleSubmit">
          <div class="space-y-1">
            <label for="email" class="block text-sm font-medium text-ink-700">
              Adresse e-mail
            </label>
            <input
              id="email"
              v-model="email"
              type="email"
              required
              autocomplete="email"
              placeholder="vous@exemple.fr"
              class="w-full rounded-card border border-ink-500/30 bg-surface px-3 py-2 text-sm text-ink-900 placeholder-ink-500 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
              :disabled="pending"
            />
          </div>

          <p v-if="error" role="alert" class="text-sm text-danger-500">{{ error }}</p>

          <button
            type="submit"
            :disabled="pending || !email"
            class="w-full rounded-card bg-brand-600 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span v-if="pending">Envoi en cours…</span>
            <span v-else>Recevoir un lien de connexion</span>
          </button>
        </form>

        <p class="text-xs text-center text-ink-500">
          Pas de mot de passe. Vous recevrez un lien valable 10 minutes.
        </p>
      </template>

      <template v-else>
        <div class="text-center space-y-3">
          <p class="text-success-500 font-medium">✓ Lien envoyé !</p>
          <p class="text-sm text-ink-700">
            Consultez votre boîte e-mail (<strong>{{ email }}</strong>) et cliquez sur le lien pour
            vous connecter.
          </p>
          <p class="text-xs text-ink-500">Le lien est valable 10 minutes.</p>
          <button
            class="text-sm text-brand-600 hover:underline"
            @click="sent = false"
          >
            Utiliser une autre adresse
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

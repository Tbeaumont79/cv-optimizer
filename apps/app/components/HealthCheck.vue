<script setup lang="ts">
import type { HealthStatus } from '@cvo/shared'
import { HEALTH_PATH } from '@cvo/shared'

// useFetch + healthLabel sont auto-importés par Nuxt.
const { data: status, error, pending, refresh } = await useFetch<HealthStatus>(HEALTH_PATH)
</script>

<template>
  <section class="rounded-card bg-surface p-6 shadow-sm ring-1 ring-ink-500/10">
    <h2 class="text-lg font-semibold text-ink-900">Preuve de vie</h2>

    <p v-if="pending" class="mt-2 text-ink-500">Vérification de l'API…</p>

    <p v-else-if="error" class="mt-2 text-danger-500">API injoignable : {{ error.message }}</p>

    <div v-else-if="status" class="mt-2 space-y-1">
      <p
        class="font-medium"
        :class="status.status === 'ok' ? 'text-success-500' : 'text-danger-500'"
      >
        {{ healthLabel(status) }}
      </p>
      <p class="text-sm text-ink-700">Base de données : {{ status.db }}</p>
      <p class="text-sm text-ink-500">{{ status.service }} · {{ status.timestamp }}</p>
    </div>

    <button
      type="button"
      class="mt-4 rounded-card bg-brand-600 px-4 py-2 text-sm font-medium text-brand-50 hover:bg-brand-700"
      @click="refresh()"
    >
      Rafraîchir
    </button>
  </section>
</template>

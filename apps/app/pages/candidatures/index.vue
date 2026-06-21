<script setup lang="ts">
import type { CandidatureListItemDTO, CandidatureStatus } from '@cvo/shared'
import { CANDIDATURE_STATUS_LABELS } from '@cvo/shared'
import { FileText, Plus, ArrowRight } from '@lucide/vue'

definePageMeta({ middleware: 'auth' })

const { data, status, error } = await useFetch<CandidatureListItemDTO[]>('/api/candidatures', {
  lazy: true,
})

const candidatures = computed(() => data.value ?? [])
const isLoading = computed(() => status.value === 'pending' && !data.value)

/** Couleur de badge par statut. */
const STATUS_VARIANT: Record<CandidatureStatus, 'neutral' | 'brand' | 'warning' | 'danger' | 'success'> = {
  DRAFT: 'neutral',
  SUBMITTED: 'brand',
  INTERVIEW: 'warning',
  REJECTED: 'danger',
  ACCEPTED: 'success',
}

const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
function formatDate(iso: string): string {
  return dateFmt.format(new Date(iso))
}
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-6 py-10">
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">Mes candidatures</h1>
        <p class="mt-2 max-w-2xl text-sm leading-relaxed text-ink-500 sm:text-base">
          Tes CV générés et le suivi des offres auxquelles tu as postulé.
        </p>
      </div>
      <NuxtLink to="/candidature">
        <UiButton>
          <Plus class="h-4 w-4" :stroke-width="2" aria-hidden="true" />
          Nouvelle candidature
        </UiButton>
      </NuxtLink>
    </header>

    <!-- Chargement -->
    <div v-if="isLoading" class="mt-8 space-y-3" role="status">
      <span class="sr-only">Chargement…</span>
      <UiSkeleton v-for="i in 3" :key="i" class="h-20 w-full rounded-card" />
    </div>

    <!-- Erreur -->
    <UiState
      v-else-if="error"
      variant="error"
      title="Impossible de charger tes candidatures"
      description="Une erreur est survenue. Réessaie dans un instant."
      class="mt-8"
    />

    <!-- Vide -->
    <UiState
      v-else-if="!candidatures.length"
      variant="empty"
      title="Aucune candidature pour l'instant"
      description="Lance une nouvelle candidature : analyse l'offre, génère ton CV adapté, puis personnalise-le."
      class="mt-8"
    >
      <NuxtLink to="/candidature">
        <UiButton variant="secondary">Commencer</UiButton>
      </NuxtLink>
    </UiState>

    <!-- Liste -->
    <ul v-else class="mt-8 space-y-3">
      <li v-for="c in candidatures" :key="c.id">
        <NuxtLink
          :to="`/candidatures/${c.id}`"
          class="flex items-center justify-between gap-4 rounded-card bg-surface p-4 shadow-xs ring-1 ring-border transition-shadow duration-300 ease-out hover:shadow-card-hover sm:p-5"
        >
          <div class="flex min-w-0 items-center gap-3">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-brand-50 text-brand-600"
              aria-hidden="true"
            >
              <FileText class="h-5 w-5" :stroke-width="1.75" />
            </div>
            <div class="min-w-0">
              <p class="truncate font-semibold text-ink-900">{{ c.label }}</p>
              <p class="mt-0.5 text-sm text-ink-500">
                Match {{ c.matchScore }}/100 · {{ formatDate(c.updatedAt) }}
              </p>
            </div>
          </div>
          <div class="flex shrink-0 items-center gap-3">
            <UiBadge :variant="STATUS_VARIANT[c.status]">
              {{ CANDIDATURE_STATUS_LABELS[c.status] }}
            </UiBadge>
            <ArrowRight class="h-4 w-4 text-ink-400" :stroke-width="2" aria-hidden="true" />
          </div>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>

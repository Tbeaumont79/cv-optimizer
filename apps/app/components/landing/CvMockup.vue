<script setup lang="ts">
import { useLanding } from '~/composables/useLanding'

/**
 * Visuel hero : pile « avant / après » de deux mini-CV.
 * - Derrière : le CV générique (lignes neutres, estompé).
 * - Devant : le CV adapté à l'offre, avec les éléments réalignés surlignés
 *   (bg-brand-100) et un badge « Match 87 % ».
 *
 * Le contenu du CV est un pseudo-contenu FICTIF purement décoratif
 * (aria-hidden) — seuls les libellés (badge, avant/après) viennent de l'i18n.
 */
const { m } = useLanding()

interface MockJob {
  role: string
  period: string
  bullets: { text: string; highlight: boolean }[]
}

const JOBS: readonly MockJob[] = [
  {
    role: 'Cheffe de projets digitaux · Lumea',
    period: '2021 – 2025',
    bullets: [
      { text: 'Pilotage de 12 campagnes multicanales (budget 150 k€)', highlight: true },
      { text: '+40 % d’abonnés à la newsletter en un an', highlight: false },
    ],
  },
  {
    role: 'Chargée de communication · Atelier Verde',
    period: '2018 – 2021',
    bullets: [{ text: 'Refonte du site vitrine et de la stratégie de contenus', highlight: false }],
  },
]

const SKILLS: readonly { label: string; highlight: boolean }[] = [
  { label: 'Gestion de projet', highlight: true },
  { label: 'SEO', highlight: true },
  { label: 'HubSpot', highlight: false },
  { label: 'Analyse de données', highlight: false },
  { label: 'Brief créatif', highlight: false },
]
</script>

<template>
  <div class="relative mx-auto w-full max-w-sm" aria-hidden="true">
    <!-- CV générique (derrière, estompé) -->
    <div
      class="absolute inset-0 -translate-x-4 translate-y-4 -rotate-3 rounded-card bg-surface p-5 opacity-80 shadow-card ring-1 ring-border"
    >
      <span
        class="inline-flex rounded-full bg-ink-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-ink-500"
      >
        {{ m.hero.mockup.beforeLabel }}
      </span>
      <div class="mt-4 flex items-center gap-3">
        <div class="h-9 w-9 rounded-full bg-ink-200"></div>
        <div class="space-y-1.5">
          <div class="h-2.5 w-28 rounded-full bg-ink-200"></div>
          <div class="h-2 w-36 rounded-full bg-ink-100"></div>
        </div>
      </div>
      <div class="mt-5 space-y-2">
        <div class="h-2 w-full rounded-full bg-ink-100"></div>
        <div class="h-2 w-5/6 rounded-full bg-ink-100"></div>
        <div class="h-2 w-3/4 rounded-full bg-ink-100"></div>
        <div class="mt-4 h-2 w-1/3 rounded-full bg-ink-200"></div>
        <div class="h-2 w-full rounded-full bg-ink-100"></div>
        <div class="h-2 w-4/6 rounded-full bg-ink-100"></div>
      </div>
    </div>

    <!-- CV adapté à l'offre (devant) -->
    <div class="relative rotate-1 rounded-card bg-surface p-5 shadow-pop ring-1 ring-border">
      <span class="absolute -top-3 right-4 drop-shadow-sm">
        <UiBadge variant="success">{{ m.hero.mockup.badge }}</UiBadge>
      </span>

      <span
        class="inline-flex rounded-full bg-brand-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-brand-700 ring-1 ring-brand-100"
      >
        {{ m.hero.mockup.afterLabel }}
      </span>

      <!-- Identité -->
      <div class="mt-4 flex items-center gap-3">
        <div
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white"
        >
          CR
        </div>
        <div class="min-w-0">
          <p class="text-sm font-bold text-ink-900">Camille Roussel</p>
          <p class="truncate text-[11px] text-ink-600">Cheffe de projets marketing · Nantes</p>
        </div>
      </div>

      <!-- Accroche -->
      <p class="mt-3 text-[10px] leading-relaxed text-ink-700">
        <span class="rounded bg-brand-100 px-1 py-px font-medium text-brand-900">
          6 ans de gestion de projets digitaux
        </span>
        au service de marques grand public, de la stratégie au déploiement.
      </p>

      <!-- Expérience -->
      <p
        class="mt-4 border-b border-border pb-1 text-[9px] font-semibold uppercase tracking-widest text-brand-700"
      >
        Expérience
      </p>
      <div v-for="job in JOBS" :key="job.role" class="mt-2.5">
        <div class="flex items-baseline justify-between gap-2">
          <p class="truncate text-[10px] font-semibold text-ink-900">{{ job.role }}</p>
          <p class="shrink-0 text-[9px] text-ink-500">{{ job.period }}</p>
        </div>
        <ul class="mt-1 list-disc space-y-0.5 pl-3.5 marker:text-brand-400">
          <li v-for="bullet in job.bullets" :key="bullet.text" class="text-[10px] text-ink-700">
            <span
              v-if="bullet.highlight"
              class="rounded bg-brand-100 px-1 py-px font-medium text-brand-900"
            >
              {{ bullet.text }}
            </span>
            <template v-else>{{ bullet.text }}</template>
          </li>
        </ul>
      </div>

      <!-- Compétences -->
      <p
        class="mt-4 border-b border-border pb-1 text-[9px] font-semibold uppercase tracking-widest text-brand-700"
      >
        Compétences
      </p>
      <div class="mt-2 flex flex-wrap gap-1">
        <span
          v-for="skill in SKILLS"
          :key="skill.label"
          class="rounded-full px-2 py-0.5 text-[9px] font-medium"
          :class="skill.highlight ? 'bg-brand-100 text-brand-800' : 'bg-ink-100 text-ink-700'"
        >
          {{ skill.label }}
        </span>
      </div>
    </div>
  </div>
</template>

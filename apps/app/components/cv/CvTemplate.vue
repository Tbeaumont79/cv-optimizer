<script setup lang="ts">
import type { RenderableCv, CvSection } from '@cvo/shared'

defineProps<{
  cv: RenderableCv
}>()

/** Narrowing utilitaire pour le template (exhaustivité par kind). */
function isExperience(s: CvSection): s is Extract<CvSection, { kind: 'experience' }> {
  return s.kind === 'experience'
}
function isSkills(s: CvSection): s is Extract<CvSection, { kind: 'skills' }> {
  return s.kind === 'skills'
}
function isEducation(s: CvSection): s is Extract<CvSection, { kind: 'education' }> {
  return s.kind === 'education'
}
function isSummary(s: CvSection): s is Extract<CvSection, { kind: 'summary' }> {
  return s.kind === 'summary'
}
</script>

<template>
  <!--
    Rendu déterministe d'un RenderableCv. Seule source de vérité du style CV.
    Tailwind v4 tokens exclusivement (pas de valeur en dur).
    L'ID #cv-render est la cible du headless-Chromium (export PDF, THI-125 PR3).
    La classe .cv-page cible les media-query @print (voir main.css).
  -->
  <article
    id="cv-render"
    class="cv-page mx-auto w-full max-w-[210mm] bg-surface font-sans text-ink-900"
    lang="fr"
  >
    <!-- En-tête : identité + accroche + contacts -->
    <header class="border-b border-ink-500/20 px-10 py-8">
      <h1 class="text-3xl font-bold text-ink-900">{{ cv.header.fullName }}</h1>
      <p class="mt-1 text-base font-medium text-brand-600">{{ cv.header.headline }}</p>

      <ul v-if="cv.header.contacts.length" class="mt-3 flex flex-wrap gap-x-5 gap-y-1">
        <li
          v-for="contact in cv.header.contacts"
          :key="contact.kind + contact.value"
          class="flex items-center gap-1.5 text-sm text-ink-500"
        >
          <!-- Icônes SVG inline minimalistes — pas de dépendance externe -->
          <svg
            v-if="contact.kind === 'email'"
            class="h-3.5 w-3.5 shrink-0"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            aria-hidden="true"
          >
            <rect x="1" y="3" width="14" height="10" rx="1.5" />
            <path d="M1 3l7 6 7-6" />
          </svg>
          <svg
            v-else-if="contact.kind === 'phone'"
            class="h-3.5 w-3.5 shrink-0"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            aria-hidden="true"
          >
            <path d="M4 1h2.5l1 3-1.5 1a9 9 0 004 4l1-1.5 3 1V12a2 2 0 01-2 2C5.4 14 2 8.6 2 3a2 2 0 012-2z" />
          </svg>
          <svg
            v-else-if="contact.kind === 'location'"
            class="h-3.5 w-3.5 shrink-0"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            aria-hidden="true"
          >
            <circle cx="8" cy="6" r="2.5" />
            <path d="M8 1a5 5 0 015 5c0 3.5-5 9-5 9S3 9.5 3 6a5 5 0 015-5z" />
          </svg>
          <svg
            v-else
            class="h-3.5 w-3.5 shrink-0"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            aria-hidden="true"
          >
            <path d="M6 3H3a1 1 0 00-1 1v9a1 1 0 001 1h9a1 1 0 001-1v-3" />
            <path d="M9 2h5v5" />
            <path d="M14 2L7 9" />
          </svg>
          <span>{{ contact.label ? `${contact.label} · ` : '' }}{{ contact.value }}</span>
        </li>
      </ul>
    </header>

    <!-- Sections (ordonnées par le moteur) -->
    <main class="space-y-6 px-10 py-7">
      <section
        v-for="(section, idx) in cv.sections"
        :key="idx"
        class="break-inside-avoid"
      >
        <!-- Titre de section uniforme -->
        <h2
          class="mb-3 border-b border-brand-100 pb-1 text-xs font-bold uppercase tracking-widest text-brand-600"
        >
          {{ section.title }}
        </h2>

        <!-- Profil / résumé -->
        <p v-if="isSummary(section)" class="text-sm leading-relaxed text-ink-700">
          {{ section.text }}
        </p>

        <!-- Expériences -->
        <div
          v-else-if="isExperience(section)"
          class="space-y-5"
        >
          <div
            v-for="entry in section.entries"
            :key="entry.id"
            class="break-inside-avoid"
          >
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-sm font-semibold text-ink-900">{{ entry.role }}</p>
                <p class="text-sm text-ink-700">
                  {{ entry.organization
                  }}<span v-if="entry.location"> · {{ entry.location }}</span>
                </p>
              </div>
              <p class="shrink-0 text-xs text-ink-500">{{ entry.period }}</p>
            </div>
            <ul v-if="entry.bullets.length" class="mt-2 space-y-1 pl-4">
              <li
                v-for="bullet in entry.bullets"
                :key="bullet.id"
                class="list-disc text-sm text-ink-700 marker:text-brand-500"
              >
                {{ bullet.text }}
              </li>
            </ul>
          </div>
        </div>

        <!-- Compétences -->
        <ul
          v-else-if="isSkills(section)"
          class="flex flex-wrap gap-2"
        >
          <li
            v-for="entry in section.entries"
            :key="entry.id"
            class="rounded-card bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700"
          >
            {{ entry.label }}
          </li>
        </ul>

        <!-- Formation -->
        <div
          v-else-if="isEducation(section)"
          class="space-y-3"
        >
          <div
            v-for="entry in section.entries"
            :key="entry.id"
            class="flex items-start justify-between gap-4"
          >
            <div>
              <p class="text-sm font-semibold text-ink-900">{{ entry.degree }}</p>
              <p class="text-sm text-ink-700">{{ entry.institution }}</p>
            </div>
            <p class="shrink-0 text-xs text-ink-500">{{ entry.period }}</p>
          </div>
        </div>
      </section>
    </main>
  </article>
</template>

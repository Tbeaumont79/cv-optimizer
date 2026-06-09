<script setup lang="ts">
import type { RenderableCv, ProfileItemId } from '@cvo/shared'
import { assertValidCv } from '@cvo/shared'

// Données de démo statiques — aucune donnée personnelle réelle.
// Le moteur (THI-124) remplacera ceci par une vraie génération côté serveur.
const DEMO_PROFILE_IDS: ProfileItemId[] = [
  'identity-1', 'summary-1',
  'exp-1', 'exp-1-b1', 'exp-1-b2',
  'skill-ts', 'skill-vue', 'edu-1',
]

const demoCv: RenderableCv = {
  locale: 'fr',
  header: {
    fullName: 'Camille Martin',
    headline: 'Développeuse full-stack TypeScript — Vue & Node',
    contacts: [
      { kind: 'email', label: 'Email', value: 'camille.martin@exemple.fr' },
      { kind: 'location', label: 'Localisation', value: 'Lyon, France' },
    ],
    provenance: { profileItemId: 'identity-1', reformulated: true },
  },
  sections: [
    {
      kind: 'summary',
      title: 'Profil',
      text: 'Développeuse full-stack avec 4 ans de pratique sur des SaaS en TypeScript, orientée qualité et impact produit.',
      provenance: { profileItemId: 'summary-1', reformulated: true },
    },
    {
      kind: 'experience',
      title: 'Expériences',
      entries: [
        {
          id: 'cv-exp-1',
          role: 'Développeuse full-stack',
          organization: 'Studio Web SAS',
          period: '2021 – 2024',
          location: 'Lyon',
          provenance: { profileItemId: 'exp-1', reformulated: true },
          bullets: [
            {
              id: 'b1',
              text: "Conception et livraison d'une application Vue 3 + Nitro pour 12 000 utilisateurs.",
              provenance: { profileItemId: 'exp-1-b1', reformulated: true },
            },
            {
              id: 'b2',
              text: 'Mise en place de la CI PR-only et des tests sur les chemins sensibles.',
              provenance: { profileItemId: 'exp-1-b2', reformulated: true },
            },
          ],
        },
      ],
    },
    {
      kind: 'skills',
      title: 'Compétences',
      entries: [
        { id: 'sk-1', label: 'TypeScript', provenance: { profileItemId: 'skill-ts', reformulated: false } },
        { id: 'sk-2', label: 'Vue 3', provenance: { profileItemId: 'skill-vue', reformulated: false } },
      ],
    },
    {
      kind: 'education',
      title: 'Formation',
      entries: [
        {
          id: 'edu-1',
          degree: 'Master Informatique',
          institution: 'Université de Lyon',
          period: '2019',
          provenance: { profileItemId: 'edu-1', reformulated: false },
        },
      ],
    },
  ],
}

// Défense en profondeur : garde-fou provenance avant tout rendu.
assertValidCv(demoCv, DEMO_PROFILE_IDS)

// Export PDF : câblé sur /api/cv/export-pdf (PR 3, THI-125).
const exporting = ref(false)

async function handleExport() {
  exporting.value = true
  try {
    const res = await $fetch<ArrayBuffer>('/api/cv/export-pdf', {
      method: 'POST',
      body: demoCv,
      responseType: 'arrayBuffer',
    })
    const blob = new Blob([res], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'cv-demo.pdf'
    a.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    // Route export non encore déployée (PR 3) — erreur attendue en démo.
    console.error('[cv/demo] export-pdf non disponible (PR 3):', err)
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-surface-muted py-10 print:bg-white print:py-0">
    <!-- Barre d'actions — masquée à l'impression -->
    <div class="mx-auto mb-6 flex w-full max-w-[210mm] items-center justify-between px-2 print:hidden">
      <p class="text-sm text-ink-500">
        Aperçu CV — <span class="font-medium text-ink-700">données de démo</span>
      </p>
      <button
        type="button"
        :disabled="exporting"
        class="rounded-card bg-brand-600 px-4 py-2 text-sm font-medium text-brand-50 hover:bg-brand-700 disabled:opacity-60"
        @click="handleExport"
      >
        {{ exporting ? 'Export en cours…' : 'Télécharger PDF' }}
      </button>
    </div>

    <!-- Rendu du CV (composant déterministe) -->
    <CvTemplate :cv="demoCv" />
  </div>
</template>

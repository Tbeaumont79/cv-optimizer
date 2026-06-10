<script setup lang="ts">
import type { RenderableCv, ProfileItemId } from '@cvo/shared'
import { assertValidCv } from '@cvo/shared'
import { Download } from '@lucide/vue'

// Données de démo statiques — aucune donnée personnelle réelle.
// Le moteur (THI-124) remplacera ceci par une vraie génération côté serveur.
const DEMO_PROFILE_IDS: ProfileItemId[] = [
  'identity-1',
  'summary-1',
  'exp-1',
  'exp-1-b1',
  'exp-1-b2',
  'skill-ts',
  'skill-vue',
  'edu-1',
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
        {
          id: 'sk-1',
          label: 'TypeScript',
          provenance: { profileItemId: 'skill-ts', reformulated: false },
        },
        {
          id: 'sk-2',
          label: 'Vue 3',
          provenance: { profileItemId: 'skill-vue', reformulated: false },
        },
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

// Export PDF via /api/cv/export-pdf (THI-125).
const toast = useToast()
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
    console.error('[cv/demo] export-pdf en échec:', err)
    toast.error(
      'Export impossible',
      "Le PDF n'a pas pu être généré. Réessaie dans quelques instants.",
    )
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <div class="bg-surface-muted print:bg-white">
    <!-- Barre d'actions — chrome d'aperçu, masquée à l'impression. -->
    <div
      class="mx-auto mb-8 flex w-full max-w-[210mm] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden"
    >
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2.5">
          <h1 class="text-2xl font-bold tracking-tight text-ink-900">Aperçu de ton CV</h1>
          <UiBadge variant="brand">Données de démo</UiBadge>
        </div>
        <p class="mt-1 text-sm text-ink-500">Vérifie le rendu, puis télécharge-le en un clic.</p>
      </div>
      <UiButton :loading="exporting" class="shrink-0" @click="handleExport">
        <Download v-if="!exporting" class="h-4 w-4" :stroke-width="2" aria-hidden="true" />
        Télécharger en PDF
      </UiButton>
    </div>

    <!--
      Feuille d'aperçu : seul le conteneur est stylé.
      CvTemplate (.cv-page) reste intouché — parité stricte avec l'export PDF serveur.
    -->
    <div
      class="mx-auto max-w-[210mm] overflow-hidden rounded-card shadow-pop ring-1 ring-border print:max-w-none print:overflow-visible print:rounded-none print:shadow-none print:ring-0"
    >
      <CvTemplate :cv="demoCv" />
    </div>

    <p class="mt-5 text-center text-xs text-ink-400 print:hidden">Aperçu fidèle au PDF exporté.</p>
  </div>
</template>

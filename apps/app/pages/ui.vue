<script setup lang="ts">
// Catalogue du design system — référence visuelle + QA manuelle des composants.
// Les WS profil/génération consomment ces mêmes composants et tokens.
import type { Component } from 'vue'
import {
  Briefcase,
  CircleAlert,
  CircleCheck,
  Download,
  FileText,
  GraduationCap,
  Inbox,
  Info,
  Mail,
  MapPin,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  TriangleAlert,
  X,
} from '@lucide/vue'
import { BRAND } from '~/config/brand'

const toast = useToast()

// ─── Boutons / formulaires ──────────────────────────────────────────────────
const sampleName = ref('Camille Martin')
const sampleEmail = ref('camille@exemple')
const sampleBio = ref('')
const loadingDemo = ref(false)

function simulate() {
  loadingDemo.value = true
  setTimeout(() => (loadingDemo.value = false), 1500)
}

// ─── Dialogue de confirmation ───────────────────────────────────────────────
const dialogOpen = ref(false)
const dialogLoading = ref(false)

function confirmDialogDemo() {
  dialogLoading.value = true
  setTimeout(() => {
    dialogLoading.value = false
    dialogOpen.value = false
    toast.success('Offre supprimée', 'Démo : aucune donnée réelle touchée.')
  }, 1200)
}

// ─── Icônes lucide utilisées dans l'app ─────────────────────────────────────
const ICONS: { name: string; icon: Component }[] = [
  { name: 'Download', icon: Download },
  { name: 'FileText', icon: FileText },
  { name: 'Sparkles', icon: Sparkles },
  { name: 'Mail', icon: Mail },
  { name: 'MapPin', icon: MapPin },
  { name: 'Briefcase', icon: Briefcase },
  { name: 'GraduationCap', icon: GraduationCap },
  { name: 'Plus', icon: Plus },
  { name: 'Pencil', icon: Pencil },
  { name: 'Trash2', icon: Trash2 },
  { name: 'Inbox', icon: Inbox },
  { name: 'X', icon: X },
  { name: 'CircleCheck', icon: CircleCheck },
  { name: 'CircleAlert', icon: CircleAlert },
  { name: 'Info', icon: Info },
  { name: 'TriangleAlert', icon: TriangleAlert },
]

// ─── Tokens (classes en littéraux complets : requis par le scanner Tailwind) ─
const SHADOWS = [
  { name: 'shadow-xs', class: 'shadow-xs' },
  { name: 'shadow-sm', class: 'shadow-sm' },
  { name: 'shadow-card', class: 'shadow-card' },
  { name: 'shadow-card-hover', class: 'shadow-card-hover' },
  { name: 'shadow-pop', class: 'shadow-pop' },
  { name: 'shadow-brand', class: 'shadow-brand' },
]

const BRAND_SCALE = [
  { step: '50', class: 'bg-brand-50' },
  { step: '100', class: 'bg-brand-100' },
  { step: '200', class: 'bg-brand-200' },
  { step: '300', class: 'bg-brand-300' },
  { step: '400', class: 'bg-brand-400' },
  { step: '500', class: 'bg-brand-500' },
  { step: '600', class: 'bg-brand-600' },
  { step: '700', class: 'bg-brand-700' },
  { step: '800', class: 'bg-brand-800' },
  { step: '900', class: 'bg-brand-900' },
  { step: '950', class: 'bg-brand-950' },
]

const INK_SCALE = [
  { step: '50', class: 'bg-ink-50' },
  { step: '100', class: 'bg-ink-100' },
  { step: '200', class: 'bg-ink-200' },
  { step: '300', class: 'bg-ink-300' },
  { step: '400', class: 'bg-ink-400' },
  { step: '500', class: 'bg-ink-500' },
  { step: '600', class: 'bg-ink-600' },
  { step: '700', class: 'bg-ink-700' },
  { step: '800', class: 'bg-ink-800' },
  { step: '900', class: 'bg-ink-900' },
  { step: '950', class: 'bg-ink-950' },
]

const SEMANTIC_SCALES = [
  {
    name: 'success',
    swatches: [
      { step: '50', class: 'bg-success-50' },
      { step: '100', class: 'bg-success-100' },
      { step: '200', class: 'bg-success-200' },
      { step: '500', class: 'bg-success-500' },
      { step: '600', class: 'bg-success-600' },
      { step: '700', class: 'bg-success-700' },
    ],
  },
  {
    name: 'warning',
    swatches: [
      { step: '50', class: 'bg-warning-50' },
      { step: '100', class: 'bg-warning-100' },
      { step: '200', class: 'bg-warning-200' },
      { step: '500', class: 'bg-warning-500' },
      { step: '600', class: 'bg-warning-600' },
      { step: '700', class: 'bg-warning-700' },
    ],
  },
  {
    name: 'danger',
    swatches: [
      { step: '50', class: 'bg-danger-50' },
      { step: '100', class: 'bg-danger-100' },
      { step: '200', class: 'bg-danger-200' },
      { step: '500', class: 'bg-danger-500' },
      { step: '600', class: 'bg-danger-600' },
      { step: '700', class: 'bg-danger-700' },
    ],
  },
]
</script>

<template>
  <div>
    <header class="mb-8">
      <h1 class="text-2xl font-bold tracking-tight text-ink-900">Design system</h1>
      <p class="mt-1 text-ink-500">
        Le langage visuel de {{ BRAND }} — tokens, composants et retours d'état (QA visuelle).
      </p>
    </header>

    <!-- Masonry 2 colonnes sur grand écran pour exploiter la largeur. -->
    <div class="lg:gap-6 lg:[column-count:2] [&>*]:mb-6 [&>*]:break-inside-avoid">
      <!-- ─── Palette ─────────────────────────────────────────────────────── -->
      <UiCard title="Palette">
        <div class="flex flex-col gap-6">
          <div>
            <h3 class="text-sm font-semibold text-ink-700">brand — indigo profond</h3>
            <div class="mt-2 flex flex-wrap gap-1.5">
              <div v-for="s in BRAND_SCALE" :key="s.step" class="flex flex-col items-center gap-1">
                <div class="h-9 w-9 rounded-control ring-1 ring-ink-950/10" :class="s.class" />
                <span class="text-[10px] text-ink-500">{{ s.step }}</span>
              </div>
            </div>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-ink-700">ink — neutres chauds (stone)</h3>
            <div class="mt-2 flex flex-wrap gap-1.5">
              <div v-for="s in INK_SCALE" :key="s.step" class="flex flex-col items-center gap-1">
                <div class="h-9 w-9 rounded-control ring-1 ring-ink-950/10" :class="s.class" />
                <span class="text-[10px] text-ink-500">{{ s.step }}</span>
              </div>
            </div>
          </div>
          <div class="grid gap-6 sm:grid-cols-3">
            <div v-for="scale in SEMANTIC_SCALES" :key="scale.name">
              <h3 class="text-sm font-semibold text-ink-700">{{ scale.name }}</h3>
              <div class="mt-2 flex flex-wrap gap-1.5">
                <div
                  v-for="s in scale.swatches"
                  :key="s.step"
                  class="flex flex-col items-center gap-1"
                >
                  <div class="h-9 w-9 rounded-control ring-1 ring-ink-950/10" :class="s.class" />
                  <span class="text-[10px] text-ink-500">{{ s.step }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </UiCard>

      <!-- ─── Ombres ──────────────────────────────────────────────────────── -->
      <UiCard title="Ombres">
        <div class="grid grid-cols-2 gap-6 rounded-control bg-surface-warm p-6 sm:grid-cols-3">
          <div
            v-for="s in SHADOWS"
            :key="s.name"
            class="flex h-24 items-center justify-center rounded-card bg-surface"
            :class="s.class"
          >
            <code class="text-xs text-ink-500">{{ s.name }}</code>
          </div>
        </div>
      </UiCard>

      <!-- ─── Boutons ─────────────────────────────────────────────────────── -->
      <UiCard title="Boutons">
        <div class="flex flex-wrap items-center gap-3">
          <UiButton>Primaire</UiButton>
          <UiButton variant="secondary">Secondaire</UiButton>
          <UiButton variant="ghost">Ghost</UiButton>
          <UiButton variant="danger">Supprimer</UiButton>
          <UiButton disabled>Désactivé</UiButton>
          <UiButton :loading="loadingDemo" @click="simulate">Générer</UiButton>
        </div>
        <div class="mt-4 flex flex-wrap items-center gap-3">
          <UiButton size="sm">Small</UiButton>
          <UiButton size="md">Medium</UiButton>
          <UiButton size="lg">Large</UiButton>
          <UiButton variant="secondary">
            <Download class="h-4 w-4" :stroke-width="2" aria-hidden="true" />
            Avec icône
          </UiButton>
        </div>
      </UiCard>

      <!-- ─── Champs de formulaire ────────────────────────────────────────── -->
      <UiCard title="Champs de formulaire">
        <div class="flex flex-col gap-4">
          <UiInput
            v-model="sampleName"
            label="Nom complet"
            required
            hint="Tel qu'il apparaîtra sur le CV."
          />
          <UiInput
            v-model="sampleEmail"
            label="Email"
            type="email"
            error="Adresse email invalide."
          />
          <UiInput label="Champ désactivé" placeholder="Indisponible" disabled />
          <UiTextarea v-model="sampleBio" label="Accroche" placeholder="Quelques lignes…" />
        </div>
      </UiCard>

      <!-- ─── Badges ──────────────────────────────────────────────────────── -->
      <UiCard title="Badges">
        <div class="flex flex-wrap items-center gap-3">
          <UiBadge variant="brand">Recommandé</UiBadge>
          <UiBadge variant="success">Validé</UiBadge>
          <UiBadge variant="warning">À retravailler</UiBadge>
          <UiBadge variant="danger">Manquant</UiBadge>
          <UiBadge variant="neutral">Brouillon</UiBadge>
        </div>
      </UiCard>

      <!-- ─── Icônes ──────────────────────────────────────────────────────── -->
      <UiCard title="Icônes (lucide)">
        <p class="mb-4 text-sm text-ink-500">
          Toujours via <code class="text-xs">@lucide/vue</code>, stroke-width 1.75–2. Jamais
          d'émojis ni de SVG inline ad hoc.
        </p>
        <ul class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <li
            v-for="item in ICONS"
            :key="item.name"
            class="flex flex-col items-center gap-2 rounded-control bg-surface-warm px-2 py-4"
          >
            <component
              :is="item.icon"
              class="h-5 w-5 text-ink-700"
              :stroke-width="1.75"
              aria-hidden="true"
            />
            <span class="text-xs text-ink-500">{{ item.name }}</span>
          </li>
        </ul>
      </UiCard>

      <!-- ─── États ───────────────────────────────────────────────────────── -->
      <UiCard title="États (loading / erreur / vide)">
        <div class="grid gap-4 sm:grid-cols-3">
          <UiState variant="loading" title="Chargement…" description="Récupération des données." />
          <UiState variant="error" title="Erreur" description="Impossible de charger le profil.">
            <UiButton size="sm" variant="secondary">Réessayer</UiButton>
          </UiState>
          <UiState
            variant="empty"
            title="Aucune offre"
            description="Ajoutez une offre pour commencer."
          >
            <UiButton size="sm">Ajouter</UiButton>
          </UiState>
        </div>
      </UiCard>

      <!-- ─── Skeleton ────────────────────────────────────────────────────── -->
      <UiCard title="Skeleton (chargement)">
        <p class="mb-4 text-sm text-ink-500">
          Plusieurs petits skeletons qui épousent la forme du contenu final, plutôt qu'un grand
          bloc.
        </p>
        <div class="rounded-control bg-surface-warm p-6">
          <div class="max-w-sm rounded-card bg-surface p-5 shadow-card" aria-hidden="true">
            <div class="flex items-center gap-3">
              <UiSkeleton class="h-10 w-10" />
              <div class="flex-1 space-y-2">
                <UiSkeleton class="h-4 w-1/3" />
                <UiSkeleton class="h-3 w-1/2" />
              </div>
            </div>
            <div class="mt-4 space-y-2">
              <UiSkeleton class="h-3 w-full" />
              <UiSkeleton class="h-3 w-5/6" />
              <UiSkeleton class="h-3 w-2/3" />
            </div>
          </div>
        </div>
      </UiCard>

      <!-- ─── Toasts ──────────────────────────────────────────────────────── -->
      <UiCard title="Toasts">
        <p class="mb-4 text-sm text-ink-500">
          Feedback non bloquant après une action — via <code class="text-xs">useToast()</code>.
        </p>
        <div class="flex flex-wrap items-center gap-3">
          <UiButton
            variant="secondary"
            @click="toast.success('Profil enregistré', 'Tes modifications sont sauvegardées.')"
          >
            Toast succès
          </UiButton>
          <UiButton
            variant="secondary"
            @click="toast.error('Export impossible', 'Réessaie dans quelques instants.')"
          >
            Toast erreur
          </UiButton>
          <UiButton
            variant="secondary"
            @click="toast.info('Génération en cours', 'Cela prend environ une minute.')"
          >
            Toast info
          </UiButton>
        </div>
      </UiCard>

      <!-- ─── Dialogue de confirmation ────────────────────────────────────── -->
      <UiCard title="Dialogue de confirmation">
        <p class="mb-4 text-sm text-ink-500">
          Pour les actions irréversibles — focus initial sur « Annuler », piège de focus, fermeture
          avec Échap.
        </p>
        <UiButton variant="danger" @click="dialogOpen = true">Supprimer une offre…</UiButton>
        <UiDialog
          v-model:open="dialogOpen"
          title="Supprimer cette offre ?"
          description="L'offre et les CV générés associés seront définitivement supprimés."
          confirm-label="Supprimer"
          cancel-label="Annuler"
          variant="danger"
          :loading="dialogLoading"
          @confirm="confirmDialogDemo"
        />
      </UiCard>
    </div>
  </div>
</template>

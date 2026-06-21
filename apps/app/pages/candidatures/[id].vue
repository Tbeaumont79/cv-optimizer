<script setup lang="ts">
import type {
  CandidatureDTO,
  CandidatureStatus,
  CvDesign,
  CvSection,
  RenderableCv,
} from '@cvo/shared'
import { CANDIDATURE_STATUSES, CANDIDATURE_STATUS_LABELS } from '@cvo/shared'
import {
  ArrowLeft,
  Download,
  Trash2,
  Plus,
  X,
  ChevronUp,
  ChevronDown,
  TriangleAlert,
  Sparkles,
} from '@lucide/vue'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const toast = useToast()
const id = route.params.id as string

const {
  data,
  status: fetchStatus,
  error,
} = await useFetch<CandidatureDTO>(`/api/candidatures/${id}`, {
  lazy: true,
})
const isLoading = computed(() => fetchStatus.value === 'pending' && !data.value)

// Design par défaut côté client (miroir de DEFAULT_DESIGN serveur).
const CLIENT_DEFAULT_DESIGN: CvDesign = {
  layout: 'single',
  accent: '#4f46e5',
  sidebarBg: '#1f2937',
  sidebarFg: '#f9fafb',
  sidebarRadius: 0,
  photoPosition: 'header-right',
  photoSize: 128,
  photoMargin: 14,
  photoPadding: 0,
  font: null,
  photo: null,
  summary: '',
}

// Copies de travail éditables.
const cv = ref<RenderableCv | null>(null)
const design = ref<CvDesign>({ ...CLIENT_DEFAULT_DESIGN })
const statusValue = ref<CandidatureStatus>('DRAFT')
let synced = false

watch(
  data,
  (c) => {
    if (c && !synced) {
      cv.value = structuredClone(toRaw(c.cv))
      design.value = c.design ? structuredClone(toRaw(c.design)) : { ...CLIENT_DEFAULT_DESIGN }
      statusValue.value = c.status
      synced = true
    }
  },
  { immediate: true },
)

// ─── Provenance : tout nœud ajouté recopie un id donneur (jamais vide). ───────
function donorId(): string {
  return cv.value?.header.provenance.profileItemId || 'user-edit'
}
function newNodeId(): string {
  // crypto.randomUUID dispo navigateur + Node 18+.
  return globalThis.crypto?.randomUUID?.() ?? `n-${Date.now()}-${Math.round(Math.random() * 1e6)}`
}

// ─── Mutations de contenu (provenance-safe). ──────────────────────────────────
function moveSection(i: number, dir: -1 | 1) {
  if (!cv.value) return
  const j = i + dir
  const arr = cv.value.sections
  if (j < 0 || j >= arr.length) return
  ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
}
function addBullet(section: Extract<CvSection, { kind: 'experience' }>, entryIdx: number) {
  const entry = section.entries[entryIdx]
  if (!entry) return
  entry.bullets.push({
    id: newNodeId(),
    text: '',
    provenance: { profileItemId: entry.provenance.profileItemId || donorId(), reformulated: true },
  })
}
function removeBullet(
  section: Extract<CvSection, { kind: 'experience' }>,
  entryIdx: number,
  bulletIdx: number,
) {
  section.entries[entryIdx]?.bullets.splice(bulletIdx, 1)
}
function addExperienceEntry(section: Extract<CvSection, { kind: 'experience' }>) {
  const did = section.entries[0]?.provenance.profileItemId || donorId()
  section.entries.push({
    id: newNodeId(),
    role: '',
    organization: '',
    period: '',
    bullets: [],
    provenance: { profileItemId: did, reformulated: true },
  })
}
function addSkillEntry(section: Extract<CvSection, { kind: 'skills' }>) {
  const did = section.entries[0]?.provenance.profileItemId || donorId()
  section.entries.push({
    id: newNodeId(),
    label: '',
    provenance: { profileItemId: did, reformulated: true },
  })
}
function addEducationEntry(section: Extract<CvSection, { kind: 'education' }>) {
  const did = section.entries[0]?.provenance.profileItemId || donorId()
  section.entries.push({
    id: newNodeId(),
    degree: '',
    institution: '',
    period: '',
    provenance: { profileItemId: did, reformulated: true },
  })
}
function addLanguageEntry(section: Extract<CvSection, { kind: 'languages' }>) {
  const did = section.entries[0]?.provenance.profileItemId || donorId()
  section.entries.push({
    id: newNodeId(),
    label: '',
    level: '',
    provenance: { profileItemId: did, reformulated: true },
  })
}
// Suppression générique d'une entrée d'une section à entrées.
function removeEntry(section: CvSection, idx: number) {
  if ('entries' in section) section.entries.splice(idx, 1)
}

// Ajout d'une phrase « compétence clé » (verbe d'action). Provenance recopiée.
// Plafond à 8 (aligné sur le profil / la persistance).
function addKeySkillEntry(section: Extract<CvSection, { kind: 'keyskills' }>) {
  if (section.entries.length >= 8) {
    toast.error('Maximum atteint', '8 compétences clés au maximum.')
    return
  }
  const did = section.entries[0]?.provenance.profileItemId || donorId()
  section.entries.push({
    id: newNodeId(),
    text: '',
    provenance: { profileItemId: did, reformulated: true },
  })
}

/**
 * Insère une section « Compétences clés » (phrases) au-dessus des expériences si
 * elle n'existe pas déjà. Le contenu vient idéalement du profil à la génération ;
 * ici on permet de l'ajouter/compléter à la main.
 */
function addKeySkillsSection() {
  if (!cv.value) return
  if (cv.value.sections.some((s) => s.kind === 'keyskills')) {
    toast.error('Déjà présente', 'Une section « Compétences clés » existe déjà — édite-la.')
    return
  }
  const section: CvSection = {
    kind: 'keyskills',
    title: 'Compétences clés',
    entries: [
      { id: newNodeId(), text: '', provenance: { profileItemId: donorId(), reformulated: true } },
    ],
  }
  const expIdx = cv.value.sections.findIndex((s) => s.kind === 'experience')
  cv.value.sections.splice(expIdx >= 0 ? expIdx : cv.value.sections.length, 0, section)
}

// ─── Aperçu live (débouncé). ──────────────────────────────────────────────────
const previewHtml = ref('')
let previewTimer: ReturnType<typeof setTimeout> | null = null
async function refreshPreview() {
  if (!cv.value) return
  try {
    previewHtml.value = await $fetch<string>('/api/cv/preview', {
      method: 'POST',
      body: { cv: cv.value, design: design.value },
    })
  } catch {
    /* aperçu non bloquant : garder le dernier rendu */
  }
}
watch(
  [cv, design],
  () => {
    if (previewTimer) clearTimeout(previewTimer)
    previewTimer = setTimeout(refreshPreview, 500)
  },
  { deep: true },
)
watch(cv, (v) => {
  if (v && !previewHtml.value) refreshPreview()
})

// ─── Avertissement « 1 page » (heuristique, non bloquant). ────────────────────
const overflowWarning = computed(() => {
  if (!cv.value) return null
  const exp = cv.value.sections.find((s) => s.kind === 'experience')
  if (exp && exp.kind === 'experience') {
    if (exp.entries.length > 6) return "Beaucoup d'expériences : le CV risque de dépasser une page."
    if (exp.entries.some((e) => e.bullets.length > 4))
      return "Certaines expériences ont >4 puces : risque de dépassement d'une page."
  }
  // Les compétences clés s'empilent au-dessus des expériences (colonne principale).
  const ks = cv.value.sections.find((s) => s.kind === 'keyskills')
  if (ks && ks.kind === 'keyskills') {
    if (ks.entries.length > 6)
      return 'Beaucoup de compétences clés : le CV risque de dépasser une page.'
    if (ks.entries.some((e) => e.text.length > 200))
      return "Des compétences clés très longues : risque de dépassement d'une page."
  }
  return null
})

// ─── Actions. ─────────────────────────────────────────────────────────────────
const saving = ref(false)
const exporting = ref(false)
const deleting = ref(false)
const deleteDialogOpen = ref(false)

async function save() {
  if (!cv.value) return
  saving.value = true
  try {
    await $fetch(`/api/candidatures/${id}`, {
      method: 'PATCH',
      body: { cv: cv.value, design: design.value },
    })
    toast.success('Enregistré', 'Tes modifications sont sauvegardées.')
  } catch {
    toast.error("L'enregistrement a échoué", 'Vérifie ta connexion puis réessaie.')
  } finally {
    saving.value = false
  }
}

async function updateStatus() {
  try {
    await $fetch(`/api/candidatures/${id}`, {
      method: 'PATCH',
      body: { status: statusValue.value },
    })
    toast.success('Statut mis à jour')
  } catch {
    toast.error('La mise à jour a échoué')
  }
}

async function exportPdf() {
  if (!cv.value) return
  exporting.value = true
  try {
    const res = await $fetch<ArrayBuffer>('/api/cv/export-pdf', {
      method: 'POST',
      body: { cv: cv.value, design: design.value },
      responseType: 'arrayBuffer',
    })
    const url = URL.createObjectURL(new Blob([res], { type: 'application/pdf' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'cv.pdf'
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    toast.error('Export impossible', 'Réessaie dans quelques instants.')
  } finally {
    exporting.value = false
  }
}

async function confirmDelete() {
  deleting.value = true
  try {
    await $fetch(`/api/candidatures/${id}`, { method: 'DELETE' })
    deleteDialogOpen.value = false
    toast.success('Candidature supprimée')
    await navigateTo('/candidatures')
  } catch {
    toast.error('La suppression a échoué')
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-7xl px-6 py-8">
    <NuxtLink
      to="/candidatures"
      class="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-700"
    >
      <ArrowLeft class="h-4 w-4" :stroke-width="2" aria-hidden="true" /> Mes candidatures
    </NuxtLink>

    <div v-if="isLoading" class="mt-6"><UiSkeleton class="h-96 w-full rounded-card" /></div>
    <UiState
      v-else-if="error || !cv"
      variant="error"
      title="Candidature introuvable"
      description="Elle a peut-être été supprimée."
      class="mt-8"
    />

    <div
      v-else
      class="mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-8"
    >
      <!-- Colonne édition -->
      <div class="min-w-0 space-y-6">
        <!-- Barre d'actions -->
        <div
          class="flex flex-wrap items-center gap-3 rounded-card bg-surface p-4 shadow-card ring-1 ring-border"
        >
          <select
            v-model="statusValue"
            class="h-10 rounded-control bg-surface px-3 text-sm text-ink-900 ring-1 ring-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            @change="updateStatus"
          >
            <option v-for="s in CANDIDATURE_STATUSES" :key="s" :value="s">
              {{ CANDIDATURE_STATUS_LABELS[s] }}
            </option>
          </select>
          <UiButton variant="secondary" size="sm" @click="addKeySkillsSection">
            <Sparkles class="h-4 w-4" :stroke-width="2" aria-hidden="true" />
            Compétences clés
          </UiButton>
          <div class="ml-auto flex flex-wrap gap-2">
            <UiButton variant="ghost" :loading="deleting" @click="deleteDialogOpen = true">
              <Trash2 class="h-4 w-4" :stroke-width="1.75" aria-hidden="true" />
            </UiButton>
            <UiButton variant="secondary" :loading="saving" @click="save">Enregistrer</UiButton>
            <UiButton :loading="exporting" @click="exportPdf">
              <Download class="h-4 w-4" :stroke-width="2" aria-hidden="true" /> Exporter
            </UiButton>
          </div>
        </div>

        <div
          v-if="overflowWarning"
          class="flex items-start gap-2 rounded-card bg-warning-50 p-3 text-sm text-warning-700 ring-1 ring-warning-200"
        >
          <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" :stroke-width="1.75" aria-hidden="true" />
          <span>{{ overflowWarning }}</span>
        </div>

        <!-- Design -->
        <UiCard>
          <p class="mb-3 text-sm font-semibold text-ink-900">Apparence</p>
          <div class="space-y-4">
            <CvPhotoInput v-model="design.photo" />
            <CvDesignPanel v-model="design" />
          </div>
        </UiCard>

        <!-- En-tête -->
        <UiCard>
          <p class="mb-3 text-sm font-semibold text-ink-900">En-tête</p>
          <div class="space-y-3">
            <UiInput v-model="cv.header.fullName" label="Nom complet" />
            <UiInput v-model="cv.header.headline" label="Intitulé / accroche" />
            <div
              v-for="(contact, ci) in cv.header.contacts"
              :key="ci"
              class="flex items-center gap-2"
            >
              <div class="flex-1">
                <UiInput
                  v-model="contact.value"
                  :label="ci === 0 ? 'Contacts' : ''"
                  :placeholder="contact.kind"
                />
              </div>
              <button
                type="button"
                class="shrink-0 rounded-control p-2 text-ink-400 hover:bg-danger-50 hover:text-danger-600"
                aria-label="Retirer ce contact"
                @click="cv.header.contacts.splice(ci, 1)"
              >
                <X class="h-4 w-4" :stroke-width="2" aria-hidden="true" />
              </button>
            </div>
          </div>
        </UiCard>

        <!-- Sections -->
        <UiCard v-for="(section, si) in cv.sections" :key="si">
          <div class="mb-3 flex items-center gap-2">
            <div class="flex-1">
              <UiInput v-model="section.title" label="" />
            </div>
            <button
              type="button"
              class="rounded-control p-2 text-ink-400 hover:bg-ink-100 disabled:opacity-40"
              :disabled="si === 0"
              aria-label="Monter"
              @click="moveSection(si, -1)"
            >
              <ChevronUp class="h-4 w-4" :stroke-width="2" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="rounded-control p-2 text-ink-400 hover:bg-ink-100 disabled:opacity-40"
              :disabled="si === cv.sections.length - 1"
              aria-label="Descendre"
              @click="moveSection(si, 1)"
            >
              <ChevronDown class="h-4 w-4" :stroke-width="2" aria-hidden="true" />
            </button>
          </div>

          <!-- Résumé -->
          <UiTextarea v-if="section.kind === 'summary'" v-model="section.text" :rows="4" label="" />

          <!-- Compétences clés (phrases, verbe d'action) -->
          <div v-else-if="section.kind === 'keyskills'" class="space-y-2">
            <div
              v-for="(entry, ei) in section.entries"
              :key="entry.id"
              class="flex items-start gap-2"
            >
              <div class="flex-1">
                <UiTextarea
                  v-model="entry.text"
                  :rows="2"
                  label=""
                  placeholder="Concevoir des applications web performantes…"
                />
              </div>
              <button
                type="button"
                class="mt-1 shrink-0 rounded-control p-2 text-ink-400 hover:bg-danger-50 hover:text-danger-600"
                aria-label="Retirer la phrase"
                @click="removeEntry(section, ei)"
              >
                <X class="h-4 w-4" :stroke-width="2" aria-hidden="true" />
              </button>
            </div>
            <UiButton variant="secondary" size="sm" @click="addKeySkillEntry(section)">
              <Plus class="h-4 w-4" :stroke-width="2" aria-hidden="true" /> Ajouter une phrase
            </UiButton>
          </div>

          <!-- Expériences -->
          <div v-else-if="section.kind === 'experience'" class="space-y-4">
            <div
              v-for="(entry, ei) in section.entries"
              :key="entry.id"
              class="space-y-2 rounded-card bg-surface-muted p-3 ring-1 ring-border"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="grid flex-1 gap-2 sm:grid-cols-2">
                  <UiInput v-model="entry.role" label="Poste" />
                  <UiInput v-model="entry.organization" label="Entreprise" />
                  <UiInput v-model="entry.period" label="Période" />
                </div>
                <button
                  type="button"
                  class="shrink-0 rounded-control p-2 text-ink-400 hover:bg-danger-50 hover:text-danger-600"
                  aria-label="Retirer l'expérience"
                  @click="removeEntry(section, ei)"
                >
                  <Trash2 class="h-4 w-4" :stroke-width="1.75" aria-hidden="true" />
                </button>
              </div>
              <div
                v-for="(bullet, bi) in entry.bullets"
                :key="bullet.id"
                class="flex items-center gap-2"
              >
                <div class="flex-1">
                  <UiInput v-model="bullet.text" placeholder="Puce" />
                </div>
                <button
                  type="button"
                  class="shrink-0 rounded-control p-2 text-ink-400 hover:bg-danger-50 hover:text-danger-600"
                  aria-label="Retirer la puce"
                  @click="removeBullet(section, ei, bi)"
                >
                  <X class="h-4 w-4" :stroke-width="2" aria-hidden="true" />
                </button>
              </div>
              <UiButton variant="ghost" size="sm" @click="addBullet(section, ei)">
                <Plus class="h-3.5 w-3.5" :stroke-width="2" aria-hidden="true" /> Puce
              </UiButton>
            </div>
            <UiButton variant="secondary" size="sm" @click="addExperienceEntry(section)">
              <Plus class="h-4 w-4" :stroke-width="2" aria-hidden="true" /> Ajouter une expérience
            </UiButton>
          </div>

          <!-- Compétences -->
          <div v-else-if="section.kind === 'skills'" class="space-y-2">
            <div
              v-for="(entry, ei) in section.entries"
              :key="entry.id"
              class="flex items-center gap-2"
            >
              <div class="flex-1">
                <UiInput v-model="entry.label" placeholder="Compétence" />
              </div>
              <button
                type="button"
                class="shrink-0 rounded-control p-2 text-ink-400 hover:bg-danger-50 hover:text-danger-600"
                aria-label="Retirer"
                @click="removeEntry(section, ei)"
              >
                <X class="h-4 w-4" :stroke-width="2" aria-hidden="true" />
              </button>
            </div>
            <UiButton variant="secondary" size="sm" @click="addSkillEntry(section)">
              <Plus class="h-4 w-4" :stroke-width="2" aria-hidden="true" /> Ajouter
            </UiButton>
          </div>

          <!-- Formations -->
          <div v-else-if="section.kind === 'education'" class="space-y-3">
            <div
              v-for="(entry, ei) in section.entries"
              :key="entry.id"
              class="space-y-2 rounded-card bg-surface-muted p-3 ring-1 ring-border"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="grid flex-1 gap-2 sm:grid-cols-2">
                  <UiInput v-model="entry.degree" label="Diplôme" />
                  <UiInput v-model="entry.institution" label="Établissement" />
                  <UiInput v-model="entry.period" label="Période" />
                </div>
                <button
                  type="button"
                  class="shrink-0 rounded-control p-2 text-ink-400 hover:bg-danger-50 hover:text-danger-600"
                  aria-label="Retirer"
                  @click="removeEntry(section, ei)"
                >
                  <Trash2 class="h-4 w-4" :stroke-width="1.75" aria-hidden="true" />
                </button>
              </div>
            </div>
            <UiButton variant="secondary" size="sm" @click="addEducationEntry(section)">
              <Plus class="h-4 w-4" :stroke-width="2" aria-hidden="true" /> Ajouter
            </UiButton>
          </div>

          <!-- Langues -->
          <div v-else-if="section.kind === 'languages'" class="space-y-2">
            <div
              v-for="(entry, ei) in section.entries"
              :key="entry.id"
              class="flex items-center gap-2"
            >
              <div class="flex-1">
                <UiInput v-model="entry.label" placeholder="Langue" />
              </div>
              <UiInput v-model="entry.level" class="w-32" placeholder="Niveau" />
              <button
                type="button"
                class="shrink-0 rounded-control p-2 text-ink-400 hover:bg-danger-50 hover:text-danger-600"
                aria-label="Retirer"
                @click="removeEntry(section, ei)"
              >
                <X class="h-4 w-4" :stroke-width="2" aria-hidden="true" />
              </button>
            </div>
            <UiButton variant="secondary" size="sm" @click="addLanguageEntry(section)">
              <Plus class="h-4 w-4" :stroke-width="2" aria-hidden="true" /> Ajouter
            </UiButton>
          </div>
        </UiCard>
      </div>

      <!-- Colonne aperçu (sticky) -->
      <div class="mt-6 lg:mt-0 lg:sticky lg:top-24">
        <div class="overflow-hidden rounded-card bg-white shadow-pop ring-1 ring-border">
          <iframe
            v-if="previewHtml"
            :srcdoc="previewHtml"
            title="Aperçu du CV"
            sandbox=""
            class="aspect-[210/297] w-full border-0"
          />
          <div v-else class="aspect-[210/297] w-full animate-pulse bg-surface-muted" />
        </div>
      </div>
    </div>

    <UiDialog
      v-model:open="deleteDialogOpen"
      title="Supprimer cette candidature ?"
      description="Le CV et le suivi associés seront retirés. Cette action est définitive."
      confirm-label="Supprimer"
      variant="danger"
      :loading="deleting"
      @confirm="confirmDelete"
    />
  </div>
</template>

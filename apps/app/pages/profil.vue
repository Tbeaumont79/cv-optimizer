<script setup lang="ts">
import type { ProfileDTO, ExperienceDTO, SkillDTO, SkillLevel } from '@cvo/shared'
import { SKILL_LEVELS } from '@cvo/shared'
import {
  Plus,
  Trash2,
  X,
  Briefcase,
  Wrench,
  ClipboardPaste,
  UserRound,
  ShieldCheck,
  ArrowRight,
} from '@lucide/vue'

definePageMeta({ middleware: 'auth' })

const toast = useToast()

// ─── Chargement du profil ────────────────────────────────────────────────────

const { data, status, error, refresh } = await useFetch<ProfileDTO | null>('/api/profile', {
  lazy: true,
})

const profile = computed(() => data.value ?? null)
// Skeleton uniquement au premier chargement : les refresh suivants gardent le contenu affiché.
const isLoading = computed(() => status.value === 'pending' && !data.value)

const expCount = computed(() => profile.value?.experiences.length ?? 0)
const skillCount = computed(() => profile.value?.skills.length ?? 0)

// ─── Formulaire en-tête ──────────────────────────────────────────────────────

const headline = ref('')
const summary = ref('')
let headerSynced = false

// Pré-remplit le formulaire dès la première arrivée des données (fetch lazy),
// sans écraser une saisie en cours lors des refresh suivants.
watch(
  data,
  (p) => {
    if (p && !headerSynced) {
      headline.value = p.headline ?? ''
      summary.value = p.summary ?? ''
      headerSynced = true
    }
  },
  { immediate: true },
)

const savingHeader = ref(false)

async function saveHeader() {
  savingHeader.value = true
  try {
    const res = await $fetch<ProfileDTO>('/api/profile', {
      method: 'PUT',
      body: { headline: headline.value || null, summary: summary.value || null },
    })
    data.value = res
    toast.success('En-tête enregistré', 'Ton intitulé et ton résumé sont à jour.')
  } catch {
    toast.error("L'enregistrement a échoué", 'Vérifie ta connexion puis réessaie.')
  } finally {
    savingHeader.value = false
  }
}

// ─── Expériences ─────────────────────────────────────────────────────────────

const showExpForm = ref(false)
const addingExp = ref(false)
const expForm = reactive({
  title: '',
  company: '',
  startDate: '',
  endDate: '',
  description: '',
  skillsUsed: '',
})

function resetExpForm() {
  Object.assign(expForm, {
    title: '',
    company: '',
    startDate: '',
    endDate: '',
    description: '',
    skillsUsed: '',
  })
}

async function addExperience() {
  addingExp.value = true
  try {
    await $fetch('/api/profile/experiences', {
      method: 'POST',
      body: {
        title: expForm.title,
        company: expForm.company,
        startDate: expForm.startDate ? new Date(expForm.startDate).toISOString() : null,
        endDate: expForm.endDate ? new Date(expForm.endDate).toISOString() : null,
        description: expForm.description || null,
        skillsUsed: expForm.skillsUsed
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      },
    })
    resetExpForm()
    showExpForm.value = false
    await refresh()
    toast.success('Expérience ajoutée', 'Elle apparaît maintenant dans ton profil.')
  } catch {
    toast.error("L'ajout a échoué", 'Vérifie ta connexion puis réessaie.')
  } finally {
    addingExp.value = false
  }
}

const periodFormatter = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric' })

function formatPeriod(exp: ExperienceDTO): string | null {
  if (!exp.startDate && !exp.endDate) return null
  const end = exp.endDate ? periodFormatter.format(new Date(exp.endDate)) : "aujourd'hui"
  if (!exp.startDate) return end
  return `${periodFormatter.format(new Date(exp.startDate))} – ${end}`
}

// ─── Compétences ─────────────────────────────────────────────────────────────

const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  BEGINNER: 'Débutant',
  INTERMEDIATE: 'Intermédiaire',
  ADVANCED: 'Avancé',
  EXPERT: 'Expert',
}

const showSkillForm = ref(false)
const addingSkill = ref(false)
// `years` peut devenir un number : Vue applique le modificateur .number aux inputs type=number.
const skillForm = reactive({ label: '', level: '' as string, years: '' as string | number })

const levelSelectId = useId()
const yearsInputId = useId()

async function addSkill() {
  addingSkill.value = true
  try {
    await $fetch('/api/profile/skills', {
      method: 'POST',
      body: {
        label: skillForm.label,
        level: skillForm.level || null,
        years: skillForm.years === '' ? null : Number(skillForm.years),
      },
    })
    Object.assign(skillForm, { label: '', level: '', years: '' })
    await refresh()
    toast.success('Compétence ajoutée')
  } catch {
    toast.error("L'ajout a échoué", 'Vérifie ta connexion puis réessaie.')
  } finally {
    addingSkill.value = false
  }
}

// ─── Suppressions (avec confirmation) ────────────────────────────────────────

type DeleteTarget = { kind: 'experience' | 'skill'; id: string; label: string }

const deleteTarget = ref<DeleteTarget | null>(null)
const deleteDialogOpen = ref(false)
const deleting = ref(false)

const deleteDialogTitle = computed(() =>
  deleteTarget.value?.kind === 'skill'
    ? 'Supprimer cette compétence ?'
    : 'Supprimer cette expérience ?',
)
const deleteDialogDescription = computed(() =>
  deleteTarget.value
    ? `« ${deleteTarget.value.label} » sera retirée de ton profil. Cette action est définitive.`
    : '',
)

function askDeleteExperience(exp: ExperienceDTO) {
  deleteTarget.value = { kind: 'experience', id: exp.id, label: `${exp.title} — ${exp.company}` }
  deleteDialogOpen.value = true
}

function askDeleteSkill(sk: SkillDTO) {
  deleteTarget.value = { kind: 'skill', id: sk.id, label: sk.label }
  deleteDialogOpen.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    const { kind, id } = deleteTarget.value
    if (kind === 'experience') {
      await $fetch(`/api/profile/experiences/${id}`, { method: 'DELETE' })
    } else {
      await $fetch(`/api/profile/skills/${id}`, { method: 'DELETE' })
    }
    await refresh()
    deleteDialogOpen.value = false
    toast.success(kind === 'experience' ? 'Expérience supprimée' : 'Compétence supprimée')
  } catch {
    toast.error('La suppression a échoué', 'Vérifie ta connexion puis réessaie.')
  } finally {
    deleting.value = false
  }
}

// ─── Import copier-coller ────────────────────────────────────────────────────

type ParsedProfile = {
  headline: string | null
  summary: string | null
  experiences: Omit<ExperienceDTO, 'id'>[]
  skills: Omit<SkillDTO, 'id'>[]
}

const pasteText = ref('')
const parsing = ref(false)
const applyingImport = ref(false)
const importResult = ref<ParsedProfile | null>(null)

async function doParse() {
  parsing.value = true
  importResult.value = null
  try {
    const res = await $fetch<ParsedProfile>('/api/profile/import-text', {
      method: 'POST',
      body: { text: pasteText.value },
    })
    importResult.value = res
  } catch {
    toast.error("L'analyse a échoué", 'Réessaie dans un instant, ou avec un autre texte.')
  } finally {
    parsing.value = false
  }
}

async function applyImport() {
  if (!importResult.value) return
  applyingImport.value = true
  try {
    const r = importResult.value
    await $fetch('/api/profile', {
      method: 'PUT',
      body: { headline: r.headline, summary: r.summary },
    })
    for (const exp of r.experiences) {
      await $fetch('/api/profile/experiences', { method: 'POST', body: exp })
    }
    for (const sk of r.skills) {
      await $fetch('/api/profile/skills', { method: 'POST', body: sk })
    }
    pasteText.value = ''
    importResult.value = null
    await refresh()
    headline.value = profile.value?.headline ?? ''
    summary.value = profile.value?.summary ?? ''
    toast.success('Profil importé', 'Tes informations ont bien été enregistrées.')
  } catch {
    // Les écritures sont séquentielles : certaines ont pu aboutir avant l'échec.
    await refresh()
    toast.error(
      "L'import a échoué",
      'Certaines données ont pu être enregistrées — vérifie ton profil puis réessaie.',
    )
  } finally {
    applyingImport.value = false
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-6 py-10">
    <!-- ── En-tête de page ── -->
    <header>
      <h1 class="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">Mon profil</h1>
      <p class="mt-2 max-w-2xl text-sm leading-relaxed text-ink-500 sm:text-base">
        Tes informations réelles, la matière première de tous tes CV. Plus ton profil est complet,
        plus tes CV seront pertinents.
      </p>
    </header>

    <!-- ── Chargement initial : skeleton épousant les sections ── -->
    <div v-if="isLoading" class="mt-8 space-y-6" role="status">
      <span class="sr-only">Chargement de ton profil…</span>
      <div class="rounded-card bg-surface p-6 shadow-card ring-1 ring-border">
        <UiSkeleton class="mb-5 h-5 w-40" />
        <div class="space-y-3">
          <UiSkeleton class="h-10 w-full" />
          <UiSkeleton class="h-24 w-full" />
          <UiSkeleton class="h-10 w-36" />
        </div>
      </div>
      <div class="rounded-card bg-surface p-6 shadow-card ring-1 ring-border">
        <UiSkeleton class="mb-5 h-5 w-32" />
        <div class="space-y-3">
          <UiSkeleton class="h-16 w-full" />
          <UiSkeleton class="h-16 w-full" />
        </div>
      </div>
      <div class="rounded-card bg-surface p-6 shadow-card ring-1 ring-border">
        <UiSkeleton class="mb-5 h-5 w-36" />
        <div class="flex flex-wrap gap-2">
          <UiSkeleton class="h-7 w-24 rounded-full" />
          <UiSkeleton class="h-7 w-20 rounded-full" />
          <UiSkeleton class="h-7 w-28 rounded-full" />
          <UiSkeleton class="h-7 w-16 rounded-full" />
        </div>
      </div>
    </div>

    <!-- ── Erreur de chargement ── -->
    <UiState
      v-else-if="error"
      variant="error"
      title="Impossible de charger ton profil"
      description="Une erreur est survenue. Vérifie ta connexion puis réessaie."
      class="mt-8"
    >
      <UiButton variant="secondary" @click="refresh()">Réessayer</UiButton>
    </UiState>

    <!-- ── Contenu : édition à gauche, rail sticky à droite ── -->
    <div v-else class="mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-8">
      <div class="min-w-0 space-y-10">
        <!-- En-tête du profil -->
        <section class="space-y-4" aria-labelledby="section-entete">
          <div class="flex items-center gap-3">
            <div
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-brand-50 text-brand-600"
              aria-hidden="true"
            >
              <UserRound class="h-5 w-5" :stroke-width="1.75" />
            </div>
            <div>
              <h2 id="section-entete" class="text-lg font-semibold text-ink-900">
                En-tête du profil
              </h2>
              <p class="text-sm text-ink-500">
                Ton intitulé et ton accroche, repris en haut de tes CV.
              </p>
            </div>
          </div>

          <UiCard>
            <form class="space-y-4" @submit.prevent="saveHeader">
              <UiInput
                v-model="headline"
                label="Intitulé de poste"
                placeholder="ex. Développeur Full-Stack Vue / Node"
              />
              <UiTextarea
                v-model="summary"
                label="Résumé / accroche"
                :rows="4"
                placeholder="Quelques phrases sur ton parcours et tes ambitions…"
              />
              <div class="flex justify-end">
                <UiButton type="submit" :loading="savingHeader">Enregistrer</UiButton>
              </div>
            </form>
          </UiCard>
        </section>

        <!-- Expériences -->
        <section class="space-y-4" aria-labelledby="section-experiences">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-brand-50 text-brand-600"
                aria-hidden="true"
              >
                <Briefcase class="h-5 w-5" :stroke-width="1.75" />
              </div>
              <div>
                <h2 id="section-experiences" class="text-lg font-semibold text-ink-900">
                  Expériences
                </h2>
                <p class="text-sm text-ink-500">Tes postes passés et actuels.</p>
              </div>
            </div>
            <UiButton v-if="!showExpForm" variant="secondary" size="sm" @click="showExpForm = true">
              <Plus class="h-4 w-4" :stroke-width="2" aria-hidden="true" />
              Ajouter une expérience
            </UiButton>
          </div>

          <ul v-if="profile?.experiences.length" class="space-y-3">
            <li
              v-for="exp in profile.experiences"
              :key="exp.id"
              class="flex items-start justify-between gap-4 rounded-card bg-surface p-4 shadow-xs ring-1 ring-border transition-shadow duration-300 ease-out hover:shadow-card-hover sm:p-5"
            >
              <div class="min-w-0">
                <p class="font-semibold text-ink-900">{{ exp.title }}</p>
                <p class="text-sm text-ink-600">{{ exp.company }}</p>
                <p v-if="formatPeriod(exp)" class="mt-0.5 text-sm text-ink-500">
                  {{ formatPeriod(exp) }}
                </p>
                <p
                  v-if="exp.description"
                  class="mt-2 text-sm leading-relaxed text-ink-600 line-clamp-3"
                >
                  {{ exp.description }}
                </p>
                <ul v-if="exp.skillsUsed.length" class="mt-2.5 flex flex-wrap gap-1.5">
                  <li v-for="s in exp.skillsUsed" :key="s">
                    <UiBadge variant="neutral">{{ s }}</UiBadge>
                  </li>
                </ul>
              </div>
              <button
                type="button"
                class="shrink-0 rounded-control p-2 text-ink-400 transition-colors duration-300 ease-out hover:bg-danger-50 hover:text-danger-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-500"
                :aria-label="`Supprimer l'expérience ${exp.title}`"
                @click="askDeleteExperience(exp)"
              >
                <Trash2 class="h-4 w-4" :stroke-width="1.75" aria-hidden="true" />
              </button>
            </li>
          </ul>
          <div
            v-else-if="!showExpForm"
            class="flex flex-col items-center gap-2 rounded-card border border-dashed border-border-strong bg-surface px-6 py-8 text-center"
          >
            <Briefcase class="h-6 w-6 text-ink-400" :stroke-width="1.75" aria-hidden="true" />
            <p class="max-w-sm text-sm text-ink-500">
              Aucune expérience pour l'instant. Ajoute ta première expérience : c'est elle qui
              nourrira tes CV.
            </p>
          </div>

          <UiCard v-if="showExpForm" class="animate-fade-up">
            <form class="space-y-4" @submit.prevent="addExperience">
              <UiInput
                v-model="expForm.title"
                label="Intitulé du poste"
                required
                placeholder="ex. Chargée de clientèle"
              />
              <UiInput
                v-model="expForm.company"
                label="Entreprise"
                required
                placeholder="ex. Acme"
              />
              <div class="grid gap-4 sm:grid-cols-2">
                <UiInput v-model="expForm.startDate" type="date" label="Date de début" />
                <UiInput
                  v-model="expForm.endDate"
                  type="date"
                  label="Date de fin"
                  hint="Laisse vide si c'est ton poste actuel."
                />
              </div>
              <UiTextarea
                v-model="expForm.description"
                label="Description"
                :rows="3"
                placeholder="Missions, résultats, contexte… (optionnel)"
              />
              <UiInput
                v-model="expForm.skillsUsed"
                label="Compétences mobilisées"
                placeholder="ex. Relation client, Excel, Anglais"
                hint="Sépare-les par des virgules."
              />
              <div class="flex flex-wrap justify-end gap-3">
                <UiButton variant="ghost" :disabled="addingExp" @click="showExpForm = false">
                  Annuler
                </UiButton>
                <UiButton
                  type="submit"
                  :loading="addingExp"
                  :disabled="!expForm.title.trim() || !expForm.company.trim()"
                >
                  Ajouter l'expérience
                </UiButton>
              </div>
            </form>
          </UiCard>
        </section>

        <!-- Compétences -->
        <section class="space-y-4" aria-labelledby="section-competences">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-brand-50 text-brand-600"
                aria-hidden="true"
              >
                <Wrench class="h-5 w-5" :stroke-width="1.75" />
              </div>
              <div>
                <h2 id="section-competences" class="text-lg font-semibold text-ink-900">
                  Compétences
                </h2>
                <p class="text-sm text-ink-500">
                  Uniquement tes compétences réelles : elles font foi pour la génération de tes CV.
                </p>
              </div>
            </div>
            <UiButton
              v-if="!showSkillForm"
              variant="secondary"
              size="sm"
              @click="showSkillForm = true"
            >
              <Plus class="h-4 w-4" :stroke-width="2" aria-hidden="true" />
              Ajouter une compétence
            </UiButton>
          </div>

          <ul v-if="profile?.skills.length" class="flex flex-wrap gap-2">
            <li v-for="sk in profile.skills" :key="sk.id">
              <UiBadge variant="brand" class="group pr-1.5">
                <span>{{ sk.label }}</span>
                <span v-if="sk.level" class="font-normal text-brand-500">
                  · {{ SKILL_LEVEL_LABELS[sk.level] }}
                </span>
                <button
                  type="button"
                  class="-my-1.5 ml-0.5 rounded-full p-1.5 text-brand-500 transition-colors duration-300 ease-out hover:bg-brand-100 hover:text-danger-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 group-hover:text-brand-600"
                  :aria-label="`Supprimer la compétence ${sk.label}`"
                  @click="askDeleteSkill(sk)"
                >
                  <X class="h-3.5 w-3.5" :stroke-width="2" aria-hidden="true" />
                </button>
              </UiBadge>
            </li>
          </ul>
          <div
            v-else-if="!showSkillForm"
            class="flex flex-col items-center gap-2 rounded-card border border-dashed border-border-strong bg-surface px-6 py-8 text-center"
          >
            <Wrench class="h-6 w-6 text-ink-400" :stroke-width="1.75" aria-hidden="true" />
            <p class="max-w-sm text-sm text-ink-500">
              Aucune compétence pour l'instant. Ajoute celles que tu maîtrises vraiment.
            </p>
          </div>

          <UiCard v-if="showSkillForm" class="animate-fade-up">
            <form class="space-y-4" @submit.prevent="addSkill">
              <UiInput
                v-model="skillForm.label"
                label="Compétence"
                required
                placeholder="ex. Gestion de projet"
              />
              <div class="grid gap-4 sm:grid-cols-2">
                <div class="flex flex-col gap-1.5">
                  <label :for="levelSelectId" class="text-sm font-medium text-ink-700"
                    >Niveau</label
                  >
                  <select
                    :id="levelSelectId"
                    v-model="skillForm.level"
                    class="h-10 w-full rounded-control bg-surface px-3 text-sm text-ink-900 ring-1 ring-border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    <option value="">Non précisé</option>
                    <option v-for="l in SKILL_LEVELS" :key="l" :value="l">
                      {{ SKILL_LEVEL_LABELS[l] }}
                    </option>
                  </select>
                </div>
                <div class="flex flex-col gap-1.5">
                  <label :for="yearsInputId" class="text-sm font-medium text-ink-700">
                    Années de pratique
                  </label>
                  <input
                    :id="yearsInputId"
                    v-model="skillForm.years"
                    type="number"
                    min="0"
                    max="50"
                    placeholder="ex. 3"
                    class="h-10 w-full rounded-control bg-surface px-3 text-sm text-ink-900 ring-1 ring-border transition placeholder:text-ink-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  />
                </div>
              </div>
              <div class="flex flex-wrap justify-end gap-3">
                <UiButton variant="ghost" :disabled="addingSkill" @click="showSkillForm = false">
                  Annuler
                </UiButton>
                <UiButton type="submit" :loading="addingSkill" :disabled="!skillForm.label.trim()">
                  Ajouter la compétence
                </UiButton>
              </div>
            </form>
          </UiCard>
        </section>

        <!-- Import copier-coller -->
        <section class="space-y-4" aria-labelledby="section-import">
          <div class="flex items-center gap-3">
            <div
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-brand-50 text-brand-600"
              aria-hidden="true"
            >
              <ClipboardPaste class="h-5 w-5" :stroke-width="1.75" />
            </div>
            <div>
              <h2 id="section-import" class="text-lg font-semibold text-ink-900">Import express</h2>
              <p class="text-sm text-ink-500">
                Colle le texte de ton CV ou de ton profil LinkedIn : on te propose une suggestion à
                relire. Rien n'est enregistré sans ta confirmation.
              </p>
            </div>
          </div>

          <UiCard>
            <form class="space-y-4" @submit.prevent="doParse">
              <UiTextarea
                v-model="pasteText"
                label="Texte de ton CV ou profil LinkedIn"
                :rows="8"
                placeholder="Colle ici ton CV ou ton profil LinkedIn en texte brut…"
              />
              <div class="flex justify-end">
                <UiButton
                  type="submit"
                  variant="secondary"
                  :loading="parsing"
                  :disabled="pasteText.length < 10"
                >
                  Analyser le texte
                </UiButton>
              </div>
            </form>

            <!-- Relecture avant enregistrement -->
            <div
              v-if="importResult"
              class="mt-4 animate-fade-up space-y-4 rounded-card bg-brand-50 p-4 ring-1 ring-brand-200 sm:p-5"
            >
              <div class="flex flex-wrap items-center gap-2">
                <UiBadge variant="brand">Relecture</UiBadge>
                <p class="text-sm font-medium text-brand-700">
                  Vérifie la suggestion : rien n'est encore enregistré.
                </p>
              </div>

              <p v-if="importResult.headline" class="text-sm text-ink-700">
                <span class="font-semibold">Intitulé :</span> {{ importResult.headline }}
              </p>
              <p v-if="importResult.summary" class="text-sm leading-relaxed text-ink-700">
                <span class="font-semibold">Résumé :</span> {{ importResult.summary }}
              </p>

              <div v-if="importResult.experiences.length" class="space-y-1.5">
                <p class="text-sm font-semibold text-ink-700">
                  {{ importResult.experiences.length }}
                  {{
                    importResult.experiences.length > 1
                      ? 'expériences détectées'
                      : 'expérience détectée'
                  }}
                </p>
                <ul class="space-y-1">
                  <li
                    v-for="(e, i) in importResult.experiences"
                    :key="i"
                    class="flex items-center gap-2 text-sm text-ink-600"
                  >
                    <Briefcase
                      class="h-3.5 w-3.5 shrink-0 text-brand-500"
                      :stroke-width="1.75"
                      aria-hidden="true"
                    />
                    {{ e.title }} — {{ e.company }}
                  </li>
                </ul>
              </div>

              <div v-if="importResult.skills.length" class="space-y-1.5">
                <p class="text-sm font-semibold text-ink-700">
                  {{ importResult.skills.length }}
                  {{
                    importResult.skills.length > 1 ? 'compétences détectées' : 'compétence détectée'
                  }}
                </p>
                <ul class="flex flex-wrap gap-1.5">
                  <li v-for="(s, i) in importResult.skills" :key="i">
                    <UiBadge variant="neutral">{{ s.label }}</UiBadge>
                  </li>
                </ul>
              </div>

              <div class="flex flex-wrap justify-end gap-3 pt-1">
                <UiButton variant="ghost" :disabled="applyingImport" @click="importResult = null">
                  Annuler
                </UiButton>
                <UiButton :loading="applyingImport" @click="applyImport">
                  Confirmer et enregistrer
                </UiButton>
              </div>
            </div>
          </UiCard>
        </section>
      </div>

      <!-- Rail latéral : progression + repère honnêteté, sticky au scroll -->
      <aside class="mt-10 space-y-4 lg:mt-0 lg:sticky lg:top-24">
        <div class="rounded-card bg-surface p-5 shadow-card ring-1 ring-border">
          <h2 class="text-sm font-semibold text-ink-900">Ton profil en bref</h2>
          <dl class="mt-3 space-y-2.5">
            <div class="flex items-center justify-between">
              <dt class="flex items-center gap-2 text-sm text-ink-600">
                <Briefcase class="h-4 w-4 text-brand-600" :stroke-width="1.75" aria-hidden="true" />
                Expériences
              </dt>
              <dd class="text-sm font-semibold tabular-nums text-ink-900">{{ expCount }}</dd>
            </div>
            <div class="flex items-center justify-between">
              <dt class="flex items-center gap-2 text-sm text-ink-600">
                <Wrench class="h-4 w-4 text-brand-600" :stroke-width="1.75" aria-hidden="true" />
                Compétences
              </dt>
              <dd class="text-sm font-semibold tabular-nums text-ink-900">{{ skillCount }}</dd>
            </div>
          </dl>
          <p class="mt-3 text-xs leading-relaxed text-ink-500">
            Plus ton profil est complet, plus tes CV générés seront pertinents.
          </p>
        </div>

        <div class="rounded-card bg-brand-50 p-5 ring-1 ring-brand-100">
          <div class="flex items-center gap-2 text-brand-700">
            <ShieldCheck class="h-5 w-5 shrink-0" :stroke-width="1.75" aria-hidden="true" />
            <p class="text-sm font-semibold">Toujours honnête</p>
          </div>
          <p class="mt-2 text-sm leading-relaxed text-brand-900/80">
            Teven ne s'invente jamais de compétences : il hiérarchise et reformule ce que tu as
            réellement fait.
          </p>
          <NuxtLink
            to="/cv/demo"
            class="mt-3 inline-flex items-center gap-1 rounded text-sm font-semibold text-brand-700 transition-colors duration-300 ease-out hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            Voir un exemple de CV
            <ArrowRight class="h-4 w-4" :stroke-width="2" aria-hidden="true" />
          </NuxtLink>
        </div>
      </aside>
    </div>

    <!-- ── Confirmation de suppression ── -->
    <UiDialog
      v-model:open="deleteDialogOpen"
      :title="deleteDialogTitle"
      :description="deleteDialogDescription"
      confirm-label="Supprimer"
      variant="danger"
      :loading="deleting"
      @confirm="confirmDelete"
    />
  </div>
</template>

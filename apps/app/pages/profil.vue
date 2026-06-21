<script setup lang="ts">
import type {
  ProfileDTO,
  ExperienceDTO,
  SkillDTO,
  SkillLevel,
  LanguageDTO,
  LanguageLevel,
  EducationDTO,
  CvDesign,
  ParsedCvProfile,
} from '@cvo/shared'
import { SKILL_LEVELS, LANGUAGE_LEVELS } from '@cvo/shared'
import {
  Plus,
  Trash2,
  X,
  Briefcase,
  Wrench,
  Globe,
  GraduationCap,
  ClipboardPaste,
  UserRound,
  ShieldCheck,
  ArrowRight,
  FileText,
  Upload,
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
const languageCount = computed(() => profile.value?.languages.length ?? 0)
const educationCount = computed(() => profile.value?.education.length ?? 0)

// ─── Formulaire en-tête ──────────────────────────────────────────────────────

const fullName = ref('')
const email = ref('')
const phone = ref('')
const location = ref('')
const linksText = ref('') // liens séparés par des virgules (UI) → string[] (API)
const headline = ref('')
const summary = ref('')
const keySkills = ref<string[]>([]) // phrases « compétences clés » (verbe d'action)
let headerSynced = false

const KEY_SKILLS_MAX = 8
function addKeySkill() {
  if (keySkills.value.length >= KEY_SKILLS_MAX) {
    toast.error('Maximum atteint', `${KEY_SKILLS_MAX} compétences clés au maximum.`)
    return
  }
  keySkills.value.push('')
}
function removeKeySkill(i: number) {
  keySkills.value.splice(i, 1)
}

// Pré-remplit le formulaire dès la première arrivée des données (fetch lazy),
// sans écraser une saisie en cours lors des refresh suivants.
watch(
  data,
  (p) => {
    if (p && !headerSynced) {
      fullName.value = p.fullName ?? ''
      email.value = p.email ?? ''
      phone.value = p.phone ?? ''
      location.value = p.location ?? ''
      linksText.value = (p.links ?? []).join(', ')
      headline.value = p.headline ?? ''
      summary.value = p.summary ?? ''
      keySkills.value = [...(p.keySkills ?? [])]
      headerSynced = true
    }
  },
  { immediate: true },
)

const savingHeader = ref(false)

async function saveHeader() {
  savingHeader.value = true
  try {
    const links = linksText.value
      .split(',')
      .map((l) => l.trim())
      .filter(Boolean)
    const res = await $fetch<ProfileDTO>('/api/profile', {
      method: 'PUT',
      body: {
        fullName: fullName.value.trim() || null,
        email: email.value.trim() || null,
        phone: phone.value.trim() || null,
        location: location.value.trim() || null,
        links,
        keySkills: keySkills.value.map((s) => s.trim()).filter(Boolean),
        headline: headline.value || null,
        summary: summary.value || null,
      },
    })
    data.value = res
    toast.success('En-tête enregistré', 'Ton identité et ton résumé sont à jour.')
  } catch {
    toast.error("L'enregistrement a échoué", 'Vérifie ton nom et ton e-mail, puis réessaie.')
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

// ─── Langues ─────────────────────────────────────────────────────────────────

const LANGUAGE_LEVEL_LABELS: Record<LanguageLevel, string> = {
  A1: 'A1 (Débutant)',
  A2: 'A2 (Élémentaire)',
  B1: 'B1 (Intermédiaire)',
  B2: 'B2 (Avancé)',
  C1: 'C1 (Autonome)',
  C2: 'C2 (Maîtrise)',
  NATIVE: 'Natif',
}

const showLanguageForm = ref(false)
const addingLanguage = ref(false)
const languageForm = reactive({ label: '', level: '' as string })

const languageLevelSelectId = useId()

async function addLanguage() {
  addingLanguage.value = true
  try {
    await $fetch('/api/profile/languages', {
      method: 'POST',
      body: {
        label: languageForm.label,
        level: languageForm.level || null,
      },
    })
    Object.assign(languageForm, { label: '', level: '' })
    await refresh()
    toast.success('Langue ajoutée')
  } catch {
    toast.error("L'ajout a échoué", 'Vérifie ta connexion puis réessaie.')
  } finally {
    addingLanguage.value = false
  }
}

// ─── Formations ──────────────────────────────────────────────────────────────

const showEduForm = ref(false)
const addingEdu = ref(false)
const eduForm = reactive({ degree: '', school: '', startDate: '', endDate: '', description: '' })

function resetEduForm() {
  Object.assign(eduForm, { degree: '', school: '', startDate: '', endDate: '', description: '' })
}

function formatEduPeriod(ed: EducationDTO): string | null {
  if (!ed.startDate && !ed.endDate) return null
  const end = ed.endDate ? periodFormatter.format(new Date(ed.endDate)) : "aujourd'hui"
  if (!ed.startDate) return end
  return `${periodFormatter.format(new Date(ed.startDate))} – ${end}`
}

async function addEducation() {
  addingEdu.value = true
  try {
    await $fetch('/api/profile/education', {
      method: 'POST',
      body: {
        degree: eduForm.degree,
        school: eduForm.school,
        startDate: eduForm.startDate ? new Date(eduForm.startDate).toISOString() : null,
        endDate: eduForm.endDate ? new Date(eduForm.endDate).toISOString() : null,
        description: eduForm.description || null,
      },
    })
    resetEduForm()
    showEduForm.value = false
    await refresh()
    toast.success('Formation ajoutée', 'Elle apparaît maintenant dans ton profil.')
  } catch {
    toast.error("L'ajout a échoué", 'Vérifie ta connexion puis réessaie.')
  } finally {
    addingEdu.value = false
  }
}

// ─── Suppressions (avec confirmation) ────────────────────────────────────────

type DeleteTarget = {
  kind: 'experience' | 'skill' | 'language' | 'education'
  id: string
  label: string
}

const deleteTarget = ref<DeleteTarget | null>(null)
const deleteDialogOpen = ref(false)
const deleting = ref(false)

const deleteDialogTitle = computed(() => {
  switch (deleteTarget.value?.kind) {
    case 'skill':
      return 'Supprimer cette compétence ?'
    case 'language':
      return 'Supprimer cette langue ?'
    case 'education':
      return 'Supprimer cette formation ?'
    default:
      return 'Supprimer cette expérience ?'
  }
})
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

function askDeleteLanguage(lang: LanguageDTO) {
  deleteTarget.value = { kind: 'language', id: lang.id, label: lang.label }
  deleteDialogOpen.value = true
}

function askDeleteEducation(ed: EducationDTO) {
  deleteTarget.value = { kind: 'education', id: ed.id, label: `${ed.degree} — ${ed.school}` }
  deleteDialogOpen.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    const { kind, id } = deleteTarget.value
    const resource = {
      experience: 'experiences',
      skill: 'skills',
      language: 'languages',
      education: 'education',
    }[kind]
    await $fetch(`/api/profile/${resource}/${id}`, { method: 'DELETE' })
    await refresh()
    deleteDialogOpen.value = false
    const successLabel = {
      experience: 'Expérience supprimée',
      skill: 'Compétence supprimée',
      language: 'Langue supprimée',
      education: 'Formation supprimée',
    }[kind]
    toast.success(successLabel)
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

// ─── Dédup d'import : ne créer QUE les éléments absents du profil ────────────
// Réimporter le même CV ne doit pas dupliquer. Comparaison insensible à la casse
// et aux accents ; on dédoublonne aussi à l'intérieur d'un même lot d'import.
function normKey(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()
}
const expKey = (title: string, company: string) => `${normKey(title)}|${normKey(company)}`
const eduKey = (degree: string, school: string) => `${normKey(degree)}|${normKey(school)}`

async function applyImport() {
  if (!importResult.value) return
  applyingImport.value = true
  try {
    const r = importResult.value
    await $fetch('/api/profile', {
      method: 'PUT',
      body: { headline: r.headline, summary: r.summary },
    })
    const seenExp = new Set(
      (profile.value?.experiences ?? []).map((e) => expKey(e.title, e.company)),
    )
    const seenSkills = new Set((profile.value?.skills ?? []).map((s) => normKey(s.label)))
    for (const exp of r.experiences) {
      const key = expKey(exp.title, exp.company)
      if (!exp.title.trim() || !exp.company.trim() || seenExp.has(key)) continue
      seenExp.add(key)
      await $fetch('/api/profile/experiences', { method: 'POST', body: exp })
    }
    for (const sk of r.skills) {
      const key = normKey(sk.label)
      if (!sk.label.trim() || seenSkills.has(key)) continue
      seenSkills.add(key)
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

// ─── CV de base (capture de DA depuis un PDF) ─────────────────────────────────

const baseDesign = computed<CvDesign | null>(() => profile.value?.baseCvDesign ?? null)
const extractingDesign = ref(false)
const savingDesign = ref(false)
const removingDesign = ref(false)
const designPreview = ref<CvDesign | null>(null)
const parsedPreview = ref<ParsedCvProfile | null>(null)
const cvFileInput = ref<HTMLInputElement | null>(null)

function triggerCvUpload() {
  cvFileInput.value?.click()
}

function clearCvPreview() {
  designPreview.value = null
  parsedPreview.value = null
}

// Édition de la proposition avant écriture (l'utilisateur reste la source de vérité).
const parsedLinksText = computed<string>({
  get: () => parsedPreview.value?.links.join(', ') ?? '',
  set: (v) => {
    if (parsedPreview.value) {
      parsedPreview.value.links = v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    }
  },
})
function removeParsedExperience(i: number) {
  parsedPreview.value?.experiences.splice(i, 1)
}
function removeParsedEducation(i: number) {
  parsedPreview.value?.education.splice(i, 1)
}
function removeParsedSkill(i: number) {
  parsedPreview.value?.skills.splice(i, 1)
}
function removeParsedLanguage(i: number) {
  parsedPreview.value?.languages.splice(i, 1)
}

/** Convertit une date "YYYY-MM"/"YYYY-MM-DD" en ISO (ou null) pour les POST. */
function toIsoOrNull(value: string | null): string | null {
  if (!value) return null
  const d = new Date(value.length === 7 ? `${value}-01` : value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

async function extractDesign(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (file.type !== 'application/pdf') {
    toast.error('Format invalide', 'Choisis un fichier PDF.')
    input.value = ''
    return
  }
  extractingDesign.value = true
  clearCvPreview()
  try {
    const form = new FormData()
    form.append('file', file)
    const res = await $fetch<{ design: CvDesign; parsed: ParsedCvProfile }>(
      '/api/profile/cv-design/extract',
      { method: 'POST', body: form },
    )
    designPreview.value = res.design
    parsedPreview.value = res.parsed
  } catch {
    toast.error("L'analyse du CV a échoué", 'Réessaie dans un instant, ou avec un autre PDF.')
  } finally {
    extractingDesign.value = false
    input.value = '' // permet de re-sélectionner le même fichier
  }
}

/**
 * Confirme l'import : enregistre le design + complète le profil depuis le PDF.
 * Identité/intitulé/résumé : on ne remplit que les champs ENCORE VIDES (pas de
 * clobber). Expériences / compétences / langues : ajoutées (additif).
 */
async function saveDesign() {
  if (!designPreview.value) return
  savingDesign.value = true
  try {
    await $fetch('/api/profile/cv-design', { method: 'PUT', body: designPreview.value })

    const p = parsedPreview.value
    if (p) {
      // En-tête : remplir seulement les champs vides côté formulaire.
      const headerPatch: Record<string, unknown> = {}
      if (!fullName.value.trim() && p.fullName) headerPatch.fullName = p.fullName
      if (!email.value.trim() && p.email) headerPatch.email = p.email
      if (!phone.value.trim() && p.phone) headerPatch.phone = p.phone
      if (!location.value.trim() && p.location) headerPatch.location = p.location
      if (!linksText.value.trim() && p.links.length) headerPatch.links = p.links
      if (!headline.value.trim() && p.headline) headerPatch.headline = p.headline
      if (!summary.value.trim() && p.summary) headerPatch.summary = p.summary
      if (!keySkills.value.length && p.keySkills.length) headerPatch.keySkills = p.keySkills
      if (Object.keys(headerPatch).length) {
        await $fetch('/api/profile', { method: 'PUT', body: headerPatch })
      }

      // Listes : ajout (additif) MAIS sans doublon — on ne crée que ce qui n'existe
      // pas déjà (comparaison normalisée), et on dédoublonne au sein du lot importé.
      // On saute aussi les entrées dont un champ requis est vide (sinon POST 400).
      const seenExp = new Set(
        (profile.value?.experiences ?? []).map((e) => expKey(e.title, e.company)),
      )
      for (const exp of p.experiences) {
        if (!exp.title.trim() || !exp.company.trim()) continue
        const key = expKey(exp.title, exp.company)
        if (seenExp.has(key)) continue
        seenExp.add(key)
        await $fetch('/api/profile/experiences', {
          method: 'POST',
          body: {
            title: exp.title,
            company: exp.company,
            startDate: toIsoOrNull(exp.startDate),
            endDate: toIsoOrNull(exp.endDate),
            description: exp.description || null,
            skillsUsed: exp.skillsUsed,
          },
        })
      }
      const seenEdu = new Set(
        (profile.value?.education ?? []).map((e) => eduKey(e.degree, e.school)),
      )
      for (const ed of p.education) {
        if (!ed.degree.trim() || !ed.school.trim()) continue
        const key = eduKey(ed.degree, ed.school)
        if (seenEdu.has(key)) continue
        seenEdu.add(key)
        await $fetch('/api/profile/education', {
          method: 'POST',
          body: {
            degree: ed.degree,
            school: ed.school,
            startDate: toIsoOrNull(ed.startDate),
            endDate: toIsoOrNull(ed.endDate),
            description: ed.description || null,
          },
        })
      }
      const seenSkills = new Set((profile.value?.skills ?? []).map((s) => normKey(s.label)))
      for (const sk of p.skills) {
        if (!sk.label.trim()) continue
        const key = normKey(sk.label)
        if (seenSkills.has(key)) continue
        seenSkills.add(key)
        await $fetch('/api/profile/skills', {
          method: 'POST',
          body: { label: sk.label, level: sk.level, years: sk.years },
        })
      }
      const seenLang = new Set((profile.value?.languages ?? []).map((l) => normKey(l.label)))
      for (const lang of p.languages) {
        if (!lang.label.trim()) continue
        const key = normKey(lang.label)
        if (seenLang.has(key)) continue
        seenLang.add(key)
        await $fetch('/api/profile/languages', {
          method: 'POST',
          body: { label: lang.label, level: lang.level },
        })
      }
    }

    clearCvPreview()
    await refresh()
    // Re-synchronise le formulaire en-tête avec les valeurs fraîchement importées.
    headerSynced = false
    const fresh = profile.value
    if (fresh) {
      fullName.value = fresh.fullName ?? ''
      email.value = fresh.email ?? ''
      phone.value = fresh.phone ?? ''
      location.value = fresh.location ?? ''
      linksText.value = (fresh.links ?? []).join(', ')
      headline.value = fresh.headline ?? ''
      summary.value = fresh.summary ?? ''
      keySkills.value = [...(fresh.keySkills ?? [])]
      headerSynced = true
    }
    toast.success('CV importé', 'Design appliqué et profil complété depuis ton CV.')
  } catch {
    await refresh()
    toast.error(
      "L'import a échoué",
      'Certaines données ont pu être enregistrées — vérifie ton profil puis réessaie.',
    )
  } finally {
    savingDesign.value = false
  }
}

async function removeDesign() {
  removingDesign.value = true
  try {
    await $fetch('/api/profile/cv-design', { method: 'DELETE' })
    await refresh()
    toast.success('Design retiré', 'Tes CV utiliseront de nouveau le modèle par défaut.')
  } catch {
    toast.error('La suppression a échoué', 'Vérifie ta connexion puis réessaie.')
  } finally {
    removingDesign.value = false
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
                Ton identité, ton intitulé et ton accroche, repris en haut de tes CV.
              </p>
            </div>
          </div>

          <UiCard>
            <form class="space-y-4" @submit.prevent="saveHeader">
              <UiInput
                v-model="fullName"
                label="Nom complet"
                required
                placeholder="ex. Camille Martin"
                hint="Affiché en tête de tes CV."
              />
              <div class="grid gap-4 sm:grid-cols-2">
                <UiInput
                  v-model="email"
                  type="email"
                  label="E-mail de contact"
                  placeholder="ex. camille.martin@email.fr"
                  hint="Par défaut, l'e-mail de ton compte."
                />
                <UiInput v-model="phone" label="Téléphone" placeholder="ex. 06 12 34 56 78" />
              </div>
              <UiInput v-model="location" label="Localisation" placeholder="ex. Paris, France" />
              <UiInput
                v-model="linksText"
                label="Liens"
                placeholder="ex. https://linkedin.com/in/…, https://github.com/…"
                hint="Sépare-les par des virgules (portfolio, LinkedIn, GitHub…)."
              />
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

              <!-- Compétences clés : phrases (verbe d'action), section au-dessus des expériences du CV -->
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium text-ink-700"
                    >Compétences clés · {{ keySkills.length }}/{{ KEY_SKILLS_MAX }}</span
                  >
                  <span class="text-xs text-ink-400">Commence par un verbe d'action</span>
                </div>
                <div v-for="(_, i) in keySkills" :key="i" class="flex items-start gap-2">
                  <div class="flex-1">
                    <UiTextarea
                      v-model="keySkills[i]"
                      label=""
                      :rows="2"
                      :maxlength="300"
                      placeholder="ex. Concevoir des applications web performantes en Vue 3 / TypeScript"
                    />
                  </div>
                  <button
                    type="button"
                    class="mt-1 shrink-0 rounded-control p-2 text-ink-400 hover:bg-danger-50 hover:text-danger-600"
                    aria-label="Retirer la compétence clé"
                    @click="removeKeySkill(i)"
                  >
                    <X class="h-4 w-4" :stroke-width="2" aria-hidden="true" />
                  </button>
                </div>
                <UiButton
                  variant="secondary"
                  size="sm"
                  type="button"
                  :disabled="keySkills.length >= KEY_SKILLS_MAX"
                  @click="addKeySkill"
                >
                  <Plus class="h-4 w-4" :stroke-width="2" aria-hidden="true" /> Ajouter une phrase
                </UiButton>
              </div>

              <div class="flex justify-end">
                <UiButton type="submit" :loading="savingHeader" :disabled="!fullName.trim()">
                  Enregistrer
                </UiButton>
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

        <!-- Formations -->
        <section class="space-y-4" aria-labelledby="section-formations">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-brand-50 text-brand-600"
                aria-hidden="true"
              >
                <GraduationCap class="h-5 w-5" :stroke-width="1.75" />
              </div>
              <div>
                <h2 id="section-formations" class="text-lg font-semibold text-ink-900">
                  Formations
                </h2>
                <p class="text-sm text-ink-500">Tes diplômes et formations.</p>
              </div>
            </div>
            <UiButton v-if="!showEduForm" variant="secondary" size="sm" @click="showEduForm = true">
              <Plus class="h-4 w-4" :stroke-width="2" aria-hidden="true" />
              Ajouter une formation
            </UiButton>
          </div>

          <ul v-if="profile?.education.length" class="space-y-3">
            <li
              v-for="ed in profile.education"
              :key="ed.id"
              class="flex items-start justify-between gap-4 rounded-card bg-surface p-4 shadow-xs ring-1 ring-border transition-shadow duration-300 ease-out hover:shadow-card-hover sm:p-5"
            >
              <div class="min-w-0">
                <p class="font-semibold text-ink-900">{{ ed.degree }}</p>
                <p class="text-sm text-ink-600">{{ ed.school }}</p>
                <p v-if="formatEduPeriod(ed)" class="mt-0.5 text-sm text-ink-500">
                  {{ formatEduPeriod(ed) }}
                </p>
                <p
                  v-if="ed.description"
                  class="mt-2 text-sm leading-relaxed text-ink-600 line-clamp-3"
                >
                  {{ ed.description }}
                </p>
              </div>
              <button
                type="button"
                class="shrink-0 rounded-control p-2 text-ink-400 transition-colors duration-300 ease-out hover:bg-danger-50 hover:text-danger-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-500"
                :aria-label="`Supprimer la formation ${ed.degree}`"
                @click="askDeleteEducation(ed)"
              >
                <Trash2 class="h-4 w-4" :stroke-width="1.75" aria-hidden="true" />
              </button>
            </li>
          </ul>
          <div
            v-else-if="!showEduForm"
            class="flex flex-col items-center gap-2 rounded-card border border-dashed border-border-strong bg-surface px-6 py-8 text-center"
          >
            <GraduationCap class="h-6 w-6 text-ink-400" :stroke-width="1.75" aria-hidden="true" />
            <p class="max-w-sm text-sm text-ink-500">
              Aucune formation pour l'instant. Ajoute tes diplômes et titres.
            </p>
          </div>

          <UiCard v-if="showEduForm" class="animate-fade-up">
            <form class="space-y-4" @submit.prevent="addEducation">
              <UiInput
                v-model="eduForm.degree"
                label="Diplôme / titre"
                required
                placeholder="ex. Titre RNCP Développeur web"
              />
              <UiInput
                v-model="eduForm.school"
                label="Établissement"
                required
                placeholder="ex. Donkey School"
              />
              <div class="grid gap-4 sm:grid-cols-2">
                <UiInput v-model="eduForm.startDate" type="date" label="Date de début" />
                <UiInput v-model="eduForm.endDate" type="date" label="Date de fin" />
              </div>
              <UiTextarea
                v-model="eduForm.description"
                label="Description"
                :rows="3"
                placeholder="Projets, mentions… (optionnel)"
              />
              <div class="flex flex-wrap justify-end gap-3">
                <UiButton variant="ghost" :disabled="addingEdu" @click="showEduForm = false">
                  Annuler
                </UiButton>
                <UiButton
                  type="submit"
                  :loading="addingEdu"
                  :disabled="!eduForm.degree.trim() || !eduForm.school.trim()"
                >
                  Ajouter la formation
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

        <!-- Langues -->
        <section class="space-y-4" aria-labelledby="section-langues">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-brand-50 text-brand-600"
                aria-hidden="true"
              >
                <Globe class="h-5 w-5" :stroke-width="1.75" />
              </div>
              <div>
                <h2 id="section-langues" class="text-lg font-semibold text-ink-900">Langues</h2>
                <p class="text-sm text-ink-500">Les langues que tu parles, avec ton niveau.</p>
              </div>
            </div>
            <UiButton
              v-if="!showLanguageForm"
              variant="secondary"
              size="sm"
              @click="showLanguageForm = true"
            >
              <Plus class="h-4 w-4" :stroke-width="2" aria-hidden="true" />
              Ajouter une langue
            </UiButton>
          </div>

          <ul v-if="profile?.languages.length" class="flex flex-wrap gap-2">
            <li v-for="lang in profile.languages" :key="lang.id">
              <UiBadge variant="brand" class="group pr-1.5">
                <span>{{ lang.label }}</span>
                <span v-if="lang.level" class="font-normal text-brand-500">
                  · {{ LANGUAGE_LEVEL_LABELS[lang.level] }}
                </span>
                <button
                  type="button"
                  class="-my-1.5 ml-0.5 rounded-full p-1.5 text-brand-500 transition-colors duration-300 ease-out hover:bg-brand-100 hover:text-danger-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 group-hover:text-brand-600"
                  :aria-label="`Supprimer la langue ${lang.label}`"
                  @click="askDeleteLanguage(lang)"
                >
                  <X class="h-3.5 w-3.5" :stroke-width="2" aria-hidden="true" />
                </button>
              </UiBadge>
            </li>
          </ul>
          <div
            v-else-if="!showLanguageForm"
            class="flex flex-col items-center gap-2 rounded-card border border-dashed border-border-strong bg-surface px-6 py-8 text-center"
          >
            <Globe class="h-6 w-6 text-ink-400" :stroke-width="1.75" aria-hidden="true" />
            <p class="max-w-sm text-sm text-ink-500">
              Aucune langue pour l'instant. Ajoute celles que tu parles.
            </p>
          </div>

          <UiCard v-if="showLanguageForm" class="animate-fade-up">
            <form class="space-y-4" @submit.prevent="addLanguage">
              <UiInput
                v-model="languageForm.label"
                label="Langue"
                required
                placeholder="ex. Anglais"
              />
              <div class="flex flex-col gap-1.5">
                <label :for="languageLevelSelectId" class="text-sm font-medium text-ink-700"
                  >Niveau</label
                >
                <select
                  :id="languageLevelSelectId"
                  v-model="languageForm.level"
                  class="h-10 w-full rounded-control bg-surface px-3 text-sm text-ink-900 ring-1 ring-border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  <option value="">Non précisé</option>
                  <option v-for="l in LANGUAGE_LEVELS" :key="l" :value="l">
                    {{ LANGUAGE_LEVEL_LABELS[l] }}
                  </option>
                </select>
              </div>
              <div class="flex flex-wrap justify-end gap-3">
                <UiButton
                  variant="ghost"
                  :disabled="addingLanguage"
                  @click="showLanguageForm = false"
                >
                  Annuler
                </UiButton>
                <UiButton
                  type="submit"
                  :loading="addingLanguage"
                  :disabled="!languageForm.label.trim()"
                >
                  Ajouter la langue
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

        <!-- CV de base (capture de DA depuis un PDF) -->
        <section class="space-y-4" aria-labelledby="section-cv-base">
          <div class="flex items-center gap-3">
            <div
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-brand-50 text-brand-600"
              aria-hidden="true"
            >
              <FileText class="h-5 w-5" :stroke-width="1.75" />
            </div>
            <div>
              <h2 id="section-cv-base" class="text-lg font-semibold text-ink-900">CV de base</h2>
              <p class="text-sm text-ink-500">
                Upload ton CV actuel (PDF) : on en capture la mise en forme (couleurs, polices,
                agencement) ET on pré-remplit ton profil (expériences, compétences, langues…) à
                partir de son contenu. Tu relis avant d'enregistrer. Ton PDF n'est pas conservé.
              </p>
            </div>
          </div>

          <UiCard>
            <!-- Input fichier caché, piloté par les boutons ci-dessous -->
            <input
              ref="cvFileInput"
              type="file"
              accept="application/pdf"
              class="sr-only"
              @change="extractDesign"
            />

            <!-- Thème déjà configuré -->
            <div v-if="baseDesign && !designPreview" class="space-y-3">
              <UiBadge variant="brand">Design actif</UiBadge>
              <p class="text-sm leading-relaxed text-ink-700">{{ baseDesign.summary }}</p>
              <div class="flex flex-wrap justify-end gap-3">
                <UiButton variant="ghost" :loading="removingDesign" @click="removeDesign">
                  Retirer
                </UiButton>
                <UiButton variant="secondary" :loading="extractingDesign" @click="triggerCvUpload">
                  <Upload class="h-4 w-4" :stroke-width="2" aria-hidden="true" />
                  Remplacer
                </UiButton>
              </div>
            </div>

            <!-- Relecture avant enregistrement -->
            <div v-else-if="designPreview" class="space-y-4">
              <div class="flex flex-wrap items-center gap-2">
                <UiBadge variant="brand">Relecture</UiBadge>
                <p class="text-sm font-medium text-brand-700">
                  Détecté — rien n'est encore enregistré.
                </p>
              </div>
              <p class="text-sm leading-relaxed text-ink-700">
                <span class="font-semibold">Design :</span> {{ designPreview.summary }}
              </p>
              <div class="flex flex-wrap items-center gap-3 text-sm text-ink-600">
                <span class="inline-flex items-center gap-1.5">
                  <span
                    class="inline-block h-4 w-4 rounded-full ring-1 ring-border"
                    :style="{ backgroundColor: designPreview.accent }"
                  />
                  Accent
                </span>
                <span class="inline-flex items-center gap-1.5">
                  <span
                    class="inline-block h-4 w-4 rounded-full ring-1 ring-border"
                    :style="{ backgroundColor: designPreview.sidebarBg }"
                  />
                  Sidebar
                </span>
                <span>{{
                  designPreview.layout === 'sidebar-left' ? '2 colonnes' : '1 colonne'
                }}</span>
                <span v-if="designPreview.font">Police : {{ designPreview.font }}</span>
              </div>

              <!-- Contenu détecté — ÉDITABLE avant écriture -->
              <div
                v-if="parsedPreview"
                class="max-h-[28rem] space-y-5 overflow-y-auto rounded-card bg-brand-50 p-4 ring-1 ring-brand-200"
              >
                <p class="text-sm font-semibold text-brand-700">
                  Infos détectées — relis et corrige avant d'enregistrer
                </p>

                <!-- Identité -->
                <div class="grid gap-3 sm:grid-cols-2">
                  <UiInput v-model="parsedPreview.fullName" label="Nom complet" placeholder="—" />
                  <UiInput
                    v-model="parsedPreview.email"
                    type="email"
                    label="E-mail"
                    placeholder="—"
                  />
                  <UiInput v-model="parsedPreview.phone" label="Téléphone" placeholder="—" />
                  <UiInput v-model="parsedPreview.location" label="Localisation" placeholder="—" />
                </div>
                <UiInput v-model="parsedLinksText" label="Liens" hint="Séparés par des virgules." />
                <UiInput
                  v-model="parsedPreview.headline"
                  label="Intitulé de poste"
                  placeholder="—"
                />
                <UiTextarea
                  v-model="parsedPreview.summary"
                  label="Résumé"
                  :rows="3"
                  placeholder="—"
                />

                <!-- Compétences clés détectées -->
                <div v-if="parsedPreview.keySkills.length" class="space-y-2">
                  <p class="text-sm font-semibold text-brand-700">
                    Compétences clés ({{ parsedPreview.keySkills.length }})
                  </p>
                  <div
                    v-for="(_, i) in parsedPreview.keySkills"
                    :key="i"
                    class="flex items-start gap-2"
                  >
                    <div class="flex-1">
                      <UiTextarea
                        v-model="parsedPreview.keySkills[i]"
                        label=""
                        :rows="2"
                        placeholder="—"
                      />
                    </div>
                    <button
                      type="button"
                      class="mt-1 shrink-0 rounded-control p-2 text-ink-400 hover:bg-danger-50 hover:text-danger-600"
                      aria-label="Retirer"
                      @click="parsedPreview.keySkills.splice(i, 1)"
                    >
                      <X class="h-4 w-4" :stroke-width="2" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <!-- Expériences -->
                <div v-if="parsedPreview.experiences.length" class="space-y-3">
                  <p class="text-sm font-semibold text-brand-700">
                    Expériences ({{ parsedPreview.experiences.length }})
                  </p>
                  <div
                    v-for="(exp, i) in parsedPreview.experiences"
                    :key="i"
                    class="space-y-3 rounded-card bg-surface p-3 ring-1 ring-border"
                  >
                    <div class="flex items-start justify-between gap-3">
                      <div class="grid flex-1 gap-3 sm:grid-cols-2">
                        <UiInput v-model="exp.title" label="Poste" />
                        <UiInput v-model="exp.company" label="Entreprise" />
                        <UiInput v-model="exp.startDate" type="month" label="Début" />
                        <UiInput v-model="exp.endDate" type="month" label="Fin (vide = en cours)" />
                      </div>
                      <button
                        type="button"
                        class="shrink-0 rounded-control p-2 text-ink-400 transition-colors hover:bg-danger-50 hover:text-danger-600"
                        aria-label="Retirer cette expérience"
                        @click="removeParsedExperience(i)"
                      >
                        <Trash2 class="h-4 w-4" :stroke-width="1.75" aria-hidden="true" />
                      </button>
                    </div>
                    <UiTextarea v-model="exp.description" label="Description" :rows="2" />
                  </div>
                </div>

                <!-- Formations -->
                <div v-if="parsedPreview.education.length" class="space-y-3">
                  <p class="text-sm font-semibold text-brand-700">
                    Formations ({{ parsedPreview.education.length }})
                  </p>
                  <div
                    v-for="(ed, i) in parsedPreview.education"
                    :key="i"
                    class="space-y-3 rounded-card bg-surface p-3 ring-1 ring-border"
                  >
                    <div class="flex items-start justify-between gap-3">
                      <div class="grid flex-1 gap-3 sm:grid-cols-2">
                        <UiInput v-model="ed.degree" label="Diplôme / titre" />
                        <UiInput v-model="ed.school" label="Établissement" />
                        <UiInput v-model="ed.startDate" type="month" label="Début" />
                        <UiInput v-model="ed.endDate" type="month" label="Fin" />
                      </div>
                      <button
                        type="button"
                        class="shrink-0 rounded-control p-2 text-ink-400 transition-colors hover:bg-danger-50 hover:text-danger-600"
                        aria-label="Retirer cette formation"
                        @click="removeParsedEducation(i)"
                      >
                        <Trash2 class="h-4 w-4" :stroke-width="1.75" aria-hidden="true" />
                      </button>
                    </div>
                    <UiTextarea v-model="ed.description" label="Description" :rows="2" />
                  </div>
                </div>

                <!-- Compétences -->
                <div v-if="parsedPreview.skills.length" class="space-y-2">
                  <p class="text-sm font-semibold text-brand-700">
                    Compétences ({{ parsedPreview.skills.length }})
                  </p>
                  <div
                    v-for="(sk, i) in parsedPreview.skills"
                    :key="i"
                    class="flex items-center gap-2"
                  >
                    <UiInput v-model="sk.label" class="flex-1" placeholder="Compétence" />
                    <select
                      v-model="sk.level"
                      class="h-10 rounded-control bg-surface px-2 text-sm text-ink-900 ring-1 ring-border"
                    >
                      <option :value="null">Niveau ?</option>
                      <option v-for="l in SKILL_LEVELS" :key="l" :value="l">
                        {{ SKILL_LEVEL_LABELS[l] }}
                      </option>
                    </select>
                    <button
                      type="button"
                      class="shrink-0 rounded-control p-2 text-ink-400 hover:bg-danger-50 hover:text-danger-600"
                      aria-label="Retirer cette compétence"
                      @click="removeParsedSkill(i)"
                    >
                      <X class="h-4 w-4" :stroke-width="2" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <!-- Langues -->
                <div v-if="parsedPreview.languages.length" class="space-y-2">
                  <p class="text-sm font-semibold text-brand-700">
                    Langues ({{ parsedPreview.languages.length }})
                  </p>
                  <div
                    v-for="(lang, i) in parsedPreview.languages"
                    :key="i"
                    class="flex items-center gap-2"
                  >
                    <UiInput v-model="lang.label" class="flex-1" placeholder="Langue" />
                    <select
                      v-model="lang.level"
                      class="h-10 rounded-control bg-surface px-2 text-sm text-ink-900 ring-1 ring-border"
                    >
                      <option :value="null">Niveau ?</option>
                      <option v-for="l in LANGUAGE_LEVELS" :key="l" :value="l">
                        {{ LANGUAGE_LEVEL_LABELS[l] }}
                      </option>
                    </select>
                    <button
                      type="button"
                      class="shrink-0 rounded-control p-2 text-ink-400 hover:bg-danger-50 hover:text-danger-600"
                      aria-label="Retirer cette langue"
                      @click="removeParsedLanguage(i)"
                    >
                      <X class="h-4 w-4" :stroke-width="2" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <p class="pt-1 text-xs leading-relaxed text-brand-900/70">
                  Expériences, compétences et langues seront ajoutées. Identité et résumé ne sont
                  remplis que s'ils sont encore vides dans ton profil.
                </p>
              </div>

              <div class="flex flex-wrap justify-end gap-3">
                <UiButton variant="ghost" :disabled="savingDesign" @click="clearCvPreview">
                  Annuler
                </UiButton>
                <UiButton :loading="savingDesign" @click="saveDesign">
                  Utiliser et compléter le profil
                </UiButton>
              </div>
            </div>

            <!-- Aucun thème : invitation à uploader -->
            <div v-else class="flex flex-col items-center gap-3 py-4 text-center">
              <FileText class="h-6 w-6 text-ink-400" :stroke-width="1.75" aria-hidden="true" />
              <p class="max-w-sm text-sm text-ink-500">
                Aucun design importé. Tes CV utilisent le modèle par défaut.
              </p>
              <UiButton variant="secondary" :loading="extractingDesign" @click="triggerCvUpload">
                <Upload class="h-4 w-4" :stroke-width="2" aria-hidden="true" />
                Importer un PDF
              </UiButton>
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
            <div class="flex items-center justify-between">
              <dt class="flex items-center gap-2 text-sm text-ink-600">
                <Globe class="h-4 w-4 text-brand-600" :stroke-width="1.75" aria-hidden="true" />
                Langues
              </dt>
              <dd class="text-sm font-semibold tabular-nums text-ink-900">{{ languageCount }}</dd>
            </div>
            <div class="flex items-center justify-between">
              <dt class="flex items-center gap-2 text-sm text-ink-600">
                <GraduationCap
                  class="h-4 w-4 text-brand-600"
                  :stroke-width="1.75"
                  aria-hidden="true"
                />
                Formations
              </dt>
              <dd class="text-sm font-semibold tabular-nums text-ink-900">{{ educationCount }}</dd>
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

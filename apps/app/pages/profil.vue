<script setup lang="ts">
import type { ProfileDTO, ExperienceDTO, SkillDTO } from '@cvo/shared'
import { SKILL_LEVELS } from '@cvo/shared'

definePageMeta({ middleware: 'auth' })

// ─── État ───────────────────────────────────────────────────────────────────

const profile = ref<ProfileDTO | null>(null)
const loadError = ref<string | null>(null)
const saving = ref(false)

// ─── Chargement ─────────────────────────────────────────────────────────────

const { data, error, refresh } = await useFetch<ProfileDTO | null>('/api/profile')
if (error.value) {
  loadError.value = 'Impossible de charger le profil.'
} else {
  profile.value = data.value ?? null
}

// Formulaire en-tête
const headline = ref(profile.value?.headline ?? '')
const summary = ref(profile.value?.summary ?? '')

// ─── Sauvegarde en-tête ──────────────────────────────────────────────────────

async function saveHeader() {
  saving.value = true
  try {
    const res = await $fetch<ProfileDTO>('/api/profile', {
      method: 'PUT',
      body: { headline: headline.value || null, summary: summary.value || null },
    })
    profile.value = res
  } finally {
    saving.value = false
  }
}

// ─── Expériences ────────────────────────────────────────────────────────────

const expForm = reactive({
  title: '',
  company: '',
  startDate: '',
  endDate: '',
  description: '',
  skillsUsed: '',
})
const addingExp = ref(false)

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
        skillsUsed: expForm.skillsUsed.split(',').map((s) => s.trim()).filter(Boolean),
      },
    })
    Object.assign(expForm, { title: '', company: '', startDate: '', endDate: '', description: '', skillsUsed: '' })
    await refresh()
    profile.value = data.value ?? null
  } finally {
    addingExp.value = false
  }
}

async function deleteExperience(id: string) {
  await $fetch(`/api/profile/experiences/${id}`, { method: 'DELETE' })
  await refresh()
  profile.value = data.value ?? null
}

// ─── Compétences ─────────────────────────────────────────────────────────────

const skillForm = reactive({ label: '', level: '' as string, years: '' })
const addingSkill = ref(false)

async function addSkill() {
  addingSkill.value = true
  try {
    await $fetch('/api/profile/skills', {
      method: 'POST',
      body: {
        label: skillForm.label,
        level: skillForm.level || null,
        years: skillForm.years ? Number(skillForm.years) : null,
      },
    })
    Object.assign(skillForm, { label: '', level: '', years: '' })
    await refresh()
    profile.value = data.value ?? null
  } finally {
    addingSkill.value = false
  }
}

async function deleteSkill(id: string) {
  await $fetch(`/api/profile/skills/${id}`, { method: 'DELETE' })
  await refresh()
  profile.value = data.value ?? null
}

// ─── Import copier-coller ────────────────────────────────────────────────────

const pasteText = ref('')
const importing = ref(false)
const importApplied = ref(false)

type ParsedProfile = {
  headline: string | null
  summary: string | null
  experiences: Omit<ExperienceDTO, 'id'>[]
  skills: Omit<SkillDTO, 'id'>[]
}

const importResult = ref<ParsedProfile | null>(null)

async function doParse() {
  importing.value = true
  importResult.value = null
  try {
    const res = await $fetch<ParsedProfile>('/api/profile/import-text', {
      method: 'POST',
      body: { text: pasteText.value },
    })
    importResult.value = res
  } finally {
    importing.value = false
  }
}

async function applyImport() {
  if (!importResult.value) return
  saving.value = true
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
    importApplied.value = true
    await refresh()
    profile.value = data.value ?? null
    headline.value = profile.value?.headline ?? ''
    summary.value = profile.value?.summary ?? ''
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto py-10 px-4 space-y-10">
    <h1 class="text-2xl font-semibold text-ink-900">Mon profil</h1>

    <p v-if="loadError" role="alert" class="text-danger-500 text-sm">{{ loadError }}</p>

    <!-- ── En-tête profil ── -->
    <section class="space-y-4">
      <h2 class="text-lg font-medium text-ink-700">En-tête</h2>
      <div class="space-y-3">
        <div class="space-y-1">
          <label for="headline" class="block text-sm font-medium text-ink-700">Intitulé de poste</label>
          <input
            id="headline"
            v-model="headline"
            type="text"
            maxlength="150"
            placeholder="ex. Développeur Full-Stack Vue / Node"
            class="w-full rounded-card border border-ink-500/30 bg-surface px-3 py-2 text-sm text-ink-900 placeholder-ink-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div class="space-y-1">
          <label for="summary" class="block text-sm font-medium text-ink-700">Résumé / accroche</label>
          <textarea
            id="summary"
            v-model="summary"
            rows="4"
            maxlength="2000"
            placeholder="Quelques phrases sur votre parcours et vos ambitions…"
            class="w-full rounded-card border border-ink-500/30 bg-surface px-3 py-2 text-sm text-ink-900 placeholder-ink-500 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />
        </div>
        <button
          :disabled="saving"
          class="rounded-card bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
          @click="saveHeader"
        >
          {{ saving ? 'Sauvegarde…' : 'Enregistrer' }}
        </button>
      </div>
    </section>

    <!-- ── Expériences ── -->
    <section class="space-y-4">
      <h2 class="text-lg font-medium text-ink-700">Expériences</h2>

      <ul v-if="profile?.experiences.length" class="space-y-3">
        <li
          v-for="exp in profile.experiences"
          :key="exp.id"
          class="bg-surface rounded-card border border-ink-500/20 p-4 flex justify-between gap-4"
        >
          <div>
            <p class="font-medium text-ink-900">{{ exp.title }}</p>
            <p class="text-sm text-ink-500">{{ exp.company }}</p>
          </div>
          <button
            class="text-sm text-danger-500 hover:underline shrink-0"
            @click="deleteExperience(exp.id)"
          >Supprimer</button>
        </li>
      </ul>
      <p v-else class="text-sm text-ink-500">Aucune expérience saisie.</p>

      <!-- Formulaire ajout -->
      <details class="rounded-card border border-ink-500/20 bg-surface-muted">
        <summary class="cursor-pointer px-4 py-3 text-sm font-medium text-ink-700 select-none">
          + Ajouter une expérience
        </summary>
        <div class="px-4 pb-4 pt-2 space-y-3">
          <input v-model="expForm.title" type="text" placeholder="Titre du poste *" required
            class="w-full rounded-card border border-ink-500/30 bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          <input v-model="expForm.company" type="text" placeholder="Entreprise *" required
            class="w-full rounded-card border border-ink-500/30 bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          <div class="grid grid-cols-2 gap-3">
            <input v-model="expForm.startDate" type="date" aria-label="Date de début"
              class="w-full rounded-card border border-ink-500/30 bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            <input v-model="expForm.endDate" type="date" aria-label="Date de fin (vide = en cours)"
              class="w-full rounded-card border border-ink-500/30 bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <textarea v-model="expForm.description" rows="3" placeholder="Description (optionnel)"
            class="w-full rounded-card border border-ink-500/30 bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
          <input v-model="expForm.skillsUsed" type="text" placeholder="Compétences utilisées (séparées par des virgules)"
            class="w-full rounded-card border border-ink-500/30 bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          <button
            :disabled="addingExp || !expForm.title || !expForm.company"
            class="rounded-card bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
            @click="addExperience"
          >
            {{ addingExp ? 'Ajout…' : 'Ajouter' }}
          </button>
        </div>
      </details>
    </section>

    <!-- ── Compétences ── -->
    <section class="space-y-4">
      <h2 class="text-lg font-medium text-ink-700">Compétences</h2>
      <p class="text-xs text-ink-500">
        Saisissez uniquement vos <strong>compétences réelles</strong> — elles seront la source de vérité du moteur de génération.
      </p>

      <ul v-if="profile?.skills.length" class="flex flex-wrap gap-2">
        <li
          v-for="sk in profile.skills"
          :key="sk.id"
          class="flex items-center gap-1 rounded-full bg-brand-100 px-3 py-1 text-sm text-brand-700"
        >
          <span>{{ sk.label }}</span>
          <span v-if="sk.level" class="text-xs text-brand-500">({{ sk.level.toLowerCase() }})</span>
          <button class="text-brand-500 hover:text-danger-500 ml-1 text-xs" @click="deleteSkill(sk.id)">✕</button>
        </li>
      </ul>
      <p v-else class="text-sm text-ink-500">Aucune compétence saisie.</p>

      <!-- Formulaire ajout compétence -->
      <details class="rounded-card border border-ink-500/20 bg-surface-muted">
        <summary class="cursor-pointer px-4 py-3 text-sm font-medium text-ink-700 select-none">
          + Ajouter une compétence
        </summary>
        <div class="px-4 pb-4 pt-2 space-y-3">
          <input v-model="skillForm.label" type="text" placeholder="Compétence (ex. TypeScript) *" required
            class="w-full rounded-card border border-ink-500/30 bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          <div class="grid grid-cols-2 gap-3">
            <select v-model="skillForm.level"
              class="w-full rounded-card border border-ink-500/30 bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="">Niveau (optionnel)</option>
              <option v-for="l in SKILL_LEVELS" :key="l" :value="l">{{ l.charAt(0) + l.slice(1).toLowerCase() }}</option>
            </select>
            <input v-model="skillForm.years" type="number" min="0" max="50" placeholder="Années (optionnel)"
              class="w-full rounded-card border border-ink-500/30 bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <button
            :disabled="addingSkill || !skillForm.label"
            class="rounded-card bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
            @click="addSkill"
          >
            {{ addingSkill ? 'Ajout…' : 'Ajouter' }}
          </button>
        </div>
      </details>
    </section>

    <!-- ── Import copier-coller ── -->
    <section class="space-y-4">
      <h2 class="text-lg font-medium text-ink-700">Import par copier-coller</h2>
      <p class="text-sm text-ink-500">
        Copiez le texte de votre CV ou LinkedIn et collez-le ici. Une suggestion de profil sera générée
        pour relecture — <strong>rien n'est enregistré avant votre confirmation</strong>.
      </p>

      <textarea
        v-model="pasteText"
        rows="8"
        placeholder="Collez ici votre CV ou profil LinkedIn en texte brut…"
        class="w-full rounded-card border border-ink-500/30 bg-surface px-3 py-2 text-sm text-ink-900 placeholder-ink-500 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
      />

      <button
        :disabled="importing || pasteText.length < 10"
        class="rounded-card bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
        @click="doParse"
      >
        {{ importing ? 'Analyse…' : 'Analyser le texte' }}
      </button>

      <!-- Résultat de l'analyse -->
      <div v-if="importResult" class="rounded-card border border-brand-100 bg-brand-50 p-4 space-y-3">
        <p class="text-sm font-medium text-brand-700">Relecture avant enregistrement</p>
        <div v-if="importResult.headline" class="text-sm text-ink-700">
          <span class="font-medium">Intitulé :</span> {{ importResult.headline }}
        </div>
        <div v-if="importResult.summary" class="text-sm text-ink-700">
          <span class="font-medium">Résumé :</span> {{ importResult.summary }}
        </div>
        <div v-if="importResult.experiences.length">
          <p class="text-sm font-medium text-ink-700">{{ importResult.experiences.length }} expérience(s) détectée(s)</p>
          <ul class="text-xs text-ink-500 list-disc list-inside">
            <li v-for="(e, i) in importResult.experiences" :key="i">{{ e.title }} — {{ e.company }}</li>
          </ul>
        </div>
        <div v-if="importResult.skills.length">
          <p class="text-sm font-medium text-ink-700">{{ importResult.skills.length }} compétence(s) détectée(s)</p>
          <p class="text-xs text-ink-500">{{ importResult.skills.map((s) => s.label).join(', ') }}</p>
        </div>
        <div class="flex gap-3">
          <button
            :disabled="saving"
            class="rounded-card bg-success-500 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-colors"
            @click="applyImport"
          >
            {{ saving ? 'Enregistrement…' : 'Confirmer et enregistrer' }}
          </button>
          <button
            class="rounded-card border border-ink-500/30 px-4 py-2 text-sm text-ink-700 hover:bg-surface-muted transition-colors"
            @click="importResult = null"
          >
            Annuler
          </button>
        </div>
      </div>

      <p v-if="importApplied" class="text-sm text-success-500">✓ Profil importé et enregistré.</p>
    </section>
  </div>
</template>

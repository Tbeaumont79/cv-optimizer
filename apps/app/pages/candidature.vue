<script setup lang="ts">
import type {
  AnalyzeCandidatureRequest,
  AnalyzeCandidatureResponse,
  BillingSummary,
  GenerateCandidatureRequest,
  GenerateCandidatureResponse,
  ProfileDTO,
} from '@cvo/shared'
import {
  BILLING_SUMMARY_PATH,
  CANDIDATURE_ANALYZE_PATH,
  CANDIDATURE_GENERATE_PATH,
  QUOTA_EXCEEDED_CODE,
  matchVerdict,
} from '@cvo/shared'
import type { MatchVerdict } from '@cvo/shared'
import { ChevronRight, TriangleAlert } from '@lucide/vue'

definePageMeta({ middleware: 'auth' })

const toast = useToast()

// ─── Machine à états du parcours ─────────────────────────────────────────────

// Le parcours s'arrête à `generating` : au succès on redirige vers l'éditeur
// (/candidatures/:id) — le CV est persisté, donc plus de perte au changement d'onglet.
type Step = 'input' | 'analyzing' | 'scored' | 'generating'
const step = ref<Step>('input')

const offerText = ref('')
const offerError = ref('')
const analysis = ref<AnalyzeCandidatureResponse | null>(null)

// ─── Solde de crédits (badge + gating des boutons) ───────────────────────────

const { data: billing, refresh: refreshUsage } = await useFetch<BillingSummary>(
  BILLING_SUMMARY_PATH,
  { lazy: true },
)

/** `null` = solde pas encore chargé → pas de blocage prématuré. */
const creditBalance = computed(() => billing.value?.creditBalance ?? null)
const quotaExhausted = computed(() => creditBalance.value !== null && creditBalance.value < 1)

const quotaBadgeLabel = computed(() => {
  const c = creditBalance.value
  if (c === null) return null
  return c > 1 ? `${c} crédits restants` : `${c} crédit restant`
})

// ─── Garde profil : pas de génération sans matière première ──────────────────

const {
  data: profileData,
  status: profileStatus,
  error: profileError,
  refresh: refreshProfile,
} = await useFetch<ProfileDTO | null>('/api/profile', { lazy: true })

const profileLoading = computed(() => profileStatus.value === 'pending' && !profileData.value)

/** Forcé quand le serveur répond 409 profile_empty à l'analyse. */
const forcedProfileGuard = ref(false)

const profileEmpty = computed(() => {
  const p = profileData.value
  return !p || (p.experiences.length === 0 && p.skills.length === 0)
})
const showProfileGuard = computed(() => forcedProfileGuard.value || profileEmpty.value)

// ─── Lecture des erreurs $fetch (statut + message serveur, sans dépendance) ──

type FetchErrorLike = {
  statusCode?: number
  status?: number
  data?: { message?: string; statusMessage?: string; data?: { code?: string } }
}

function errorStatus(err: unknown): number | undefined {
  const e = err as FetchErrorLike
  return e?.statusCode ?? e?.status
}

function errorMessage(err: unknown, fallback: string): string {
  const e = err as FetchErrorLike
  return e?.data?.message || e?.data?.statusMessage || fallback
}

function errorCode(err: unknown): string | undefined {
  return (err as FetchErrorLike)?.data?.data?.code
}

// ─── Étape 1 : analyse de l'offre → score de match ───────────────────────────

const canAnalyze = computed(() => offerText.value.trim().length >= 50)

async function analyze() {
  if (!canAnalyze.value || step.value === 'analyzing') return
  offerError.value = ''
  step.value = 'analyzing'
  try {
    const body: AnalyzeCandidatureRequest = { offerText: offerText.value }
    analysis.value = await $fetch<AnalyzeCandidatureResponse>(CANDIDATURE_ANALYZE_PATH, {
      method: 'POST',
      body,
    })
    step.value = 'scored'
  } catch (err) {
    step.value = 'input'
    const status = errorStatus(err)
    if (status === 409) {
      // Le serveur fait foi : profil vide ⇒ on bascule sur le garde profil.
      forcedProfileGuard.value = true
    } else if (status === 400) {
      offerError.value = errorMessage(
        err,
        "Ce texte ne ressemble pas à une offre — colle l'annonce complète.",
      )
    } else {
      toast.error("L'analyse a échoué", 'Réessaie dans quelques instants.')
    }
  }
}

function backToInput() {
  // Le texte de l'offre est conservé pour une retouche rapide.
  step.value = 'input'
}

// ─── Affichage du verdict (logique partagée, jamais redéfinie ici) ───────────

const verdict = computed<MatchVerdict | null>(() =>
  analysis.value ? matchVerdict(analysis.value.match.score) : null,
)

const VERDICT_BADGES: Record<
  MatchVerdict,
  { variant: 'success' | 'warning' | 'danger'; label: string }
> = {
  strong: { variant: 'success', label: 'Très bon match' },
  medium: { variant: 'warning', label: 'Match correct' },
  weak: { variant: 'danger', label: 'Match faible' },
}

// ─── Étape 2 : génération du CV adapté ───────────────────────────────────────

async function generate() {
  if (!analysis.value || quotaExhausted.value || step.value === 'generating') return
  step.value = 'generating'
  try {
    const body: GenerateCandidatureRequest = {
      offer: analysis.value.offer,
      match: analysis.value.match,
    }
    const res = await $fetch<GenerateCandidatureResponse>(CANDIDATURE_GENERATE_PATH, {
      method: 'POST',
      body,
    })
    await refreshUsage()
    toast.success('CV généré', 'Ton CV est prêt — tu peux le personnaliser.')
    // Persisté en base : on ouvre l'éditeur (le CV survit aux changements d'onglet).
    await navigateTo(`/candidatures/${res.candidatureId}`)
  } catch (err) {
    step.value = 'scored'
    const status = errorStatus(err)
    if (status === 403 || errorCode(err) === QUOTA_EXCEEDED_CODE) {
      // Le refresh fait passer remaining à 0 → l'encart quota s'affiche seul.
      await refreshUsage()
      toast.error('Plus de crédits', 'Achète un pack pour continuer à générer.')
    } else if (status === 422) {
      toast.error('Génération impossible', errorMessage(err, 'Réessaie dans quelques instants.'))
    } else if (status === 409) {
      // Profil incomplet (vide ou nom manquant) : on relaie le message serveur,
      // qui guide vers la page profil. Aucun crédit consommé.
      toast.error('Profil à compléter', errorMessage(err, 'Complète ton profil puis réessaie.'))
    } else {
      toast.error('La génération a échoué', "Ton crédit n'a pas été consommé.")
    }
  }
}

// ─── A11y : focus déplacé sur le titre du résultat à l'étape « scored » ──────

const scoredHeadingRef = ref<HTMLHeadingElement | null>(null)

watch(step, async (s) => {
  if (s !== 'scored') return
  await nextTick()
  scoredHeadingRef.value?.focus()
})
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-6 py-10">
    <!-- ── En-tête de page ── -->
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
          Nouvelle candidature
        </h1>
        <p class="mt-2 max-w-2xl text-sm leading-relaxed text-ink-500 sm:text-base">
          Colle une offre, on adapte ton CV — sans jamais rien inventer.
        </p>
      </div>
      <UiBadge
        v-if="quotaBadgeLabel !== null"
        :variant="quotaExhausted ? 'danger' : 'brand'"
        class="mt-1"
      >
        {{ quotaBadgeLabel }}
      </UiBadge>
    </header>

    <!-- ── Chargement du profil : skeleton ── -->
    <div v-if="profileLoading" class="mt-8" role="status">
      <span class="sr-only">Chargement de ton espace candidature…</span>
      <div class="rounded-card bg-surface p-6 shadow-card ring-1 ring-border">
        <UiSkeleton class="mb-5 h-5 w-44" />
        <div class="space-y-3">
          <UiSkeleton class="h-40 w-full" />
          <UiSkeleton class="h-10 w-44" />
        </div>
      </div>
    </div>

    <!-- ── Erreur de chargement du profil ── -->
    <UiState
      v-else-if="profileError"
      variant="error"
      title="Impossible de vérifier ton profil"
      description="Une erreur est survenue. Vérifie ta connexion puis réessaie."
      class="mt-8"
    >
      <UiButton variant="secondary" @click="refreshProfile()">Réessayer</UiButton>
    </UiState>

    <!-- ── Garde profil : pas de candidature sans matière première ── -->
    <UiState
      v-else-if="showProfileGuard"
      variant="empty"
      title="Complète d'abord ton profil"
      description="Ton CV est généré uniquement à partir de ton profil réel. Ajoute au moins une expérience ou une compétence pour commencer."
      class="mt-8"
    >
      <UiButton @click="navigateTo('/profil')">Compléter mon profil</UiButton>
    </UiState>

    <!-- ── Parcours candidature ── -->
    <div v-else class="mt-8">
      <!-- Étape input / analyzing : saisie de l'offre -->
      <UiCard v-if="step === 'input' || step === 'analyzing'" title="L'offre qui t'intéresse">
        <form class="space-y-4" @submit.prevent="analyze">
          <UiTextarea
            v-model="offerText"
            label="Texte de l'offre"
            hint="Copie-colle l'annonce complète — intitulé, missions, compétences demandées"
            :error="offerError || undefined"
            :rows="10"
            :disabled="step === 'analyzing'"
            placeholder="Colle ici le texte de l'offre d'emploi…"
          />
          <div class="flex justify-end">
            <UiButton type="submit" :loading="step === 'analyzing'" :disabled="!canAnalyze">
              {{ step === 'analyzing' ? "Analyse de l'offre…" : "Analyser l'offre" }}
            </UiButton>
          </div>
        </form>
      </UiCard>

      <!-- Zone de résultat (annoncée aux lecteurs d'écran à chaque mise à jour) -->
      <div aria-live="polite">
        <!-- Étape scored / generating : score de match puis génération -->
        <UiCard v-if="(step === 'scored' || step === 'generating') && analysis">
          <!-- Génération en cours : travail long, état centré plutôt que skeleton -->
          <div
            v-if="step === 'generating'"
            class="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center"
          >
            <UiSpinner class="h-8 w-8 text-brand-600" label="Génération du CV en cours…" />
            <p class="font-semibold text-ink-900">On adapte ton CV à l'offre…</p>
            <p class="max-w-sm text-sm leading-relaxed text-ink-500">
              On réordonne tes forces et reformule tes expériences — environ 30 secondes.
            </p>
          </div>

          <!-- Résultat du match -->
          <div v-else class="animate-fade-up space-y-5">
            <div>
              <h2
                ref="scoredHeadingRef"
                tabindex="-1"
                class="text-lg font-semibold text-ink-900 outline-none"
              >
                Ton score de match
              </h2>
              <p class="mt-0.5 text-sm text-ink-500">{{ analysis.offer.title }}</p>
            </div>

            <div class="flex flex-wrap items-baseline gap-x-2 gap-y-3">
              <span class="text-5xl font-bold tabular-nums text-ink-900">
                {{ analysis.match.score }}
              </span>
              <span class="text-xl font-medium text-ink-400">/100</span>
              <UiBadge v-if="verdict" :variant="VERDICT_BADGES[verdict].variant" class="ml-2">
                {{ VERDICT_BADGES[verdict].label }}
              </UiBadge>
            </div>

            <ul class="space-y-1.5">
              <li
                v-for="(reason, i) in analysis.match.reasons"
                :key="i"
                class="flex items-start gap-2 text-sm leading-relaxed text-ink-700"
              >
                <ChevronRight
                  class="mt-0.5 h-4 w-4 shrink-0 text-brand-600"
                  :stroke-width="2"
                  aria-hidden="true"
                />
                {{ reason }}
              </li>
            </ul>

            <div v-if="analysis.match.matchedKeywords.length">
              <h3 class="text-sm font-semibold text-ink-700">Atouts couverts</h3>
              <ul class="mt-2 flex flex-wrap gap-1.5">
                <li v-for="kw in analysis.match.matchedKeywords" :key="kw">
                  <UiBadge variant="success">{{ kw }}</UiBadge>
                </li>
              </ul>
            </div>

            <div v-if="analysis.match.missingKeywords.length">
              <h3 class="text-sm font-semibold text-ink-700">Manque à l'appel</h3>
              <ul class="mt-2 flex flex-wrap gap-1.5">
                <li v-for="kw in analysis.match.missingKeywords" :key="kw">
                  <UiBadge variant="neutral">{{ kw }}</UiBadge>
                </li>
              </ul>
            </div>

            <!-- Garde-fou économique : on prévient AVANT de consommer un crédit -->
            <div
              v-if="verdict === 'weak'"
              class="flex items-start gap-2.5 rounded-card bg-warning-50 p-4 ring-1 ring-warning-200"
            >
              <TriangleAlert
                class="mt-0.5 h-5 w-5 shrink-0 text-warning-600"
                :stroke-width="1.75"
                aria-hidden="true"
              />
              <p class="text-sm leading-relaxed text-warning-700">
                Ton profil ne matche qu'à {{ analysis.match.score }} %. Tu risques un refus — tu
                peux
                <NuxtLink
                  to="/profil"
                  class="font-semibold underline underline-offset-2 transition-colors duration-300 ease-out hover:text-warning-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning-500"
                >
                  retravailler ton profil </NuxtLink
                >, ou générer quand même.
              </p>
            </div>

            <!-- Solde épuisé : on explique et on oriente vers l'achat de crédits -->
            <div
              v-if="quotaExhausted"
              class="flex flex-wrap items-center justify-between gap-3 rounded-card bg-danger-50 p-4 ring-1 ring-danger-200"
            >
              <p class="text-sm leading-relaxed text-danger-700">
                Tu n'as plus de crédits. Achète un pack pour continuer à générer.
              </p>
              <NuxtLink
                to="/credits"
                class="rounded text-sm font-semibold text-danger-700 underline underline-offset-2 transition-colors duration-300 ease-out hover:text-danger-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-500"
              >
                Acheter des crédits
              </NuxtLink>
            </div>

            <div class="flex flex-wrap items-center justify-end gap-3 pt-1">
              <UiButton variant="ghost" @click="backToInput">Modifier l'offre</UiButton>
              <UiButton
                v-if="verdict === 'weak'"
                variant="secondary"
                :disabled="quotaExhausted"
                @click="generate"
              >
                Générer quand même
              </UiButton>
              <UiButton v-else :disabled="quotaExhausted" @click="generate">
                Générer mon CV adapté
              </UiButton>
            </div>
          </div>
        </UiCard>
      </div>
    </div>
  </div>
</template>

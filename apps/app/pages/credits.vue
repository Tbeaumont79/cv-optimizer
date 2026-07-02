<script setup lang="ts">
import type { BillingSummary, CreateCheckoutResponse, CreditPackKey } from '@cvo/shared'
import { BILLING_SUMMARY_PATH, BILLING_CHECKOUT_PATH } from '@cvo/shared'
import { CREDIT_PACKS } from '~/config/pricing'
import { fr } from '~/i18n/fr'
import { Sparkles, Check } from '@lucide/vue'

definePageMeta({ middleware: 'auth' })

const toast = useToast()
const route = useRoute()

const { data: billing, refresh } = await useFetch<BillingSummary>(BILLING_SUMMARY_PATH, { lazy: true })
const creditBalance = computed(() => billing.value?.creditBalance ?? null)

const packs = fr.pricing.packs

// Solde mémorisé juste avant la redirection Checkout : sert de référence fiable au
// retour (survit au rechargement complet de page imposé par Stripe).
const CREDITS_BEFORE_KEY = 'teven:creditsBefore'

/**
 * Le webhook Stripe crédite de façon ASYNCHRONE (souvent 1–3 s après le retour) :
 * on relit le solde plusieurs fois avec un backoff court, en s'arrêtant dès qu'il
 * dépasse la référence. Renvoie le nouveau solde, ou `null` si rien n'a bougé.
 */
async function waitForCredit(previous: number): Promise<number | null> {
  for (const delay of [800, 1200, 1800, 2500, 3500]) {
    await new Promise((resolve) => setTimeout(resolve, delay))
    await refresh()
    const now = billing.value?.creditBalance ?? previous
    if (now > previous) return now
  }
  return null
}

// Retour de Stripe Checkout : confirmation / annulation, puis on rafraîchit le solde.
onMounted(async () => {
  const status = route.query.status
  if (status === 'success') {
    toast.success('Paiement reçu', 'Tes crédits arrivent dans un instant.')
    const before = Number(localStorage.getItem(CREDITS_BEFORE_KEY) ?? creditBalance.value ?? 0)
    localStorage.removeItem(CREDITS_BEFORE_KEY)
    const credited = await waitForCredit(before)
    if (credited !== null) {
      toast.success('Crédits ajoutés', `Ton solde est de ${credited} crédit${credited > 1 ? 's' : ''}.`)
    } else {
      // Webhook non encore reçu après ~10 s : le solde restera correct au prochain chargement.
      toast.info('Crédits en cours', 'Paiement confirmé — le solde se met à jour sous peu.')
    }
  } else if (status === 'cancel') {
    toast.info('Paiement annulé', "Aucun montant n'a été débité.")
  }
  if (status) navigateTo('/credits', { replace: true })
})

const buying = ref<CreditPackKey | null>(null)

async function buy(packKey: CreditPackKey) {
  if (buying.value) return
  buying.value = packKey
  try {
    const res = await $fetch<CreateCheckoutResponse>(BILLING_CHECKOUT_PATH, {
      method: 'POST',
      body: { packKey },
    })
    // Référence pour détecter l'augmentation du solde au retour (cf. waitForCredit).
    localStorage.setItem(CREDITS_BEFORE_KEY, String(creditBalance.value ?? 0))
    // Redirection vers la page de paiement hébergée par Stripe.
    window.location.href = res.url
  } catch {
    toast.error('Paiement indisponible', 'Réessaie dans un instant.')
    buying.value = null
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-5xl px-6 py-10">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">Crédits</h1>
        <p class="mt-2 max-w-2xl text-sm leading-relaxed text-ink-500 sm:text-base">
          1 crédit = 1 CV adapté à une offre. Packs sans abonnement — tu paies quand tu postules.
        </p>
      </div>
      <UiBadge :variant="creditBalance !== null && creditBalance < 1 ? 'danger' : 'brand'" class="mt-1">
        <template v-if="creditBalance === null">…</template>
        <template v-else>{{ creditBalance }} crédit{{ creditBalance > 1 ? 's' : '' }}</template>
      </UiBadge>
    </header>

    <div class="mt-8 grid gap-5 sm:grid-cols-2">
      <UiCard
        v-for="pack in CREDIT_PACKS"
        :key="pack.key"
        :class="pack.featured ? 'ring-2 ring-brand-500' : ''"
      >
        <div class="flex h-full flex-col gap-4 p-1">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-ink-900">{{ packs[pack.key].name }}</h2>
            <UiBadge v-if="pack.featured" variant="brand">
              <Sparkles class="h-3.5 w-3.5" :stroke-width="2" aria-hidden="true" />
              {{ fr.pricing.featuredBadge }}
            </UiBadge>
          </div>

          <div class="flex items-baseline gap-1.5">
            <span class="text-3xl font-bold text-ink-900">{{ pack.priceEur }} €</span>
            <span class="text-sm text-ink-500">· {{ pack.credits }} crédits</span>
          </div>

          <p class="text-sm leading-relaxed text-ink-500">{{ packs[pack.key].tagline }}</p>

          <ul class="space-y-1.5">
            <li
              v-for="(feat, i) in packs[pack.key].features"
              :key="i"
              class="flex items-start gap-2 text-sm text-ink-700"
            >
              <Check class="mt-0.5 h-4 w-4 shrink-0 text-brand-600" :stroke-width="2" aria-hidden="true" />
              {{ feat }}
            </li>
          </ul>

          <div class="mt-auto pt-2">
            <UiButton
              class="w-full"
              :variant="pack.featured ? 'primary' : 'secondary'"
              :loading="buying === pack.key"
              :disabled="buying !== null"
              @click="buy(pack.key)"
            >
              {{ packs[pack.key].cta }}
            </UiButton>
          </div>
        </div>
      </UiCard>
    </div>

    <p class="mt-6 text-center text-xs text-ink-400">{{ fr.pricing.legal }}</p>
  </div>
</template>

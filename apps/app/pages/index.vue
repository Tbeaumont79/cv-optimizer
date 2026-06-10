<script setup lang="ts">
import { ref, useId } from 'vue'
import { useRuntimeConfig, useHead } from '#imports'
import {
  Briefcase,
  Check,
  ChevronDown,
  ClipboardList,
  Compass,
  FileText,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  X,
} from '@lucide/vue'
import { useLanding } from '~/composables/useLanding'
import { buttonClasses } from '~/components/ui/button-classes'
import MagicLinkForm from '~/components/landing/MagicLinkForm.vue'
import CvMockup from '~/components/landing/CvMockup.vue'
import type { CreditPackConfig } from '~/config/pricing'

// Copy 100 % issue de useLanding() — aucun texte en dur (DoD i18n FR-first).
const { m, brand, packs, faqJsonLd } = useLanding()

const siteUrl = useRuntimeConfig().public.siteUrl

// SEO de base : title/meta, OpenGraph, canonical, JSON-LD FAQPage.
// `lang="fr"` est posé globalement (nuxt.config app.head.htmlAttrs).
useHead({
  title: m.meta.title,
  link: [{ rel: 'canonical', href: siteUrl }],
  meta: [
    { name: 'description', content: m.meta.description },
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: brand },
    { property: 'og:title', content: m.meta.title },
    { property: 'og:description', content: m.meta.description },
    { property: 'og:url', content: siteUrl },
    { property: 'og:locale', content: 'fr_FR' },
    { property: 'og:image', content: `${siteUrl}/og-image.png` },
    { name: 'twitter:card', content: 'summary_large_image' },
  ],
  script: [{ type: 'application/ld+json', innerHTML: faqJsonLd }],
})

// Icônes décoratives associées aux listes i18n (même ordre que la copy).
const STEP_ICONS = [FileText, ClipboardList, Sparkles] as const
const AUDIENCE_ICONS = [GraduationCap, Briefcase, Compass] as const

// Prix au format FR : entier sans décimales (« 5 € »), sinon 2 décimales (« 0,80 € »).
function formatEur(value: number): string {
  const digits = Number.isInteger(value) ? 0 : 2
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}

function perCvLabel(pack: CreditPackConfig): string {
  return m.pricing.perCv.replace('{price}', formatEur(pack.priceEur / pack.credits))
}

// FAQ : accordéon accessible (un seul panneau ouvert, ids uniques via useId).
const faqUid = useId()
const openFaq = ref<number | null>(0)
function toggleFaq(index: number) {
  openFaq.value = openFaq.value === index ? null : index
}
</script>

<template>
  <main id="top" class="min-h-full bg-surface text-ink-900">
    <!-- Le header global (nav + connexion) vient du layout par défaut. -->

    <!-- Hero -->
    <section class="relative overflow-hidden">
      <div
        class="pointer-events-none absolute -top-24 right-[-10%] h-96 w-96 rounded-full bg-brand-100/60 blur-3xl"
        aria-hidden="true"
      ></div>
      <div
        class="mx-auto grid max-w-6xl items-center gap-14 px-6 pb-24 pt-12 lg:grid-cols-2 lg:gap-16 lg:pb-28 lg:pt-20"
      >
        <div class="relative">
          <p class="text-xs font-semibold uppercase tracking-widest text-brand-600">
            {{ m.hero.eyebrow }}
          </p>
          <h1 class="mt-4 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
            {{ m.hero.h1Lead }}<br />
            <span class="text-brand-600">{{ m.hero.h1Accent }}</span>
          </h1>
          <p class="mt-6 max-w-xl text-lg leading-relaxed text-ink-600">{{ m.hero.subtitle }}</p>
          <div class="mt-8">
            <MagicLinkForm />
          </div>
          <p class="mt-4 text-sm text-ink-500">{{ m.hero.trust }}</p>
        </div>

        <!-- LE produit : pile avant/après de CV (CvMockup) -->
        <div class="relative px-4 sm:px-8 lg:px-0">
          <CvMockup />
        </div>
      </div>
    </section>

    <!-- Problème -->
    <section class="bg-surface-muted px-6 py-20 sm:py-24">
      <div class="mx-auto max-w-3xl text-center">
        <p class="text-xs font-semibold uppercase tracking-widest text-brand-600">
          {{ m.problem.eyebrow }}
        </p>
        <h2 class="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{{ m.problem.h2 }}</h2>
        <p class="mt-6 text-lg leading-relaxed text-ink-600">{{ m.problem.body }}</p>
        <p class="mt-6 text-lg font-semibold text-brand-600">{{ m.problem.transition }}</p>
      </div>
    </section>

    <!-- Comment ça marche -->
    <section class="px-6 py-20 sm:py-24">
      <div class="mx-auto max-w-6xl">
        <div class="mx-auto max-w-2xl text-center">
          <p class="text-xs font-semibold uppercase tracking-widest text-brand-600">
            {{ m.how.eyebrow }}
          </p>
          <h2 class="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{{ m.how.h2 }}</h2>
        </div>
        <ol class="mt-14 grid gap-6 md:grid-cols-3">
          <li
            v-for="(step, i) in m.how.steps"
            :key="i"
            class="rounded-card bg-surface p-7 shadow-card ring-1 ring-border transition-shadow duration-300 ease-out hover:shadow-card-hover"
          >
            <div class="flex items-center justify-between">
              <span
                class="flex h-12 w-12 items-center justify-center rounded-control bg-brand-50 text-brand-600"
              >
                <component
                  :is="STEP_ICONS[i]"
                  class="h-6 w-6"
                  :stroke-width="1.75"
                  aria-hidden="true"
                />
              </span>
              <span class="text-sm font-semibold tabular-nums text-ink-300" aria-hidden="true">
                0{{ i + 1 }}
              </span>
            </div>
            <h3 class="mt-5 text-lg font-semibold text-ink-900">{{ step.title }}</h3>
            <p class="mt-2 leading-relaxed text-ink-600">{{ step.body }}</p>
          </li>
        </ol>
      </div>
    </section>

    <!-- Garde-fou (différenciateur cœur) -->
    <section class="bg-ink-900 px-6 py-20 text-white sm:py-24">
      <div class="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <span
            class="inline-flex h-12 w-12 items-center justify-center rounded-control bg-white/10"
          >
            <ShieldCheck class="h-6 w-6 text-brand-300" :stroke-width="1.75" aria-hidden="true" />
          </span>
          <p class="mt-6 text-xs font-semibold uppercase tracking-widest text-brand-300">
            {{ m.guardrail.eyebrow }}
          </p>
          <h2 class="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{{ m.guardrail.h2 }}</h2>
          <p class="mt-6 leading-relaxed text-white/80">{{ m.guardrail.promise }}</p>
          <p class="mt-6 font-medium text-white">{{ m.guardrail.reassurance }}</p>
        </div>
        <ul class="space-y-4">
          <li
            v-for="(p, i) in m.guardrail.proof"
            :key="i"
            class="flex items-start gap-4 rounded-card bg-white/5 px-5 py-4 ring-1 ring-white/10"
          >
            <span
              class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
              :class="
                p.ok ? 'bg-success-500/20 text-success-500' : 'bg-danger-500/20 text-danger-500'
              "
            >
              <Check v-if="p.ok" class="h-4 w-4" :stroke-width="2" aria-hidden="true" />
              <X v-else class="h-4 w-4" :stroke-width="2" aria-hidden="true" />
            </span>
            <span class="leading-relaxed text-white/90">{{ p.text }}</span>
          </li>
        </ul>
      </div>
    </section>

    <!-- Pour qui -->
    <section class="px-6 py-20 sm:py-24">
      <div class="mx-auto max-w-6xl">
        <div class="mx-auto max-w-2xl text-center">
          <p class="text-xs font-semibold uppercase tracking-widest text-brand-600">
            {{ m.audience.eyebrow }}
          </p>
          <h2 class="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{{ m.audience.h2 }}</h2>
        </div>
        <div class="mt-14 grid gap-6 md:grid-cols-3">
          <article
            v-for="(c, i) in m.audience.cards"
            :key="i"
            class="rounded-card bg-surface-muted p-7 ring-1 ring-border transition-shadow duration-300 ease-out hover:shadow-card"
          >
            <span
              class="flex h-12 w-12 items-center justify-center rounded-control bg-brand-50 text-brand-600"
            >
              <component
                :is="AUDIENCE_ICONS[i]"
                class="h-6 w-6"
                :stroke-width="1.75"
                aria-hidden="true"
              />
            </span>
            <h3 class="mt-5 text-lg font-semibold text-ink-900">{{ c.title }}</h3>
            <p class="mt-2 leading-relaxed text-ink-600">{{ c.body }}</p>
          </article>
        </div>
      </div>
    </section>

    <!-- Pricing : crédits one-shot, pas d'abonnement -->
    <section id="tarifs" class="bg-surface-muted px-6 py-20 sm:py-24">
      <div class="mx-auto max-w-6xl">
        <div class="mx-auto max-w-2xl text-center">
          <p class="text-xs font-semibold uppercase tracking-widest text-brand-600">
            {{ m.pricing.eyebrow }}
          </p>
          <h2 class="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{{ m.pricing.h2 }}</h2>
          <p class="mt-6 leading-relaxed text-ink-600">{{ m.pricing.intro }}</p>
        </div>

        <div class="mx-auto mt-14 grid max-w-5xl gap-6 md:grid-cols-3">
          <!-- Carte « Gratuit » (2 générations offertes à l'inscription) -->
          <article class="flex flex-col rounded-card bg-surface p-7 shadow-xs ring-1 ring-border">
            <h3 class="text-lg font-semibold text-ink-900">{{ m.pricing.free.name }}</h3>
            <p class="mt-1 text-sm text-ink-500">{{ m.pricing.free.tagline }}</p>
            <p class="mt-5">
              <span class="text-4xl font-bold tracking-tight text-ink-900">
                {{ m.pricing.freePrice }}
              </span>
            </p>
            <p class="mt-1 text-sm font-medium text-ink-600">{{ m.pricing.free.creditsNote }}</p>
            <ul class="mt-6 flex-1 space-y-3 text-sm text-ink-700">
              <li
                v-for="(f, i) in m.pricing.free.features"
                :key="i"
                class="flex items-start gap-2.5"
              >
                <Check
                  class="mt-0.5 h-4 w-4 shrink-0 text-success-600"
                  :stroke-width="2"
                  aria-hidden="true"
                />
                <span>{{ f }}</span>
              </li>
            </ul>
            <NuxtLink to="/connexion" class="mt-8 w-full" :class="buttonClasses('secondary', 'lg')">
              {{ m.pricing.free.cta }}
            </NuxtLink>
          </article>

          <!-- Packs de crédits (config/pricing.ts, jamais en dur) -->
          <article
            v-for="pack in packs"
            :key="pack.key"
            class="relative flex flex-col rounded-card p-7"
            :class="
              pack.featured
                ? 'bg-brand-50/50 shadow-card ring-2 ring-brand-600'
                : 'bg-surface shadow-xs ring-1 ring-border'
            "
          >
            <span v-if="pack.featured" class="absolute -top-3 left-1/2 -translate-x-1/2">
              <UiBadge variant="brand">{{ m.pricing.featuredBadge }}</UiBadge>
            </span>
            <h3 class="text-lg font-semibold text-ink-900">
              {{ m.pricing.packs[pack.key].name }}
            </h3>
            <p class="mt-1 text-sm text-ink-500">{{ m.pricing.packs[pack.key].tagline }}</p>
            <p class="mt-5">
              <span class="text-4xl font-bold tracking-tight text-ink-900">
                {{ formatEur(pack.priceEur) }}
              </span>
            </p>
            <p class="mt-1 text-sm font-medium text-ink-600">
              {{ pack.credits }} {{ m.pricing.creditsSuffix }} · {{ perCvLabel(pack) }}
            </p>
            <ul class="mt-6 flex-1 space-y-3 text-sm text-ink-700">
              <li
                v-for="(f, i) in m.pricing.packs[pack.key].features"
                :key="i"
                class="flex items-start gap-2.5"
              >
                <Check
                  class="mt-0.5 h-4 w-4 shrink-0 text-success-600"
                  :stroke-width="2"
                  aria-hidden="true"
                />
                <span>{{ f }}</span>
              </li>
            </ul>
            <NuxtLink
              to="/connexion"
              class="mt-8 w-full"
              :class="buttonClasses(pack.featured ? 'primary' : 'secondary', 'lg')"
            >
              {{ m.pricing.packs[pack.key].cta }}
            </NuxtLink>
          </article>
        </div>

        <p class="mt-8 text-center text-sm text-ink-500">{{ m.pricing.legal }}</p>
      </div>
    </section>

    <!-- FAQ (+ JSON-LD FAQPage injecté via useHead) -->
    <section class="px-6 py-20 sm:py-24">
      <div class="mx-auto max-w-3xl">
        <div class="text-center">
          <p class="text-xs font-semibold uppercase tracking-widest text-brand-600">
            {{ m.faq.eyebrow }}
          </p>
          <h2 class="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{{ m.faq.h2 }}</h2>
        </div>
        <div class="mt-12 space-y-3">
          <div
            v-for="(item, i) in m.faq.items"
            :key="i"
            class="overflow-hidden rounded-card bg-surface ring-1 ring-border transition-shadow duration-300 ease-out"
            :class="openFaq === i ? 'shadow-card' : ''"
          >
            <h3>
              <button
                type="button"
                class="flex w-full items-center justify-between gap-4 rounded-card px-5 py-4 text-left font-semibold text-ink-900 transition-colors duration-300 ease-out hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
                :aria-expanded="openFaq === i"
                :aria-controls="`${faqUid}-panel-${i}`"
                @click="toggleFaq(i)"
              >
                <span>{{ item.q }}</span>
                <ChevronDown
                  class="h-5 w-5 shrink-0 text-ink-500 transition-transform duration-300 ease-out"
                  :class="openFaq === i ? 'rotate-180' : ''"
                  :stroke-width="2"
                  aria-hidden="true"
                />
              </button>
            </h3>
            <div
              :id="`${faqUid}-panel-${i}`"
              class="grid transition-[grid-template-rows] duration-300 ease-out"
              :class="openFaq === i ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'"
              :aria-hidden="openFaq === i ? undefined : 'true'"
            >
              <div class="overflow-hidden">
                <p class="px-5 pb-5 leading-relaxed text-ink-600">{{ item.a }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA final -->
    <section
      class="relative overflow-hidden bg-brand-600 px-6 py-20 text-center text-white sm:py-24"
    >
      <div
        class="pointer-events-none absolute -bottom-32 left-1/2 h-80 w-[40rem] -translate-x-1/2 rounded-full bg-brand-500/40 blur-3xl"
        aria-hidden="true"
      ></div>
      <div class="relative mx-auto max-w-2xl">
        <h2 class="text-3xl font-bold tracking-tight sm:text-4xl">{{ m.finalCta.h2 }}</h2>
        <div class="mt-10 flex justify-center">
          <MagicLinkForm />
        </div>
        <p class="mt-4 text-sm text-white/80">{{ m.finalCta.trust }}</p>
      </div>
    </section>

    <!-- Footer -->
    <footer class="border-t border-border bg-surface px-6 py-10">
      <div
        class="mx-auto flex max-w-6xl flex-col items-center gap-4 sm:flex-row sm:justify-between"
      >
        <nav class="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-ink-600">
          <a
            v-for="(l, i) in m.footer.links"
            :key="i"
            :href="l.href"
            class="transition-colors duration-300 ease-out hover:text-brand-600"
          >
            {{ l.label }}
          </a>
        </nav>
        <p class="text-sm text-ink-500">{{ m.footer.copyright }}</p>
      </div>
    </footer>
  </main>
</template>

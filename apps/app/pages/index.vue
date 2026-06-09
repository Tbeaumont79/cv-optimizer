<script setup lang="ts">
import { useRuntimeConfig, useHead } from '#imports'
import { useLanding } from '~/composables/useLanding'
import MagicLinkForm from '~/components/landing/MagicLinkForm.vue'

// Copy 100 % issue de useLanding() — aucun texte en dur (DoD i18n FR-first).
const { m, brand, plans, faqJsonLd } = useLanding()

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

function priceLabel(priceEur: number | null): string {
  return priceEur === null ? m.pricing.free : `${priceEur} €`
}
</script>

<template>
  <main id="top" class="min-h-full bg-surface text-ink-900">
    <!-- Hero -->
    <section class="mx-auto max-w-5xl px-6 pb-16 pt-20 text-center">
      <h1 class="text-4xl font-bold leading-tight sm:text-5xl">
        {{ m.hero.h1Lead }}<br />
        <span class="text-brand-600">{{ m.hero.h1Accent }}</span>
      </h1>
      <p class="mx-auto mt-6 max-w-2xl text-lg text-ink-700">{{ m.hero.subtitle }}</p>
      <div class="mt-8 flex justify-center">
        <MagicLinkForm id="hero-email" />
      </div>
      <p class="mt-4 text-sm text-ink-500">{{ m.hero.trust }}</p>

      <!-- Visuel avant/après (placeholder structuré ; asset hero = demande dédiée design) -->
      <div class="mx-auto mt-12 grid max-w-3xl gap-4 sm:grid-cols-2">
        <figure class="rounded-card border border-ink-500/20 bg-surface-muted p-5 text-left">
          <figcaption class="text-xs font-semibold uppercase tracking-wide text-ink-500">
            {{ m.hero.visualBefore }}
          </figcaption>
          <div class="mt-3 space-y-2" aria-hidden="true">
            <div class="h-2 w-3/4 rounded bg-ink-500/20"></div>
            <div class="h-2 w-full rounded bg-ink-500/20"></div>
            <div class="h-2 w-5/6 rounded bg-ink-500/20"></div>
          </div>
        </figure>
        <figure class="rounded-card border border-brand-500/40 bg-brand-50 p-5 text-left">
          <figcaption class="text-xs font-semibold uppercase tracking-wide text-brand-700">
            {{ m.hero.visualAfter }}
          </figcaption>
          <div class="mt-3 space-y-2" aria-hidden="true">
            <div class="h-2 w-5/6 rounded bg-brand-500"></div>
            <div class="h-2 w-full rounded bg-brand-500/60"></div>
            <div class="h-2 w-2/3 rounded bg-ink-500/20"></div>
          </div>
          <figcaption class="mt-3 text-xs text-ink-700">{{ m.hero.visualNote }}</figcaption>
        </figure>
      </div>
    </section>

    <!-- Problème -->
    <section class="bg-surface-muted px-6 py-16">
      <div class="mx-auto max-w-3xl text-center">
        <h2 class="text-2xl font-bold sm:text-3xl">{{ m.problem.h2 }}</h2>
        <p class="mt-4 text-ink-700">{{ m.problem.body }}</p>
        <p class="mt-4 font-semibold text-brand-600">{{ m.problem.transition }}</p>
      </div>
    </section>

    <!-- Comment ça marche -->
    <section class="px-6 py-16">
      <div class="mx-auto max-w-5xl">
        <h2 class="text-center text-2xl font-bold sm:text-3xl">{{ m.how.h2 }}</h2>
        <ol class="mt-10 grid gap-8 md:grid-cols-3">
          <li v-for="(step, i) in m.how.steps" :key="i" class="text-center">
            <span
              class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-lg font-bold text-white"
            >
              {{ i + 1 }}
            </span>
            <h3 class="mt-4 text-lg font-semibold">{{ step.title }}</h3>
            <p class="mt-2 text-ink-700">{{ step.body }}</p>
          </li>
        </ol>
      </div>
    </section>

    <!-- Garde-fou (différenciateur cœur) -->
    <section class="bg-ink-900 px-6 py-16 text-white">
      <div class="mx-auto max-w-3xl text-center">
        <h2 class="text-2xl font-bold sm:text-3xl">{{ m.guardrail.h2 }}</h2>
        <p class="mt-4 text-white/80">{{ m.guardrail.promise }}</p>
        <ul class="mx-auto mt-8 max-w-xl space-y-3 text-left">
          <li
            v-for="(p, i) in m.guardrail.proof"
            :key="i"
            class="flex items-start gap-3 rounded-card bg-white/5 px-4 py-3"
          >
            <span class="text-lg" :class="p.ok ? 'text-success-500' : 'text-danger-500'">
              {{ p.ok ? '✅' : '❌' }}
            </span>
            <span class="text-white/90">{{ p.text }}</span>
          </li>
        </ul>
        <p class="mt-6 font-medium text-white">{{ m.guardrail.reassurance }}</p>
      </div>
    </section>

    <!-- Pour qui -->
    <section class="px-6 py-16">
      <div class="mx-auto max-w-5xl">
        <h2 class="text-center text-2xl font-bold sm:text-3xl">{{ m.audience.h2 }}</h2>
        <div class="mt-10 grid gap-6 md:grid-cols-3">
          <article
            v-for="(c, i) in m.audience.cards"
            :key="i"
            class="rounded-card border border-ink-500/20 bg-surface-muted p-6"
          >
            <h3 class="text-lg font-semibold">{{ c.title }}</h3>
            <p class="mt-2 text-ink-700">{{ c.body }}</p>
          </article>
        </div>
      </div>
    </section>

    <!-- Pricing -->
    <section id="tarifs" class="bg-surface-muted px-6 py-16">
      <div class="mx-auto max-w-4xl">
        <h2 class="text-center text-2xl font-bold sm:text-3xl">{{ m.pricing.h2 }}</h2>
        <div class="mt-10 grid gap-6 md:grid-cols-2">
          <article
            v-for="plan in plans"
            :key="plan.key"
            class="flex flex-col rounded-card border bg-surface p-6"
            :class="plan.featured ? 'border-brand-600 shadow-md' : 'border-ink-500/20'"
          >
            <h3 class="text-lg font-semibold">{{ m.pricing.plans[plan.key].name }}</h3>
            <p class="mt-2">
              <span class="text-3xl font-bold">{{ priceLabel(plan.priceEur) }}</span>
              <span v-if="plan.priceEur !== null" class="text-ink-500">{{
                m.pricing.perMonth
              }}</span>
            </p>
            <p class="mt-1 text-sm text-ink-500">{{ m.pricing.plans[plan.key].tagline }}</p>
            <ul class="mt-4 flex-1 space-y-2 text-sm text-ink-700">
              <li v-for="(f, i) in m.pricing.plans[plan.key].features" :key="i" class="flex gap-2">
                <span class="text-success-500">✓</span>{{ f }}
              </li>
            </ul>
            <a
              href="#top"
              class="mt-6 rounded-card px-5 py-3 text-center font-semibold transition"
              :class="
                plan.featured
                  ? 'bg-brand-600 text-white hover:bg-brand-700'
                  : 'border border-brand-600 text-brand-600 hover:bg-brand-50'
              "
            >
              {{ m.pricing.plans[plan.key].cta }}
            </a>
          </article>
        </div>
        <p class="mt-6 text-center text-sm text-ink-500">{{ m.pricing.legal }}</p>
      </div>
    </section>

    <!-- FAQ (+ JSON-LD FAQPage injecté via useHead) -->
    <section class="px-6 py-16">
      <div class="mx-auto max-w-3xl">
        <h2 class="text-center text-2xl font-bold sm:text-3xl">{{ m.faq.h2 }}</h2>
        <dl class="mt-10 space-y-4">
          <div
            v-for="(item, i) in m.faq.items"
            :key="i"
            class="rounded-card border border-ink-500/20 p-5"
          >
            <dt class="font-semibold">{{ item.q }}</dt>
            <dd class="mt-2 text-ink-700">{{ item.a }}</dd>
          </div>
        </dl>
      </div>
    </section>

    <!-- CTA final -->
    <section class="bg-brand-600 px-6 py-16 text-center text-white">
      <div class="mx-auto max-w-2xl">
        <h2 class="text-2xl font-bold sm:text-3xl">{{ m.finalCta.h2 }}</h2>
        <div class="mt-8 flex justify-center">
          <MagicLinkForm id="final-email" />
        </div>
        <p class="mt-4 text-sm text-white/80">{{ m.finalCta.trust }}</p>
      </div>
    </section>

    <!-- Footer -->
    <footer class="border-t border-ink-500/20 bg-surface px-6 py-10">
      <div
        class="mx-auto flex max-w-5xl flex-col items-center gap-4 sm:flex-row sm:justify-between"
      >
        <nav class="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-ink-700">
          <a v-for="(l, i) in m.footer.links" :key="i" :href="l.href" class="hover:text-brand-600">
            {{ l.label }}
          </a>
        </nav>
        <p class="text-sm text-ink-500">{{ m.footer.copyright }}</p>
      </div>
    </footer>
  </main>
</template>

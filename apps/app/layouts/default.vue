<template>
  <div class="flex min-h-full flex-col bg-surface-muted">
    <header class="border-b border-border bg-surface">
      <div class="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
        <NuxtLink to="/" class="text-lg font-bold text-ink-900">CV Optimizer</NuxtLink>
        <nav class="flex gap-4 text-sm text-ink-700">
          <NuxtLink to="/ui" class="hover:text-brand-600">Design system</NuxtLink>
        </nav>
      </div>
    </header>

    <main class="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <slot />
    </main>

    <footer class="border-t border-border bg-surface">
      <div class="mx-auto max-w-4xl px-6 py-4 text-sm text-ink-500">
        CV Optimizer — génération de CV adaptés aux offres.
      </div>
    </footer>
  </div>
</template>

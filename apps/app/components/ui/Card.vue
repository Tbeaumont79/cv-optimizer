<script setup lang="ts">
// Conteneur de contenu. Titre simple via prop, ou en-tête/pied riches via slots.
defineProps<{ title?: string }>()
</script>

<template>
  <section class="rounded-card bg-surface p-6 shadow-card ring-1 ring-border">
    <header v-if="title || $slots.header" class="mb-4">
      <slot name="header">
        <h2 class="text-lg font-semibold text-ink-900">{{ title }}</h2>
      </slot>
    </header>
    <slot />
    <footer v-if="$slots.footer" class="mt-4 border-t border-border pt-4">
      <slot name="footer" />
    </footer>
  </section>
</template>

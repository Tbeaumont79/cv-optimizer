<script setup lang="ts">
// Indicateur de chargement. Hérite de la couleur du texte (text-current) pour
// s'adapter à son contexte (bouton, état vide…).
withDefaults(defineProps<{ label?: string }>(), { label: 'Chargement…' })
</script>

<template>
  <svg
    class="animate-spin text-current"
    viewBox="0 0 24 24"
    fill="none"
    role="status"
    :aria-label="label"
  >
    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
  </svg>
</template>

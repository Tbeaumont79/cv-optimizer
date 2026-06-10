<script setup lang="ts">
// Habillage commun d'un champ : label, contrôle (slot) puis message d'aide/erreur.
// Les contrôles (UiInput, UiTextarea) fournissent le contrôle dans le slot par défaut.
defineProps<{
  fieldId: string
  label?: string
  hint?: string
  error?: string
  required?: boolean
}>()
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" :for="fieldId" class="text-sm font-medium text-ink-700">
      {{ label }}<span v-if="required" class="text-danger-500" aria-hidden="true"> *</span>
    </label>
    <slot />
    <p v-if="error" :id="`${fieldId}-error`" aria-live="polite" class="text-sm text-danger-600">
      {{ error }}
    </p>
    <p v-else-if="hint" :id="`${fieldId}-hint`" class="text-sm text-ink-500">{{ hint }}</p>
  </div>
</template>

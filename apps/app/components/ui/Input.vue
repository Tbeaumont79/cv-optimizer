<script setup lang="ts">
// Les attributs natifs non déclarés (maxlength, autocomplete, min…) doivent
// atterrir sur l'<input>, pas sur le wrapper UiFormField.
defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    label?: string
    type?: string
    placeholder?: string
    hint?: string
    error?: string
    disabled?: boolean
    required?: boolean
  }>(),
  { type: 'text', disabled: false, required: false },
)

const model = defineModel<string>({ default: '' })
const { id, describedBy } = useField(props)
</script>

<template>
  <UiFormField :field-id="id" :label="label" :hint="hint" :error="error" :required="required">
    <input
      :id="id"
      v-bind="$attrs"
      v-model="model"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :aria-invalid="error ? true : undefined"
      :aria-describedby="describedBy"
      class="h-10 w-full rounded-control bg-surface px-3 text-sm text-ink-900 ring-1 ring-border transition placeholder:text-ink-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-60"
      :class="error ? 'ring-danger-500 focus-visible:ring-danger-500' : ''"
    />
  </UiFormField>
</template>

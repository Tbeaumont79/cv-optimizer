<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    label?: string
    placeholder?: string
    hint?: string
    error?: string
    rows?: number
    disabled?: boolean
    required?: boolean
  }>(),
  { rows: 4, disabled: false, required: false },
)

const model = defineModel<string>({ default: '' })
const { id, describedBy } = useField(props)
</script>

<template>
  <UiFormField :field-id="id" :label="label" :hint="hint" :error="error" :required="required">
    <textarea
      :id="id"
      v-model="model"
      :rows="rows"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :aria-invalid="error ? true : undefined"
      :aria-describedby="describedBy"
      class="w-full resize-y rounded-control bg-surface px-3 py-2 text-sm text-ink-900 ring-1 ring-border transition placeholder:text-ink-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-60"
      :class="error ? 'ring-danger-500 focus-visible:ring-danger-500' : ''"
    />
  </UiFormField>
</template>

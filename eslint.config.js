// @ts-check
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import vue from 'eslint-plugin-vue'

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/.nuxt/**',
      '**/.output/**',
      'apps/app/prisma/migrations/**',
      '**/*.cjs',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // 'essential' = vraies erreurs Vue uniquement ; le formatage est délégué à Prettier.
  ...vue.configs['flat/essential'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      'vue/multi-word-component-names': 'off',
      // TS gère les références non définies ; Nuxt auto-importe (defineEventHandler,
      // useFetch, ref…) → no-undef ferait des faux positifs.
      'no-undef': 'off',
    },
  },
)

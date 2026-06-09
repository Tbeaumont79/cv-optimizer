import tailwindcss from '@tailwindcss/vite'
import type { PluginOption } from 'vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },

  // TS strict des deux côtés (front Vue + serveur Nitro).
  typescript: {
    strict: true,
    // Le typecheck tourne en CI via `nuxt typecheck` (pas au dev pour la vitesse).
    typeCheck: false,
  },

  // FR-first, i18n-ready (modules i18n ajoutés dans un WS dédié).
  app: {
    head: {
      htmlAttrs: { lang: 'fr' },
      title: 'CV Optimizer',
    },
  },

  css: ['~/assets/css/main.css'],

  // Tailwind v4 via le plugin Vite officiel ; tokens dans assets/css/main.css.
  // @tailwindcss/vite est typé contre Vite 7 (celui que Nuxt 3.21 embarque à
  // l'exécution), mais une copie de types Vite 5 traîne dans le graphe → le cast
  // aligne les types sans rien changer au runtime (build/dev restent verts).
  vite: {
    plugins: [tailwindcss() as PluginOption],
  },

  runtimeConfig: {
    // DATABASE_URL est lue côté serveur uniquement (jamais exposée au client).
    databaseUrl: process.env.DATABASE_URL,
  },
})

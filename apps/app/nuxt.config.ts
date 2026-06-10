import tailwindcss from '@tailwindcss/vite'
import type { PluginOption } from 'vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },

  // Chargement réel des fontes (self-hosted au build — pas de requête Google au runtime).
  // La famille est consommée via le token --font-sans (assets/css/main.css).
  modules: ['@nuxt/fonts'],
  fonts: {
    families: [{ name: 'Plus Jakarta Sans', provider: 'google', weights: [400, 500, 600, 700, 800] }],
  },

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
      // Titre global de repli = nom de marque. La landing surcharge avec un
      // <title> SEO dédié ; le nom vient du token BRAND (config/brand.ts).
      title: 'Teven',
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
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
    // Serveur uniquement (jamais exposées au client).
    databaseUrl: process.env.DATABASE_URL,
    // Clé secrète Better Auth (BETTER_AUTH_SECRET en prod, min 32 chars).
    authSecret: process.env.BETTER_AUTH_SECRET ?? 'dev-secret-change-in-prod-min32chars!!',
    // SMTP optionnel (dev : log console ; prod : fournir SMTP_HOST).
    smtpHost: process.env.SMTP_HOST ?? '',
    smtpPort: process.env.SMTP_PORT ?? '587',
    smtpUser: process.env.SMTP_USER ?? '',
    smtpPass: process.env.SMTP_PASS ?? '',
    mailFrom: process.env.MAIL_FROM ?? '',

    public: {
      // URL canonique du site (SEO/OG/sitemap). Override via NUXT_PUBLIC_SITE_URL au déploiement.
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL ?? 'https://cv-optimizer.example.com',
      // URL de base de l'app (utilisée par Better Auth pour générer les liens magic-link).
      appUrl: process.env.APP_URL ?? 'http://localhost:3000',
    },
  },
})

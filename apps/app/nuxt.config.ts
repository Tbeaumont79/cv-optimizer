import tailwindcss from '@tailwindcss/vite'
import type { PluginOption } from 'vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },

  // Chargement réel des fontes (self-hosted au build — pas de requête Google au runtime).
  // La famille est consommée via le token --font-sans (assets/css/main.css).
  modules: ['@nuxt/fonts', 'nuxt-security'],
  fonts: {
    families: [{ name: 'Plus Jakarta Sans', provider: 'google', weights: [400, 500, 600, 700, 800] }],
  },

  // Durcissement HTTP (nuxt-security). Headers appliqués globalement ; la CSP est
  // en Report-Only tant qu'elle n'a pas été validée au navigateur (elle n' observe
  // et ne bloque RIEN dans cet état — voir /api/_security si besoin).
  security: {
    // CSP ACTIVE (bloquante) : validée au navigateur via le collecteur /api/csp-report
    // (0 violation après allowlist Google Fonts). Le header report-uri reste actif pour
    // continuer à monitorer d'éventuelles violations en prod.
    contentSecurityPolicyReportOnly: false,
    // Rate-limit global désactivé : on gère finement ailleurs (Better Auth pour le
    // magic-link, compteur par utilisateur pour /analyze). Le limiteur intégré est
    // par-IP en mémoire (par instance) → insuffisant pour l'abus économique.
    rateLimiter: false,
    // Le magic-link + les uploads PDF (cv-design/extract, 8 Mo) doivent passer.
    requestSizeLimiter: {
      maxRequestSizeInBytes: 2_000_000, // corps JSON standard (2 Mo)
      maxUploadFileRequestInBytes: 12_000_000, // > 8 Mo pour l'upload PDF multipart
    },
    // CSP en observation d'abord : header Report-Only (ne bloque pas).
    // Passer à `false` une fois la CSP validée pour l'appliquer réellement.
    headers: {
      contentSecurityPolicy: {
        'base-uri': ["'self'"],
        'default-src': ["'self'"],
        'object-src': ["'none'"],
        'frame-ancestors': ["'none'"],
        'img-src': ["'self'", 'data:'],
        // Google Fonts pour le rendu du CV (cv-html.ts injecte un <link> selon la
        // police du design). Suivi #3 : auto-héberger ces polices pour retirer ces
        // deux hôtes distants et la requête sortante au rendu.
        'font-src': ["'self'", 'https://fonts.gstatic.com'],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'script-src': ["'self'", "'nonce-{{nonce}}'", "'strict-dynamic'"],
        'connect-src': ["'self'"],
        'form-action': ["'self'"],
        'upgrade-insecure-requests': true,
        // Collecteur de violations (phase Report-Only) — voir server/api/csp-report.
        'report-uri': ['/api/csp-report'],
      },
      strictTransportSecurity: { maxAge: 63072000, includeSubdomains: true, preload: true },
      xFrameOptions: 'DENY',
      referrerPolicy: 'strict-origin-when-cross-origin',
      permissionsPolicy: { camera: [], microphone: [], geolocation: [], payment: [] },
    },
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

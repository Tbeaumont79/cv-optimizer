# 02 — Architecture

## Le monorepo

```
cv-optimizer/
├─ apps/
│  └─ app/                    # L'application Nuxt 3 full-stack
│     ├─ pages/               # Routes Vue (front)
│     ├─ components/          # Composants Vue (ui/, cv/, landing/)
│     ├─ composables/         # Logique front réutilisable (useAuth, useToast…)
│     ├─ layouts/ middleware/ # Layout global + garde de navigation (auth)
│     ├─ config/ i18n/        # Marque, pricing, textes FR
│     ├─ assets/css/          # Tokens de design Tailwind v4
│     ├─ utils/               # Utils front (photo-crop, health-label)
│     ├─ server/              # ⬅️ L'API (serveur Nitro) — voir plus bas
│     ├─ prisma/              # schema.prisma + migrations
│     ├─ scripts/             # stripe-seed.ts
│     └─ test/                # Tests unitaires Vitest (côté app)
├─ packages/
│  └─ shared/                 # @cvo/shared : types & logique partagés client ↔ serveur
├─ docs/                      # Documentation (dont ce dossier onboarding/)
├─ scripts/                   # pre-merge.sh, mock-llm.mjs
└─ docker-compose.yml         # PostgreSQL local
```

### `apps/app/server/` — l'API (Nitro)

C'est le cœur backend. Nitro mappe l'arborescence de fichiers sur des routes.

```
server/
├─ api/                # Endpoints HTTP (le nom du fichier = la route + la méthode)
│  ├─ auth/[...all].ts        # tout /api/auth/** délégué à Better Auth
│  ├─ profile/…               # CRUD profil candidat
│  ├─ candidature/…           # analyze + generate (LLM)
│  ├─ candidatures/…          # CRUD des candidatures persistées
│  ├─ cv/…                    # preview (HTML) + export-pdf
│  ├─ billing/…               # checkout + webhook + summary (Stripe)
│  ├─ usage/current.get.ts    # compteurs d'usage
│  ├─ health.get.ts           # preuve de vie
│  └─ csp-report.post.ts      # collecteur de violations CSP
├─ middleware/auth.ts   # s'exécute sur CHAQUE requête : pose event.context.userId
├─ plugins/00.validate-env.ts # fail-fast au boot (secrets prod)
├─ routes/sitemap.xml.ts# routes non-/api (sitemap)
├─ services/            # logique métier LLM (offer-analysis, matching, match-report…)
└─ utils/               # briques serveur (prisma, auth, stripe, pdf, credits, cv-html…)
```

> **Convention Nitro** : `server/api/foo/bar.post.ts` → `POST /api/foo/bar`.
> `[id]` = paramètre dynamique (`getRouterParam(event, 'id')`).
> `[...all]` = catch-all (toutes les sous-routes).

### `packages/shared` (`@cvo/shared`)

Types TypeScript et **logique pure** partagés entre le front et le serveur : contrats
d'API, types du CV, garde-fou de provenance, quotas, pricing. Importé partout via
`@cvo/shared` (workspace pnpm). **Doit être buildé** (`tsc`) avant l'app — c'est fait
automatiquement par `pnpm build`/`typecheck`/`test`. Voir [03](./03-modele-de-donnees.md)
et [06](./06-pipeline-candidature.md).

## Principe directeur : tout le sensible est côté serveur

Le navigateur ne voit **jamais** : les clés API (Anthropic, Stripe), les prompts, les
données brutes d'un autre utilisateur. Le front appelle des endpoints `/api/*` ; le
serveur Nitro fait le travail (DB, LLM, Stripe, PDF) et ne renvoie que le strict
nécessaire. C'est aussi une exigence RGPD (voir [`docs/rgpd.md`](../rgpd.md)).

## Cycle de vie d'une requête API

```
Navigateur ──HTTP──▶ Nitro
                       │
                       ├─ 1. server/middleware/auth.ts
                       │      résout la session Better Auth (cookie)
                       │      → pose event.context.userId (ou undefined)
                       │      ⚠️ NON bloquant : ne lève jamais 401 lui-même
                       │
                       ├─ 2. nuxt-security (headers, CSP, size limiter)
                       │
                       └─ 3. le handler de l'endpoint
                              ├─ requireUserId(event) ── si besoin d'auth → 401 si absent
                              ├─ validation Zod du body
                              ├─ Prisma (DB) / services LLM / Stripe / PDF
                              └─ réponse JSON (ou binaire pour le PDF)
```

### Le modèle d'authentification (à bien comprendre)

C'est un modèle **opt-in par route**, en deux temps :

1. **Producteur** — `server/middleware/auth.ts` tourne sur *toutes* les requêtes,
   résout la session et **pose `event.context.userId`** (ou le laisse `undefined`).
   Il **ne bloque jamais**.
2. **Consommateur** — chaque endpoint qui exige l'auth appelle
   **`requireUserId(event)`** (`server/utils/session.ts`), qui lit
   `event.context.userId` et **lève une 401** s'il est absent.

> ⚠️ **Conséquence pour toi** : un endpoint qui **oublie** `requireUserId` est
> **ouvert au public**. C'est déjà arrivé (l'export PDF, corrigé dans l'audit sécu).
> Réflexe : tout nouvel endpoint qui lit/écrit des données d'un user **commence** par
> `const userId = requireUserId(event)`.

### Le flux magic-link (Better Auth)

```
1. POST /api/auth/sign-in/magic-link  { email }   → envoie un lien (mail ou log dev)
2. GET  /api/auth/magic-link/verify?token=…       → valide, pose le cookie de session,
                                                     redirige vers callbackURL (ex. /profil)
3. Requêtes suivantes : le cookie `better-auth.session_token` authentifie l'utilisateur
```

Better Auth stocke ses données dans les tables `sessions` / `accounts` / `verifications`
(voir [03](./03-modele-de-donnees.md)). Côté front, le composable `useAuth()`
enveloppe le client Better Auth.

## Stack technique (récap)

| Couche | Techno | Où |
|---|---|---|
| Front | Vue 3 (SFC), Nuxt 3 | `apps/app/pages`, `components`, `composables` |
| Styles | Tailwind v4 (tokens `@theme`) | `apps/app/assets/css/main.css` |
| API | Nitro (Nuxt server) | `apps/app/server` |
| DB | PostgreSQL + Prisma | `apps/app/prisma`, `server/utils/prisma.ts` |
| Auth | Better Auth (magic-link) | `server/utils/auth.ts` |
| LLM | Claude (Anthropic) | `server/utils/anthropic.ts`, `server/services/*` |
| PDF | Chromium (playwright-core) | `server/utils/pdf.ts` |
| Paiement | Stripe Checkout | `server/utils/stripe.ts`, `server/api/billing/*` |
| Types partagés | `@cvo/shared` | `packages/shared` |
| Sécurité HTTP | nuxt-security (headers, CSP) | `apps/app/nuxt.config.ts` |

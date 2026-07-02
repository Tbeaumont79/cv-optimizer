# 05 — Frontend (Nuxt 3 / Vue 3)

Front en Vue 3 `<script setup lang="ts">`, Tailwind v4, Better Auth (magic-link),
icônes `@lucide/vue`. **Tous les textes** viennent de `i18n/fr.ts` et **tous les
contrats d'API** (chemins, codes, DTO) de `@cvo/shared` — jamais d'URL ni de string en dur.

> **Auto-imports Nuxt** : les composables (`useAuth`, `useToast`…), le contenu de
> `utils/`, et les composants `Ui*`/`Cv*` sont disponibles **sans import** dans les
> templates.

## Pages (`apps/app/pages/`)

| Fichier | Route | Auth | Rôle | Endpoints appelés |
|---|---|---|---|---|
| `index.vue` | `/` | — | Landing marketing (hero, problème, étapes, garde-fou, pricing, FAQ). SEO + JSON-LD. | aucun |
| `connexion.vue` | `/connexion` | — (`layout: false`, plein écran) | Saisie e-mail → envoi magic-link → écran « vérifie ta boîte ». | `useAuth().signIn` → Better Auth |
| `profil.vue` | `/profil` | **Oui** | **Édition du profil** (en-tête, expériences, formations, compétences, langues, « compétences clés »), import copier-coller, import CV PDF (capture design + pré-remplissage). ~1700 lignes. | `GET/PUT /api/profile` ; `POST/DELETE /api/profile/{experiences,skills,languages,education}[/:id]` ; `POST /api/profile/import-text` ; `POST /api/profile/cv-design/extract` ; `PUT/DELETE /api/profile/cv-design` |
| `candidature.vue` | `/candidature` | **Oui** | **Parcours candidature** : colle une offre → analyse + score → génération. Machine à états `input/analyzing/scored/generating`, gating crédits, garde profil vide. | `GET /api/billing/summary` ; `GET /api/profile` ; `POST /api/candidature/analyze` ; `POST /api/candidature/generate` |
| `candidatures/index.vue` | `/candidatures` | **Oui** | Liste des candidatures (badge statut + score). | `GET /api/candidatures` |
| `candidatures/[id].vue` | `/candidatures/:id` | **Oui** | **Éditeur CV in-app** : édition sections (provenance-safe), panneau design + photo, aperçu live débouncé (iframe), avertissement « 1 page », sauvegarde, statut, export PDF, suppression. | `GET/PATCH/DELETE /api/candidatures/:id` ; `POST /api/cv/preview` ; `POST /api/cv/export-pdf` |
| `cv/demo.vue` | `/cv/demo` | — | Aperçu statique d'un `RenderableCv` de démo + export PDF. Page vitrine. | `POST /api/cv/export-pdf` |

> ⚠️ **Note sécu** : `cv/demo` est **publique** mais l'export PDF exige désormais
> l'auth (voir [08](./08-securite.md)) — l'export ne marche donc que connecté.

## Composants (`apps/app/components/`)

### `ui/` — le design system (préfixe auto-import `Ui*`)
Briques génériques, sans logique métier :
- **`Button.vue`** + **`button-classes.ts`** — le bouton délègue ses classes à la
  fonction **pure** `buttonClasses(variant, size)` (variants `primary/secondary/ghost/danger`,
  tailles `sm/md/lg`) → testable hors Vue (`test/button-classes.spec.ts`).
- **`Input.vue`** / **`Textarea.vue`** — champs `v-model`, câblés a11y via `useField`,
  habillés par **`FormField.vue`** (label + hint/erreur, ids `-error`/`-hint`).
- **`Card.vue`** (conteneur `rounded-card`), **`Badge.vue`** (pastille), **`Dialog.vue`**
  (modale de confirmation : `Teleport`, focus trap, Escape), **`State.vue`**
  (loading/error/empty), **`Toaster.vue`** (pile de toasts, montée une fois dans `app.vue`),
  **`Spinner.vue`**, **`Skeleton.vue`**.

### `landing/`
- **`MagicLinkForm.vue`** — formulaire e-mail (monté 2× sur la landing, ids via `useId`).
  Prop `onSubmit` surchargeable, sinon `useAuth().signIn`.
- **`CvMockup.vue`** — visuel hero « avant/après » (décoratif, `aria-hidden`).

### `cv/` — le cœur métier CV
- **`CvTemplate.vue`** ⭐ — **rendu déterministe d'un `RenderableCv`, seule source de
  vérité du style à l'écran.** Rend le header (identité + contacts) puis chaque
  `CvSection` typée par `kind` (narrowing exhaustif : `summary`/`keyskills`/`experience`/
  `skills`/`education`/`languages`). L'élément `#cv-render` est la **cible du Chromium
  headless** à l'export ; `.cv-page` = cible `@media print`. Tokens Tailwind uniquement.
- **`CvDesignPanel.vue`** — panneau de tokens de design (`defineModel<CvDesign>`) :
  disposition (`single`/`sidebar-left`), couleurs (accent, sidebar), `sidebarRadius`,
  photo (position/taille/marge/padding), police (liste alignée sur `sanitizeFont` côté serveur).
- **`CvPhotoInput.vue`** — upload + **recadrage carré client-side** (`defineModel<string|null>`
  = data-URL JPEG). Cropper maison (drag + zoom), s'appuie sur `utils/photo-crop.ts`.
  Sortie bornée (256–768 px, qualité JPEG dégradée pour rester sous ~620k chars, plafond serveur 700k).

### Racine
- **`HealthCheck.vue`** — appelle `/api/health`, affiche l'état via `healthLabel()`.

## Composables (`apps/app/composables/`)

| Composable | API exposée | Rôle |
|---|---|---|
| **`useAuth`** | `{ session, signIn(email)→bool, signOut(), pending, error }` | Enveloppe le **client** Better Auth (plugin magic-link). `signIn` envoie le lien (`callbackURL: '/profil'`). |
| **`useField`** | `{ id, describedBy }` | Helper a11y pur (ids SSR-safe, `aria-describedby`). Consommé par `Input`/`Textarea`. |
| **`useLanding`** | `{ m, brand, packs, freeGenerations, faqJsonLd }` | Interpole `{brand}`/`{freeGenerations}` dans la copy `fr`. |
| **`useToast`** | `{ toasts, dismiss, success, error, info }` | État partagé (`useState`, SSR-safe). Auto-dismiss (6 s erreur / 4 s autres). Rendu par `UiToaster`. |

## Layout & garde de navigation

- **`layouts/default.vue`** — chrome global (header sticky + footer). Nav (si connecté) :
  `/candidature`, `/profil`, `/candidatures`, `/credits`. Menu compte (dropdown maison),
  `handleSignOut` → `/`. S'abonne à l'atom nanostores de Better Auth pour recopier `user`.
- **`middleware/auth.ts`** (client) — `defineNuxtRouteMiddleware` : appelle
  `GET /api/auth/get-session` (transfère les cookies en SSR), redirige vers `/connexion`
  si absent. **Volontairement** il n'utilise **pas** l'atom `useAuth()` (toujours truthy,
  hydraté trop tard → laissait passer des non-connectés).

> Une page devient protégée en ajoutant `definePageMeta({ middleware: 'auth' })`.

## Config & i18n

- **`config/brand.ts`** — `export const BRAND = 'Teven'` (token de naming unique).
- **`config/pricing.ts`** — `FREE_GENERATIONS = 5` (générations offertes à vie),
  `CREDIT_PACKS` (`starter` 5 €/5 crédits, `standard` 12 €/15, featured) + helpers purs
  **partagés avec le backend Stripe** (`packLookupKey`, `resolveCreditPack`, `packAmountCents`).
- **`i18n/fr.ts`** — **toute la copy FR** (source unique, aucun texte en dur). `export const fr`
  avec clés `brand/meta/nav/hero/problem/how/guardrail/audience/pricing/faq/finalCta/signup/footer`.
  Placeholders `{brand}`/`{freeGenerations}` résolus par `useLanding`. Structuré pour devenir
  le locale `fr` d'un futur module i18n.

> ⚠️ **Écart doc/code à connaître** : la mémoire projet mentionne « 2 générations
> offertes », mais **le code fait foi : `FREE_GENERATIONS = 5`**.

## `utils/` front
- **`photo-crop.ts`** — géométrie **pure** du recadrage carré (sans DOM, testée).
- **`health-label.ts`** — `healthLabel(status)` → libellé FR (testé).

## Styling — `assets/css/main.css`
- **Tailwind v4** (`@import 'tailwindcss'`), **design tokens via `@theme`** = source
  unique de vérité. **Règle d'équipe : aucune valeur en dur dans les composants**, tout
  passe par les classes générées (`bg-brand-600`, `text-ink-700`, `rounded-card`…).
- Direction « Chaleur professionnelle » : `brand` = indigo, `ink` = stone (neutres chauds),
  échelles `success/warning/danger`, surfaces, ombres douces multi-couches. Police
  **Plus Jakarta Sans** (via `@nuxt/fonts`, self-hosted au build).
- **Bloc `@media print`** = la mise en page A4 de l'export PDF (cible Chromium) :
  masque tout hors `.cv-print-root`/`.cv-page`, force le fond blanc, `break-inside: avoid`,
  `print-color-adjust: exact`.

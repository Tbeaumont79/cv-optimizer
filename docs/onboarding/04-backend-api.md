# 04 — Backend & API (Nitro)

Tout est dans `apps/app/server/`. Rappel de la convention Nitro : le **chemin du
fichier = la route**, le **suffixe = la méthode** (`.get.ts`, `.post.ts`, `.put.ts`,
`.patch.ts`, `.delete.ts`). `[id]` = param dynamique, `[...all]` = catch-all.

## Table des endpoints

Légende auth : 🔒 = `requireUserId` obligatoire · 🌐 = public.

### Auth
| Route | Auth | Fichier | Rôle |
|---|---|---|---|
| `ALL /api/auth/**` | 🌐 | `api/auth/[...all].ts` | Délègue **tout** à Better Auth (`sign-in/magic-link`, `magic-link/verify`, `get-session`, `sign-out`…). |

### Profil (`api/profile/`)
| Route | Auth | Rôle |
|---|---|---|
| `GET /api/profile` | 🔒 | Profil complet de l'utilisateur (`ProfileDTO`). |
| `PUT /api/profile` | 🔒 | Met à jour l'en-tête/identité/résumé/keySkills (validation zod, champs bornés). |
| `POST /api/profile/experiences` · `DELETE …/experiences/:id` | 🔒 | Ajoute / supprime (soft-delete) une expérience. |
| `POST /api/profile/skills` · `DELETE …/skills/:id` | 🔒 | Idem compétences. |
| `POST /api/profile/education` · `DELETE …/education/:id` | 🔒 | Idem formations. |
| `POST /api/profile/languages` · `DELETE …/languages/:id` | 🔒 | Idem langues. |
| `POST /api/profile/import-text` | 🔒 | Parse un CV **collé** (texte, ≤10 000 chars) en proposition éditable — **aucune écriture DB**, regex linéaires. |
| `POST /api/profile/cv-design/extract` | 🔒 | Reçoit un **PDF multipart** (≤8 Mo), lance `extractCvContent` + `extractCvDesign` en parallèle. PDF jamais stocké. |
| `PUT /api/profile/cv-design` · `DELETE /api/profile/cv-design` | 🔒 | Définit / retire le thème « CV de base » du profil. |

> **Anti-IDOR** : les suppressions de sous-ressources filtrent par propriétaire —
> `where: { id, profile: { userId } }`. Un `id` d'autrui renvoie **404** (ne divulgue pas
> l'existence).

### Candidature — pipeline LLM (`api/candidature/`)
| Route | Auth | Rôle |
|---|---|---|
| `POST /api/candidature/analyze` | 🔒 | Offre collée → `{ offer, match }`. 2 appels LLM. **Hors gate crédits.** |
| `POST /api/candidature/generate` | 🔒 | `{ offer, match }` → `{ cv, candidatureId }`. **Gate crédits + provenance + débit.** |

Détails complets : [06 — Pipeline candidature](./06-pipeline-candidature.md).

### Candidatures — CRUD (`api/candidatures/`)
| Route | Auth | Rôle |
|---|---|---|
| `GET /api/candidatures` | 🔒 | Liste (scopée `userId`). |
| `GET /api/candidatures/:id` | 🔒 | Une candidature complète (`findFirst { id, userId }` → 404 sinon). |
| `PATCH /api/candidatures/:id` | 🔒 | Met à jour `cv`/`design`/`status`/`label`. Le `cv` **repasse le garde-fou de provenance** ; `status` validé contre l'enum. |
| `DELETE /api/candidatures/:id` | 🔒 | Soft-delete. |

### CV — rendu (`api/cv/`)
| Route | Auth | Rôle |
|---|---|---|
| `POST /api/cv/preview` | 🔒 | `RenderableCv` (ou `{cv, design}`) → **HTML** (aperçu iframe). |
| `POST /api/cv/export-pdf` | 🔒 | Idem → **PDF binaire** (Chromium). Gate quota `export_pdf` + metering. |

> ⚠️ Ces deux endpoints exigent l'auth **depuis l'audit sécu** (avant, l'export était
> public = DoS Chromium). Voir [08](./08-securite.md).

### Billing (`api/billing/`)
| Route | Auth | Rôle |
|---|---|---|
| `GET /api/billing/summary` | 🔒 | Solde de crédits (`{ creditBalance }`) + octroi gratuit idempotent au 1er accès. |
| `POST /api/billing/checkout` | 🔒 | Crée une session Stripe Checkout pour un `packKey` → `{ url }`. |
| `POST /api/billing/webhook` | 🌐* | Reçoit les événements Stripe (**signés** — voir [07](./07-billing-credits.md)). Crédite sur paiement confirmé. |

\* Public au sens « pas de session utilisateur », mais **authentifié par signature Stripe**.

### Divers
| Route | Auth | Rôle |
|---|---|---|
| `GET /api/usage/current` | 🔒 | Compteurs d'usage de la période + état des quotas. |
| `GET /api/health` | 🌐 | Preuve de vie (`{ status, db, service, timestamp }`). |
| `POST /api/csp-report` | 🌐 | Collecteur de violations CSP (monitoring, logge). |
| `GET /sitemap.xml` | 🌐 | `server/routes/sitemap.xml.ts` — sitemap SEO. |

## `server/utils/` — les briques serveur

| Fichier | Rôle |
|---|---|
| `prisma.ts` | Client Prisma **singleton** (réutilisé entre requêtes / HMR). |
| `auth.ts` | Instance **Better Auth** (magic-link, adaptateur Prisma, cookies Secure, rate-limit). |
| `session.ts` | **`requireUserId(event)`** (→ 401) et `getAuthSession(event)`. ⚠️ Passe `event.headers` directement (ne pas convertir en Request : verrouille le body). |
| `auth-context.ts` | `resolveUserId(getSession, headers)` — logique pure injectable (testée sans Better Auth). |
| `stripe.ts` | Client Stripe (singleton paresseux) ; `StripeNotConfiguredError`. |
| `credits.ts` | **Le ledger de crédits** : `getCreditBalance`, `ensureFreeGrant`, `getOrInitBalance`, `consumeOneCredit` (transactionnel), `grantPurchasedCredits`. Voir [07](./07-billing-credits.md). |
| `metering.ts` | Usage : `recordUsageEvent` (upsert atomique), `readUsageSummary`, `isUsageAllowed`. Logique de mapping **pure** et testée. |
| `anthropic.ts` | Client Claude (structured output, tokens, erreurs). Voir [06](./06-pipeline-candidature.md). |
| `mailer.ts` | Envoi e-mail (nodemailer). SMTP en prod ; **log console en dev** ; **échec explicite en prod sans SMTP** (ne logge jamais le token). |
| `pdf.ts` | `renderHtmlToPdf(html)` — lance **Chromium headless** (playwright-core), print-to-PDF A4. |
| `cv-html.ts` | `buildCvHtml(cv, design)` — génère le HTML du CV. **Échappe toutes les données user** (`esc()`). |
| `cv-render-input.ts` | `parseRenderInput` / `parseRenderableCvBody` — validation zod **bornée** + garde-fou provenance du CV reçu. |
| `cv-design.ts` / `cv-design-tokens.ts` | `loadBaseCvDesign`, `normalizeDesign`, `sanitizeColor/Font/Number/DataImage` (assainissement des tokens de design). |
| `cv-render-input.ts` | (voir ci-dessus) bornes de taille anti-DoS. |
| `profile-serialize.ts` | `toProfileDTO`, `NOT_DELETED` (filtre soft-delete). |
| `candidature-serialize.ts` | `toCandidatureDTO` / `toListItemDTO`. |
| `health.ts` | `checkDb` (ping `SELECT 1`) — interface `DbPinger` injectable. |

## Plugins & middleware serveur

- **`server/middleware/auth.ts`** — tourne sur **chaque** requête, pose
  `event.context.userId` (non bloquant). Producteur consommé par `requireUserId`.
- **`server/plugins/00.validate-env.ts`** — **fail-fast au boot** : en prod, refuse de
  démarrer si `BETTER_AUTH_SECRET` est absent/faible ou si `APP_URL` n'est pas `https://`.
- **`server/routes/sitemap.xml.ts`** — génère le sitemap (route hors `/api`).

## Le patron d'un endpoint (à copier pour un nouveau)

```ts
export default defineEventHandler(async (event) => {
  const userId = requireUserId(event)               // 1. auth (sauf endpoint public assumé)
  const parsed = bodySchema.safeParse(await readBody(event))  // 2. validation zod
  if (!parsed.success) throw createError({ statusCode: 400, message: '…' })

  // 3. accès ressource TOUJOURS filtré par userId (anti-IDOR)
  const row = await prisma.candidature.findFirst({ where: { id, userId, ...NOT_DELETED } })
  if (!row) throw createError({ statusCode: 404, message: 'Introuvable.' })

  // 4. travail (DB / service LLM / Stripe / PDF)
  return toCandidatureDTO(row)                        // 5. réponse (DTO, pas la row brute)
})
```

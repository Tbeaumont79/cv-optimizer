# Audit de sécurité — Teven (cv-optimizer)

**Date :** 2026-07-02
**Périmètre :** `apps/app` (Nuxt 3 / Nitro), `packages/shared` — auth, ~30 endpoints API, intégrations LLM (Anthropic), rendu PDF (Chromium/playwright-core), e-mail (nodemailer), paiement (Stripe), dépendances et configuration.
**Méthode :** lecture ligne à ligne des fichiers sensibles + 3 audits ciblés en parallèle + `pnpm audit` + vérification manuelle des findings critiques.

> ⚠️ **Mise au point honnête :** « 100 % sécurisé » n'existe pour aucun site. Cet audit couvre les failles réalistes de la surface applicative. Il ne remplace pas : un pentest externe, la sécurité de l'infra (réseau, secrets manager, WAF, sauvegardes DB), ni la conformité RGPD juridique. L'objectif ici = **fermer les failles exploitables et durcir au maximum avant prod**.

---

## Synthèse — à traiter avant la mise en prod

| Priorité | Finding | Sévérité | Effort |
|---|---|---|---|
| **1** | Secret d'auth avec fallback en dur, sans fail-fast | 🔴 Critique | Faible |
| **2** | Export PDF **non authentifié** → DoS Chromium + bypass quota | 🔴 Élevé | Faible |
| **3** | Magic-link (jeton) loggé en clair si pas de SMTP | 🟠 Élevé* | Faible |
| **4** | Aucun header de sécurité (CSP, HSTS, X-Frame-Options…) | 🟠 Élevé | Moyen |
| **5** | Aucun rate-limit (magic-link, endpoints LLM) | 🟠 Élevé | Moyen |
| **6** | Cookies session non forcés `Secure` (dépend de `APP_URL`) | 🟡 Moyen | Faible |
| **7** | `nodemailer` 8.x vulnérable (advisory) | 🟡 Moyen | Faible |
| **8** | Chromium lancé avec `--no-sandbox` | 🟡 Moyen | Moyen |
| **9** | Gate crédits TOCTOU → surconsommation LLM + 500 | 🟡 Moyen | Faible |
| **10** | Schéma de rendu CV sans bornes de taille + pas de `bodyLimit` | 🟡 Moyen | Faible |
| **11** | Pas de CSRF applicatif (repose uniquement sur SameSite=Lax) | 🟡 Moyen | Faible |
| **12** | Dépendances en retard (`better-auth`, Prisma) | 🟡 Moyen | Moyen |
| — | Divers (preview non auth, fonts distantes, prompt-injection borné, /health, robots) | ⚪ Faible/Info | — |

\* Élevé **conditionnel** au déploiement actuel (pas de SMTP câblé → le jeton part dans les logs).

> **Statut correctifs (branche `fix/security-hardening`) :**
> ✅ **corrigés** — #1 (fail-fast secret via plugin Nitro), #2 (auth + quota + metering sur `export-pdf`, auth sur `preview`), #3 (magic-link : échec explicite en prod, plus de log), #4 (**nuxt-security** : HSTS/XFO/nosniff/Referrer/Permissions + **CSP en Report-Only**), #6 (cookies `Secure` + `trustedOrigins`), #9 (catch `InsufficientCreditsError` → 403), #10 (bornes Zod + `requestSizeLimiter`).
> �️ **partiel** — #5 : rate-limit **magic-link** actif (Better Auth, 3/min) ; **reste** la limite par-utilisateur sur `/analyze` (à décider : seuil + stockage). #11 : mitigé par #6 (SameSite=Lax + `trustedOrigins`) ; CSRF middleware nuxt-security laissé off pour ne pas casser le webhook Stripe.
> ⏳ **restants** — **passer la CSP en mode bloquant** après validation navigateur (retirer `contentSecurityPolicyReportOnly`), limite `/analyze`, #7 bump `nodemailer`, #8 sandbox Chromium (infra), #12 updates deps (`better-auth`).
>
> ⚠️ Notes : l'export PDF depuis la page publique `/cv/demo` exige désormais d'être connecté (conséquence de #2). Le rate-limit magic-link et le limiteur nuxt-security sont **en mémoire par instance** → prévoir un stockage partagé (Redis/DB) en multi-instance.

---

## Ce qui est déjà solide (vérifié)

- ✅ **Aucune injection SQL** — Prisma paramétré partout ; pas de `$queryRaw`/`$executeRaw` (sauf `SELECT 1` du healthcheck).
- ✅ **IDOR entièrement couvert** — chaque accès par id filtre par propriétaire : candidatures (`findFirst { id, userId }`), sous-ressources profil (`where: { id, profile: { userId } }`). Un id d'autrui renvoie 404 (ne divulgue pas l'existence).
- ✅ **Pas de mass-assignment** — les handlers n'écrivent que des champs explicites après validation Zod ; `userId`/`id`/`status`/`deletedAt` non pilotables par le body.
- ✅ **Pas de XSS stocké dans le CV** — `cv-html.ts` échappe **toutes** les données user via `esc()` ; tokens de design assainis (couleur hex, police `[A-Za-z0-9 \-]`, nombres clampés).
- ✅ **Pas de SSRF via la photo/PDF** — `sanitizeDataImage` n'accepte QUE des data-URL raster (png/jpg/webp), **rejette le SVG**, refuse les URL distantes et `file://`, borne à 700 Ko.
- ✅ **Stripe durci** — webhook signé sur le corps brut, montants/crédits déterminés server-side, idempotence réelle (ledger `idempotencyKey`), crédits seulement sur `payment_status='paid'`.
- ✅ **Garde-fou anti-invention LLM** — `assertValidCv` rejette tout contenu de CV dont la provenance ne pointe pas un id réel du profil : une injection de prompt ne peut pas fabriquer de fausse expérience.
- ✅ **Logs RGPD-safe** — ni offre, ni profil, ni CV, ni clé API loggés (seulement tokens/coût).
- ✅ **Aucun secret réel committé** — `.env`/`.output`/`.nuxt` gitignorés ; historique et working tree propres ; `.env.example` sans vraie clé.

---

## Findings détaillés

### 🔴 1 — Secret d'authentification : fallback en dur, pas de fail-fast (Critique)
**`apps/app/nuxt.config.ts`**
```ts
authSecret: process.env.BETTER_AUTH_SECRET ?? 'dev-secret-change-in-prod-min32chars!!',
```
**Scénario :** si `BETTER_AUTH_SECRET` est absent en prod, l'app démarre **silencieusement** avec un secret **présent dans le repo public**. Ce secret signe les cookies de session et les tokens magic-link → un attaquant qui connaît cette valeur peut **forger des sessions valides** (usurpation totale de n'importe quel compte). Le fallback rend la faute invisible.

**Correctif — refuser de démarrer en prod sans secret fort :**
```ts
const authSecret = process.env.BETTER_AUTH_SECRET
if (process.env.NODE_ENV === 'production' && (!authSecret || authSecret.length < 32)) {
  throw new Error('BETTER_AUTH_SECRET manquant ou < 32 chars — refus de démarrer en production.')
}
// puis : authSecret: authSecret ?? 'dev-secret-change-in-prod-min32chars!!'
```
Appliquer le même fail-fast à `DATABASE_URL`, `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, et exiger `APP_URL=https://…`.

---

### 🔴 2 — Export PDF non authentifié → DoS Chromium + bypass de quota (Élevé)
**`apps/app/server/api/cv/export-pdf.post.ts:17`** (et `preview.post.ts:13`) — **aucun `requireUserId`**.

**Scénario :** un visiteur **non authentifié** peut POSTer un CV et déclencher `renderHtmlToPdf`, qui **lance une instance Chromium headless par requête** (~100-300 Mo RAM chacune). Une boucle de requêtes → épuisement mémoire/CPU du serveur, coût nul côté attaquant. De plus, le quota `export_pdf` (censé être borné par période) **n'est jamais appliqué** ici : aucun `recordUsageEvent`, aucune vérif de quota.

**Correctif :**
```ts
const userId = requireUserId(event)
// vérifier le quota export_pdf (isUsageAllowed) → 429 si dépassé
const { cv, design: bodyDesign } = parseRenderInput(await readBody(event))
// … rendu …
await recordUsageEvent(prisma, { userId, type: 'export_pdf' }, new Date())
```
Ajouter aussi `requireUserId` sur `preview.post.ts`.

---

### 🟠 3 — Magic-link loggé en clair sans SMTP (Élevé, conditionnel)
**`apps/app/server/utils/mailer.ts:34`**
```ts
} else {
  console.log(`\n[DEV] Magic-link pour ${email}:\n  ${magicLinkUrl}\n`)
}
```
**Scénario :** sans `SMTP_HOST` (état actuel du projet), **chaque demande de connexion imprime un jeton d'auth valide 10 min dans les logs**. Quiconque accède aux logs (opérateur, agrégateur type Datadog, fuite) peut se connecter en tant que n'importe quel utilisateur.

**Correctif :** ne jamais logger le lien hors dev, et **échouer explicitement** en prod si SMTP absent :
```ts
} else if (process.env.NODE_ENV !== 'production') {
  console.log(`\n[DEV] Magic-link pour ${email}:\n  ${magicLinkUrl}\n`)
} else {
  throw new Error('SMTP non configuré en production — envoi du magic-link impossible.')
}
```
→ **Câbler un vrai SMTP est un prérequis de prod** (sans lui, la connexion ne fonctionne pas de toute façon).

---

### 🟠 4 — Aucun header de sécurité HTTP (Élevé)
`nuxt.config.ts` ne définit aucun header ; aucun module `nuxt-security` installé. Absents : **CSP, HSTS, X-Content-Type-Options, X-Frame-Options/frame-ancestors, Referrer-Policy, Permissions-Policy**. → clickjacking, MIME-sniffing, pas de HTTPS forcé, XSS non durci.

**Correctif sans dépendance (à tester d'abord en `Content-Security-Policy-Report-Only`) :**
```ts
// nuxt.config.ts
routeRules: {
  '/**': {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
      'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
      'Content-Security-Policy': [
        "default-src 'self'", "base-uri 'self'", "frame-ancestors 'none'",
        "object-src 'none'", "img-src 'self' data:", "font-src 'self'",
        "style-src 'self' 'unsafe-inline'", "script-src 'self'",
        "connect-src 'self'", "form-action 'self'",
      ].join('; '),
    },
  },
},
```
Alternative recommandée à terme : **`nuxt-security`** (CSP à nonce, HSTS, CORS, rate-limit intégré — cf. #5).

---

### 🟠 5 — Aucun rate limiting (Élevé)
Aucun `rateLimit` dans le code. Surfaces exposées :
- **`POST /api/auth/magic-link/sign-in`** : email bombing (envoi massif vers des tiers → coût, blacklist domaine) + énumération de comptes.
- **`POST /api/candidature/analyze`** : **2 appels LLM Anthropic** et **hors gate de crédits** (seul `generate` consomme un crédit) → un compte peut marteler `/analyze` = coût token illimité (abus économique).

**Correctifs :**
```ts
// server/utils/auth.ts — Better Auth
rateLimit: {
  enabled: true, window: 60, max: 20,
  customRules: { '/magic-link/sign-in': { window: 60, max: 3 } },
},
```
+ rate-limit applicatif par `userId` sur `/analyze` (compteur fenêtre glissante, en base ou Redis).

---

### 🟡 6 — Cookies de session non forcés `Secure` (Moyen)
`server/utils/auth.ts` ne configure ni `advanced.useSecureCookies` ni `trustedOrigins`. Better Auth active `Secure` **seulement si `baseURL` est en `https://`**. Or `baseURL = APP_URL ?? 'http://localhost:3000'` → si `APP_URL` n'est pas `https://…` en prod, **le cookie de session part en clair**.
```ts
// server/utils/auth.ts
trustedOrigins: [config.public.appUrl],
advanced: { useSecureCookies: process.env.NODE_ENV === 'production' },
```
+ garantir `APP_URL=https://…` en prod.

---

### 🟡 7 — `nodemailer` 8.0.10 vulnérable (Moyen)
`pnpm audit` : **1 High** — `GHSA-p6gq-j5cr-w38f` (l'option `raw` contourne `disableFileAccess`/`disableUrlAccess` → lecture de fichier / SSRF). **Le code n'utilise pas `raw`** → exploitabilité réelle faible, mais le correctif est un bump majeur.
```
nodemailer ^8.0.10 → ^9.0.1   (éditer la contrainte dans package.json, puis pnpm update)
```
Autres : `esbuild` transitif (Low, dev/Windows uniquement — non-prod).

---

### 🟡 8 — Chromium lancé sans sandbox (Moyen)
**`apps/app/server/utils/pdf.ts:47`** — `args: ['--no-sandbox', '--disable-setuid-sandbox']`. Retire une défense en profondeur : en cas de 0-day renderer sur du contenu dérivé de l'utilisateur, l'absence de sandbox facilite une RCE serveur. **Correctif :** faire tourner Chromium en utilisateur non-root dans un conteneur dédié plutôt que `--no-sandbox`, avec egress réseau filtré ; ou déléguer à Gotenberg.

---

### 🟡 9 — Gate crédits TOCTOU → surconsommation LLM (Moyen)
**`apps/app/server/api/candidature/generate.post.ts`** — le solde est lu **au début** (l.66), les appels LLM ont lieu, puis `consumeOneCredit` débite **après succès** (l.165). Avec un solde de 1, N requêtes concurrentes passent toutes le contrôle → **N appels LLM payés**, un seul débit ; les autres lèvent `InsufficientCreditsError` **non capturée** → **500 non maîtrisée**. Le solde ne devient jamais négatif (transaction OK), mais le **coût LLM est amplifié** et l'erreur est sale.

**Correctif :** réserver le crédit **avant** l'appel LLM (débit puis remboursement si échec), ou a minima `catch (InsufficientCreditsError)` → 403 propre.

---

### 🟡 10 — Rendu CV sans bornes de taille + pas de `bodyLimit` (Moyen)
**`apps/app/server/utils/cv-render-input.ts`** : `RenderableCvSchema` valide la structure mais **aucune borne** (`sections`/`bullets` sans `.max()`, strings sans `.max()`). Couplé au #2 (endpoint ouvert), un CV valide mais gigantesque → HTML massif → rendu Chromium très lourd + JSON géant persisté via `[id].patch`. De plus `readBody` bufferise tout avant validation, sans `bodyLimit` Nitro.
**Correctif :** bornes Zod (`.max(20)` sections, `.max(30)` bullets, `.max(2000)` textes) + `bodyLimit` global sur les routes d'écriture.

---

### 🟡 11 — Pas de CSRF applicatif sur les endpoints custom (Moyen)
`/api/candidature/*`, `/api/profile/*`, `/api/billing/*` s'appuient sur le cookie de session sans vérif d'`Origin` ni token CSRF. La **seule** protection est `SameSite=Lax` (défaut Better Auth). Correct aujourd'hui, mais défense unique : à durcir avec `trustedOrigins` explicite (cf. #6) et, idéalement, une vérif `Origin` sur les mutations.

---

### 🟡 12 — Dépendances en retard (Moyen)
| Paquet | Actuel | Latest | Note |
|---|---|---|---|
| `better-auth` | 1.6.15 | 1.6.23 | **8 patchs de retard sur la lib d'auth** — à mettre à jour en priorité |
| `@prisma/client` / `prisma` | 6.19.3 | 7.8.0 | 1 majeure de retard (à planifier) |
| `nuxt` | 3.21.8 | 4.4.8 | 1 majeure (hors périmètre prod immédiat) |
| `stripe` | 22.2.2 | 22.3.0 | mineur, OK |

---

### ⚪ Faible / Info
- **Preview HTML non authentifié** (`cv/preview.post.ts`) — pas de fuite (HTML issu du body), mais surface exposée : ajouter `requireUserId`.
- **Fonts distantes au rendu PDF** (`cv-html.ts` → `fonts.googleapis.com`, `waitUntil:'networkidle'`) — hôte non contrôlable par l'attaquant ; auto-héberger les polices évite la requête sortante et la latence.
- **Prompt injection via texte d'offre** — borné : le contenu du CV vient du profil + garde-fou provenance, score clampé, offre plafonnée 20 000 car. Résiduel acceptable ; optionnel : délimiteurs explicites autour de l'entrée non fiable.
- **`/api/health` public** — expose `db: up/down` + nom de service (pas de secret). Optionnel : réduire à 200/503.
- **`robots.txt` absent** — SEO/contrôle du crawl (empêcher l'indexation des pages app).
- **Détails de schéma dans les erreurs 400** (`profile/index.put.ts`) — `error.flatten()` divulgue la forme du schéma (pas de secret). Cosmétique.

---

## Plan de remédiation recommandé (ordre)

1. **#1 fail-fast secret** + **#2 auth sur export-pdf/preview** + **#9 catch InsufficientCreditsError** + **#3 magic-link** — corrections ciblées, faible risque, fort impact.
2. **#6 cookies Secure + trustedOrigins** + **#10 bornes Zod / bodyLimit**.
3. **#4 headers de sécurité** (tester en Report-Only) + **#5 rate-limit**.
4. **#7 bump nodemailer** + **#12 update better-auth**.
5. **#8 sandbox Chromium** (infra/conteneur) — au déploiement.

**Prérequis d'infra prod (hors code) :** SMTP réel, `APP_URL=https`, tous les secrets fournis via un gestionnaire de secrets (pas de `.env` en clair sur la machine), HTTPS/HSTS au niveau du reverse-proxy, sauvegardes DB chiffrées, et idéalement un scanner de secrets (`gitleaks`) en CI.

# 08 — Sécurité

> 📄 **La référence complète est [`SECURITY-AUDIT.md`](../../SECURITY-AUDIT.md)** à la
> racine (12 findings détaillés + correctifs). Ce fichier est le résumé « ce qu'un dev
> doit savoir au quotidien ».

## Ce qui est en place (ne pas casser)

### Authentification & autorisation
- Modèle **opt-in par route** : `requireUserId(event)` sur tout endpoint qui touche des
  données user (voir [02](./02-architecture.md) et [04](./04-backend-api.md)).
- **Anti-IDOR** : chaque accès par `id` filtre par propriétaire
  (`findFirst({ where: { id, userId } })` ou `{ id, profile: { userId } }`). Un id
  d'autrui → **404**.
- **Cookies de session** : `HttpOnly` + `SameSite=Lax` (défauts Better Auth) + **`Secure`
  forcé en prod** (`useSecureCookies`) + `trustedOrigins` explicite.
- **Fail-fast au boot** (`server/plugins/00.validate-env.ts`) : en prod, l'app **refuse
  de démarrer** si `BETTER_AUTH_SECRET` est absent/faible ou si `APP_URL` n'est pas `https://`.

### Headers HTTP (nuxt-security, dans `nuxt.config.ts`)
- **CSP active** (bloquante), HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options:
  nosniff`, Referrer-Policy, Permissions-Policy.
- `img-src` autorise `data:` (photos de CV) ; `font-src`/`style-src` autorisent Google
  Fonts (utilisées par le rendu CV — voir note plus bas).
- Violations CSP remontées à **`/api/csp-report`** (monitoring). Pour re-valider après un
  changement, repasser la CSP en Report-Only (`contentSecurityPolicyReportOnly: true`),
  naviguer, lire les logs, puis réactiver.
- **`requestSizeLimiter`** réglé au-dessus de 8 Mo pour ne pas casser l'upload PDF de
  `cv-design/extract`.

### Rate limiting
- **Magic-link** : `POST /api/auth/sign-in/magic-link` bridé à **3/min** (Better Auth
  `rateLimit.customRules`) — anti email-bombing / énumération.
- ⚠️ **Stockage en mémoire par instance** : en multi-instance/serverless, il faut un store
  partagé (Redis/DB), sinon la limite est contournable.

### Injection & rendu
- **Pas de SQL brut** : Prisma paramétré partout.
- **Rendu CV échappé** : `cv-html.ts` passe **toutes** les données user par `esc()`. Les
  tokens de design sont assainis (`sanitizeColor/Font/Number`). La **photo** n'accepte que
  des **data-URL raster** (SVG rejeté → pas de script, pas de SSRF).
- **Provenance** : le garde-fou anti-invention est aussi une barrière d'intégrité (voir
  [06](./06-pipeline-candidature.md)).

### Billing
- Webhook Stripe **signé** (corps brut), montants **server-side**, idempotence par
  `session.id`. Voir [07](./07-billing-credits.md).

### Secrets
- `.env` / `.output` / `.nuxt` **gitignorés** ; aucun secret réel committé ; `.env.example`
  ne contient que des placeholders `changeme`.

## Ce qui reste à faire (avant/juste après prod)

| Sujet | Détail |
|---|---|
| **Limite `/analyze` par user** | `/api/candidature/analyze` fait 2 appels LLM **hors gate crédits** → abus de coût possible. Ajouter une limite par `userId` (table metering). |
| **Sandbox Chromium** | `pdf.ts` lance Chromium avec `--no-sandbox`. En conteneur, préférer un user non-root / egress filtré. |
| **Polices CV auto-hébergées** | Retirer les hôtes Google Fonts de la CSP (rendu CV) — durcit encore. |
| **Store rate-limit partagé** | Redis/DB si multi-instance. |
| **Mises à jour** | Prisma 6→7, Nuxt 3→4 (majeures, à planifier). |

## Réflexes quand tu codes

1. Nouvel endpoint qui touche des données user ? → **`requireUserId` en première ligne**.
2. Accès par `id` ? → **filtre par `userId`**, renvoie 404 (pas 403).
3. Nouvel input ? → **valide avec zod + borne les tailles** (anti-DoS).
4. Tu affiches/rends de la donnée user en HTML ? → **échappe** (utilise `esc()` / le gabarit codé).
5. Tu logges ? → **jamais** de contenu (offre, profil, CV), de token, ni de clé (RGPD).
6. Tu changes la CSP ? → **repasse en Report-Only**, valide au navigateur, puis réactive.

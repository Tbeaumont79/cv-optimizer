# 01 — Démarrage local

Objectif : app qui tourne sur `http://localhost:3000` avec une DB, l'auth, et
(optionnellement) le LLM et Stripe.

## Prérequis

- **Node ≥ 20** (le repo tourne en pratique sur Node 24)
- **pnpm 10** (`packageManager` épinglé dans le `package.json` racine)
- **Docker** (pour le PostgreSQL local via `docker-compose.yml`)
- Pour le PDF : un **Chromium/Chrome** installé (dev macOS : Chrome suffit ; sinon variable `CHROMIUM_EXECUTABLE_PATH`)
- Optionnel : le **CLI Stripe** (`stripe`) pour tester le paiement en local

## Étapes

```bash
# 0. Dépendances (postinstall lance `nuxt prepare`)
pnpm install

# 1. Fichier d'environnement (voir la table ci-dessous)
cp apps/app/.env.example apps/app/.env
#   → puis édite apps/app/.env avec tes vraies clés

# 2. PostgreSQL local (conteneur postgres:16 sur :5432)
pnpm db:up

# 3. Applique le schéma (crée toutes les tables)
pnpm --filter @cvo/app prisma:migrate:deploy

# 4. Lance l'app (front Vue + API Nitro dans le même process)
pnpm dev            # http://localhost:3000
```

> `pnpm dev` lance `prisma generate && nuxt dev`. Nuxt charge automatiquement
> `apps/app/.env` en dev.

## Variables d'environnement (`apps/app/.env`)

Toutes lues **côté serveur uniquement** (jamais exposées au client).

| Variable | Rôle | Requis ? |
|---|---|---|
| `DATABASE_URL` | Connexion PostgreSQL (matche `docker-compose.yml`) | **Oui** |
| `BETTER_AUTH_SECRET` | Secret de signature des sessions/tokens (min 32 chars) | **Oui** (en prod : fail-fast si absent, voir [08](./08-securite.md)) |
| `APP_URL` | URL de base de l'app (magic-links, cookies) — **`https://…` en prod** | **Oui** |
| `ANTHROPIC_API_KEY` | Clé API Claude (analyse/score/génération). Sans elle, `/api/candidature/*` répond 502 | Oui pour le flux CV |
| `ANTHROPIC_BASE_URL` | Origine de l'API Anthropic (le code ajoute `/v1/messages`) | Non (défaut fourni) |
| `DISABLE_GENERATION_LIMIT` | `true` = désactive le gate de crédits à la génération (**dev only**) | Non |
| `STRIPE_SECRET_KEY` | Clé Stripe (test `sk_test_…`/`rk_test_…`) — checkout & webhook | Oui pour le billing |
| `STRIPE_WEBHOOK_SECRET` | Secret de signature du webhook (`whsec_…`) | Oui pour le billing |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `MAIL_FROM` | Envoi d'e-mail (magic-link). **Absent en dev → le lien est loggé dans la console** | Oui en **prod** |
| `CHROMIUM_EXECUTABLE_PATH` | Chemin du binaire Chromium pour le rendu PDF (Docker/CI) | Non en dev macOS |

## Se connecter en local (magic-link sans SMTP)

Sans `SMTP_HOST`, l'e-mail n'est pas envoyé : le lien magic-link est **écrit dans la
console du serveur dev**. Récupère-le dans les logs :

```
[DEV] Magic-link pour toi@example.com:
  http://localhost:3000/api/auth/magic-link/verify?token=...&callbackURL=%2Fprofil
```

Colle l'URL dans le navigateur → tu es connecté. Le lien est **à usage unique** et
expire en **10 min**. Le sign-in est **rate-limité à 3/min** (voir [08](./08-securite.md)).

## Tester le paiement Stripe en local ⚠️ (piège vécu)

Les crédits ne sont accordés **que par le webhook** `checkout.session.completed`. En
local, Stripe ne peut pas joindre `localhost` seul : il faut le relais du CLI.

```bash
# 1. Crée les produits/prix des packs dans Stripe (idempotent)
pnpm --filter @cvo/app stripe:seed

# 2. Laisse tourner CE terminal pendant tout le dev billing :
stripe listen --api-key <TA_CLÉ_.env> --forward-to localhost:3000/api/billing/webhook
```

**Deux pièges qui font que « le paiement passe mais les crédits n'augmentent pas » :**
1. `stripe listen` **pas lancé** → l'événement n'atteint jamais le serveur.
2. `stripe listen` connecté à un **autre compte Stripe** que ta clé `.env` (utilise
   `--api-key <clé .env>` pour forcer le bon compte) — sinon les events partent ailleurs.

Copie le `whsec_…` imprimé par `stripe listen` dans `STRIPE_WEBHOOK_SECRET`, puis
**redémarre Nuxt** (l'env n'est lu qu'au boot). Détails complets : [07 — Billing](./07-billing-credits.md).

## Scripts utiles

### Racine (`package.json`)
| Commande | Effet |
|---|---|
| `pnpm dev` | Lance l'app Nuxt (`apps/app`) |
| `pnpm build` | Build `@cvo/shared` puis l'app (Nuxt/Nitro) |
| `pnpm typecheck` | Build shared + `typecheck` récursif (vue-tsc + tsc strict) |
| `pnpm test` | Build shared + tests Vitest récursifs |
| `pnpm lint` | ESLint sur tout le repo |
| `pnpm format` / `pnpm format:write` | Prettier (check / write) |
| `pnpm db:up` / `pnpm db:down` | PostgreSQL local (Docker) |

### App (`apps/app`, via `pnpm --filter @cvo/app <script>`)
| Commande | Effet |
|---|---|
| `prisma:migrate:dev` | Crée une migration en dev (schéma modifié) |
| `prisma:migrate:deploy` | Applique les migrations existantes |
| `prisma:generate` | (Re)génère le client Prisma |
| `stripe:seed` | Crée les produits/prix Stripe des packs |
| `dev` / `build` / `start` / `preview` | Cycle de vie Nuxt |
| `typecheck` / `test` | Qualité (par package) |

## Gate qualité avant de merger

Le repo est **PR-only** (aucun push direct sur `main`, seul l'owner merge). Un script
rejoue les jobs CI en local :

```bash
bash scripts/pre-merge.sh            # lint · typecheck · build · test
bash scripts/pre-merge.sh --health   # + boot Nuxt + probe /api/health (Postgres requis)
```

> ℹ️ La CI GitHub-hosted peut être rouge pour une raison **d'infra** (facturation
> Actions au niveau du compte, pas de SMTP). On valide **en local**. Voir
> [`docs/ci-gate.md`](../ci-gate.md).

## Preuve de vie

```bash
curl -s http://localhost:3000/api/health
# {"status":"ok","db":"up","service":"cvo-app","timestamp":"…"}
```

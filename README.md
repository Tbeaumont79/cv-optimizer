# CV Optimizer — monorepo

SaaS web FR qui génère un CV **reformulé et hiérarchisé** (jamais inventé) à partir du
profil réel d'un candidat et d'une offre d'emploi. Ce dépôt est le **squelette technique**
(THI-122) ; le métier (auth, profil, matching, génération, metering, landing) arrive après
le data model (THI-120).

> **Garde-fou produit (non négociable) : honnêteté.** La plateforme ne fabrique jamais de
> fausses compétences/expériences ; elle reformule et hiérarchise l'existant. À garder en
> tête pour toute future couche de génération.

## Stack (architecture THI-120)

| Couche | Techno |
| --- | --- |
| Full-stack | **Nuxt 3** (Vue 3 + serveur **Nitro**), **TS strict** — un seul dépôt |
| Styles | Tailwind v4 (design tokens, aucune valeur en dur) |
| DB | PostgreSQL (cloud) via Prisma (ORM + migrations) |
| Monorepo | pnpm workspaces |
| CI | GitHub Actions, **PR-only** |

> Le serveur Nitro porte l'API (`/api/*`) : tout le traitement sensible (profil, offre,
> appels LLM, génération) reste côté serveur — aucune clé ni donnée brute exposée au client.

## Structure

```
cv-optimizer/
├─ apps/
│  └─ app/         # Nuxt 3 full-stack : pages Vue + server/ (Nitro), Prisma
│     ├─ assets/css/main.css   # design tokens Tailwind (@theme)
│     ├─ components/ pages/     # front Vue
│     ├─ server/api/health.get.ts  # GET /api/health (preuve de vie)
│     └─ prisma/                # schema + migration init (squelette)
├─ packages/
│  └─ shared/      # contrats TS partagés client ↔ serveur (@cvo/shared)
├─ docs/rgpd.md    # placeholder RGPD (cadrage = THI-120)
└─ .github/workflows/ci.yml
```

## Prérequis

- Node 20+ · pnpm 10 · Docker (pour PostgreSQL local)

## Démarrage local

```bash
pnpm install

# 1. PostgreSQL local
cp .env.example apps/app/.env       # DATABASE_URL local
pnpm db:up                          # docker compose : postgres:16 sur :5432

# 2. Migrations (crée le schéma)
pnpm --filter @cvo/app prisma:migrate:deploy

# 3. Lancer l'app (front + API Nitro)
pnpm dev                            # http://localhost:3000
```

Front : http://localhost:3000 — la carte « Preuve de vie » appelle `GET /api/health`.

### Preuve de vie (health check)

```bash
curl -s http://localhost:3000/api/health
# {"status":"ok","db":"up","service":"cvo-app","timestamp":"…"}
```

Le même probe tourne **en CI** (job `health`) contre un PostgreSQL éphémère.

## Scripts (racine)

| Commande | Effet |
| --- | --- |
| `pnpm lint` | ESLint (TS + Vue) sur tout le repo |
| `pnpm typecheck` | `nuxt typecheck` (vue-tsc) + `tsc` strict |
| `pnpm build` | build shared → app (Nuxt/Nitro) |
| `pnpm test` | tests unitaires (Vitest) |
| `pnpm dev` | app Nuxt en dev |
| `pnpm db:up` / `pnpm db:down` | PostgreSQL local (Docker) |

## Règles d'ingénierie

- **PR-only** — aucun push direct sur `main`. **Seul Thibault merge.**
- **PR > 400 lignes → split.**
- **QA sur chaque PR** ; CI verte obligatoire (lint · typecheck · build · test · health).
- **TS strict** ; pas de `any` non justifié.
- **Tailwind : design tokens uniquement** (`apps/app/assets/css/main.css`), aucune valeur en dur.
- FR-first, i18n-ready (pas d'exigence EN bloquante au MVP).
- Cloud + PostgreSQL (≠ Bloom local-first).

> ⚙️ La protection de branche `main` (PR obligatoire, CI requise, 1 review) doit être
> activée côté GitHub par l'owner du dépôt — voir le commentaire récap de THI-122.

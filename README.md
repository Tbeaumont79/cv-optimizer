# CV Optimizer — monorepo

SaaS web FR qui génère un CV **reformulé et hiérarchisé** (jamais inventé) à partir du
profil réel d'un candidat et d'une offre d'emploi. Ce dépôt est le **squelette technique**
(THI-122) ; le métier (auth, profil, matching, génération, metering, landing) arrive après
le data model (THI-120).

> **Garde-fou produit (non négociable) : honnêteté.** La plateforme ne fabrique jamais de
> fausses compétences/expériences ; elle reformule et hiérarchise l'existant. À garder en
> tête pour toute future couche de génération.

## Stack (imposée par le brief)

| Couche | Techno |
| --- | --- |
| Front | Vue 3 + TypeScript **strict** + Tailwind v4 (design tokens) + Vite |
| Back | NestJS + TypeScript **strict** |
| DB | PostgreSQL (cloud) via Prisma (ORM + migrations) |
| Monorepo | pnpm workspaces |
| CI | GitHub Actions, **PR-only** |

## Structure

```
cv-optimizer/
├─ apps/
│  ├─ web/      # Vue 3 + Tailwind (design tokens dans src/assets/main.css)
│  └─ api/      # NestJS + Prisma (PostgreSQL)
├─ packages/
│  └─ shared/   # contrats TS partagés front ↔ back (@cvo/shared)
├─ docs/rgpd.md # placeholder RGPD (cadrage = THI-120)
└─ .github/workflows/ci.yml
```

## Prérequis

- Node 20+ · pnpm 10 · Docker (pour PostgreSQL local)

## Démarrage local

```bash
pnpm install

# 1. PostgreSQL local
cp .env.example apps/api/.env        # DATABASE_URL local
pnpm db:up                           # docker compose : postgres:16 sur :5432

# 2. Migrations (crée le schéma)
pnpm --filter @cvo/api prisma:migrate:deploy

# 3. Lancer back + front
pnpm dev                             # API :3000  ·  Web :5173
```

Front : http://localhost:5173 — la carte « Preuve de vie » appelle `GET /health`.

### Preuve de vie (health check)

```bash
curl -s http://localhost:3000/health
# {"status":"ok","db":"up","service":"cvo-api","timestamp":"…"}
```

Le même probe tourne **en CI** (job `health`) contre un PostgreSQL éphémère.

## Scripts (racine)

| Commande | Effet |
| --- | --- |
| `pnpm lint` | ESLint (TS + Vue) sur tout le repo |
| `pnpm typecheck` | `tsc` / `vue-tsc` strict sur les 3 packages |
| `pnpm build` | build shared → web → api |
| `pnpm test` | tests unitaires (Vitest web · Jest api) |
| `pnpm dev` | front + back en parallèle |
| `pnpm db:up` / `pnpm db:down` | PostgreSQL local (Docker) |

## Règles d'ingénierie

- **PR-only** — aucun push direct sur `main`. **Seul Thibault merge.**
- **PR > 400 lignes → split.**
- **QA sur chaque PR** ; CI verte obligatoire (lint · typecheck · build · test · health).
- **TS strict** des deux côtés ; pas de `any` non justifié.
- **Tailwind : design tokens uniquement** (`apps/web/src/assets/main.css`), aucune valeur en dur.
- FR-first, i18n-ready (pas d'exigence EN bloquante au MVP).
- Cloud + PostgreSQL (≠ Bloom local-first).

> ⚙️ La protection de branche `main` (PR obligatoire, CI requise, 1 review) doit être
> activée côté GitHub par l'owner du dépôt — voir le commentaire récap de THI-122.

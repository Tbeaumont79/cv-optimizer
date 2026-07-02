# Onboarding — Teven (cv-optimizer)

> Bienvenue 👋 Cette doc est écrite pour qu'un dev qui arrive sur le projet soit
> **autonome en une demi-journée** : comprendre l'archi, lancer le projet, savoir
> où se trouve quoi, et pouvoir modifier une feature sans casser les garde-fous.

## C'est quoi Teven ?

Un **SaaS web français** qui génère un CV **reformulé et hiérarchisé** à partir du
profil réel d'un candidat et d'une offre d'emploi collée. On adapte le CV à l'offre,
on **n'invente jamais** de compétences ou d'expériences.

> ### ⛔ Le garde-fou produit non négociable : l'honnêteté
> La plateforme **reformule et priorise l'existant**, elle ne fabrique jamais de faux.
> Ce principe est appliqué **techniquement** par un garde-fou de « provenance »
> (voir [06 — Pipeline candidature](./06-pipeline-candidature.md)). Si tu touches à la
> génération, ce garde-fou doit rester intact.

## Comment lire cette doc

Lis dans l'ordre si tu débarques ; sinon pioche par sujet.

| # | Fichier | Pour… |
|---|---|---|
| 01 | [Démarrage](./01-demarrage.md) | Installer, configurer l'`.env`, lancer l'app en local |
| 02 | [Architecture](./02-architecture.md) | Vue d'ensemble : monorepo, Nuxt/Nitro, cycle d'une requête, auth |
| 03 | [Modèle de données](./03-modele-de-donnees.md) | Le schéma Prisma expliqué modèle par modèle |
| 04 | [Backend & API](./04-backend-api.md) | Tous les endpoints, les `server/utils`, les plugins/middleware |
| 05 | [Frontend](./05-frontend.md) | Pages, composants, composables, styling |
| 06 | [Pipeline candidature (LLM)](./06-pipeline-candidature.md) | Le cœur métier : offre → analyse → match → génération → design |
| 07 | [Billing & crédits](./07-billing-credits.md) | Stripe, le ledger de crédits, le webhook |
| 08 | [Sécurité](./08-securite.md) | Durcissement, CSP, rate-limit, secrets |
| 09 | [Conventions & workflow](./09-conventions.md) | Règles d'ingénierie, PR, tests, RGPD, i18n |

## Le projet en 30 secondes

- **Monorepo pnpm** : `apps/app` (l'app Nuxt 3 full-stack) + `packages/shared` (types & logique partagés client ↔ serveur, alias `@cvo/shared`).
- **Full-stack Nuxt 3** : le front Vue 3 et l'API (serveur **Nitro**, dossier `apps/app/server/`) vivent dans le même projet. **Tout le sensible** (profil, offre, appels au LLM Claude, génération, Stripe) est **côté serveur** — aucune clé ni donnée brute n'atteint le navigateur.
- **PostgreSQL** via **Prisma** (ORM + migrations).
- **Auth** : Better Auth, **magic-link** (pas de mot de passe).
- **LLM** : Claude (API Anthropic) pour analyser l'offre, scorer le match et générer le CV.
- **PDF** : Chromium headless (playwright-core), rendu HTML → PDF côté serveur.
- **Paiement** : Stripe Checkout (packs de crédits one-shot, pas d'abonnement).

## Fichiers de référence à la racine

- [`README.md`](../../README.md) — présentation courte + démarrage.
- [`SECURITY-AUDIT.md`](../../SECURITY-AUDIT.md) — audit sécu complet (12 findings + correctifs).
- [`docs/rgpd.md`](../rgpd.md) — cadrage RGPD (placeholder structurel).
- [`docs/ci-gate.md`](../ci-gate.md) — la CI et le gate qualité.

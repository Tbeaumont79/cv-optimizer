# 09 — Conventions & workflow

## Règles d'ingénierie (non négociables)

- **PR-only** — aucun push direct sur `main`. **Seul l'owner (Thibault) merge.**
- **PR > 400 lignes → split.**
- **CI/gate vert obligatoire** avant merge (lint · typecheck · build · test).
- **TypeScript strict** des deux côtés (front Vue + serveur Nitro). Pas de `any` non justifié.
- **Tailwind : design tokens uniquement** (`assets/css/main.css`), **aucune valeur en dur**
  dans les composants (voir [05](./05-frontend.md)).
- **FR-first** — toute la copy passe par `i18n/fr.ts` (pas de texte en dur dans les templates).
- **Contrats via `@cvo/shared`** — jamais d'URL d'API ni de type dupliqué en dur ; importe
  les chemins/DTO/constantes depuis le package partagé.

## Les garde-fous produit (à respecter dans le code)

1. **Honnêteté** — on ne fabrique jamais de fausses compétences/expériences. Concrètement :
   le garde-fou de **provenance** (`assertValidCv`) doit rester en place sur toute écriture
   de CV (génération **et** `PATCH /api/candidatures/:id`). Voir [06](./06-pipeline-candidature.md).
2. **Jamais déficitaire** — les crédits passent **toujours** par le ledger (une ligne par
   mouvement), jamais d'écriture directe d'un solde. Voir [07](./07-billing-credits.md).
3. **RGPD** — tout le traitement sensible reste **côté serveur** ; on ne **logge jamais**
   de contenu (offre, profil, CV), de token d'auth, ni de clé API. Le soft-delete
   (`deletedAt`) est la règle sur les tables métier. Voir [`docs/rgpd.md`](../rgpd.md).

## Tests (Vitest)

- Emplacements : `apps/app/test/` (logique app) et `packages/shared/test/` (contrats/garde-fou).
- Lancer : `pnpm test` (racine, build shared + tests récursifs) ou
  `pnpm --filter @cvo/app test`.
- **Philosophie** : la logique **pure** est extraite pour être testée sans Vue ni base ni
  réseau. Exemples : `button-classes.ts`, `usage.ts` (quotas), `provenance.ts` (garde-fou),
  `photo-crop.ts`, `metering.ts` (builders purs), `match.ts` (score déterministe).
- **Services LLM** : testés par **injection** d'un faux `LlmComplete` (pas d'appel réseau
  ni de clé). Voir `scripts/mock-llm.mjs` et les `*.spec.ts` des services.
- Le test « **item sans provenance → rejeté** » protège le garde-fou anti-invention : il
  **doit** rester vert (c'est le cœur de la promesse produit).

## CI & gate

- Workflow : `.github/workflows/ci.yml` — 2 jobs sur les PR vers `main` :
  - **quality** : lint · typecheck · build · test.
  - **health** : boot Nuxt + probe `/api/health` contre un Postgres éphémère.
- ⚠️ La CI GitHub-hosted peut être **rouge pour une raison d'infra** (facturation Actions
  au niveau du compte, pas de SMTP). Dans ce cas, on **valide en local** :
  ```bash
  bash scripts/pre-merge.sh            # rejoue lint·typecheck·build·test
  bash scripts/pre-merge.sh --health   # + boot + probe santé (Postgres requis)
  ```
  Détails : [`docs/ci-gate.md`](../ci-gate.md).

## Git & commits

- Branches : `feat/…`, `fix/…`, `chore/…`, `docs/…`.
- Messages de commit en **français**, format type `type(scope): résumé` (ex.
  `fix(security): …`, `feat(billing): …`). Corps explicatif si non trivial.
- Ouvre une PR vers `main`, colle une exécution verte du gate, laisse l'owner merger.

## Nommage & marque

- Le nom de marque est un **token unique** : `config/brand.ts` (`BRAND = 'Teven'`). Aucune
  autre occurrence en dur ; les messages i18n portent `{brand}`, interpolé par `useLanding`.

## Où ajouter quoi (aide-mémoire)

| Tu veux… | Va dans… |
|---|---|
| Un nouvel endpoint | `apps/app/server/api/…` (+ `requireUserId`, zod, filtre `userId`) |
| Un type/contrat partagé client↔serveur | `packages/shared/src/…` (+ ré-export dans `index.ts` avec `.js`) |
| De la logique LLM | `apps/app/server/services/…` (injecte `LlmComplete`, impose un JSON Schema, borne la sortie) |
| Un composant UI générique | `apps/app/components/ui/…` |
| Un écran | `apps/app/pages/…` (+ `definePageMeta({ middleware: 'auth' })` si protégé) |
| Du texte affiché | `apps/app/i18n/fr.ts` |
| Un token de style | `apps/app/assets/css/main.css` (`@theme`) |
| Un changement de schéma DB | `apps/app/prisma/schema.prisma` + migration |

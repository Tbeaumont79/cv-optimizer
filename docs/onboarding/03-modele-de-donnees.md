# 03 — Modèle de données (Prisma / PostgreSQL)

Fichier : [`apps/app/prisma/schema.prisma`](../../apps/app/prisma/schema.prisma).
Client Prisma exposé en singleton par [`server/utils/prisma.ts`](../../apps/app/server/utils/prisma.ts).

> **Convention** : les modèles sont en `PascalCase` côté Prisma mais **mappés en
> `snake_case` en base** via `@@map` (ex. `Candidature` → table `candidatures`,
> `CreditLedger` → `credit_ledger`, `User` → `users`). ⚠️ En SQL direct (psql), utilise
> les noms **snake_case**, pas les noms Prisma.

## Deux invariants transverses

1. **Soft-delete RGPD** — la plupart des tables métier ont un `deletedAt DateTime?`.
   Une ligne avec `deletedAt` non nul = **supprimée logiquement**, à exclure des
   lectures. Le helper `NOT_DELETED` (`server/utils/profile-serialize.ts`) sert de
   filtre standard (`{ deletedAt: null }`). La purge physique est un futur job de
   rétention (voir `DataGovernanceEvent`).
2. **`userId` opaque sur les tables « additives »** — `Candidature`, `UsageEvent`,
   `UsageCounter`, `CreditLedger` stockent un `userId` **sans FK Prisma** vers `users`.
   C'était un choix pour que ces lots restent indépendants de l'ordre de merge. La
   sécurité d'accès repose donc sur le **filtrage applicatif par `userId`** dans chaque
   endpoint (voir [04](./04-backend-api.md)), pas sur une contrainte DB.

## Domaines du schéma

### 1. Profil candidat (la source de vérité du moteur)

```
User (1) ──1:1── Profile (1) ──1:n── Experience
                              ├──1:n── Skill
                              ├──1:n── Education
                              └──1:n── Language
```

| Modèle | Table | Rôle & champs notables |
|---|---|---|
| `User` | `users` | Compte. `email` unique, `emailVerified`, `name`, `image`, `stripeCustomerId` (unique, créé à la 1re intention d'achat), `deletedAt`. Relations : `profile`, `sessions`, `accounts`. |
| `Profile` | `profiles` | 1-1 avec User. **Identité factuelle** du CV : `fullName`, `email`, `phone`, `location`, `links[]`. `keySkills[]` = « compétences clés » (phrases verbe d'action). `headline`, `summary`. `baseCvDesign Json?` = thème « CV de base » capturé d'un PDF (style seul, **jamais le contenu**, le PDF n'est jamais stocké). |
| `Experience` | `experiences` | `title`, `company`, `startDate`/`endDate` (`Date`, endDate null = en cours), `description`, `skillsUsed[]`, `orderIndex` (ordre d'affichage). |
| `Skill` | `skills` | `label`, `level` (`SkillLevel` enum), `years?`, `orderIndex`. **Compétence RÉELLE déclarée** = source de vérité du moteur. |
| `Education` | `education` | `degree`, `school`, dates, `description`, `orderIndex`. |
| `Language` | `languages` | `label`, `level` (`LanguageLevel` = CEFR A1→C2 + `NATIVE`), `orderIndex`. |

> 🔑 **À retenir** : le contenu du CV généré **ne peut venir que de ces tables**. Le
> garde-fou de provenance (voir [06](./06-pipeline-candidature.md)) rejette tout élément
> de CV qui ne pointe pas vers un `id` réel du profil.

### 2. Candidature (CV persisté + suivi)

| Modèle | Table | Rôle & champs notables |
|---|---|---|
| `Candidature` | `candidatures` | Une candidature = une offre analysée + un CV généré éditable + un suivi. `userId` (opaque), `label` (dénormalisé = `offer.title`), `status` (`CandidatureStatus`: DRAFT/SUBMITTED/INTERVIEW/REJECTED/ACCEPTED), `offerSnapshot Json` (`AnalyzedOffer` figée), `matchScore Int` (dénormalisé, tri/badge), `matchReport Json`, `generatedCv Json` (`RenderableCv`, **copie de travail éditable**), `design Json?` (`CvDesign` par-candidature, null = fallback profil/défaut). Index `[userId, deletedAt]`. |

### 3. Metering (usage — base du billing freemium)

On mesure l'usage **dès le MVP**, même gratuit. **Jamais de contenu** — que des
compteurs et des volumes de tokens.

| Modèle | Table | Rôle |
|---|---|---|
| `UsageEvent` | `usage_events` | 1 ligne par action. `type` (`UsageEventType`: GENERATION/EXPORT_PDF/EXTRACTION), `period` (yyyymm dénormalisé), `tokensIn`/`tokensOut`, `billable`. |
| `UsageCounter` | `usage_counters` | Agrégat `(userId, period)` — incrémenté par upsert atomique à chaque événement. Unique `[userId, period]`. Sert au quota `export_pdf` (voir [`usage.ts`](#quotas)). |

### 4. Billing — le ledger de crédits ⭐

Modèle **grand livre append-only** : le **solde = somme des `delta`**. On n'écrit
**jamais** un solde directement — chaque octroi/consommation est **une ligne**. Ça
garantit l'audit et l'invariant « **jamais déficitaire** ».

| Modèle | Table | Champs |
|---|---|---|
| `CreditLedger` | `credit_ledger` | `userId`, `delta Int` (jamais 0 : +N octroi/achat, −1 génération), `reason` (`CreditReason`), `idempotencyKey String?` (unique), `packKey String?`, `createdAt`. |

**Les `reason` et leur idempotence :**

| reason | delta | idempotencyKey | Signification |
|---|---|---|---|
| `FREE_GRANT` | +N | `free:<userId>` | Crédits offerts (1 seule ligne par user) |
| `PURCHASE` | +N | id de session Stripe | 1 achat = 1 ligne (rejeu webhook sans effet) |
| `GENERATION` | −1 | `null` | Consommation à la génération d'un CV |
| `ADJUSTMENT` | ±N | `null` | Correction manuelle (SAV) |

> La contrainte `@@unique([idempotencyKey])` fait tout le travail d'idempotence :
> deux `PURCHASE` avec le même `sessionId` ⇒ le 2e est rejeté (Postgres autorise
> plusieurs `NULL` distincts, donc les GENERATION/ADJUSTMENT ne se gênent pas). Détails
> dans [07 — Billing](./07-billing-credits.md).

### 5. Better Auth (tables satellites)

Schéma imposé par Better Auth v1 (adaptateur Prisma). **Pas de soft-delete** (géré en
dur par Better Auth). Champs en `camelCase` imposés par l'adaptateur.

| Modèle | Table | Rôle |
|---|---|---|
| `Session` | `sessions` | Sessions actives (`token` unique, `expiresAt`, `ipAddress`, `userAgent`). |
| `Account` | `accounts` | Comptes liés (OAuth/credentials ; ici = magic-link). |
| `Verification` | `verifications` | Tokens de vérification — **le plugin magic-link y stocke ses tokens**. |

### 6. RGPD (placeholder structurel)

| Modèle | Table | Rôle |
|---|---|---|
| `DataGovernanceEvent` | `data_governance_event` | Trace des actions de gouvernance (`DataGovernanceAction`: RETENTION_APPLIED / ERASURE_REQUESTED / EXPORT_REQUESTED). `subjectRef` = référence opaque (ex. userId), pas de FK. **Placeholder** : la couche conformité réelle est cadrée par [`docs/rgpd.md`](../rgpd.md). |

## Migrations

- Dossier : `apps/app/prisma/migrations/`.
- Créer une migration en dev : `pnpm --filter @cvo/app prisma:migrate:dev`.
- Appliquer en CI/prod : `pnpm --filter @cvo/app prisma:migrate:deploy`.
- Après changement de schéma : `pnpm --filter @cvo/app prisma:generate` (fait aussi par `dev`/`build`).

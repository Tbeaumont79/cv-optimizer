# 06 — Pipeline candidature (le cœur métier LLM)

C'est **la** partie à comprendre avant de toucher à la génération. Elle transforme
un texte d'offre + le profil réel en un CV structuré, **sans jamais inventer**.

## Vue d'ensemble

```
   Texte d'offre (collé)                       Profil réel (DB)
          │                                          │
          ▼                                          │
  ┌──────────────────────  POST /api/candidature/analyze  ─────────────┐
  │  analyzeOffer() ─▶ AnalyzedOffer {title, requiredSkills, keywords}  │
  │  buildMatchReport() ─▶ MatchReport {score, reasons, matched/missing}│
  └────────────────────────────────────────────────────────────────────┘
          │  { offer, match }  (rien n'est encore généré, ~peu de tokens)
          ▼
  ┌─────────────────────  POST /api/candidature/generate  ─────────────┐
  │  ① gate crédits (solde ≥ 1)                                         │
  │  ② matchProfileToOffer() ─▶ RenderableCv  (+ garde-fou provenance)  │
  │  ③ identité factuelle écrasée côté serveur                         │
  │  ④ adaptKeySkills() ─▶ section « compétences clés »                │
  │  ⑤ recordUsageEvent + consumeOneCredit + persist Candidature       │
  └────────────────────────────────────────────────────────────────────┘
          │  { cv, candidatureId }  ─▶  éditeur /candidatures/:id
```

Deux étapes séparées **par design** : le score est calculé **avant** la génération
(peu de tokens) pour prévenir l'utilisateur d'un match faible **avant** de consommer
un crédit. C'est un garde-fou **économique**.

## Le garde-fou d'honnêteté : la PROVENANCE (à ne jamais casser)

Le principe « on n'invente rien » n'est **pas** qu'une consigne de prompt — c'est un
**contrôle de code déterministe**, dans `packages/shared/src/provenance.ts`.

- Chaque élément du CV généré (`header`, chaque bullet, chaque entrée d'expérience/
  skill/formation/langue) porte une **`Provenance`** :
  `{ profileItemId: string, reformulated: boolean }`.
- `profileItemId` **doit** référencer un `id` **réel** du profil. `reformulated: true`
  signale seulement que le libellé a été reformulé (transparence), jamais ajouté.
- **`checkProvenance(cv, validIds)`** parcourt tout le CV et liste les violations
  (`missing` = pas de provenance / id vide ; `unknown` = id absent du profil). Il **ne
  fait pas confiance aux types TS** : la sortie LLM est une donnée externe, revalidée au
  runtime.
- **`assertValidCv(cv, validIds)`** est la version stricte : elle **lève
  `ProvenanceError`** si le CV n'est pas 100 % sourcé. **Un CV non conforme n'atteint
  jamais l'utilisateur.**

L'ensemble des ids valides vient de **`collectProfileItemIds(profile)`** (`matching.ts`) :
`profile.id` (header) + tous les ids d'expériences / skills / formations / langues.

> 💡 Conséquence : même si le LLM « hallucine » une compétence, elle n'aura pas d'id de
> provenance valide → le CV est rejeté (422). L'invention est impossible **par
> construction**, pas par confiance dans le modèle.

## Le client LLM — `server/utils/anthropic.ts`

Tous les services passent par le type injectable **`LlmComplete = (req) => Promise<unknown>`**
(réel = `anthropicComplete` ; faux en test → pas de réseau ni de clé).

- **Modèle** : constante `DEFAULT_MODEL` dans `anthropic.ts` (surchargable par `req.model`).
  Table `PRICING` (USD/M tokens) par modèle pour estimer le coût.
- **Sortie structurée** : le body pose `output_config.format = { type: 'json_schema', schema }`.
  Le LLM est **forcé** de répondre selon le JSON Schema fourni.
- **Multimodal** : `LlmContentBlock` gère `text`, `document` (PDF base64), `image` — le
  bloc document/image doit précéder le texte.
- **Mesure des tokens** : lit `usage.input/output_tokens`, logge le coût (`event: 'llm_cost'`),
  puis appelle `req.onUsage({ inputTokens, outputTokens })` → les endpoints cumulent pour
  le metering. **Jamais de contenu loggé** (RGPD).
- **Erreurs** : tout échec (clé manquante, HTTP non-ok, refus, JSON invalide) devient une
  **`LlmError`**, convertie en **502 générique** par les endpoints (ne divulgue pas la config).

> ⚠️ **Règle de schéma Anthropic** (déjà rencontrée, cause de 400→502) : `additionalProperties: false`
> partout ; un champ nullable + enum s'écrit **`anyOf: [{enum:…}, {type:'null'}]`** (jamais
> `type: ['string','null']`) ; et une grammaire trop grosse est factorisée en **`$defs` + `$ref`**
> (cf. `RENDERABLE_CV_SCHEMA`). Voir la mémoire projet « anthropic-structured-output-schema-rules ».

## Les services (`apps/app/server/services/`)

Chaque service impose un JSON Schema **et** revalide/borne la sortie côté code.

| Service | Fonction | Rôle | Modèle/effort | Bornage code |
|---|---|---|---|---|
| `offer-analysis.ts` | `analyzeOffer(text, deps)` | Texte brut → `AnalyzedOffer` | `effort: low`, 1024 tok, `ANALYZED_OFFER_SCHEMA` | tronque à 20 000 chars ; remap défensif |
| `match-report.ts` | `buildMatchReport(profile, offer, deps)` | Score de match | `effort: low`, `MATCH_SCORE_SCHEMA` (LLM ne rend que `{score, reasons}`) | `clampScore`, `sanitizeReasons` (≤4), `computeKeywordCoverage` **déterministe** ; plafonne à 60 si score>70 mais 0 mot-clé couvert |
| `matching.ts` | `matchProfileToOffer(profile, offer, deps)` | Génère le `RenderableCv` | `effort: medium`, 16000 tok, `RENDERABLE_CV_SCHEMA` (`$defs`/`$ref`) | `capCvLength` (max 6 exp, 4 bullets) puis **`assertValidCv`** |
| `keyskills-adapt.ts` | `adaptKeySkills(keySkills, offer, deps)` | Adapte les phrases « compétences clés » réelles | `effort: low`, schéma local | filtre/trim/`.slice(0, keySkills.length)` (jamais plus que fourni) ; repli **verbatim** |
| `cv-content-extract.ts` | `extractCvContent(pdfB64, deps)` | Extrait le **contenu** d'un CV PDF → `ParsedCvProfile` | `document`+`text`, `CV_CONTENT_SCHEMA` | `null→''`, keySkills bornées |
| `cv-design-extract.ts` | `extractCvDesign(pdfB64, deps)` | Capture le **style** → `CvDesign` | `document`+`text`, `CV_DESIGN_SCHEMA` | `normalizeDesign` (hex/police/layout validés) |

> Les deux derniers ne font **pas** partie du flux offre→CV : ils sont consommés par
> **`POST /api/profile/cv-design/extract`** (import d'un CV PDF au profil), qui les lance
> **en parallèle** (`Promise.all`) sur le même PDF. Le PDF n'est **jamais stocké ni loggé**.

### Détail important dans `matching.ts`
- `keySkills` est **retiré du profil envoyé au LLM** (`const { keySkills: _k, ...profilReel }`)
  pour éviter que le modèle les recopie — elles sont réinjectées déterministe-ment à l'étape ④.
- `RENDERABLE_CV_SCHEMA` est factorisé en `$defs`/`$ref` car inliner provenance × entrées
  × 5 variantes de section dépasse la limite de grammaire compilée d'Anthropic (« compiled
  grammar too large » → 400/502).

## Étape 1 — `POST /api/candidature/analyze`

Fichier : `server/api/candidature/analyze.post.ts`.
1. `requireUserId` + validation zod `{ offerText }` (50–20 000 chars).
2. Charge le `ProfileDTO` (`NOT_DELETED`, relations triées). **409 `profile_empty`** si
   pas de profil, ou ni expérience ni skill.
3. `complete` qui **cumule les tokens** des deux appels via `onUsage`.
4. `analyzeOffer(offerText)` → `AnalyzedOffer` ; `buildMatchReport(profile, offer)` → `MatchReport`.
5. `recordUsageEvent(type: 'extraction', billable: false)` (les 2 appels = 1 événement).
6. Renvoie `{ offer, match }`. `LlmError` → **502**.

> ⚠️ **`/analyze` n'est PAS derrière le gate de crédits** (il fait 2 appels LLM). C'est
> un point d'abus économique connu (finding sécu #5) — une limite par utilisateur reste
> à ajouter. Voir [08](./08-securite.md).

## Étape 2 — `POST /api/candidature/generate`

Fichier : `server/api/candidature/generate.post.ts`.
1. `requireUserId` + validation zod `{ offer, match }` (renvoyés par /analyze, persistés
   **sans recalcul LLM**).
2. **Gate crédits AVANT tout appel LLM** : sauf `DISABLE_GENERATION_LIMIT=true`,
   `getOrInitBalance(userId)` (octroi idempotent des générations offertes) ; si `balance < 1`
   → **403** `data.code = 'quota_exceeded'`. Zéro token consommé si pas de crédit.
3. Recharge le profil (**409 `profile_empty`**). Résout `fullName` (profil sinon compte)
   → **409 `profile_name_missing`** si vide (évite un header vide / export cassé, avant le LLM).
4. `matchProfileToOffer(profile, offer)` → `RenderableCv` (`capCvLength` + `assertValidCv`
   déjà appliqués dans le service).
5. **Identité écrasée côté serveur** (factuelle, jamais du LLM) : `cv.header.fullName` et
   `cv.header.contacts = buildContacts(profile, account.email)`.
6. **Compétences clés** : si `profile.keySkills.length`, `adaptKeySkills(...)` (repli
   verbatim sur `catch`) → section `keyskills` (provenance = `profile.id`) insérée **juste
   avant** la section `experience`.
7. `recordUsageEvent(type: 'generation')` puis (sauf bypass) **`consumeOneCredit(userId)`**
   — débit transactionnel **après succès**, jamais déficitaire.
8. Persiste la `Candidature` (offre figée, score, report, CV, design seedé depuis
   `profile.baseCvDesign`). Renvoie `{ cv, candidatureId }`.
- Erreurs : `InsufficientCreditsError` (course sur le dernier crédit) → **403** ;
  `ProvenanceError` → **422** ; `LlmError` → **502**.

## Qui décide de quoi : LLM vs code

| Le **LLM** fournit | Le **code** garde le contrôle sur |
|---|---|
| L'analyse d'offre (titre, skills, keywords) | La couverture de mots-clés (déterministe) |
| `{score, reasons}` du match | Le bornage/plafonnement du score |
| Le CV structuré priorisé | La troncature 1 page (`capCvLength`) |
| L'adaptation des « compétences clés » | L'identité factuelle du header |
| | Le débit de crédit |
| | **Le garde-fou de provenance (`assertValidCv`)** |

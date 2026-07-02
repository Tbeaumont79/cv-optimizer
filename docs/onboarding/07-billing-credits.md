# 07 — Billing & crédits

Modèle économique acté : **packs de crédits one-shot** via **Stripe Checkout hébergé**.
Pas d'abonnement, pas d'illimité. **1 crédit = 1 génération de CV.**

- Catalogue (source de vérité) : `apps/app/config/pricing.ts`
  - `FREE_GENERATIONS = 5` (générations offertes à vie, via le ledger)
  - `starter` : 5 € / 5 crédits · `standard` : 12 € / 15 crédits (featured)
- Contrats partagés : `packages/shared/src/billing.ts`
- Fichiers serveur : `server/utils/{credits,stripe}.ts`, `server/api/billing/*`, `scripts/stripe-seed.ts`

## Le ledger de crédits (append-only) ⭐

Le solde n'est **jamais** une colonne : c'est la **somme des `delta`** de la table
`credit_ledger` (voir [03](./03-modele-de-donnees.md)). Chaque octroi/consommation est
**une ligne**. Avantages : audit complet + invariant « **jamais déficitaire** ».

Fonctions clés — `server/utils/credits.ts` :

| Fonction | Rôle |
|---|---|
| `getCreditBalance(db, userId)` | Solde = `SUM(delta)` (≥ 0 par construction). |
| `ensureFreeGrant(db, userId)` | Insère la ligne `FREE_GRANT` **une seule fois** (idempotent via `idempotencyKey = free:<userId>` ; avale le P2002). |
| `getOrInitBalance(userId)` | `ensureFreeGrant` puis lit le solde. |
| `consumeOneCredit(userId)` | **Transaction** : relit le solde, insère `−1` seulement si `≥ 1`, sinon lève `InsufficientCreditsError`. |
| `grantPurchasedCredits({userId, sessionId, packKey, credits})` | Insère `PURCHASE +credits` avec `idempotencyKey = sessionId` (rejeu webhook sans effet). |

## Flux d'achat (Checkout hébergé)

```
Front (/credits) ──POST /api/billing/checkout {packKey}──▶ Serveur
                                                             │ résout le prix par lookup_key
                                                             │ (aucun prix piloté par le client)
                                                             ▼
                                              crée une session Stripe Checkout
                     ◀────────────── { url } ──────────────
Front redirige vers l'URL Stripe (paiement hébergé)
                                                             │
       Stripe ──POST /api/billing/webhook (signé)──────────▶ Serveur
                     checkout.session.completed / paid       │ grantPurchasedCredits()
                                                             ▼
                                              +N crédits (ligne PURCHASE)
```

Points de sécurité importants :
- **Prix/crédits déterminés côté serveur** depuis le catalogue (`resolveCreditPack`) — le
  client n'envoie qu'un `packKey`. Le prix Stripe est retrouvé par **`lookup_key`**
  (`teven_credits_<pack>`), aucun ID Stripe stocké en base.
- **Les crédits ne sont accordés QUE par le webhook**, sur `checkout.session.completed`
  avec `payment_status === 'paid'`. Jamais depuis un appel client.
- **Webhook signé** : la signature est vérifiée sur le **corps brut** (`readRawBody` +
  `constructEvent`) avec `STRIPE_WEBHOOK_SECRET`. Signature invalide → 400.
- **Idempotence** : `grantPurchasedCredits` s'appuie sur `@@unique([idempotencyKey])` =
  `session.id` → un rejeu de webhook ne crédite pas deux fois.

## Le seed Stripe

`scripts/stripe-seed.ts` (lancé par `pnpm --filter @cvo/app stripe:seed`) crée les
**produits + prix** dans Stripe depuis `CREDIT_PACKS`. **Idempotent** : cherche le prix
par `lookup_key`, ne recrée pas s'il existe. Le checkout retrouve ensuite le prix par
cette même clé.

## Consommation à la génération

À `POST /api/candidature/generate`, après une génération **réussie**, `consumeOneCredit`
débite 1 crédit **dans une transaction** (relit le solde, insère `−1` si `≥ 1`). Le gate
d'entrée (`balance < 1` → 403) évite de lancer le LLM sans crédit. Bypass dev :
`DISABLE_GENERATION_LIMIT=true`.

## ⚠️ Tester en local — les pièges vécus

Symptôme classique : **« le paiement passe mais les crédits n'augmentent pas »**. Le
webhook n'atteint pas le serveur. Causes, par ordre de fréquence :

1. **`stripe listen` pas lancé** → l'événement n'est jamais forwardé à `localhost`.
2. **`STRIPE_WEBHOOK_SECRET` ≠ secret imprimé par `stripe listen`** → signature invalide → 400.
3. **`stripe listen` connecté à un AUTRE compte Stripe que `STRIPE_SECRET_KEY`** — le plus
   fourbe : un `stripe trigger` marche (même compte que la CLI) mais les **vrais achats**
   de l'app partent sur l'autre compte → jamais forwardés.

**La bonne commande** (force le bon compte + imprime le secret à coller dans `.env`) :
```bash
stripe listen --api-key <ta clé sk_test .env> --forward-to localhost:3000/api/billing/webhook
```
Puis **redémarre Nuxt** (l'env n'est lu qu'au boot).

Diagnostic compte : `curl .../v1/account -u sk:` vs `stripe get /v1/account` — les deux
doivent renvoyer le **même** `acct_…`.

Rattraper un achat déjà payé (sans re-payer) :
```bash
stripe events resend <evt_id> --api-key <clé>   # idempotent par session id
```

## Côté front (`pages/credits.vue`)

Le webhook crédite de façon **asynchrone**. La page mémorise le solde avant la
redirection (localStorage) et **poll** le solde au retour (`?status=success`) avec un
backoff, jusqu'à ce qu'il augmente — sinon l'utilisateur verrait un solde figé.

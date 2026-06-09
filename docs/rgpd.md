# RGPD — placeholder structurel (cadrage = THI-120)

> ⚠️ Document **squelette**. Le cadrage détaillé (base légale, durées, hébergement
> UE, registre des traitements) est livré par THI-120 (WS-Arch). Ce fichier réserve
> l'emplacement et liste les points à couvrir, il ne fait pas autorité.

CV Optimizer stocke des **données personnelles** (profils candidats, CV, offres).
Le squelette technique prévoit dès maintenant l'emplacement des notions suivantes :

| Notion | Emplacement réservé dans le code | Statut |
| --- | --- | --- |
| **Rétention** (durées de conservation) | `DataGovernanceAction.RETENTION_APPLIED` (Prisma) | placeholder |
| **Suppression** (droit à l'effacement) | `DataGovernanceAction.ERASURE_REQUESTED` (Prisma) | placeholder |
| **Export** (portabilité) | `DataGovernanceAction.EXPORT_REQUESTED` (Prisma) | placeholder |
| Minimisation / base légale | à définir | THI-120 |
| Hébergement UE | à définir (infra) | THI-120 |

Le modèle `DataGovernanceEvent` (`apps/app/prisma/schema.prisma`) est un **placeholder
volontaire** : pas de FK vers le métier tant que le data model n'existe pas. Toutes les
futures entités personnelles référenceront cette couche conformité.

Côté architecture (THI-120) : tout le traitement sensible (profil, offre, appels LLM,
génération) reste **côté serveur Nitro** — aucune donnée brute ni clé exposée au navigateur.

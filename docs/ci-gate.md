# Gate CI — cv-optimizer

Règle non négociable : **aucune PR sensible ne merge sans un gate qualité vert**
(lint · typecheck · build · test — dont le test « item sans provenance → rejeté »
qui protège le garde-fou anti-invention du moteur, [THI-124](/THI/issues/THI-124)).

## État actuel (2026-06-09)

| Élément | État |
|---|---|
| Actions activées au niveau **dépôt** | ✅ `enabled:true, allowed_actions:all` (vérifié API) |
| Workflow `.github/workflows/ci.yml` | ✅ YAML valide en local |
| Runs GitHub-hosted | ❌ `startup_failure` immédiat (0 s, `BuildFailed`) |
| Cause | **Facturation Actions au niveau compte** (limite de dépense), **owner-only** |

L'agent CTO ne peut pas lever ce blocage : l'API billing exige le scope `user`,
impossible à obtenir en headless (`gh auth refresh -s user` interactif).

### Geste exact pour rétablir la CI GitHub-hosted (fondateur, ~2 min)

1. https://github.com/settings/billing → **Spending limit** → mettre une limite
   **> 0 $** (une limite à 0 $ bloque même les minutes gratuites du tier).
   *(Le tier gratuit privé = 2000 min/mois ; il n'y a pas de coût réel tant qu'on
   reste sous le quota — la limite > 0 ne fait que débloquer l'ordonnancement.)*
2. Re-déclencher la CI : fermer/rouvrir la PR, ou `gh run rerun <id> --repo Tbeaumont79/cv-optimizer`.
3. Vérifier le run **vert**, puis rendre le check **Required** dans
   Settings → Branches → règle sur `main`.

## Gate de transition (actif dès maintenant, coût zéro)

Tant que le point ci-dessus n'est pas fait, le gate obligatoire est **local** :

```bash
bash scripts/pre-merge.sh            # lint · typecheck · build · test
bash scripts/pre-merge.sh --health   # + boot Nuxt + probe /api/health (Postgres requis)
```

Le script rejoue **à l'identique** les jobs de `ci.yml`. Code de sortie 0 = vert
= mergeable. Toute PR feature (à commencer par THI-124) doit afficher une
exécution verte de ce script — collée dans le fil de la PR — avant merge.

## Cible

Quand la facturation est débloquée : la CI GitHub-hosted devient le gate **Required**
sur `main`, et `scripts/pre-merge.sh` redevient un simple pré-vol local optionnel.

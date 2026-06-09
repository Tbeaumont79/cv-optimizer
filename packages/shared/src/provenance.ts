/**
 * Garde-fou de provenance — contrôle déterministe HORS LLM (Architecture §4a.3).
 *
 * Règle produit : CV Optimizer ne fabrique JAMAIS une compétence ou une expérience.
 * Chaque élément rendu doit pointer vers un élément RÉEL du profil candidat.
 * Ce module vérifie cela par le code (pas par un prompt) : tout élément sans
 * provenance valide est rejeté et n'est jamais affiché comme un acquis.
 * → invention impossible par construction.
 *
 * Utilisé des deux côtés de la frontière :
 *  - Moteur (THI-124) : rejette une sortie LLM non sourcée avant de la stocker.
 *  - Génération (THI-125) : refuse de rendre/exporter un CV non sourcé (défense
 *    en profondeur, même si la sortie a déjà été contrôlée en amont).
 */

import type { ProfileItemId, Provenance, RenderableCv } from './cv'

/** Raison du rejet d'un élément. */
export type ProvenanceViolationReason =
  /** Aucune provenance / profileItemId vide ⇒ élément potentiellement inventé. */
  | 'missing'
  /** Provenance présente mais référence un id absent du profil ⇒ source inconnue. */
  | 'unknown'

/** Élément rejeté par le garde-fou, avec son emplacement pour le diagnostic. */
export interface ProvenanceViolation {
  /** Chemin lisible de l'élément, ex. `sections[1].entries[0].bullets[2]`. */
  path: string
  reason: ProvenanceViolationReason
  /** Id fautif quand il est présent mais inconnu (`reason: 'unknown'`). */
  profileItemId?: string
}

/** Résultat du contrôle de provenance sur un CV complet. */
export interface ProvenanceCheckResult {
  ok: boolean
  violations: ProvenanceViolation[]
}

/**
 * Lit une provenance au runtime SANS faire confiance aux types : la sortie LLM
 * est une donnée externe, un item halluciné peut très bien ne pas porter de
 * provenance malgré le type TS. On valide donc la forme réelle.
 */
function readProfileItemId(value: unknown): string | null {
  if (typeof value !== 'object' || value === null) return null
  const id = (value as Partial<Provenance>).profileItemId
  return typeof id === 'string' && id.length > 0 ? id : null
}

/** Vérifie un nœud porteur de provenance et accumule une éventuelle violation. */
function checkNode(
  provenance: unknown,
  path: string,
  validIds: ReadonlySet<ProfileItemId>,
  out: ProvenanceViolation[],
): void {
  const id = readProfileItemId(provenance)
  if (id === null) {
    out.push({ path, reason: 'missing' })
    return
  }
  if (!validIds.has(id)) {
    out.push({ path, reason: 'unknown', profileItemId: id })
  }
}

/**
 * Contrôle déterministe : chaque élément rendu du CV référence-t-il un élément
 * réel du profil ? Ne lève pas — retourne la liste des violations (vide ⇒ ok).
 *
 * @param cv CV structuré à contrôler.
 * @param validProfileItemIds ids des éléments réels du profil (profile_snapshot).
 */
export function checkProvenance(
  cv: RenderableCv,
  validProfileItemIds: Iterable<ProfileItemId>,
): ProvenanceCheckResult {
  const validIds = new Set(validProfileItemIds)
  const violations: ProvenanceViolation[] = []

  checkNode(cv.header?.provenance, 'header', validIds, violations)

  cv.sections?.forEach((section, s) => {
    const base = `sections[${s}]`
    switch (section.kind) {
      case 'summary':
        checkNode(section.provenance, base, validIds, violations)
        break
      case 'experience':
        section.entries?.forEach((entry, e) => {
          const ep = `${base}.entries[${e}]`
          checkNode(entry.provenance, ep, validIds, violations)
          entry.bullets?.forEach((bullet, b) =>
            checkNode(bullet.provenance, `${ep}.bullets[${b}]`, validIds, violations),
          )
        })
        break
      case 'skills':
      case 'education':
        section.entries?.forEach((entry, e) =>
          checkNode(entry.provenance, `${base}.entries[${e}]`, validIds, violations),
        )
        break
    }
  })

  return { ok: violations.length === 0, violations }
}

/** Erreur levée quand un CV contient au moins un élément non sourcé. */
export class ProvenanceError extends Error {
  readonly violations: ProvenanceViolation[]
  constructor(violations: ProvenanceViolation[]) {
    super(
      `Garde-fou provenance: ${violations.length} élément(s) non sourcé(s) rejeté(s) ` +
        `(${violations.map((v) => `${v.path}:${v.reason}`).join(', ')})`,
    )
    this.name = 'ProvenanceError'
    this.violations = violations
  }
}

/**
 * Variante stricte : lève `ProvenanceError` si le CV contient un élément non
 * sourcé. À utiliser comme barrière avant stockage (moteur) ou avant rendu/export
 * (génération) — un CV non conforme ne doit JAMAIS atteindre l'utilisateur.
 */
export function assertValidCv(
  cv: RenderableCv,
  validProfileItemIds: Iterable<ProfileItemId>,
): void {
  const result = checkProvenance(cv, validProfileItemIds)
  if (!result.ok) throw new ProvenanceError(result.violations)
}

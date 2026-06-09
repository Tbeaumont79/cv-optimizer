/**
 * Contrat du CV structuré (« ranked_content ») — frontière Moteur ↔ Génération.
 *
 * Le moteur de matching (THI-124) NE produit PAS de HTML : il produit ce contenu
 * structuré (sections ordonnées + libellés reformulés). Le template déterministe
 * (THI-125) le rend en HTML/PDF. Architecture §4a/§4b.
 *
 * Garde-fou produit NON NÉGOCIABLE : chaque élément rendu porte la `provenance`
 * d'un élément RÉEL du profil candidat. Le moteur ne fait que **réordonner et
 * reformuler** ce que le candidat a réellement déclaré — jamais inventer.
 * La vérification est déterministe (voir `provenance.ts`), pas seulement un prompt.
 */

/** Identifiant opaque d'un élément réel du profil (expérience, compétence, formation…). */
export type ProfileItemId = string

/** Identifiant stable d'un élément généré (clé de rendu Vue). */
export type CvNodeId = string

/**
 * Lien obligatoire d'un élément généré vers son élément profil source.
 * Pierre angulaire du garde-fou : pas de provenance valide ⇒ rejet (jamais rendu).
 */
export interface Provenance {
  /** Id de l'élément profil source. Obligatoire. */
  profileItemId: ProfileItemId
  /**
   * `true` si le libellé a été reformulé à partir du contenu réel du profil
   * (jamais « ajouté »). Sert à la transparence produit (« reformulé »).
   */
  reformulated: boolean
}

/** Coordonnée de contact (factuelle, issue telle quelle du profil — jamais reformulée). */
export interface CvContact {
  kind: 'email' | 'phone' | 'location' | 'link'
  /** Libellé affiché (ex. « Email », « LinkedIn »). */
  label: string
  /** Valeur affichée (ex. « jean@exemple.fr »). */
  value: string
}

/** En-tête du CV : identité + accroche reformulée + contacts. */
export interface CvHeader {
  fullName: string
  /** Titre/accroche reformulé(e) à partir du profil. */
  headline: string
  contacts: CvContact[]
  /** Provenance vers l'élément d'identité réel du profil. */
  provenance: Provenance
}

/** Puce d'une expérience (réalisation reformulée d'un élément réel). */
export interface CvBullet {
  id: CvNodeId
  text: string
  provenance: Provenance
}

/** Entrée d'expérience professionnelle. */
export interface CvExperienceEntry {
  id: CvNodeId
  role: string
  organization: string
  /** Période affichée (ex. « 2021 – 2024 »). */
  period: string
  location?: string
  bullets: CvBullet[]
  provenance: Provenance
}

/** Entrée de compétence. */
export interface CvSkillEntry {
  id: CvNodeId
  label: string
  provenance: Provenance
}

/** Entrée de formation. */
export interface CvEducationEntry {
  id: CvNodeId
  degree: string
  institution: string
  period: string
  provenance: Provenance
}

/**
 * Section ordonnée du CV. Union discriminée par `kind` : le template rend chaque
 * variante de façon déterministe. MVP = 4 types de sections (1 seul template).
 */
export type CvSection =
  | { kind: 'summary'; title: string; text: string; provenance: Provenance }
  | { kind: 'experience'; title: string; entries: CvExperienceEntry[] }
  | { kind: 'skills'; title: string; entries: CvSkillEntry[] }
  | { kind: 'education'; title: string; entries: CvEducationEntry[] }

/** Type littéral des variantes de section (pratique pour le rendu/exhaustivité). */
export type CvSectionKind = CvSection['kind']

/**
 * CV structuré prêt à rendre. Produit par le moteur, consommé par le template.
 * `sections` est déjà ordonné par le moteur selon la priorisation offre↔profil.
 */
export interface RenderableCv {
  header: CvHeader
  sections: CvSection[]
  /** FR-first au MVP. */
  locale: 'fr'
}

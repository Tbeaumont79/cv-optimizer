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

/** Disposition générale d'un CV. */
export type CvLayout = 'single' | 'sidebar-left'

/**
 * Tokens de design « CV de base » extraits d'un PDF uploadé par le candidat.
 *
 * ⚠️ Ne contient que des PARAMÈTRES de style (couleurs/police/disposition) —
 * jamais de CSS brut ni de contenu. Le gabarit CV (codé, testé à l'impression)
 * applique ces tokens via des variables CSS → rendu toujours propre, adapté au CV.
 * Le contenu vient toujours du profil réel (`RenderableCv`, provenance garantie).
 */
export interface CvDesign {
  /** Disposition : une colonne, ou sidebar à gauche. */
  layout: CvLayout
  /** Couleur d'accent (titres de section, accroche, filets) — hex. */
  accent: string
  /** Fond de la sidebar (layout `sidebar-left`) — hex. */
  sidebarBg: string
  /** Couleur du texte sur la sidebar — hex. */
  sidebarFg: string
  /** Rayon d'arrondi de la sidebar, en mm (0 = bord franc). */
  sidebarRadius?: number
  /** Emplacement de la photo. `sidebar` = en haut de la sidebar (layout 2 colonnes). */
  photoPosition?: 'header-right' | 'header-left' | 'sidebar'
  /** Taille de la photo (côté du carré), en PIXELS CSS. */
  photoSize?: number
  /** Distance de la photo au bord de page, en mm (0 = bord à bord). */
  photoMargin?: number
  /** Padding intérieur de la photo, en mm (espace autour de l'image dans sa case). */
  photoPadding?: number
  /** Nom de police Google à charger (ex. « Inter »), ou null (police par défaut). */
  font: string | null
  /**
   * Photo de profil — data-URL raster validée (`data:image/png|jpeg|webp;base64,…`)
   * ou null. STYLE only, jamais de contenu/provenance. Redimensionnée côté client
   * (petite) ; re-validée serveur par `sanitizeDataImage` (plafond d'octets).
   */
  photo?: string | null
  /** Résumé lisible du design capturé (pour l'UI de relecture). */
  summary: string
}

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

/** Entrée de langue. `level` = libellé affiché (ex. « Courant », « C1 », « Natif »). */
export interface CvLanguageEntry {
  id: CvNodeId
  label: string
  level: string
  provenance: Provenance
}

/** Entrée « compétence clé » : une phrase d'accroche (idéalement un verbe d'action). */
export interface CvKeySkillEntry {
  id: CvNodeId
  text: string
  provenance: Provenance
}

/**
 * Section ordonnée du CV. Union discriminée par `kind` : le template rend chaque
 * variante de façon déterministe. MVP = 4 types de sections (1 seul template).
 */
export type CvSection =
  | { kind: 'summary'; title: string; text: string; provenance: Provenance }
  | { kind: 'keyskills'; title: string; entries: CvKeySkillEntry[] }
  | { kind: 'experience'; title: string; entries: CvExperienceEntry[] }
  | { kind: 'skills'; title: string; entries: CvSkillEntry[] }
  | { kind: 'education'; title: string; entries: CvEducationEntry[] }
  | { kind: 'languages'; title: string; entries: CvLanguageEntry[] }

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

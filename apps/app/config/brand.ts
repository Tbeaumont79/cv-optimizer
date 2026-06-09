/**
 * Nom de marque — TOKEN unique, swap trivial à la décision naming (THI-121).
 * Assomption de travail : « Cvelin » (top pick). Le verdict référent remplace
 * cette seule constante ; aucune autre dépendance naming dans la copy.
 *
 * Les messages i18n (i18n/fr.ts) portent le placeholder `{brand}` ; le
 * composable useLanding() interpole cette constante. Quand le module i18n
 * dédié arrivera, `{brand}` devient un paramètre d'interpolation natif.
 */
export const BRAND = 'Cvelin'

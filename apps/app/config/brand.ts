/**
 * Nom de marque — TOKEN unique, swap trivial à la décision naming (THI-121).
 * Verdict référent VERROUILLÉ = « Teven » (prononcé TÉ-ven), validé sur
 * THI-136 / appliqué via THI-137. Une seule constante porte le nom ; aucune
 * autre dépendance naming dans la copy.
 *
 * Les messages i18n (i18n/fr.ts) portent le placeholder `{brand}` ; le
 * composable useLanding() interpole cette constante. Quand le module i18n
 * dédié arrivera, `{brand}` devient un paramètre d'interpolation natif.
 */
export const BRAND = 'Teven'

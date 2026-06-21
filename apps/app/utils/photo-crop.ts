/**
 * Géométrie pure du recadrage carré d'une photo, en pixels SOURCE. Sans DOM →
 * testable. Le crop est un carré `{ x, y, cropSide }`.
 *
 * Zoom MINIMAL (= 1) = image ENTIÈRE visible (carré contenant toute l'image, donc
 * marges possibles si la photo n'est pas carrée — comblées en blanc à l'export).
 * Zoomer (zoom > 1) réduit le carré → recadre plus serré. Pas de zoom imposé par défaut.
 */

/** Côté du carré contenant TOUTE l'image (le plus grand côté). Zoom min. */
export function fitCropSide(naturalW: number, naturalH: number): number {
  return Math.max(1, Math.max(naturalW, naturalH))
}

/** Côté du carré « cover » (remplit le carré, recadre le surplus). Repère utile. */
export function coverCropSide(naturalW: number, naturalH: number): number {
  return Math.max(1, Math.min(naturalW, naturalH))
}

/** Côté du carré de crop pour un zoom donné (zoom 1 = image entière ; borné [1, maxZoom]). */
export function cropSideForZoom(naturalW: number, naturalH: number, zoom: number, maxZoom = 4): number {
  const z = Math.min(maxZoom, Math.max(1, Number.isFinite(zoom) ? zoom : 1))
  return fitCropSide(naturalW, naturalH) / z
}

/**
 * Borne le coin haut-gauche du carré. Si l'image est PLUS PETITE que le carré dans
 * une dimension (zoom dézoomé), on autorise un coin négatif et on centre ; sinon le
 * carré reste à l'intérieur de l'image (jamais de débordement non voulu).
 */
export function clampCrop(
  naturalW: number,
  naturalH: number,
  cropSide: number,
  x: number,
  y: number,
): { x: number; y: number } {
  const loX = Math.min(0, naturalW - cropSide)
  const hiX = Math.max(0, naturalW - cropSide)
  const loY = Math.min(0, naturalH - cropSide)
  const hiY = Math.max(0, naturalH - cropSide)
  const cx = Number.isFinite(x) ? x : 0
  const cy = Number.isFinite(y) ? y : 0
  return {
    x: Math.min(hiX, Math.max(loX, cx)),
    y: Math.min(hiY, Math.max(loY, cy)),
  }
}

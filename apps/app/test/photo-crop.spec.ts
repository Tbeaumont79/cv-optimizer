import { describe, it, expect } from 'vitest'
import { fitCropSide, coverCropSide, cropSideForZoom, clampCrop } from '../utils/photo-crop'

describe('fitCropSide / coverCropSide', () => {
  it('fit = plus grand côté (image entière) ; cover = plus petit', () => {
    expect(fitCropSide(800, 600)).toBe(800)
    expect(fitCropSide(400, 1000)).toBe(1000)
    expect(coverCropSide(800, 600)).toBe(600)
  })
  it('plancher à 1 (jamais 0)', () => {
    expect(fitCropSide(0, 0)).toBe(1)
    expect(coverCropSide(0, 0)).toBe(1)
  })
})

describe('cropSideForZoom', () => {
  it('zoom 1 = image entière (plus grand côté)', () => {
    expect(cropSideForZoom(800, 600, 1)).toBe(800)
    expect(cropSideForZoom(600, 800, 1)).toBe(800)
  })
  it('zoomer réduit le carré ; borne le zoom à [1, max]', () => {
    expect(cropSideForZoom(800, 800, 2)).toBe(400)
    expect(cropSideForZoom(800, 800, 9, 4)).toBe(200) // borné à 4 → 800/4
    expect(cropSideForZoom(800, 800, 0.5)).toBe(800) // borné à 1
    expect(cropSideForZoom(800, 800, NaN)).toBe(800) // fallback 1
  })
})

describe('clampCrop', () => {
  it('carré dans l’image (cropSide ≤ dimension) : coin borné dans [0, dim - cropSide]', () => {
    expect(clampCrop(800, 600, 600, -50, -50)).toEqual({ x: 0, y: 0 })
    expect(clampCrop(800, 600, 600, 999, 999)).toEqual({ x: 200, y: 0 })
    expect(clampCrop(800, 600, 400, 100, 80)).toEqual({ x: 100, y: 80 })
  })
  it('image plus petite que le carré (zoom dézoomé) : coin négatif autorisé (centrage)', () => {
    // image 600x800, carré 800 → x ∈ [600-800, 0] = [-200, 0], y ∈ [0, 0]
    expect(clampCrop(600, 800, 800, -500, 0)).toEqual({ x: -200, y: 0 })
    expect(clampCrop(600, 800, 800, 50, 50)).toEqual({ x: 0, y: 0 })
    expect(clampCrop(600, 800, 800, -100, 0)).toEqual({ x: -100, y: 0 })
  })
  it('valeurs non finies → 0', () => {
    expect(clampCrop(800, 600, 400, NaN, Infinity)).toEqual({ x: 0, y: 0 })
  })
})

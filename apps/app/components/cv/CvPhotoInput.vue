<script setup lang="ts">
import { Upload, X, Crop, Check } from '@lucide/vue'
import { fitCropSide, cropSideForZoom, clampCrop } from '../../utils/photo-crop'

// data-URL carrée de la photo (ou null/undefined), recadrée côté client.
const photo = defineModel<string | null | undefined>({ default: null })

const input = ref<HTMLInputElement | null>(null)
const busy = ref(false)

// ─── État du recadrage ───────────────────────────────────────────────────────
// Bornes de la résolution de sortie : on garde la résolution NATIVE du recadrage
// (1:1, le plus net) entre MIN et MAX, sans agrandir une source plus petite.
const MIN_OUTPUT = 256
const MAX_OUTPUT = 768 // ~205 DPI à la taille max → net, et data-URL sous le plafond serveur
const MAX_DATAURL_CHARS = 620_000 // marge sous le plafond serveur (700k) de sanitizeDataImage
const VIEW = 256 // côté du viewport d'aperçu (px) — h-64 w-64

const cropping = ref(false)
/** Image source de la session (data-URL) : permet de re-recadrer sans ré-importer. */
const originalSrc = ref<string | null>(null)
const cropSrc = ref<string | null>(null) // source affichée dans le cropper
const sourceImg = ref<HTMLImageElement | null>(null) // image décodée (pour le dessin)
const naturalW = ref(0)
const naturalH = ref(0)
const zoom = ref(1) // [1, 3]
const cropSide = ref(0) // côté du carré, en px source
const cropX = ref(0)
const cropY = ref(0)

const displayScale = computed(() => (cropSide.value > 0 ? VIEW / cropSide.value : 1))

/** Style de l'image dans le viewport : taille naturelle × échelle, translatée. */
const imgStyle = computed(() => ({
  width: `${naturalW.value * displayScale.value}px`,
  height: `${naturalH.value * displayScale.value}px`,
  transform: `translate(${-cropX.value * displayScale.value}px, ${-cropY.value * displayScale.value}px)`,
}))

/** Décode une data-URL et ouvre le cropper centré (zoom 1 = cover). */
function openCropper(src: string) {
  const img = new Image()
  img.onload = () => {
    sourceImg.value = img
    naturalW.value = img.naturalWidth
    naturalH.value = img.naturalHeight
    zoom.value = 1 // zoom min = image entière (pas de recadrage imposé par défaut)
    cropSide.value = fitCropSide(img.naturalWidth, img.naturalHeight)
    const c = clampCrop(
      naturalW.value,
      naturalH.value,
      cropSide.value,
      (naturalW.value - cropSide.value) / 2,
      (naturalH.value - cropSide.value) / 2,
    )
    cropX.value = c.x
    cropY.value = c.y
    cropSrc.value = src
    cropping.value = true
  }
  img.src = src
}

async function onChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  busy.value = true
  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(new Error('read'))
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(file)
    })
    originalSrc.value = dataUrl
    openCropper(dataUrl)
  } catch {
    /* ignore : photo inchangée */
  } finally {
    busy.value = false
    if (input.value) input.value.value = ''
  }
}

/** Rouvre le cropper : depuis l'original si dispo (session), sinon le carré stocké. */
function reopenCropper() {
  const src = originalSrc.value ?? photo.value
  if (src) openCropper(src)
}

// ─── Zoom (recentré) ──────────────────────────────────────────────────────────
function setZoom(next: number) {
  const oldSide = cropSide.value
  const centerX = cropX.value + oldSide / 2
  const centerY = cropY.value + oldSide / 2
  zoom.value = next
  cropSide.value = cropSideForZoom(naturalW.value, naturalH.value, next)
  const c = clampCrop(naturalW.value, naturalH.value, cropSide.value, centerX - cropSide.value / 2, centerY - cropSide.value / 2)
  cropX.value = c.x
  cropY.value = c.y
}
function onZoomInput(e: Event) {
  setZoom(Number((e.target as HTMLInputElement).value) / 100)
}
function onWheel(e: WheelEvent) {
  if (dragging.value) return // évite un saut : ancrage du drag figé au pointerdown
  const next = Math.min(4, Math.max(1, zoom.value + (e.deltaY < 0 ? 0.1 : -0.1)))
  setZoom(next)
}

// ─── Déplacement (Pointer Events : souris + tactile) ──────────────────────────
const dragging = ref(false)
let startX = 0
let startY = 0
let startCropX = 0
let startCropY = 0

function onPointerDown(e: PointerEvent) {
  dragging.value = true
  startX = e.clientX
  startY = e.clientY
  startCropX = cropX.value
  startCropY = cropY.value
  try {
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  } catch {
    /* capture non critique : le drag fonctionne sans */
  }
}
function onPointerMove(e: PointerEvent) {
  if (!dragging.value) return
  const dx = (e.clientX - startX) / displayScale.value
  const dy = (e.clientY - startY) / displayScale.value
  const c = clampCrop(naturalW.value, naturalH.value, cropSide.value, startCropX - dx, startCropY - dy)
  cropX.value = c.x
  cropY.value = c.y
}
function onPointerUp() {
  dragging.value = false
}

// ─── Validation / annulation ──────────────────────────────────────────────────
function applyCrop() {
  const img = sourceImg.value
  if (!img) return
  // Résolution de sortie = taille native du recadrage (1:1, le plus net), bornée.
  const out = Math.min(MAX_OUTPUT, Math.max(MIN_OUTPUT, Math.round(cropSide.value)))
  const canvas = document.createElement('canvas')
  canvas.width = out
  canvas.height = out
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  // Comble les marges (si l'image ne remplit pas le carré) en blanc — le JPEG n'a
  // pas d'alpha, sans ce fond les zones non couvertes seraient noires.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, out, out)
  ctx.drawImage(img, cropX.value, cropY.value, cropSide.value, cropSide.value, 0, 0, out, out)
  // Encode en JPEG en restant sous le plafond serveur : baisse la qualité si besoin.
  let url = canvas.toDataURL('image/jpeg', 0.92)
  for (const q of [0.85, 0.78, 0.7]) {
    if (url.length <= MAX_DATAURL_CHARS) break
    url = canvas.toDataURL('image/jpeg', q)
  }
  photo.value = url
  closeCropper()
}
function cancelCrop() {
  closeCropper()
}
/** Ferme le cropper et libère l'image décodée (on garde `originalSrc` pour la session). */
function closeCropper() {
  cropping.value = false
  sourceImg.value = null
  cropSrc.value = null
}
function removePhoto() {
  photo.value = null
  originalSrc.value = null
  closeCropper()
}
</script>

<template>
  <div class="space-y-3">
    <!-- Cropper -->
    <div v-if="cropping" class="space-y-3">
      <div
        class="relative mx-auto h-64 w-64 cursor-move touch-none overflow-hidden rounded-card bg-white ring-1 ring-border"
        role="img"
        aria-label="Zone de recadrage — fais glisser pour déplacer"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
        @wheel.prevent="onWheel"
      >
        <img
          v-if="cropSrc"
          :src="cropSrc"
          alt=""
          draggable="false"
          class="max-w-none origin-top-left select-none"
          :style="imgStyle"
        />
      </div>

      <label class="block text-sm font-medium text-ink-700">
        Zoom
        <input
          type="range"
          min="100"
          max="400"
          step="1"
          :value="Math.round(zoom * 100)"
          class="mt-1 w-full accent-brand-600"
          @input="onZoomInput"
        />
      </label>

      <div class="flex items-center gap-2">
        <UiButton size="sm" @click="applyCrop">
          <Check class="h-4 w-4" :stroke-width="2" aria-hidden="true" /> Valider le recadrage
        </UiButton>
        <UiButton variant="ghost" size="sm" @click="cancelCrop">Annuler</UiButton>
      </div>
    </div>

    <!-- Aperçu + actions -->
    <div v-else class="flex items-center gap-3">
      <div
        class="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-control bg-ink-100 ring-1 ring-border"
        aria-hidden="true"
      >
        <img v-if="photo" :src="photo" alt="" class="h-full w-full object-cover" />
        <Upload v-else class="h-5 w-5 text-ink-400" :stroke-width="1.75" />
      </div>
      <input ref="input" type="file" accept="image/png,image/jpeg,image/webp" class="sr-only" @change="onChange" />
      <UiButton variant="secondary" size="sm" :loading="busy" @click="input?.click()">
        {{ photo ? 'Changer la photo' : 'Ajouter une photo' }}
      </UiButton>
      <UiButton v-if="photo" variant="secondary" size="sm" @click="reopenCropper">
        <Crop class="h-4 w-4" :stroke-width="2" aria-hidden="true" /> Recadrer
      </UiButton>
      <UiButton v-if="photo" variant="ghost" size="sm" aria-label="Retirer la photo" @click="removePhoto">
        <X class="h-4 w-4" :stroke-width="2" aria-hidden="true" />
      </UiButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CvDesign } from '@cvo/shared'

// Le modèle est l'objet design entier ; on mute ses champs (deep watch parent).
const design = defineModel<CvDesign>({ required: true })

/** Polices Google proposées (alignées sur sanitizeFont : lettres/espaces/-). */
const FONTS = ['Inter', 'Poppins', 'Lato', 'Roboto', 'Montserrat', 'Open Sans', 'Work Sans', 'Merriweather', 'Playfair Display']
</script>

<template>
  <div class="space-y-4">
    <!-- Disposition -->
    <div class="flex flex-col gap-1.5">
      <span class="text-sm font-medium text-ink-700">Disposition</span>
      <div class="flex gap-2">
        <button
          type="button"
          class="flex-1 rounded-control px-3 py-2 text-sm ring-1 transition"
          :class="design.layout === 'single' ? 'bg-brand-50 text-brand-700 ring-brand-300' : 'bg-surface text-ink-600 ring-border hover:bg-ink-50'"
          @click="design.layout = 'single'"
        >
          1 colonne
        </button>
        <button
          type="button"
          class="flex-1 rounded-control px-3 py-2 text-sm ring-1 transition"
          :class="design.layout === 'sidebar-left' ? 'bg-brand-50 text-brand-700 ring-brand-300' : 'bg-surface text-ink-600 ring-border hover:bg-ink-50'"
          @click="design.layout = 'sidebar-left'"
        >
          Sidebar
        </button>
      </div>
    </div>

    <!-- Couleurs -->
    <div class="grid grid-cols-3 gap-3">
      <label class="flex flex-col gap-1.5 text-sm text-ink-700">
        Accent
        <input v-model="design.accent" type="color" class="h-9 w-full cursor-pointer rounded-control ring-1 ring-border" />
      </label>
      <label v-if="design.layout === 'sidebar-left'" class="flex flex-col gap-1.5 text-sm text-ink-700">
        Fond sidebar
        <input v-model="design.sidebarBg" type="color" class="h-9 w-full cursor-pointer rounded-control ring-1 ring-border" />
      </label>
      <label v-if="design.layout === 'sidebar-left'" class="flex flex-col gap-1.5 text-sm text-ink-700">
        Texte sidebar
        <input v-model="design.sidebarFg" type="color" class="h-9 w-full cursor-pointer rounded-control ring-1 ring-border" />
      </label>
    </div>

    <!-- Arrondi de la sidebar -->
    <label v-if="design.layout === 'sidebar-left'" class="flex flex-col gap-1.5 text-sm font-medium text-ink-700">
      Arrondi sidebar · {{ design.sidebarRadius ?? 0 }} mm
      <input v-model.number="design.sidebarRadius" type="range" min="0" max="12" step="1" class="w-full accent-brand-600" />
    </label>

    <!-- Photo -->
    <div class="grid grid-cols-2 gap-3">
      <label class="flex flex-col gap-1.5 text-sm font-medium text-ink-700">
        Photo — emplacement
        <select
          :value="design.photoPosition ?? 'header-right'"
          class="h-10 rounded-control bg-surface px-3 text-sm text-ink-900 ring-1 ring-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          @change="design.photoPosition = ($event.target as HTMLSelectElement).value as 'header-right' | 'header-left' | 'sidebar'"
        >
          <option value="header-right">En-tête droite</option>
          <option value="header-left">En-tête gauche</option>
          <option value="sidebar">Sidebar</option>
        </select>
      </label>
      <label class="flex flex-col gap-1.5 text-sm font-medium text-ink-700">
        Photo — taille · {{ design.photoSize ?? 128 }} px
        <input v-model.number="design.photoSize" type="range" min="64" max="360" step="4" class="w-full accent-brand-600" />
      </label>
    </div>

    <!-- Marge de la photo au bord (en-tête) : 0 = bord à bord -->
    <label class="flex flex-col gap-1.5 text-sm font-medium text-ink-700">
      Photo — marge au bord · {{ design.photoMargin ?? 14 }} mm
      <input v-model.number="design.photoMargin" type="range" min="0" max="16" step="1" class="w-full accent-brand-600" />
      <span class="text-xs font-normal text-ink-400">0 = bord à bord (en-tête gauche/droite)</span>
    </label>

    <!-- Padding intérieur de la photo : espace autour de l'image dans sa case -->
    <label class="flex flex-col gap-1.5 text-sm font-medium text-ink-700">
      Photo — marge intérieure · {{ design.photoPadding ?? 0 }} mm
      <input v-model.number="design.photoPadding" type="range" min="0" max="8" step="1" class="w-full accent-brand-600" />
    </label>

    <!-- Police -->
    <label class="flex flex-col gap-1.5 text-sm font-medium text-ink-700">
      Police
      <select
        :value="design.font ?? ''"
        class="h-10 rounded-control bg-surface px-3 text-sm text-ink-900 ring-1 ring-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        @change="design.font = ($event.target as HTMLSelectElement).value || null"
      >
        <option value="">Par défaut</option>
        <option v-for="f in FONTS" :key="f" :value="f">{{ f }}</option>
      </select>
    </label>
  </div>
</template>

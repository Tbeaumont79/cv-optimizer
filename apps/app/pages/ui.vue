<script setup lang="ts">
// Catalogue léger du design system — référence visuelle + QA manuelle des composants.
// Les WS profil/génération consomment ces mêmes composants.
const sampleName = ref('Camille Martin')
const sampleBio = ref('')
const loadingDemo = ref(false)

function simulate() {
  loadingDemo.value = true
  setTimeout(() => (loadingDemo.value = false), 1500)
}
</script>

<template>
  <div class="flex flex-col gap-10">
    <header>
      <h1 class="text-2xl font-bold text-ink-900">Design system</h1>
      <p class="mt-1 text-ink-500">Tokens Tailwind + composants UI de base (THI-127).</p>
    </header>

    <UiCard title="Boutons">
      <div class="flex flex-wrap items-center gap-3">
        <UiButton>Primaire</UiButton>
        <UiButton variant="secondary">Secondaire</UiButton>
        <UiButton variant="ghost">Ghost</UiButton>
        <UiButton variant="danger">Supprimer</UiButton>
        <UiButton disabled>Désactivé</UiButton>
        <UiButton :loading="loadingDemo" @click="simulate">Générer</UiButton>
      </div>
      <div class="mt-4 flex flex-wrap items-center gap-3">
        <UiButton size="sm">Small</UiButton>
        <UiButton size="md">Medium</UiButton>
        <UiButton size="lg">Large</UiButton>
      </div>
    </UiCard>

    <UiCard title="Champs de formulaire">
      <div class="flex flex-col gap-4">
        <UiInput
          v-model="sampleName"
          label="Nom complet"
          required
          hint="Tel qu'il apparaîtra sur le CV."
        />
        <UiInput v-model="sampleName" label="Email" type="email" error="Adresse email invalide." />
        <UiInput label="Champ désactivé" placeholder="Indisponible" disabled />
        <UiTextarea v-model="sampleBio" label="Accroche" placeholder="Quelques lignes…" />
      </div>
    </UiCard>

    <UiCard title="États (loading / erreur / vide)">
      <div class="grid gap-4 sm:grid-cols-3">
        <UiState variant="loading" title="Chargement…" description="Récupération des données." />
        <UiState variant="error" title="Erreur" description="Impossible de charger le profil.">
          <UiButton size="sm" variant="secondary">Réessayer</UiButton>
        </UiState>
        <UiState
          variant="empty"
          title="Aucune offre"
          description="Ajoutez une offre pour commencer."
        >
          <UiButton size="sm">Ajouter</UiButton>
        </UiState>
      </div>
    </UiCard>
  </div>
</template>

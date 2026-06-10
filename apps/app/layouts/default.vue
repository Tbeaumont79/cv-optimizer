<script setup lang="ts">
import { ChevronDown, LogOut } from '@lucide/vue'
import { BRAND } from '~/config/brand'

const isDev = import.meta.dev
const route = useRoute()
const { session, signOut, pending } = useAuth()

/** Snapshot minimal de la session Better Auth (atom nanostores côté client). */
type SessionUser = { email?: string | null }
type SessionSnapshot = { data?: { user?: SessionUser | null } | null }

const user = ref<SessionUser | null>(null)
let unsubscribeSession: (() => void) | undefined

const userInitial = computed(() => user.value?.email?.charAt(0)?.toUpperCase() ?? '?')

const navLinks = [
  { label: 'Mon profil', to: '/profil' },
  { label: 'Mon CV', to: '/cv/demo' },
] as const

function isActive(to: string) {
  if (to === '/cv/demo') return route.path.startsWith('/cv')
  return route.path === to || route.path.startsWith(`${to}/`)
}

// --- Menu utilisateur (dropdown maison) ---
const menuOpen = ref(false)
const menuRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLButtonElement | null>(null)

function onDocumentClick(event: MouseEvent) {
  if (!menuOpen.value) return
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    menuOpen.value = false
  }
}

function onDocumentKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && menuOpen.value) {
    menuOpen.value = false
    triggerRef.value?.focus()
  }
}

async function handleSignOut() {
  menuOpen.value = false
  await signOut()
  await navigateTo('/')
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onDocumentKeydown)

  // L'atom Better Auth n'est pas réactif pour Vue : on s'y abonne et on
  // recopie l'utilisateur dans une ref locale (mise à jour aussi au signOut).
  const atom = session as unknown as {
    subscribe?: (listener: (value: SessionSnapshot) => void) => () => void
  }
  if (typeof atom?.subscribe === 'function') {
    unsubscribeSession = atom.subscribe((value) => {
      user.value = value?.data?.user ?? null
    })
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onDocumentKeydown)
  unsubscribeSession?.()
})

const year = new Date().getFullYear()
</script>

<template>
  <div class="flex min-h-full flex-col bg-surface-muted">
    <header class="sticky top-0 z-40 border-b border-border bg-surface/80 backdrop-blur">
      <div class="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-6">
        <div class="flex min-w-0 items-center gap-6">
          <NuxtLink
            to="/"
            class="flex shrink-0 items-center gap-2 rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            :aria-label="`${BRAND} — retour à l'accueil`"
          >
            <span
              class="flex h-8 w-8 items-center justify-center rounded-control bg-brand-600 text-sm font-bold text-white"
              aria-hidden="true"
            >
              T
            </span>
            <span class="text-lg font-bold tracking-tight text-ink-900">{{ BRAND }}</span>
          </NuxtLink>

          <nav
            v-if="user || isDev"
            class="flex items-center gap-1"
            aria-label="Navigation principale"
          >
            <template v-if="user">
              <NuxtLink
                v-for="link in navLinks"
                :key="link.to"
                :to="link.to"
                class="rounded-control px-3 py-1.5 text-sm font-medium transition-colors duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                :class="
                  isActive(link.to)
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-ink-600 hover:bg-surface-muted hover:text-ink-900'
                "
                :aria-current="isActive(link.to) ? 'page' : undefined"
              >
                {{ link.label }}
              </NuxtLink>
            </template>

            <NuxtLink
              v-if="isDev"
              to="/ui"
              class="rounded-control px-3 py-1.5 text-sm font-medium transition-colors duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              :class="
                isActive('/ui')
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-ink-600 hover:bg-surface-muted hover:text-ink-900'
              "
              :aria-current="isActive('/ui') ? 'page' : undefined"
            >
              Design system
            </NuxtLink>
          </nav>
        </div>

        <div v-if="user" ref="menuRef" class="relative shrink-0">
          <button
            id="account-menu-trigger"
            ref="triggerRef"
            type="button"
            class="flex items-center gap-1.5 rounded-full p-1 transition-colors duration-300 ease-out hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            aria-haspopup="menu"
            :aria-expanded="menuOpen"
            aria-controls="account-menu"
            aria-label="Menu du compte"
            @click="menuOpen = !menuOpen"
          >
            <span
              class="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700"
              aria-hidden="true"
            >
              {{ userInitial }}
            </span>
            <ChevronDown
              class="h-4 w-4 text-ink-500 transition-transform duration-300 ease-out"
              :class="menuOpen ? 'rotate-180' : ''"
              :stroke-width="2"
              aria-hidden="true"
            />
          </button>

          <div
            v-if="menuOpen"
            id="account-menu"
            role="menu"
            aria-labelledby="account-menu-trigger"
            class="absolute right-0 top-full z-50 mt-2 w-64 animate-fade-up rounded-card bg-surface p-1.5 shadow-pop ring-1 ring-border"
          >
            <p class="truncate px-3 py-2 text-sm text-ink-600" :title="user.email ?? undefined">
              {{ user.email }}
            </p>
            <div role="separator" class="my-1 border-t border-border" />
            <button
              type="button"
              role="menuitem"
              :disabled="pending"
              class="flex w-full items-center gap-2 rounded-control px-3 py-2 text-left text-sm font-medium text-ink-700 transition-colors duration-300 ease-out hover:bg-danger-50 hover:text-danger-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
              @click="handleSignOut"
            >
              <LogOut class="h-4 w-4" :stroke-width="1.75" aria-hidden="true" />
              Se déconnecter
            </button>
          </div>
        </div>

        <UiButton v-else size="sm" class="shrink-0" @click="navigateTo('/connexion')">
          Essayer gratuitement
        </UiButton>
      </div>
    </header>

    <!--
      Pas de conteneur ici : chaque page gère sa largeur. La landing pose des
      sections full-bleed (fonds bord à bord) ; les pages app se wrappent dans
      mx-auto max-w-6xl px-6 py-10.
    -->
    <main class="flex-1">
      <slot />
    </main>

    <footer class="border-t border-border bg-surface-muted">
      <div class="mx-auto w-full max-w-6xl px-6 py-10">
        <div class="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
          <div class="max-w-xs space-y-3">
            <NuxtLink
              to="/"
              class="inline-flex items-center gap-2 rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              :aria-label="`${BRAND} — retour à l'accueil`"
            >
              <span
                class="flex h-7 w-7 items-center justify-center rounded-control bg-brand-600 text-xs font-bold text-white"
                aria-hidden="true"
              >
                T
              </span>
              <span class="text-base font-bold tracking-tight text-ink-900">{{ BRAND }}</span>
            </NuxtLink>
            <p class="text-sm text-ink-600">Ton CV, adapté à chaque offre. Sans stress.</p>
          </div>

          <div class="flex gap-12 sm:gap-16">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-ink-500">Produit</p>
              <ul class="mt-3 space-y-2 text-sm">
                <li>
                  <a
                    href="/#tarifs"
                    class="text-ink-600 transition-colors duration-300 ease-out hover:text-ink-900"
                  >
                    Tarifs
                  </a>
                </li>
                <li>
                  <NuxtLink
                    to="/connexion"
                    class="text-ink-600 transition-colors duration-300 ease-out hover:text-ink-900"
                  >
                    Connexion
                  </NuxtLink>
                </li>
              </ul>
            </div>

            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-ink-500">Légal</p>
              <ul class="mt-3 space-y-2 text-sm">
                <!-- Pages légales à venir : placeholders non interactifs (pas de faux liens). -->
                <li>
                  <span class="cursor-default text-ink-400">Mentions légales</span>
                </li>
                <li>
                  <span class="cursor-default text-ink-400">Confidentialité</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <p class="mt-10 border-t border-border pt-6 text-xs text-ink-500">
          © {{ year }} {{ BRAND }}. Tous droits réservés.
        </p>
      </div>
    </footer>
  </div>
</template>

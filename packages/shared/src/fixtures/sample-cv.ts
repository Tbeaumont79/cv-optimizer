/**
 * CV exemple SOURCÉ — fixture minimale pour tester le garde-fou (aucune donnée
 * personnelle réelle). Tous les `profileItemId` appartiennent à
 * `SAMPLE_PROFILE_ITEM_IDS`, donc ce CV passe le contrôle de provenance.
 * Exerce les 4 types de sections + les puces imbriquées. La fixture de démo
 * riche (pagination multi-pages) viendra avec le template (THI-125).
 */
import type { RenderableCv, ProfileItemId } from '../cv'

/** Ids des éléments réels du profil exemple (équivalent d'un profile_snapshot). */
export const SAMPLE_PROFILE_ITEM_IDS: readonly ProfileItemId[] = [
  'identity-1',
  'summary-1',
  'exp-1',
  'exp-1-b1',
  'exp-1-b2',
  'skill-ts',
  'skill-vue',
  'edu-1',
]

export const SAMPLE_CV: RenderableCv = {
  locale: 'fr',
  header: {
    fullName: 'Camille Martin',
    headline: 'Développeuse full-stack TypeScript — Vue & Node',
    contacts: [
      { kind: 'email', label: 'Email', value: 'camille.martin@exemple.fr' },
      { kind: 'location', label: 'Localisation', value: 'Lyon, France' },
    ],
    provenance: { profileItemId: 'identity-1', reformulated: true },
  },
  sections: [
    {
      kind: 'summary',
      title: 'Profil',
      text: 'Développeuse full-stack avec 4 ans de pratique sur des SaaS en TypeScript.',
      provenance: { profileItemId: 'summary-1', reformulated: true },
    },
    {
      kind: 'experience',
      title: 'Expériences',
      entries: [
        {
          id: 'cv-exp-1',
          role: 'Développeuse full-stack',
          organization: 'Studio Web SAS',
          period: '2021 – 2024',
          location: 'Lyon',
          provenance: { profileItemId: 'exp-1', reformulated: true },
          bullets: [
            {
              id: 'cv-exp-1-b1',
              text: 'Conception et livraison d’une application Vue 3 + Nitro pour 12k utilisateurs.',
              provenance: { profileItemId: 'exp-1-b1', reformulated: true },
            },
            {
              id: 'cv-exp-1-b2',
              text: 'Mise en place de la CI PR-only et des tests sur les chemins sensibles.',
              provenance: { profileItemId: 'exp-1-b2', reformulated: true },
            },
          ],
        },
      ],
    },
    {
      kind: 'skills',
      title: 'Compétences',
      entries: [
        {
          id: 'cv-sk-1',
          label: 'TypeScript',
          provenance: { profileItemId: 'skill-ts', reformulated: false },
        },
        {
          id: 'cv-sk-2',
          label: 'Vue 3',
          provenance: { profileItemId: 'skill-vue', reformulated: false },
        },
      ],
    },
    {
      kind: 'education',
      title: 'Formation',
      entries: [
        {
          id: 'cv-edu-1',
          degree: 'Master Informatique',
          institution: 'Université de Lyon',
          period: '2019',
          provenance: { profileItemId: 'edu-1', reformulated: false },
        },
      ],
    },
  ],
}

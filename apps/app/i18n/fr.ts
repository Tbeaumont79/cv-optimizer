/**
 * Copy de la landing — FR-first, source unique de vérité (conforme au doc
 * validé CMO « landing-copy », THI-128). AUCUN texte en dur dans les templates :
 * les composants lisent ces clés via useLanding().
 *
 * `{brand}` est un placeholder interpolé par useLanding() (config/brand.ts).
 * Structure pensée i18n : ce fichier devient le locale `fr` quand le module
 * i18n dédié sera branché (clés inchangées, swap trivial).
 */
export const fr = {
  brand: '{brand}',

  meta: {
    title: '{brand} — CV adapté à chaque offre d’emploi, sans mentir',
    description:
      'Reformulez et adaptez votre CV à chaque offre en quelques minutes. {brand} met en valeur votre expérience réelle — jamais de fausses compétences. Gratuit, sans mot de passe.',
  },

  hero: {
    h1Lead: 'Un CV taillé pour chaque offre.',
    h1Accent: 'Sans jamais mentir.',
    subtitle:
      '{brand} reformule et hiérarchise votre expérience réelle pour coller à l’offre que vous visez. Jamais de fausses compétences — juste votre parcours, mis en valeur.',
    cta: 'Créer mon CV adapté — gratuit',
    trust:
      'Sans carte bancaire · Lien de connexion par e-mail · Vos données restent privées (RGPD)',
    visualBefore: 'CV générique',
    visualAfter: 'CV réaligné sur l’offre',
    visualNote: 'Aucune ligne inventée — uniquement réordonnée et reformulée.',
  },

  problem: {
    h2: 'Le même CV pour 30 offres ? Les recruteurs le voient. Les ATS aussi.',
    body: 'Un CV générique se noie. Le réécrire à la main pour chaque offre prend une heure que vous n’avez pas. Et les générateurs « IA » règlent le problème en inventant des compétences que vous devrez assumer en entretien.',
    transition: 'Il y a une troisième voie.',
  },

  how: {
    h2: 'Comment ça marche',
    steps: [
      {
        title: 'Importez votre parcours',
        body: 'Votre CV actuel ou vos expériences. On en extrait vos vraies compétences.',
      },
      {
        title: 'Collez l’offre visée',
        body: '{brand} repère ce que le poste demande vraiment.',
      },
      {
        title: 'Recevez un CV réaligné',
        body: 'Vos expériences pertinentes remontées et reformulées pour l’offre. Rien d’inventé. Exportez et postulez.',
      },
    ],
  },

  guardrail: {
    h2: 'Optimisé, jamais inventé.',
    promise:
      '{brand} ne fabrique jamais de compétence, de diplôme ou d’expérience que vous n’avez pas. Notre IA hiérarchise, reformule et met en valeur ce qui existe déjà dans votre parcours — rien d’autre.',
    proof: [
      { ok: true, text: 'Reformule vos expériences réelles dans le vocabulaire de l’offre.' },
      { ok: true, text: 'Remonte les compétences pertinentes en haut.' },
      {
        ok: false,
        text: 'N’ajoute jamais une compétence ou un résultat que vous n’avez pas déclaré.',
      },
    ],
    reassurance:
      'Chaque ligne de votre CV reste défendable en entretien — parce qu’elle est vraie.',
  },

  audience: {
    h2: 'Pensé pour celles et ceux qui postulent vraiment.',
    cards: [
      { title: 'Jeunes diplômés', body: 'Faire ressortir l’essentiel d’un parcours court.' },
      { title: 'Cadres en veille', body: 'Adapter vite sans tout réécrire.' },
      { title: 'Reconversion', body: 'Traduire votre expérience vers un nouveau secteur.' },
    ],
  },

  pricing: {
    h2: 'Commencez gratuitement. Passez Premium quand ça compte.',
    perMonth: '/mois',
    free: '0 €',
    legal: 'Sans engagement · résiliable à tout moment.',
    plans: {
      free: {
        name: 'Gratuit',
        tagline: 'Idéal pour tester sur votre prochaine candidature.',
        features: ['Adaptation à l’offre', 'Export du CV', 'Découverte du garde-fou'],
        cta: 'Créer mon CV gratuit',
      },
      premium: {
        name: 'Premium',
        tagline: 'Pour celles et ceux qui postulent en série.',
        features: [
          'Adaptations illimitées',
          'Variantes par offre',
          'Historique de candidatures',
          'Exports avancés',
        ],
        cta: 'Passer Premium',
      },
    },
  },

  faq: {
    h2: 'Questions fréquentes',
    items: [
      {
        q: 'Est-ce que {brand} invente des compétences ?',
        a: 'Non, jamais. C’est notre règle non négociable : on réordonne et reformule votre expérience réelle, on n’ajoute rien.',
      },
      {
        q: 'Faut-il créer un mot de passe ?',
        a: 'Non — connexion par lien magique envoyé sur votre e-mail.',
      },
      {
        q: 'Mes données sont-elles en sécurité ?',
        a: 'Vos CV et profils sont stockés de façon sécurisée et conformes au RGPD ; vous pouvez les supprimer à tout moment.',
      },
      {
        q: 'Ça marche pour une reconversion ?',
        a: 'Oui — on traduit votre expérience existante dans le vocabulaire du secteur visé, sans rien inventer.',
      },
      {
        q: 'Combien de temps ça prend ?',
        a: 'Quelques minutes par offre.',
      },
    ],
  },

  finalCta: {
    h2: 'Votre prochaine candidature mérite mieux qu’un copier-coller.',
    cta: 'Créer mon CV adapté — gratuit',
    trust: 'Sans carte bancaire · RGPD · Honnête par conception.',
  },

  signup: {
    emailLabel: 'Votre e-mail',
    emailPlaceholder: 'vous@email.com',
    submit: 'Recevoir mon lien de connexion',
    sentTitle: 'C’est envoyé ✉️',
    sentBody: 'Cliquez sur le lien dans votre e-mail pour continuer. Pensez aux indésirables.',
    errorInvalid: 'Cet e-mail ne semble pas valide — vérifiez et réessayez.',
    errorNetwork: 'Une erreur est survenue — réessayez dans un instant.',
  },

  footer: {
    links: [
      { label: 'Accueil', href: '#top' },
      { label: 'Tarifs', href: '#tarifs' },
      { label: 'Confidentialité (RGPD)', href: '/confidentialite' },
      { label: 'Mentions légales', href: '/mentions-legales' },
      { label: 'Contact', href: 'mailto:contact@example.com' },
    ],
    copyright: '© {brand}',
  },
} as const

export type LandingMessages = typeof fr

/**
 * Copy de la landing — FR-first, source unique de vérité (conforme au doc
 * validé CMO « landing-copy », THI-128). AUCUN texte en dur dans les templates :
 * les composants lisent ces clés via useLanding().
 *
 * Placeholders interpolés par useLanding() :
 * - `{brand}` → constante BRAND (config/brand.ts)
 * - `{freeGenerations}` → constante FREE_GENERATIONS (config/pricing.ts)
 *
 * Structure pensée i18n : ce fichier devient le locale `fr` quand le module
 * i18n dédié sera branché (clés inchangées, swap trivial).
 */
export const fr = {
  brand: '{brand}',

  meta: {
    title: '{brand} — CV adapté à chaque offre d’emploi, sans mentir',
    description:
      'Adaptez votre CV à chaque offre en quelques minutes. {brand} met en valeur votre expérience réelle — jamais de fausses compétences. {freeGenerations} CV offerts, sans abonnement.',
  },

  nav: {
    signIn: 'Se connecter',
  },

  hero: {
    eyebrow: 'Votre prochain CV, taillé sur mesure',
    h1Lead: 'Un CV taillé pour chaque offre.',
    h1Accent: 'Sans jamais mentir.',
    subtitle:
      '{brand} reformule et hiérarchise votre expérience réelle pour coller à l’offre que vous visez. Jamais de fausses compétences — juste votre parcours, mis en valeur.',
    cta: 'Créer mon CV adapté — gratuit',
    trust:
      'Sans carte bancaire · {freeGenerations} CV offerts · Vos données restent privées (RGPD)',
    mockup: {
      badge: 'Match 87 %',
      beforeLabel: 'CV générique',
      afterLabel: 'CV adapté à l’offre',
    },
  },

  problem: {
    eyebrow: 'Le constat',
    h2: 'Le même CV pour 30 offres ? Les recruteurs le voient. Les ATS aussi.',
    body: 'Un CV générique se noie. Le réécrire à la main pour chaque offre prend une heure que vous n’avez pas. Et les générateurs « IA » règlent le problème en inventant des compétences que vous devrez assumer en entretien.',
    transition: 'Il y a une troisième voie.',
  },

  how: {
    eyebrow: 'Comment ça marche',
    h2: 'Trois étapes, quelques minutes.',
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
    eyebrow: 'Notre engagement',
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
    eyebrow: 'Pour qui ?',
    h2: 'Pensé pour celles et ceux qui postulent vraiment.',
    cards: [
      { title: 'Jeunes diplômés', body: 'Faire ressortir l’essentiel d’un parcours court.' },
      { title: 'Cadres en veille', body: 'Adapter vite sans tout réécrire.' },
      { title: 'Reconversion', body: 'Traduire votre expérience vers un nouveau secteur.' },
    ],
  },

  pricing: {
    eyebrow: 'Tarifs simples',
    h2: 'Vos {freeGenerations} premiers CV sont offerts.',
    intro:
      'Ensuite, des packs de crédits sans abonnement : 1 crédit = 1 CV adapté à une offre. Vous payez quand vous postulez, pas tous les mois.',
    featuredBadge: 'Le plus populaire',
    freePrice: '0 €',
    creditsSuffix: 'crédits',
    perCv: 'soit {price} par CV',
    legal: 'Paiement sécurisé · Sans abonnement, sans engagement.',
    free: {
      name: 'Découverte',
      creditsNote: '{freeGenerations} CV adaptés offerts',
      tagline: 'Pour tester {brand} sur vos prochaines candidatures.',
      features: [
        '{freeGenerations} CV adaptés à une offre, offerts à l’inscription',
        'Garde-fou anti-invention inclus',
        'Export PDF prêt à envoyer',
        'Sans carte bancaire',
      ],
      cta: 'Commencer gratuitement',
    },
    packs: {
      starter: {
        name: 'Pack Starter',
        tagline: 'Pour une recherche ciblée, au rythme de vos candidatures.',
        features: [
          '1 crédit = 1 CV adapté à une offre',
          'Toutes les fonctionnalités incluses',
          'Paiement unique, sans abonnement',
        ],
        cta: 'Choisir Starter',
      },
      standard: {
        name: 'Pack Standard',
        tagline: 'Pour postuler en série, au meilleur prix par CV.',
        features: [
          '1 crédit = 1 CV adapté à une offre',
          'Le meilleur prix par CV',
          'Paiement unique, sans abonnement',
        ],
        cta: 'Choisir Standard',
      },
    },
  },

  faq: {
    eyebrow: 'On vous répond',
    h2: 'Questions fréquentes',
    items: [
      {
        q: 'Est-ce que {brand} invente des compétences ?',
        a: 'Non, jamais. C’est notre règle non négociable : on réordonne et reformule votre expérience réelle, on n’ajoute rien.',
      },
      {
        q: 'Combien ça coûte ?',
        a: 'Vos {freeGenerations} premiers CV sont offerts à l’inscription. Ensuite, des packs de crédits sans abonnement : à partir de 1 € le CV adapté à une offre. Vous ne payez que ce que vous utilisez.',
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
    trust: 'Sans carte bancaire · {freeGenerations} CV offerts · Honnête par conception.',
  },

  signup: {
    emailLabel: 'Votre e-mail',
    emailPlaceholder: 'vous@email.com',
    submit: 'Recevoir mon lien de connexion',
    sentTitle: 'C’est envoyé !',
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

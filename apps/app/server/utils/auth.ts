/**
 * Instance Better Auth (serveur Nitro uniquement — jamais exposée au client).
 * Plugin magic-link : l'utilisateur reçoit un lien par e-mail, pas de mot de passe.
 * Données auth hébergées en FR/UE (RGPD). OAuth Google = phase 2 (hors scope).
 */
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { magicLink } from 'better-auth/plugins/magic-link'
import { prisma } from './prisma'
import { sendMagicLinkEmail } from './mailer'

const config = useRuntimeConfig()

export const auth = betterAuth({
  secret: config.authSecret,
  baseURL: config.public.appUrl,

  database: prismaAdapter(prisma, { provider: 'postgresql' }),

  // FR-first : labels et messages côté e-mail en français.
  user: {
    additionalFields: {
      deletedAt: {
        type: 'date',
        required: false,
        defaultValue: null,
        input: false,
      },
    },
  },

  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendMagicLinkEmail(email, url)
      },
      // Durée de validité du lien (10 min par défaut Better Auth).
      expiresIn: 600,
    }),
  ],
})

export type Auth = typeof auth

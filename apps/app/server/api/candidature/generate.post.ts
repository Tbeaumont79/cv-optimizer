/**
 * POST /api/candidature/generate — étape 2 du flux « Nouvelle candidature ».
 *
 * Corps : { offer } (l'offre analysée renvoyée par /analyze). Réponse : { cv }
 * (RenderableCv, garde-fou de provenance déjà appliqué par le service).
 *
 * Gate ÉCONOMIQUE : le quota `generation` (FREE_TIER_QUOTAS) est vérifié AVANT
 * tout appel LLM — un utilisateur à quota épuisé ne coûte aucun token.
 *
 * RGPD : ni l'offre, ni le profil, ni le CV ne sont loggés — seulement les tokens.
 */
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import {
  ProvenanceError,
  QUOTA_EXCEEDED_CODE,
  type AnalyzedOffer,
  type CvContact,
  type GenerateCandidatureResponse,
  type MatchReport,
  type ProfileDTO,
} from '@cvo/shared'
import { requireUserId } from '../../utils/session'
import { prisma } from '../../utils/prisma'
import { NOT_DELETED, toProfileDTO } from '../../utils/profile-serialize'
import { recordUsageEvent } from '../../utils/metering'
import { getOrInitBalance, consumeOneCredit } from '../../utils/credits'
import { anthropicComplete, LlmError, type LlmComplete } from '../../utils/anthropic'
import { matchProfileToOffer } from '../../services/matching'
import { adaptKeySkills } from '../../services/keyskills-adapt'

const bodySchema = z.object({
  offer: z.object({
    title: z.string().min(1),
    requiredSkills: z.array(z.string()),
    keywords: z.array(z.string()),
    seniority: z.enum(['junior', 'mid', 'senior', 'lead']).nullable(),
  }),
  // Rapport de match déjà calculé à /analyze — persisté avec la candidature.
  match: z.object({
    score: z.number(),
    reasons: z.array(z.string()),
    matchedKeywords: z.array(z.string()),
    missingKeywords: z.array(z.string()),
  }),
})

export default defineEventHandler(async (event): Promise<GenerateCandidatureResponse> => {
  const userId = requireUserId(event)

  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Corps invalide : { offer: AnalyzedOffer, match: MatchReport } attendu.',
    })
  }
  const offer: AnalyzedOffer = parsed.data.offer
  const match: MatchReport = parsed.data.match

  // Gate CRÉDITS avant tout appel LLM (aucun token consommé si solde nul). Le solde
  // inclut les générations offertes (octroi gratuit idempotent au 1er accès). 1 crédit
  // = 1 génération, débité APRÈS succès. Bypass dev via DISABLE_GENERATION_LIMIT=true.
  const limitDisabled = process.env.DISABLE_GENERATION_LIMIT === 'true'
  if (!limitDisabled) {
    const balance = await getOrInitBalance(userId)
    if (balance < 1) {
      throw createError({
        statusCode: 403,
        message: 'Tu n’as plus de crédits — achète un pack pour continuer',
        data: { code: QUOTA_EXCEEDED_CODE },
      })
    }
  }

  // Profil réel = seule source de contenu du CV généré (mêmes règles que /analyze).
  const profileRow = await prisma.profile.findFirst({
    where: { userId, ...NOT_DELETED },
    include: {
      experiences: { orderBy: { orderIndex: 'asc' } },
      skills: { orderBy: { orderIndex: 'asc' } },
      education: { orderBy: { orderIndex: 'asc' } },
      languages: { orderBy: { orderIndex: 'asc' } },
    },
  })
  const profile = profileRow ? toProfileDTO(profileRow) : null
  if (!profile || (profile.experiences.length === 0 && profile.skills.length === 0)) {
    throw createError({
      statusCode: 409,
      message: "Complète d'abord ton profil",
      data: { code: 'profile_empty' },
    })
  }

  // Identité du candidat (nom + email par défaut) : factuelle, posée côté serveur
  // — jamais inventée par le LLM. Le compte fournit l'email de repli.
  const account = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  })
  const fullName = (profile.fullName ?? '').trim() || (account?.name ?? '').trim()
  if (!fullName) {
    // Sans nom, le header du CV serait vide et l'export PDF échouerait (400).
    // On guide vers le profil AVANT de consommer un appel LLM.
    throw createError({
      statusCode: 409,
      message: 'Ajoute ton nom complet à ton profil',
      data: { code: 'profile_name_missing' },
    })
  }

  // Mesure des tokens via onUsage (jamais de contenu).
  let tokensIn = 0
  let tokensOut = 0
  const complete: LlmComplete = (req) =>
    anthropicComplete({
      ...req,
      onUsage: (u) => {
        tokensIn += u.inputTokens
        tokensOut += u.outputTokens
      },
    })

  try {
    const cv = await matchProfileToOffer(profile, offer, { complete })

    // Identité = données factuelles : on écrase ce que le LLM a pu produire dans
    // le header (nom + contacts) par les valeurs réelles du profil/compte. La
    // provenance et l'accroche reformulée par le moteur sont conservées.
    cv.header.fullName = fullName
    cv.header.contacts = buildContacts(profile, account?.email ?? null)

    // Compétences clés (phrases verbe d'action) : on PART des phrases réelles du
    // profil et on les fait ADAPTER à l'offre (reformulation/priorisation), borné
    // aux phrases sources — jamais d'ajout. Repli verbatim si l'adaptation échoue.
    // Posées au-dessus des expériences ; provenance = profil (garde-fou satisfait).
    if (profile.keySkills.length) {
      let phrases = profile.keySkills
      try {
        phrases = await adaptKeySkills(profile.keySkills, offer, { complete })
      } catch {
        phrases = profile.keySkills
      }
      const keySection = {
        kind: 'keyskills' as const,
        title: 'Compétences clés',
        entries: phrases.map((text, i) => ({
          id: `ks-${i}`,
          text,
          provenance: { profileItemId: profile.id, reformulated: true },
        })),
      }
      const expIdx = cv.sections.findIndex((s) => s.kind === 'experience')
      cv.sections.splice(expIdx >= 0 ? expIdx : cv.sections.length, 0, keySection)
    }

    await recordUsageEvent(
      prisma,
      { userId, type: 'generation', tokensIn, tokensOut, billable: false },
      new Date(),
    )

    // Débite 1 crédit pour cette génération réussie (transactionnel, jamais
    // déficitaire). Bypass dev : on ne débite pas quand le gate est désactivé.
    if (!limitDisabled) await consumeOneCredit(userId)

    // Persiste la candidature (CV durable + suivi). Design seedé depuis le « CV de
    // base » du profil (ou null → fallback au rendu). Statut initial = brouillon.
    const candidature = await prisma.candidature.create({
      data: {
        userId,
        label: offer.title,
        offerSnapshot: offer as unknown as Prisma.InputJsonValue,
        matchScore: Math.round(match.score),
        matchReport: match as unknown as Prisma.InputJsonValue,
        generatedCv: cv as unknown as Prisma.InputJsonValue,
        design: profile.baseCvDesign
          ? (profile.baseCvDesign as unknown as Prisma.InputJsonValue)
          : Prisma.DbNull,
      },
      select: { id: true },
    })

    return { cv, candidatureId: candidature.id }
  } catch (err) {
    // Garde-fou de provenance : le LLM a produit un élément non sourcé — rejeté.
    if (err instanceof ProvenanceError) {
      throw createError({
        statusCode: 422,
        message: 'La génération a produit un élément non vérifiable, réessaie',
      })
    }
    // Message générique : ne divulgue pas la config serveur (clé API, amont…).
    if (err instanceof LlmError) {
      throw createError({
        statusCode: 502,
        message: 'La génération a échoué, réessaie dans un instant',
      })
    }
    throw err
  }
})

/**
 * Construit les contacts factuels du header à partir du profil (email du compte
 * en repli). Aucune reformulation : valeurs reprises telles quelles.
 */
function buildContacts(profile: ProfileDTO, accountEmail: string | null): CvContact[] {
  const contacts: CvContact[] = []
  const email = (profile.email ?? '').trim() || (accountEmail ?? '').trim()
  if (email) contacts.push({ kind: 'email', label: 'Email', value: email })
  if (profile.phone?.trim()) contacts.push({ kind: 'phone', label: 'Téléphone', value: profile.phone.trim() })
  if (profile.location?.trim()) contacts.push({ kind: 'location', label: 'Localisation', value: profile.location.trim() })
  for (const raw of profile.links ?? []) {
    const value = raw.trim()
    if (value) contacts.push({ kind: 'link', label: linkLabel(value), value })
  }
  return contacts
}

/** Libellé lisible d'un lien (hôte sans `www.`), avec repli sur « Lien ». */
function linkLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'Lien'
  }
}

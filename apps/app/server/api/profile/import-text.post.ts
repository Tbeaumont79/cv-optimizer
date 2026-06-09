/**
 * POST /api/profile/import-text — Import profil par copier-coller de texte (MVP).
 *
 * Le texte collé est parsé de façon déterministe (pas de LLM) en blocs heuristiques.
 * Le résultat est retourné comme suggestion — l'utilisateur confirme avant que les
 * données soient persistées (guard : il appelle ensuite PUT /api/profile + POST skills).
 *
 * Garde-fou : on ne crée rien en base ici. On retourne uniquement les données parsées
 * pour revue dans l'UI. L'utilisateur est la source de vérité.
 */
import { z } from 'zod'
import { getAuthSession } from '../../utils/session'
import type { ExperienceDTO, SkillDTO } from '@cvo/shared'

const bodySchema = z.object({ text: z.string().min(10).max(10_000) })

interface ParsedProfile {
  headline: string | null
  summary: string | null
  experiences: Omit<ExperienceDTO, 'id'>[]
  skills: Omit<SkillDTO, 'id'>[]
}

/**
 * Parseur heuristique minimal (MVP) :
 * - Lignes débutant par des marqueurs d'expérience (•, -, *, dates YYYY) → experiences
 * - Tokens ressemblant à des compétences (courts, sans ponctuation lourde) → skills
 * - Reste → headline / summary
 *
 * L'extraction visuelle d'un CV PDF est hors scope MVP (→ V1.1 THI-120 §4c).
 */
function parseProfileText(text: string): ParsedProfile {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)

  const experiences: Omit<ExperienceDTO, 'id'>[] = []
  const skillSet = new Set<string>()
  const summaryLines: string[] = []

  // Heuristiques simples
  const expLineRe = /^(\d{4})\s*[-–]\s*(\d{4}|présent|aujourd'hui|actuel|en cours)/i
  const bulletRe = /^[•\-*]\s+(.+)/

  let idx = 0
  let orderIndex = 0

  while (idx < lines.length) {
    const line = lines[idx]!

    // Ligne de type "YYYY – YYYY  Titre  |  Entreprise"
    const expMatch = line.match(expLineRe)
    if (expMatch) {
      const rest = line.slice(line.indexOf(expMatch[2]!) + expMatch[2]!.length).trim()
      const parts = rest.split(/\s{2,}|\s*\|\s*/)
      experiences.push({
        title: parts[0] ?? rest,
        company: parts[1] ?? '',
        startDate: expMatch[1] ? `${expMatch[1]}-01-01T00:00:00.000Z` : null,
        endDate: expMatch[2]?.match(/\d{4}/) ? `${expMatch[2]}-12-31T00:00:00.000Z` : null,
        description: null,
        skillsUsed: [],
        orderIndex: orderIndex++,
      })
      idx++
      continue
    }

    // Bullet → potentielle compétence ou description
    const bulletMatch = line.match(bulletRe)
    if (bulletMatch) {
      const content = bulletMatch[1]!
      // Court (<= 40 chars sans virgule) → compétence candidate
      if (content.length <= 40 && !content.includes(',')) {
        skillSet.add(content)
      } else if (experiences.length > 0) {
        // Ajouter à la description de la dernière expérience
        const last = experiences[experiences.length - 1]!
        last.description = last.description ? `${last.description}\n${content}` : content
      } else {
        summaryLines.push(content)
      }
      idx++
      continue
    }

    // Ligne avec des virgules → liste de compétences
    if (line.includes(',') && line.length < 200) {
      line.split(',').forEach((s) => {
        const t = s.trim()
        if (t && t.length <= 60) skillSet.add(t)
      })
      idx++
      continue
    }

    summaryLines.push(line)
    idx++
  }

  const skills: Omit<SkillDTO, 'id'>[] = Array.from(skillSet).map((label, i) => ({
    label,
    level: null,
    years: null,
    orderIndex: i,
  }))

  const headline = summaryLines[0] ?? null
  const summary = summaryLines.slice(1).join(' ').trim() || null

  return { headline, summary, experiences, skills }
}

export default defineEventHandler(async (event) => {
  const session = await getAuthSession(event)
  if (!session?.user) throw createError({ statusCode: 401, message: 'Non authentifié.' })

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, message: 'Corps invalide.', data: parsed.error.flatten() })

  // Aucune écriture en base : on retourne uniquement la suggestion.
  return parseProfileText(parsed.data.text)
})

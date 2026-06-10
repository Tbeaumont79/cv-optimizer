// Mock local de l'API Messages Anthropic — test du flux candidature SANS consommer de tokens.
// Usage : node scripts/mock-llm.mjs  puis lancer l'app avec
//   ANTHROPIC_API_KEY=mock ANTHROPIC_BASE_URL=http://localhost:8787 pnpm dev
// Distingue les 3 appels du pipeline par les propriétés du JSON Schema demandé.
import http from 'node:http'

function reply(res, payload) {
  const text = JSON.stringify(payload)
  res.writeHead(200, { 'content-type': 'application/json' })
  res.end(
    JSON.stringify({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text }],
      usage: { input_tokens: 1200, output_tokens: 400 },
    }),
  )
}

const server = http.createServer((req, res) => {
  let body = ''
  req.on('data', (c) => (body += c))
  req.on('end', () => {
    const parsed = JSON.parse(body)
    const schema = parsed.output_config?.format?.schema ?? {}
    const props = schema.properties ?? {}

    if ('seniority' in props) {
      // Analyse d'offre
      return reply(res, {
        title: 'Chef de projet marketing digital',
        requiredSkills: ['Gestion de projet', 'SEO', 'HubSpot', 'Kubernetes'],
        keywords: ['campagnes multicanales', 'newsletter', 'B2C'],
        seniority: 'mid',
      })
    }
    if ('score' in props) {
      // Score de match
      return reply(res, {
        score: 78,
        reasons: [
          'Solide expérience en gestion de projets digitaux multicanaux.',
          'SEO et HubSpot maîtrisés, directement demandés par l’offre.',
          'Kubernetes absent du profil — seul manque notable.',
        ],
      })
    }
    // Matching → RenderableCv construit à partir des ids RÉELS du profil reçu.
    const user = JSON.parse(parsed.messages[0].content)
    const p = user.profilReel
    const exp = p.experiences[0]
    const cv = {
      locale: 'fr',
      header: {
        fullName: 'Camille Martin',
        headline: p.headline ?? 'Profil candidat',
        contacts: [],
        provenance: { profileItemId: p.id, reformulated: true },
      },
      sections: [
        ...(p.summary
          ? [
              {
                kind: 'summary',
                title: 'Profil',
                text: p.summary,
                provenance: { profileItemId: p.id, reformulated: true },
              },
            ]
          : []),
        ...(exp
          ? [
              {
                kind: 'experience',
                title: 'Expériences',
                entries: p.experiences.map((e, i) => ({
                  id: `cv-exp-${i}`,
                  role: e.title,
                  organization: e.company,
                  period: '2021 – 2024',
                  bullets: e.description
                    ? [
                        {
                          id: `cv-exp-${i}-b0`,
                          text: e.description,
                          provenance: { profileItemId: e.id, reformulated: true },
                        },
                      ]
                    : [],
                  provenance: { profileItemId: e.id, reformulated: true },
                })),
              },
            ]
          : []),
        {
          kind: 'skills',
          title: 'Compétences',
          entries: p.skills.map((s, i) => ({
            id: `cv-sk-${i}`,
            label: s.label,
            provenance: { profileItemId: s.id, reformulated: false },
          })),
        },
      ],
    }
    return reply(res, cv)
  })
})

server.listen(8787, () => console.log('mock-llm sur :8787'))

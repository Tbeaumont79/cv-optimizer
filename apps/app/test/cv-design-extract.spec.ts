import { describe, it, expect, vi } from 'vitest'
import { extractCvDesign } from '../server/services/cv-design-extract'
import type { LlmComplete } from '../server/utils/anthropic'

describe('extractCvDesign', () => {
  it('envoie le PDF en bloc document et renvoie des tokens normalisés', async () => {
    const complete = vi.fn(async (req) => {
      const blocks = req.user as Array<{ type: string }>
      expect(blocks[0]!.type).toBe('document')
      return {
        layout: 'sidebar-left',
        accent: '#2563eb',
        sidebarBg: '#0f172a',
        sidebarFg: '#ffffff',
        font: '  Inter  ',
        summary: '  Sobre, sidebar sombre  ',
      }
    }) as unknown as LlmComplete

    const design = await extractCvDesign('UERG', { complete })

    expect(design.layout).toBe('sidebar-left')
    expect(design.accent).toBe('#2563eb')
    expect(design.font).toBe('Inter') // trim
    expect(design.summary).toBe('Sobre, sidebar sombre')
  })

  it('retombe sur des valeurs sûres si le modèle renvoie n’importe quoi', async () => {
    const complete = vi.fn(async () => ({
      layout: 'bogus',
      accent: 'not-a-color',
      sidebarBg: '#000',
      sidebarFg: '#fff',
      font: 'Inter; }<script>',
      summary: 42,
    })) as unknown as LlmComplete

    const design = await extractCvDesign('UERG', { complete })

    expect(design.layout).toBe('single') // enum invalide → défaut
    expect(design.accent).toMatch(/^#[0-9a-f]{3,6}$/i) // couleur invalide → défaut
    expect(design.sidebarBg).toBe('#000')
    expect(design.font).toBeNull() // police non conforme → null
    expect(design.summary).toBe('')
  })
})

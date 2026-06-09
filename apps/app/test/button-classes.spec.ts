import { describe, it, expect } from 'vitest'
import { buttonClasses } from '../components/ui/button-classes'

describe('buttonClasses', () => {
  it('defaults to the primary variant in medium size', () => {
    const cls = buttonClasses()
    expect(cls).toContain('bg-brand-600')
    expect(cls).toContain('h-10')
  })

  it('maps each variant to its brand-token classes', () => {
    expect(buttonClasses('secondary')).toContain('ring-border')
    expect(buttonClasses('ghost')).toContain('bg-transparent')
    expect(buttonClasses('danger')).toContain('bg-danger-500')
  })

  it('maps each size to its dimensions', () => {
    expect(buttonClasses('primary', 'sm')).toContain('h-8')
    expect(buttonClasses('primary', 'lg')).toContain('h-12')
  })

  it('always includes shared a11y/disabled affordances', () => {
    const cls = buttonClasses()
    expect(cls).toContain('focus-visible:ring-brand-500')
    expect(cls).toContain('disabled:opacity-50')
  })
})

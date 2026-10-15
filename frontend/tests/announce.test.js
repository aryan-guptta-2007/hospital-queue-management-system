import { describe, it, expect } from 'vitest'
import { buildAnnouncements, isSpeechSupported } from '../src/utils/announce'

describe('announcement text', () => {
  it('reads a token out character by character, never as a number', () => {
    const { english } = buildAnnouncements('OPD-042', 'Out Patient Department')

    expect(english).toBe('Token O P D, zero four two. Please proceed to Out Patient Department.')
    // "forty-two" would be ambiguous against OPD-420 in a noisy room
    expect(english).not.toMatch(/forty/)
  })

  it('keeps leading zeros audible', () => {
    expect(buildAnnouncements('CARD-007', 'Cardiology').english).toContain('zero zero seven')
  })

  it('spells the token in Devanagari for the Hindi line', () => {
    const { hindi } = buildAnnouncements('OPD-042', 'Out Patient Department')

    expect(hindi).toBe('टोकन ओ पी डी, शून्य चार दो. कृपया काउंटर पर जाएँ।')
  })

  it('falls back to "the counter" when the department is unknown', () => {
    expect(buildAnnouncements('OPD-042', '').english).toMatch(/proceed to the counter\.$/)
    expect(buildAnnouncements('OPD-042', undefined).english).toMatch(/proceed to the counter\.$/)
  })

  it('handles a missing or odd token without throwing', () => {
    expect(() => buildAnnouncements(null, 'Cardiology')).not.toThrow()
    expect(() => buildAnnouncements('', 'Cardiology')).not.toThrow()
    expect(buildAnnouncements('demo token 9', 'Cardiology').english).toContain('nine')
  })

  it('reports that jsdom has no speech synthesis, so the board stays silent', () => {
    // The guard the page relies on before offering to announce anything
    expect(isSpeechSupported()).toBe(false)
  })
})

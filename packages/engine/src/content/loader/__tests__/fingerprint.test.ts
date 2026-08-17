import { describe, it, expect } from 'vitest'
import { computeFingerprint } from '../fingerprint.js'

describe('computeFingerprint', () => {
  it('is stable for the same set of packs', () => {
    const packs = [
      { id: 'core-tw', version: '1.0.0' },
      { id: 'ugc-diamond-hands', version: '2.1.0' },
    ]
    expect(computeFingerprint(packs)).toBe(computeFingerprint(packs))
  })

  it('is order-independent (load order must not change the fingerprint)', () => {
    const a = [
      { id: 'core-tw', version: '1.0.0' },
      { id: 'ugc-diamond-hands', version: '2.1.0' },
    ]
    const b = [
      { id: 'ugc-diamond-hands', version: '2.1.0' },
      { id: 'core-tw', version: '1.0.0' },
    ]
    expect(computeFingerprint(a)).toBe(computeFingerprint(b))
  })

  it('differs when a pack version changes', () => {
    const v1 = computeFingerprint([{ id: 'core-tw', version: '1.0.0' }])
    const v2 = computeFingerprint([{ id: 'core-tw', version: '1.0.1' }])
    expect(v1).not.toBe(v2)
  })

  it('differs when the set of packs changes', () => {
    const one = computeFingerprint([{ id: 'core-tw', version: '1.0.0' }])
    const two = computeFingerprint([
      { id: 'core-tw', version: '1.0.0' },
      { id: 'extra', version: '1.0.0' },
    ])
    expect(one).not.toBe(two)
  })

  it('returns a safe integer', () => {
    const fp = computeFingerprint([{ id: 'core-tw', version: '1.0.0' }])
    expect(Number.isSafeInteger(fp)).toBe(true)
  })
})

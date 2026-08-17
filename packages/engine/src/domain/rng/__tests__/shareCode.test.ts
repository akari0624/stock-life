import { describe, it, expect } from 'vitest'
import { encode, decode } from '../shareCode.js'

describe('shareCode', () => {
  it('round-trips fingerprint and seed', () => {
    const code = encode(123456, 987654)
    const result = decode(code)
    expect(result).toEqual({ ok: true, fingerprint: 123456, seed: 987654 })
  })

  it('encodes as base36(fingerprint) + "." + base36(seed)', () => {
    const code = encode(123456, 987654)
    expect(code).toBe(`${(123456).toString(36)}.${(987654).toString(36)}`)
  })

  it('decode succeeds when expectedFingerprint matches', () => {
    const code = encode(42, 7)
    const result = decode(code, 42)
    expect(result).toEqual({ ok: true, fingerprint: 42, seed: 7 })
  })

  it('decode returns a fingerprint_mismatch error object, not a throw, when fingerprints differ', () => {
    const code = encode(42, 7)
    const result = decode(code, 999)
    expect(result.ok).toBe(false)
    if (!result.ok && result.error === 'fingerprint_mismatch') {
      expect(result.expectedFingerprint).toBe(999)
      expect(result.actualFingerprint).toBe(42)
      expect(typeof result.message).toBe('string')
    }
  })

  it('decode returns a malformed error object for garbage input, not a throw', () => {
    expect(() => decode('not-a-valid-code')).not.toThrow()
    const result = decode('not-a-valid-code')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe('malformed')
    }
  })

  it('decode returns a malformed error object for wrong-shaped input', () => {
    for (const bad of ['', 'onlyonepart', 'a.b.c', '..']) {
      const result = decode(bad)
      expect(result.ok).toBe(false)
    }
  })
})

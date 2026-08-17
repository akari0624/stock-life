// Share code = base36(contentFingerprint) + "." + base36(seed) (§5.1).
// The fingerprint is baked into the code itself so "same seed = same life"
// can be verified (or explained) before a single card is drawn.

export interface DecodeSuccess {
  ok: true
  fingerprint: number
  seed: number
}

export interface DecodeMalformedError {
  ok: false
  error: 'malformed'
  message: string
}

export interface DecodeFingerprintMismatchError {
  ok: false
  error: 'fingerprint_mismatch'
  message: string
  expectedFingerprint: number
  actualFingerprint: number
}

export type DecodeError = DecodeMalformedError | DecodeFingerprintMismatchError
export type DecodeResult = DecodeSuccess | DecodeError

export function encode(fingerprint: number, seed: number): string {
  return `${toBase36(fingerprint)}.${toBase36(seed)}`
}

/**
 * Parses a share code. If `expectedFingerprint` is provided, mismatches are
 * reported as a `fingerprint_mismatch` error instead of silently decoding —
 * callers should not throw this away, since it's how the UI tells the user
 * "this seed needs pack X v1.2".
 */
export function decode(code: string, expectedFingerprint?: number): DecodeResult {
  const parts = code.split('.')
  if (parts.length !== 2) {
    return { ok: false, error: 'malformed', message: `Malformed share code: "${code}"` }
  }

  const [fingerprintPart, seedPart] = parts as [string, string]
  const fingerprint = fromBase36(fingerprintPart)
  const seed = fromBase36(seedPart)
  if (fingerprint === undefined || seed === undefined) {
    return { ok: false, error: 'malformed', message: `Malformed share code: "${code}"` }
  }

  if (expectedFingerprint !== undefined && fingerprint !== expectedFingerprint) {
    return {
      ok: false,
      error: 'fingerprint_mismatch',
      message: `Share code was created with a different content set (expected fingerprint ${toBase36(expectedFingerprint)}, got ${toBase36(fingerprint)}).`,
      expectedFingerprint,
      actualFingerprint: fingerprint,
    }
  }

  return { ok: true, fingerprint, seed }
}

function toBase36(n: number): string {
  return n.toString(36)
}

function fromBase36(s: string): number | undefined {
  if (s.length === 0 || !/^[0-9a-z]+$/.test(s)) return undefined
  const n = parseInt(s, 36)
  return Number.isSafeInteger(n) ? n : undefined
}

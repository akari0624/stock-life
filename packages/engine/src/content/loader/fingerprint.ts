import { cyrb53 } from '../../domain/rng/hash.js'

export interface PackIdentity {
  id: string
  version: string
}

/**
 * contentFingerprint = hash(sorted "id@version" list, joined) (§5.1).
 * Sorting first means load order never changes the fingerprint — only the
 * actual set of loaded packs does.
 */
export function computeFingerprint(packs: readonly PackIdentity[]): number {
  const entries = packs.map((p) => `${p.id}@${p.version}`).sort()
  return cyrb53(entries.join('|'))
}

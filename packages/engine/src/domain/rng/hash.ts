// Deterministic string hashing used to derive numeric seeds and fingerprints.
// No Math.random, no Date — pure functions of their string input (§5.3).

/** cyrb128: 128-bit string hash, returned as four unsigned 32-bit words. */
export function cyrb128(str: string): [number, number, number, number] {
  let h1 = 1779033703
  let h2 = 3144134277
  let h3 = 1013904242
  let h4 = 2773480762
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i)
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067)
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233)
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213)
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179)
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067)
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233)
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213)
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179)
  h1 ^= h2 ^ h3 ^ h4
  h2 ^= h1
  h3 ^= h1
  h4 ^= h1
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0]
}

/** cyrb53: 53-bit string hash collapsed to a single safe integer. */
export function cyrb53(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed
  let h2 = 0x41c6ce57 ^ seed
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return 4294967296 * (2097151 & h2) + (h1 >>> 0)
}

/** sfc32: fast, well-distributed PRNG seeded from four 32-bit words. */
export function sfc32(a: number, b: number, c: number, d: number): () => number {
  let sa = a >>> 0
  let sb = b >>> 0
  let sc = c >>> 0
  let sd = d >>> 0
  return function rand(): number {
    sa >>>= 0
    sb >>>= 0
    sc >>>= 0
    sd >>>= 0
    let t = (sa + sb) | 0
    sa = sb ^ (sb >>> 9)
    sb = (sc + (sc << 3)) | 0
    sc = (sc << 21) | (sc >>> 11)
    sd = (sd + 1) | 0
    t = (t + sd) | 0
    sc = (sc + t) | 0
    return (t >>> 0) / 4294967296
  }
}

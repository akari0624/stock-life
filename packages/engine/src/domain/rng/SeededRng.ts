import { cyrb128, sfc32 } from './hash.js'

/** A single independent random sub-sequence, drawn from one SeededRng.stream(id). */
export class RngStream {
  private readonly rand: () => number

  constructor(rand: () => number) {
    this.rand = rand
  }

  /** Uniform float in [0, 1). */
  next(): number {
    return this.rand()
  }

  /** Uniform integer in [min, max], inclusive on both ends. */
  int(min: number, max: number): number {
    if (max < min) throw new Error('RngStream.int: max must be >= min')
    return min + Math.floor(this.rand() * (max - min + 1))
  }

  /** Uniformly picks one element from a non-empty array. */
  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new Error('RngStream.pick: cannot pick from an empty array')
    const value = arr[this.int(0, arr.length - 1)]
    return value as T
  }

  /** True with probability p (p in [0, 1]). */
  chance(p: number): boolean {
    return this.rand() < p
  }

  /** Normally distributed value (Box-Muller), given standard deviation and optional mean. */
  normal(sd: number, mean = 0): number {
    let u = 0
    let v = 0
    while (u === 0) u = this.rand()
    while (v === 0) v = this.rand()
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
    return mean + z * sd
  }
}

/**
 * Injectable, deterministic RNG. Never a global singleton — sim creates one
 * per session and passes it explicitly into advance()/systems (§5.2).
 *
 * stream(id) derives an independent sub-sequence by hashing `seed::id`, not
 * by continuing a shared generator. That's what makes adding a new stream
 * id safe: it never shifts the sequence any existing stream already draws
 * from (§5.2's "new stream must not invalidate old seeds").
 */
export class SeededRng {
  private readonly seed: string

  constructor(seed: string | number) {
    this.seed = String(seed)
  }

  stream(id: string): RngStream {
    const [a, b, c, d] = cyrb128(`${this.seed}::${id}`)
    const rand = sfc32(a, b, c, d)
    // Warm up the generator — the first few outputs of sfc32 are weakly
    // mixed relative to later ones.
    for (let i = 0; i < 15; i++) rand()
    return new RngStream(rand)
  }
}

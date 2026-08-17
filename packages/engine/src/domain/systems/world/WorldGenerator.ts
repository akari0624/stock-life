import type { RngStream } from '../../rng/SeededRng.js'
import type { Timeline } from './Timeline.js'

// §7.4: world generation is a registered plugin, not a branch in the engine.
// `random` ships now, `tw-history` in S19, and a mod's own generator is just
// a third registration — the engine never learns their names.

export interface WorldOptions {
  startYear: number
  /** Inclusive. */
  endYear: number
  /** Theme vocabulary the generator may draw from; content matches on these strings. */
  themePool?: readonly string[]
}

export interface WorldGenerator {
  id: string
  generate(rng: RngStream, opts: WorldOptions): Timeline
}

export class WorldGeneratorRegistry {
  private readonly generators = new Map<string, WorldGenerator>()

  register(generator: WorldGenerator): void {
    if (this.generators.has(generator.id)) {
      throw new Error(`WorldGenerator "${generator.id}" is already registered`)
    }
    this.generators.set(generator.id, generator)
  }

  has(id: string): boolean {
    return this.generators.has(id)
  }

  get(id: string): WorldGenerator {
    const generator = this.generators.get(id)
    if (!generator) throw new Error(`Unknown world generator: "${id}"`)
    return generator
  }

  ids(): string[] {
    return [...this.generators.keys()]
  }
}

/** The rng stream id world generation always draws from (§5.2). */
export const WORLD_RNG_STREAM = 'world'

import type { RngStream } from '../../rng/SeededRng.js'
import type { Timeline } from './Timeline.js'
import type { WorldGenerator, WorldOptions } from './WorldGenerator.js'
import { DEFAULT_THEME_POOL, generatePhases, generateThemeWaves } from './cycles.js'

// §7.4: the procedurally generated world. Everything it does with cycles and
// theme waves lives in `cycles.ts`, which `tw-history` shares.

export {
  CRASH_INTERVAL,
  THEME_WAVE_INTERVAL,
  THEME_WAVE_DURATION,
  DEFAULT_THEME_POOL,
  generateThemeWaves,
  continueCycles,
} from './cycles.js'

export const randomWorldGenerator: WorldGenerator = {
  id: 'random',
  generate(rng: RngStream, opts: WorldOptions): Timeline {
    if (opts.endYear < opts.startYear) {
      throw new Error('WorldOptions.endYear must be >= startYear')
    }
    const pool = opts.themePool ?? DEFAULT_THEME_POOL
    return {
      generatorId: 'random',
      startYear: opts.startYear,
      endYear: opts.endYear,
      phases: generatePhases(rng, opts.startYear, opts.endYear),
      themes: generateThemeWaves(rng, opts.startYear, opts.endYear, pool),
    }
  },
}

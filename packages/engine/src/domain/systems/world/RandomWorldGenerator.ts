import type { RngStream } from '../../rng/SeededRng.js'
import type { PhaseSegment, ThemeWave, Timeline } from './Timeline.js'
import { WorldGeneratorRegistry, type WorldGenerator, type WorldOptions } from './WorldGenerator.js'

// §7.4 pacing target: roughly one big crash every 8–12 years, one theme wave
// every 5–8 years. Both are enforced by construction below rather than by
// rolling and hoping, so the statistical test is a guard, not a coin flip.

export const CRASH_INTERVAL: readonly [number, number] = [8, 12]
export const THEME_WAVE_INTERVAL: readonly [number, number] = [5, 8]
export const THEME_WAVE_DURATION: readonly [number, number] = [3, 6]

/**
 * Deliberately generic theme labels: content packs match on these strings,
 * and §2's "hint, never name" rule means no real company ever appears here.
 */
export const DEFAULT_THEME_POOL: readonly string[] = [
  'memory',
  'internet',
  'property',
  'biotech',
  'energy',
  'shipping',
  'ai',
  'finance',
  'consumer',
  'crypto',
]

interface CycleLengths {
  crash: number
  recession: number
  recovery: number
  boom: number
  mania: number
}

/**
 * One macro cycle, laid out crash-first. Anchoring the cycle on the crash is
 * what makes consecutive crashes exactly `total` years apart — if a cycle
 * started at `recovery`, the crash-to-crash distance would drift with each
 * cycle's internal split and could leave the 8–12 band.
 */
function rollCycle(rng: RngStream): CycleLengths {
  const total = rng.int(CRASH_INTERVAL[0], CRASH_INTERVAL[1])
  const crash = 1
  const recession = rng.int(1, 2)
  const mania = rng.int(1, 2)
  let recovery = rng.int(2, 3)
  let boom = total - crash - recession - mania - recovery
  if (boom < 1) {
    recovery = Math.max(1, recovery + boom - 1)
    boom = total - crash - recession - mania - recovery
  }
  return { crash, recession, recovery, boom, mania }
}

function cycleSegments(lengths: CycleLengths, startYear: number, includeCrash: boolean): PhaseSegment[] {
  const ordered: [PhaseSegment['phase'], number][] = includeCrash
    ? [
        ['crash', lengths.crash],
        ['recession', lengths.recession],
        ['recovery', lengths.recovery],
        ['boom', lengths.boom],
        ['mania', lengths.mania],
      ]
    : [
        // The game opens mid-cycle: no player starts life the year everything
        // blows up unless the seed happens to land there later.
        ['recovery', lengths.recovery],
        ['boom', lengths.boom],
        ['mania', lengths.mania],
      ]

  let year = startYear
  const segments: PhaseSegment[] = []
  for (const [phase, years] of ordered) {
    segments.push({ phase, startYear: year, years })
    year += years
  }
  return segments
}

function generatePhases(rng: RngStream, startYear: number, endYear: number): PhaseSegment[] {
  const segments: PhaseSegment[] = []
  let year = startYear
  let includeCrash = false

  do {
    const cycle = cycleSegments(rollCycle(rng), year, includeCrash)
    segments.push(...cycle)
    year = cycle.reduce((acc, s) => acc + s.years, year)
    includeCrash = true
  } while (year <= endYear)

  return segments
}

function generateThemeWaves(
  rng: RngStream,
  startYear: number,
  endYear: number,
  pool: readonly string[],
): ThemeWave[] {
  if (pool.length === 0) return []

  const waves: ThemeWave[] = []
  let year = startYear
  let previous: string | undefined

  while (year <= endYear) {
    let theme = rng.pick(pool)
    if (pool.length > 1 && theme === previous) {
      // One re-roll, never a loop: an unlucky stream must not stall generation.
      theme = rng.pick(pool.filter((t) => t !== previous))
    }
    waves.push({ theme, startYear: year, years: rng.int(THEME_WAVE_DURATION[0], THEME_WAVE_DURATION[1]) })
    previous = theme
    year += rng.int(THEME_WAVE_INTERVAL[0], THEME_WAVE_INTERVAL[1])
  }

  return waves
}

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

/** A registry preloaded with the generators the engine itself ships (§7.4). */
export function createDefaultWorldGeneratorRegistry(): WorldGeneratorRegistry {
  const registry = new WorldGeneratorRegistry()
  registry.register(randomWorldGenerator)
  return registry
}

import type { RngStream } from '../../rng/SeededRng.js'
import type { PhaseSegment, ThemeWave } from './Timeline.js'

// The procedural machinery both world generators share (§7.4 pacing target:
// roughly one big crash every 8–12 years, one theme wave every 5–8 years).
// It lives in its own file because `tw-history` needs it too — history runs
// out at the end of its table, the cycle does not.

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

export function generatePhases(rng: RngStream, startYear: number, endYear: number): PhaseSegment[] {
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

/**
 * Rolls theme waves for a stretch of years. Exported because `tw-history`
 * uses it for the years past the end of its table — "what is hot in 2040" has
 * one implementation, not two.
 */
export function generateThemeWaves(
  rng: RngStream,
  startYear: number,
  endYear: number,
  pool: readonly string[] = DEFAULT_THEME_POOL,
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

/**
 * Keeps rolling cycles from `fromYear` until `endYear` is covered, starting
 * with a crash. This is the procedural tail every generator shares: history
 * runs out, the cycle does not.
 */
export function continueCycles(rng: RngStream, fromYear: number, endYear: number): PhaseSegment[] {
  const segments: PhaseSegment[] = []
  let year = fromYear
  while (year <= endYear) {
    const cycle = cycleSegments(rollCycle(rng), year, true)
    segments.push(...cycle)
    year = cycle.reduce((acc, s) => acc + s.years, year)
  }
  return segments
}

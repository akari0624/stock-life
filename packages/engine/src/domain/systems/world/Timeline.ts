// §7.4: the stage every other system plays on. A Timeline is pure data —
// a year-indexed description of the macro cycle and the themes in fashion —
// so `tw-history` (S19) and `random` (here) produce the exact same shape.

export const ERA_PHASES = ['recovery', 'boom', 'mania', 'crash', 'recession'] as const

export type EraPhase = (typeof ERA_PHASES)[number]

export interface PhaseSegment {
  phase: EraPhase
  startYear: number
  /** Length in calendar years; always >= 1. */
  years: number
}

export interface ThemeWave {
  theme: string
  startYear: number
  years: number
}

export interface Timeline {
  /** Which WorldGenerator produced this — recorded so replays can rebuild it. */
  generatorId: string
  startYear: number
  /** Inclusive. */
  endYear: number
  /** Contiguous, in chronological order, covering [startYear, endYear]. */
  phases: PhaseSegment[]
  /** May overlap each other — several themes can be hot in the same year. */
  themes: ThemeWave[]
}

export interface EraSnapshot {
  phase: EraPhase
  themes: string[]
}

function coversYear(segment: { startYear: number; years: number }, year: number): boolean {
  return year >= segment.startYear && year < segment.startYear + segment.years
}

/**
 * Reads the era at a given calendar year. Years outside the generated range
 * clamp to the first/last segment rather than throwing — a Calendar that
 * outlives its Timeline is a content/config mismatch, not a reason to take
 * a running game down mid-turn.
 */
export function eraAt(timeline: Timeline, year: number): EraSnapshot {
  const segments = timeline.phases
  if (segments.length === 0) throw new Error('Timeline has no phase segments')

  const first = segments[0] as PhaseSegment
  const last = segments[segments.length - 1] as PhaseSegment
  let phase: EraPhase = first.phase
  if (year >= last.startYear + last.years) {
    phase = last.phase
  } else if (year > first.startYear) {
    phase = (segments.find((s) => coversYear(s, year)) ?? last).phase
  }

  const themes = timeline.themes
    .filter((wave) => coversYear(wave, year))
    .map((wave) => wave.theme)

  return { phase, themes: [...new Set(themes)] }
}

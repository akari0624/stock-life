// §9: turn/time decoupling. Content only ever reads age/year/stage — never
// turnIndex — so switching granularity changes pacing without touching content.

export type Granularity = 'year' | 'quarter'

export type LifeStage = 'student' | 'early_career' | 'mid_career' | 'late_career' | 'retirement'

export interface CalendarConfig {
  granularity: Granularity
  startYear: number
  startAge: number
}

export interface CalendarPoint {
  year: number
  age: number
  stage: LifeStage
}

const TURNS_PER_YEAR: Record<Granularity, number> = {
  year: 1,
  quarter: 4,
}

export function stageForAge(age: number): LifeStage {
  if (age < 22) return 'student'
  if (age < 35) return 'early_career'
  if (age < 50) return 'mid_career'
  if (age < 65) return 'late_career'
  return 'retirement'
}

export class Calendar {
  private readonly config: CalendarConfig

  constructor(config: CalendarConfig) {
    this.config = config
  }

  get granularity(): Granularity {
    return this.config.granularity
  }

  get turnsPerYear(): number {
    return TURNS_PER_YEAR[this.config.granularity]
  }

  /** turnIndex is 0-based: turn 0 is the first turn of the game. */
  at(turnIndex: number): CalendarPoint {
    if (turnIndex < 0) throw new Error('Calendar.at: turnIndex must be >= 0')
    const elapsedYears = Math.floor(turnIndex / this.turnsPerYear)
    const year = this.config.startYear + elapsedYears
    const age = this.config.startAge + elapsedYears
    return { year, age, stage: stageForAge(age) }
  }
}

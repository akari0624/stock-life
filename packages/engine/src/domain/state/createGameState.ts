import type { Calendar } from '../Calendar.js'
import type { CapitalState, EraState, GameState } from './GameState.js'

/**
 * Sane starting values for a new life. Not baked into the zero state below
 * (that stays a literal zero state, which is what facade/system tests lean
 * on) — game assembly passes this in explicitly.
 */
export const DEFAULT_STARTING_CAPITAL: Readonly<Partial<CapitalState>> = {
  savingsRate: 0.2,
  cognition: 5,
  network: 5,
}

export interface CreateGameStateOptions {
  name: string
  calendar: Calendar
  /**
   * Era at the starting year, from `eraStateFor(timeline, year)` (S7).
   * Optional because EraSystem resyncs it every turn anyway — passing it in
   * just means turn 0 isn't shown as 'unknown' before the first command.
   */
  era?: EraState
  /** Starting capital-slice values; anything omitted starts at zero. */
  capital?: Partial<CapitalState>
}

/**
 * The single source of truth for "what does a fresh GameState look like".
 * Tests and systems alike should go through this rather than hand-building
 * state object literals — that's what keeps facade/system tests decoupled
 * from GameState's internal shape.
 */
export function createInitialGameState(options: CreateGameStateOptions): GameState {
  const point = options.calendar.at(0)
  return {
    turnIndex: 0,
    commandIndex: 0,
    year: point.year,
    player: {
      name: options.name,
      age: point.age,
      stage: point.stage,
      nerve: 100,
      time: 100,
      family: { status: 'single', kids: 0 },
    },
    capitalState: {
      capital: 0,
      income: 0,
      savingsRate: 0,
      debt: 0,
      cognition: 0,
      network: 0,
      ...options.capital,
    },
    career: {
      id: 'unemployed',
      industry: 'none',
      rank: 0,
    },
    era: {
      phase: options.era?.phase ?? 'unknown',
      themes: [...(options.era?.themes ?? [])],
    },
    positions: {
      count: 0,
      worstDrawdown: 0,
      open: [],
      closed: [],
    },
    traits: {
      unlocked: [],
      removed: [],
    },
    counters: {},
    flags: {},
    offers: [],
    events: { queue: [], pending: [], fired: [] },
    moments: [],
  }
}

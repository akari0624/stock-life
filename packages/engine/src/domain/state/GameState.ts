import type { LifeStage } from '../Calendar.js'

// §11 error 3: domain-separated state, not a single 60+ field flat blob.
// Each slice is owned by the systems that care about it (S6+); this file
// only defines the shape.

export type FamilyStatus = 'single' | 'partnered' | 'married' | 'divorced' | 'widowed'

export interface PlayerState {
  name: string
  age: number
  stage: LifeStage
  nerve: number
  time: number
  family: {
    status: FamilyStatus
    kids: number
  }
}

export interface CapitalState {
  capital: number
  income: number
  savingsRate: number
  debt: number
  cognition: number
  network: number
}

export interface CareerState {
  id: string
  industry: string
  rank: number
}

export interface EraState {
  phase: string
  themes: string[]
}

export interface PositionsState {
  count: number
  worstDrawdown: number
}

export interface TraitsState {
  unlocked: string[]
  removed: string[]
}

export type CountersState = Record<string, number>
export type FlagsState = Record<string, boolean>

export interface GameState {
  turnIndex: number
  /**
   * Total commands dispatched so far. Purely an RNG-keying device (S6):
   * advance() derives each system's per-call stream from
   * `${systemId}:${commandIndex}:${hook}`, which is what lets multiple
   * commands within the same turnIndex draw independent randomness while
   * keeping advance() a pure function of its (state, command, rng) inputs.
   * Not part of the mod-facing facade.
   */
  commandIndex: number
  year: number
  player: PlayerState
  capitalState: CapitalState
  career: CareerState
  era: EraState
  positions: PositionsState
  traits: TraitsState
  counters: CountersState
  flags: FlagsState
}

/**
 * Deep-clones a GameState. Engine has no DOM lib (§3.1), so this avoids
 * relying on `structuredClone`'s ambient typing rather than pulling in a
 * lib that would reopen the DOM-free boundary.
 */
export function cloneGameState(state: GameState): GameState {
  return {
    turnIndex: state.turnIndex,
    commandIndex: state.commandIndex,
    year: state.year,
    player: {
      ...state.player,
      family: { ...state.player.family },
    },
    capitalState: { ...state.capitalState },
    career: { ...state.career },
    era: { ...state.era, themes: [...state.era.themes] },
    positions: { ...state.positions },
    traits: { unlocked: [...state.traits.unlocked], removed: [...state.traits.removed] },
    counters: { ...state.counters },
    flags: { ...state.flags },
  }
}

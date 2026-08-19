import type { LifeStage } from '../Calendar.js'
import { cloneOffer, type Offer } from './Offer.js'
import type { PendingEvent } from '../systems/event/PendingEvent.js'
import {
  clonePosition,
  cloneClosedPosition,
  type ClosedPosition,
  type Position,
} from '../systems/position/Position.js'

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
  /** Kept equal to `open.length` — this is what the facade exposes. */
  count: number
  worstDrawdown: number
  open: Position[]
  closed: ClosedPosition[]
}

export interface TraitsState {
  unlocked: string[]
  removed: string[]
}

/**
 * One scheduled link waiting to become a decision (§7.2). Carries its own
 * firing rules so `drainQueue` stays dumb: it never has to look back at which
 * outcome put the entry here.
 */
export interface QueuedEvent {
  eventId: string
  /**
   * Turns still to wait, counted down once per turn. Relative rather than an
   * absolute year on purpose: `mid` runs *before* the calendar rolls over
   * (advance.ts) while a command dispatched between turns runs after it, so
   * the two contexts disagree about what "this year" is by one. A countdown
   * has no such ambiguity, and it stays correct under quarter granularity.
   */
  turnsLeft: number
  /**
   * Whether the target's `require` still has to hold when it comes due. False
   * for a same-year continuation (nothing has changed since the author wrote
   * the beat), true for anything scheduled years out.
   */
  checkRequire: boolean
  /** Played instead if it cannot fire (require failed, or `once` already spent). */
  orElse?: string
}

export interface EventsState {
  /** Links waiting to be turned into a decision (an outcome's `next`, or a trial). */
  queue: QueuedEvent[]
  /** Ids of `once` events already played, so they are never played again (§7.2). */
  fired: string[]
  /** Decisions currently in front of the player, oldest first. */
  pending: PendingEvent[]
  /**
   * The last event the random draw picked. Excluded from the next draw so the
   * same situation never shows up two years running — with the prompt on
   * screen (§7.2) an immediate repeat reads like a bug. Triggered events
   * (`event.trigger`) ignore this: a trial is supposed to come back.
   */
  lastDrawn?: string
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
  /** Proposals awaiting a player decision this turn (§2: the system proposes). */
  offers: Offer[]
  events: EventsState
  /**
   * Checkpoints that fired since they were last drained — the bus that makes
   * §7.5's `checkOn` data-driven instead of hardcoded in the turn flow.
   */
  moments: string[]
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
    positions: {
      count: state.positions.count,
      worstDrawdown: state.positions.worstDrawdown,
      open: state.positions.open.map(clonePosition),
      closed: state.positions.closed.map(cloneClosedPosition),
    },
    traits: { unlocked: [...state.traits.unlocked], removed: [...state.traits.removed] },
    counters: { ...state.counters },
    flags: { ...state.flags },
    offers: state.offers.map(cloneOffer),
    events: {
      // Objects, not strings — a spread would share references and quietly
      // break this function's promise never to mutate the input.
      queue: state.events.queue.map((q) => ({ ...q })),
      fired: [...state.events.fired],
      pending: state.events.pending.map((e) => ({
        ...e,
        choices: e.choices.map((c) => ({ ...c })),
      })),
      ...(state.events.lastDrawn === undefined ? {} : { lastDrawn: state.events.lastDrawn }),
    },
    moments: [...state.moments],
  }
}

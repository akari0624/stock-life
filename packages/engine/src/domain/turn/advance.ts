import { cloneGameState, type GameState } from '../state/GameState.js'
import type { SeededRng, RngStream } from '../rng/SeededRng.js'
import type { Effect } from '../expr/effects.js'
import type { Command } from './Command.js'
import type { Phase } from '../systems/GameSystem.js'
import type { SystemRegistry } from '../systems/SystemRegistry.js'
import type { Calendar } from '../Calendar.js'

// §4: this is not a Redux reducer (§4.1) — no giant switch, no immer, no
// undo/redo. Purity only needs to hold at this function's boundary (§4.3):
// clone once, mutate the clone freely, never touch the state passed in.

const TURN_PHASES: readonly Phase[] = ['turn.start', 'pre', 'mid', 'end', 'turn.end']

export interface AdvanceDeps {
  registry: SystemRegistry
  calendar: Calendar
}

export interface AdvanceResult {
  nextState: GameState
  effects: Effect[]
}

export type Advance = (state: GameState, command: Command, rng: SeededRng) => AdvanceResult

/**
 * Builds the actual `advance(state, command, rng)` function, closing over
 * the registry/calendar a given Sim is configured with. The returned
 * function's signature matches §4's data-flow diagram exactly; the
 * dependencies live in the closure instead of being extra parameters.
 */
export function createAdvance(deps: AdvanceDeps): Advance {
  return function advance(state, command, rng) {
    const next = cloneGameState(state)
    next.commandIndex += 1
    const commandIndex = next.commandIndex

    const effects: Effect[] = []
    const emit = (effect: Effect): void => {
      effects.push(effect)
    }

    // Each (system, call, hook) triple gets its own independent stream,
    // derived purely from state.commandIndex — so replaying the same
    // command sequence against a fresh SeededRng with the same seed
    // reproduces bit-identical randomness (§5.2), while multiple commands
    // within one turnIndex still get distinct draws.
    const streamFor = (systemId: string, hook: string): RngStream => rng.stream(`${systemId}:${commandIndex}:${hook}`)

    for (const system of deps.registry.list()) {
      system.onCommand?.(command, { state: next, rng: streamFor(system.id, 'command'), emit })
    }

    if (command.type === 'advanceTurn') {
      for (const phase of TURN_PHASES) {
        for (const system of deps.registry.list()) {
          system.onPhase?.(phase, { state: next, rng: streamFor(system.id, phase), emit })
        }
      }

      next.turnIndex += 1
      const point = deps.calendar.at(next.turnIndex)
      next.year = point.year
      next.player.age = point.age
      next.player.stage = point.stage
    }

    return { nextState: next, effects }
  }
}

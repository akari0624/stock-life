import type { GameState } from '../state/GameState.js'
import type { RngStream } from '../rng/SeededRng.js'
import type { Effect } from '../expr/effects.js'
import type { FacadeField } from '../facade/FacadeField.js'
import type { Command } from '../turn/Command.js'

// §8, §9: turn.start/pre/mid/end runs once per advanceTurn, before turnIndex
// increments; turn.end runs after. Content conditions read age/year/stage,
// never a phase name or turnIndex — this list is engine-internal ordering.
export type Phase = 'turn.start' | 'pre' | 'mid' | 'end' | 'turn.end'

export interface SystemCtx {
  state: GameState
  rng: RngStream
  emit(effect: Effect): void
}

export interface GameSystem {
  id: string
  /** Resolution order within a turn — lower runs first. */
  order: number
  onPhase?(phase: Phase, ctx: SystemCtx): void
  /** §4.1: each system handles the commands it cares about — no central dispatcher/switch. */
  onCommand?(command: Command, ctx: SystemCtx): void
  /** Facade fields this system contributes to the mod-facing whitelist (§6.1, §8). */
  facadeFields?(): FacadeField[]
}

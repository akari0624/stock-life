import type { GameState } from '../../state/GameState.js'

// §7.5: the engine publishes checkpoints; content picks which to listen to.
// Systems push a moment when something noteworthy happens and TraitSystem
// drains them — no system ever calls TraitSystem, and TraitSystem never has
// to know which systems exist.

export const MOMENT_TURN_END = 'turn.end'
export const MOMENT_POSITION_CLOSE = 'position.close'
export const MOMENT_EVENT_RESOLVE = 'event.resolve'

export function pushMoment(state: GameState, moment: string): void {
  state.moments.push(moment)
}

/** Returns everything published since the last drain, and clears the bus. */
export function drainMoments(state: GameState): string[] {
  const moments = state.moments
  state.moments = []
  return moments
}

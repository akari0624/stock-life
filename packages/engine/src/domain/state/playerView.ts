import { cloneGameState, type GameState } from './GameState.js'
import type { Position } from '../systems/position/Position.js'

// §7.1: `truth` is resolved into real numbers the moment a position opens,
// and the player must not see any of it until the position settles. The
// engine needs those numbers; the presentation layer must never get them.
// This is the one-way valve between the two.

export type OpenPositionView = Omit<Position, 'secret'>

export interface PlayerView extends Omit<GameState, 'positions'> {
  positions: Omit<GameState['positions'], 'open'> & { open: OpenPositionView[] }
}

/**
 * The only shape presentation is allowed to render. Everything else about a
 * position — size, drawdown, pending trial — stays visible; the resolved
 * `secret` (multiple, years, ruin roll) is dropped entirely, not zeroed, so
 * a leak is a missing property rather than a plausible wrong number.
 */
export function toPlayerView(state: GameState): PlayerView {
  const copy = cloneGameState(state)
  const open = copy.positions.open.map((position): OpenPositionView => {
    const { secret: _secret, ...view } = position
    return view
  })
  return { ...copy, positions: { ...copy.positions, open } }
}

import type { PlayerView } from '../domain/state/playerView.js'
import type { Offer } from '../domain/state/Offer.js'
import type { PendingChoiceView } from '../domain/systems/event/PendingEvent.js'
import { TRIAL_CHOICES, type TrialChoice } from '../domain/systems/position/PositionSystem.js'
import {
  COUNTER_DICE_POOL,
  COUNTER_DICE_SPENT,
  DICE_CHANNELS,
  type DiceChannel,
} from '../domain/systems/economy/DiceSystem.js'

// What is in front of the player right now, derived purely from a PlayerView.
//
// Both the headless policy (S11) and the UI (S16) go through this function,
// so "which decision comes next" has exactly one definition. If they each
// derived it themselves, a share code + the same choices could stop
// reproducing the same life the moment the two drifted apart.

export type Decision =
  | { kind: 'event'; eventId: string; choices: PendingChoiceView[] }
  | { kind: 'trial'; positionId: string; opportunityId: string; choices: readonly TrialChoice[] }
  | { kind: 'dice'; pool: number; channels: readonly DiceChannel[] }
  | { kind: 'offer'; offer: Offer }

/** `undefined` = nothing left to decide; the turn can end. */
export function nextDecision(view: PlayerView): Decision | undefined {
  const pending = view.events.pending[0]
  if (pending) return { kind: 'event', eventId: pending.eventId, choices: pending.choices }

  const trial = view.positions.open.find((position) => position.pendingTrial)
  if (trial) {
    return {
      kind: 'trial',
      positionId: trial.id,
      opportunityId: trial.opportunityId,
      choices: TRIAL_CHOICES,
    }
  }

  const pool = (view.counters[COUNTER_DICE_POOL] ?? 0) - (view.counters[COUNTER_DICE_SPENT] ?? 0)
  if (pool > 0) return { kind: 'dice', pool, channels: DICE_CHANNELS }

  const offer = view.offers[0]
  if (offer) return { kind: 'offer', offer }

  return undefined
}

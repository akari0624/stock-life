import type { GameSystem, Phase, SystemCtx } from '../GameSystem.js'
import { addStat } from '../../state/stats.js'

// §1.1 network: decides whether an opportunity finds you at all. Contacts go
// cold if you never spend a die on them, which is what makes `social` a real
// competitor to `study` rather than a one-time purchase.

export const NETWORK_SYSTEM_ID = 'network'
export const NETWORK_SYSTEM_ORDER = 50

/** Chance a year among colleagues adds a contact, while employed. */
export const COLLEAGUE_CHANCE = 0.5
/** Contacts lost per year, once you have more than you can maintain. */
export const NETWORK_DECAY = 1
export const NETWORK_DECAY_FLOOR = 10

export function createNetworkSystem(): GameSystem {
  return {
    id: NETWORK_SYSTEM_ID,
    order: NETWORK_SYSTEM_ORDER,

    onPhase(phase: Phase, ctx: SystemCtx): void {
      if (phase !== 'mid') return
      const { state, emit } = ctx

      if (state.career.rank > 0 && ctx.rng.chance(COLLEAGUE_CHANCE)) {
        const gained = addStat(state, 'network', 1)
        if (gained !== 0) emit({ type: 'stat.add', key: 'network', value: gained })
      }

      if (state.capitalState.network > NETWORK_DECAY_FLOOR) {
        const lost = addStat(state, 'network', -NETWORK_DECAY)
        if (lost !== 0) emit({ type: 'stat.add', key: 'network', value: lost })
      }
    },
  }
}

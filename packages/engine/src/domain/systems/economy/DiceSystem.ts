import type { GameSystem, Phase, SystemCtx } from '../GameSystem.js'
import type { FacadeField } from '../../facade/FacadeField.js'
import type { Command } from '../../turn/Command.js'
import { addStat, setStat, type StatKey } from '../../state/stats.js'

// §2's core loop: at the start of each period you roll dice and spend the
// pips on abilities. The pool and everything spent live in `counter.*` — a
// first-class, mod-readable namespace (§7.5) — so no new state slice and no
// new effect type are needed, and a trait can key off "how you spent your
// life" for free.

export const DICE_SYSTEM_ID = 'dice'
export const DICE_SYSTEM_ORDER = 20

export const DICE_CHANNELS = ['study', 'social', 'work', 'rest'] as const
export type DiceChannel = (typeof DICE_CHANNELS)[number]

const CHANNEL_SET = new Set<string>(DICE_CHANNELS)

export function isDiceChannel(value: string): value is DiceChannel {
  return CHANNEL_SET.has(value)
}

/** Which stat one pip moves, and by how much. */
const CHANNEL_EFFECT: Record<DiceChannel, { stat: StatKey; perPoint: number }> = {
  study: { stat: 'cognition', perPoint: 1 },
  social: { stat: 'network', perPoint: 1 },
  work: { stat: 'income', perPoint: 1 },
  rest: { stat: 'nerve', perPoint: 2 },
}

export const DICE_FACES = 6
/** Rank is a real career payoff: a better job buys you more time to spend on yourself. */
export const DICE_RANK_BONUS = 1

export const COUNTER_DICE_POOL = 'dice_pool'
export const COUNTER_DICE_SPENT = 'dice_spent'
export const counterForChannel = (channel: DiceChannel): string => `dice_${channel}`

const DICE_FACADE_FIELDS: readonly FacadeField[] = [
  { path: `counter.${COUNTER_DICE_POOL}`, label: 'Dice: pips available this turn', type: 'number' },
  { path: `counter.${COUNTER_DICE_SPENT}`, label: 'Dice: pips spent this turn', type: 'number' },
  ...DICE_CHANNELS.map(
    (channel): FacadeField => ({
      path: `counter.${counterForChannel(channel)}`,
      label: `Dice: lifetime pips spent on ${channel}`,
      type: 'number',
    }),
  ),
]

/**
 * Rolls the period's pips and applies `allocateDice`. Unspent pips expire
 * when the next roll happens — the decision is "what do I do with this
 * year", not a bank account.
 */
export function createDiceSystem(): GameSystem {
  return {
    id: DICE_SYSTEM_ID,
    order: DICE_SYSTEM_ORDER,

    onPhase(phase: Phase, ctx: SystemCtx): void {
      if (phase !== 'turn.start') return
      const pool = ctx.rng.int(1, DICE_FACES) + ctx.state.career.rank * DICE_RANK_BONUS
      const poolDelta = setStat(ctx.state, COUNTER_DICE_POOL, pool)
      const spentDelta = setStat(ctx.state, COUNTER_DICE_SPENT, 0)
      ctx.emit({ type: 'stat.add', key: COUNTER_DICE_POOL, value: poolDelta })
      if (spentDelta !== 0) ctx.emit({ type: 'stat.add', key: COUNTER_DICE_SPENT, value: spentDelta })
    },

    onCommand(command: Command, ctx: SystemCtx): void {
      if (command.type !== 'allocateDice') return

      const pool = ctx.state.counters[COUNTER_DICE_POOL] ?? 0
      let remaining = pool - (ctx.state.counters[COUNTER_DICE_SPENT] ?? 0)
      if (remaining <= 0) return

      // Sorted so a replayed log produces the same order regardless of how
      // the assignment object was keyed when it was serialised.
      for (const channel of [...Object.keys(command.assignment)].sort()) {
        if (!isDiceChannel(channel)) continue
        const requested = Math.max(0, Math.floor(command.assignment[channel] ?? 0))
        const points = Math.min(requested, remaining)
        if (points <= 0) continue
        remaining -= points

        const { stat, perPoint } = CHANNEL_EFFECT[channel]
        const gained = addStat(ctx.state, stat, points * perPoint)
        if (gained !== 0) ctx.emit({ type: 'stat.add', key: stat, value: gained })

        addStat(ctx.state, counterForChannel(channel), points)
        ctx.emit({ type: 'stat.add', key: counterForChannel(channel), value: points })

        addStat(ctx.state, COUNTER_DICE_SPENT, points)
        ctx.emit({ type: 'stat.add', key: COUNTER_DICE_SPENT, value: points })
      }
    },

    facadeFields(): FacadeField[] {
      return [...DICE_FACADE_FIELDS]
    },
  }
}

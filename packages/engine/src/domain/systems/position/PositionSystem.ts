import type { GameSystem, Phase, SystemCtx } from '../GameSystem.js'
import type { Command } from '../../turn/Command.js'
import type { FacadeField } from '../../facade/FacadeField.js'
import type { Sizing } from '../../expr/effects.js'
import { addStat } from '../../state/stats.js'
import { LIFE_TIER, type Opportunity } from '../opportunity/Opportunity.js'
import { MOMENT_POSITION_CLOSE, pushMoment } from '../trait/moments.js'
import { enqueueEvent } from '../event/EventSystem.js'
import {
  resolveTruth,
  RUIN_RECOVERY,
  SIZING_FRACTION,
  SIZING_LEVERAGE,
  type ClosedPosition,
  type Position,
} from './Position.js'

// §1's formula settles here: multiple × capital at the time × how long you
// held. A `tier: "life"` position spends years throwing trials at you before
// it pays anything — which is the whole point of the game.

export const POSITION_SYSTEM_ID = 'position'
export const POSITION_SYSTEM_ORDER = 80

/** Odds a life-tier position throws a trial in a given year. */
export const TRIAL_CHANCE = 0.6
export const TRIAL_DRAWDOWN_RANGE: readonly [number, number] = [0.2, 0.6]
/** Nerve spent holding through a paper loss, scaled by how deep it was. */
export const HOLD_NERVE_COST = 20

export const TRIAL_CHOICES = ['hold', 'sell'] as const
export type TrialChoice = (typeof TRIAL_CHOICES)[number]

export const COUNTER_HELD_THROUGH_DRAWDOWN = 'held_through_drawdown'
export const COUNTER_PANIC_SOLD = 'panic_sold'
export const COUNTER_TRIALS_FACED = 'trials_faced'
export const COUNTER_POSITIONS_CLOSED = 'positions_closed'
export const COUNTER_RUINED = 'positions_ruined'
export const COUNTER_WIPEOUTS = 'leveraged_wipeouts'

/** Set when a leveraged bet leaves debt behind — content gates the family/health chain on it (§1.3). */
export const FLAG_LEVERAGED_WIPEOUT = 'leveraged_wipeout'

export interface PositionDeps {
  /** From the Calendar (§9) — a "3 year" hold means 12 turns in quarter mode. */
  turnsPerYear: number
}

// The system itself needs no configuration: a position carries its own
// settlement turn, tier and trials, all copied off the data at open time.
// `turnsPerYear` is only needed to *open* one — see positionOpener().

const positionIdFor = (opportunityId: string, turnIndex: number): string => `pos:${opportunityId}:${turnIndex}`

function syncCount(ctx: SystemCtx): void {
  ctx.state.positions.count = ctx.state.positions.open.length
}

/**
 * Opens a position against an opportunity. Exported rather than private so
 * OpportunitySystem can hand acceptance straight here, and so S10's event
 * pipeline can route a content-authored `position.open` effect to the same
 * code path instead of a second, subtly different one.
 *
 * `tier` and `trials` are copied off the data — no opportunity id is ever
 * special-cased (§7.1).
 */
export function openPosition(
  ctx: SystemCtx,
  deps: PositionDeps,
  opportunity: Opportunity,
  sizing: Sizing,
): Position | undefined {
  const { state, emit } = ctx
  const stake = state.capitalState.capital * (SIZING_FRACTION[sizing] ?? 0)
  if (stake <= 0) return undefined

  const spent = addStat(state, 'capital', -stake)
  emit({ type: 'stat.add', key: 'capital', value: spent })

  const position: Position = {
    id: positionIdFor(opportunity.id, state.turnIndex),
    opportunityId: opportunity.id,
    tier: opportunity.tier,
    sizing,
    stake: -spent,
    borrowed: -spent * (SIZING_LEVERAGE[sizing] ?? 0),
    openedOnTurn: state.turnIndex,
    settlesOnTurn: state.turnIndex,
    trials: [...opportunity.trials],
    drawdown: 0,
    secret: resolveTruth(opportunity, state.era.phase, ctx.rng),
  }
  position.settlesOnTurn = state.turnIndex + position.secret.years * deps.turnsPerYear

  state.positions.open.push(position)
  syncCount(ctx)
  emit({ type: 'position.open', opportunityId: opportunity.id, sizing })
  return position
}

function closePosition(
  ctx: SystemCtx,
  position: Position,
  proceeds: number,
  options: { soldEarly: boolean; ruined: boolean },
): void {
  const { state, emit } = ctx

  const afterMargin = proceeds - position.borrowed
  let shortfall = 0

  if (afterMargin >= 0) {
    const gained = addStat(state, 'capital', afterMargin)
    if (gained !== 0) emit({ type: 'stat.add', key: 'capital', value: gained })
  } else {
    // §1.3: leverage is the one size whose losses escape the portfolio and
    // land on your life.
    shortfall = -afterMargin
    const added = addStat(state, 'debt', shortfall)
    emit({ type: 'stat.add', key: 'debt', value: added })
    state.flags[FLAG_LEVERAGED_WIPEOUT] = true
    emit({ type: 'flag.set', key: FLAG_LEVERAGED_WIPEOUT })
    addStat(state, COUNTER_WIPEOUTS, 1)
    emit({ type: 'stat.add', key: COUNTER_WIPEOUTS, value: 1 })
  }

  const closed: ClosedPosition = {
    id: position.id,
    opportunityId: position.opportunityId,
    sizing: position.sizing,
    stake: position.stake,
    borrowed: position.borrowed,
    openedOnTurn: position.openedOnTurn,
    closedOnTurn: state.turnIndex,
    proceeds,
    shortfall,
    ruined: options.ruined,
    soldEarly: options.soldEarly,
    worstDrawdown: position.drawdown,
  }

  state.positions.open = state.positions.open.filter((p) => p.id !== position.id)
  state.positions.closed.push(closed)
  syncCount(ctx)

  addStat(state, COUNTER_POSITIONS_CLOSED, 1)
  emit({ type: 'stat.add', key: COUNTER_POSITIONS_CLOSED, value: 1 })
  // §7.5: publish the checkpoint; whether anything listens is content's call.
  pushMoment(state, MOMENT_POSITION_CLOSE)
  if (options.ruined) {
    addStat(state, COUNTER_RUINED, 1)
    emit({ type: 'stat.add', key: COUNTER_RUINED, value: 1 })
  }
}

const POSITION_FACADE_FIELDS: readonly FacadeField[] = [
  { path: `counter.${COUNTER_HELD_THROUGH_DRAWDOWN}`, label: 'Times held through a drawdown', type: 'number' },
  { path: `counter.${COUNTER_PANIC_SOLD}`, label: 'Times sold into a drawdown', type: 'number' },
  { path: `counter.${COUNTER_TRIALS_FACED}`, label: 'Position trials faced', type: 'number' },
  { path: `counter.${COUNTER_POSITIONS_CLOSED}`, label: 'Positions closed', type: 'number' },
  { path: `counter.${COUNTER_RUINED}`, label: 'Positions that turned out to be traps', type: 'number' },
  { path: `counter.${COUNTER_WIPEOUTS}`, label: 'Leveraged wipeouts', type: 'number' },
  { path: `flag.${FLAG_LEVERAGED_WIPEOUT}`, label: 'Has been wiped out on leverage', type: 'boolean' },
]

export function createPositionSystem(): GameSystem {
  const hold = (ctx: SystemCtx, position: Position): void => {
    const drawdown = position.pendingTrial?.drawdown ?? position.drawdown
    delete position.pendingTrial
    addStat(ctx.state, COUNTER_HELD_THROUGH_DRAWDOWN, 1)
    ctx.emit({ type: 'stat.add', key: COUNTER_HELD_THROUGH_DRAWDOWN, value: 1 })
    const nerve = addStat(ctx.state, 'nerve', -Math.round(HOLD_NERVE_COST * drawdown))
    if (nerve !== 0) ctx.emit({ type: 'stat.add', key: 'nerve', value: nerve })
  }

  return {
    id: POSITION_SYSTEM_ID,
    order: POSITION_SYSTEM_ORDER,

    onPhase(phase: Phase, ctx: SystemCtx): void {
      const { state, emit } = ctx

      if (phase === 'turn.start') {
        // Doing nothing is holding — the headless runner and a distracted
        // player end up in the same, well-defined place.
        for (const position of [...state.positions.open]) {
          if (position.pendingTrial) hold(ctx, position)
        }
        return
      }

      if (phase === 'mid') {
        for (const position of [...state.positions.open]) {
          // §7.1: trials are gated on the data field, never on which
          // opportunity this happens to be.
          if (position.tier !== LIFE_TIER || position.trials.length === 0) continue
          if (!ctx.rng.chance(TRIAL_CHANCE)) continue

          const trialId = ctx.rng.pick(position.trials)
          const [minDrawdown, maxDrawdown] = TRIAL_DRAWDOWN_RANGE
          const drawdown = minDrawdown + ctx.rng.next() * (maxDrawdown - minDrawdown)

          position.drawdown = Math.max(position.drawdown, drawdown)
          state.positions.worstDrawdown = Math.max(state.positions.worstDrawdown, position.drawdown)
          position.pendingTrial = { id: trialId, drawdown }

          addStat(state, COUNTER_TRIALS_FACED, 1)
          emit({ type: 'stat.add', key: COUNTER_TRIALS_FACED, value: 1 })
          // Trials are ordinary content events (§7.1): the pipeline that
          // renders and resolves any other event renders these too. The queue
          // is the state change; the effect is what the performance hears.
          enqueueEvent(state, trialId)
          emit({ type: 'event.trigger', eventId: trialId })
        }
        return
      }

      if (phase !== 'end') return

      for (const position of [...state.positions.open]) {
        if (state.turnIndex < position.settlesOnTurn) continue
        const exposure = position.stake + position.borrowed
        const proceeds = position.secret.ruined
          ? exposure * RUIN_RECOVERY
          : exposure * position.secret.multiple
        closePosition(ctx, position, proceeds, { soldEarly: false, ruined: position.secret.ruined })
      }
    },

    onCommand(command: Command, ctx: SystemCtx): void {
      if (command.type !== 'resolveTrial') return
      const position = ctx.state.positions.open.find((p) => p.id === command.positionId)
      if (!position?.pendingTrial) return

      if (command.choice !== 'sell') {
        // Anything that isn't an explicit sell is a hold.
        hold(ctx, position)
        return
      }

      const exposure = position.stake + position.borrowed
      const proceeds = exposure * (1 - position.pendingTrial.drawdown)
      delete position.pendingTrial
      addStat(ctx.state, COUNTER_PANIC_SOLD, 1)
      ctx.emit({ type: 'stat.add', key: COUNTER_PANIC_SOLD, value: 1 })
      closePosition(ctx, position, proceeds, { soldEarly: true, ruined: false })
    },

    facadeFields(): FacadeField[] {
      return [...POSITION_FACADE_FIELDS]
    },
  }
}

/** Convenience for wiring OpportunitySystem's `onAccept` to this system. */
export function positionOpener(deps: PositionDeps) {
  return (ctx: SystemCtx, opportunity: Opportunity, sizing: string): void => {
    openPosition(ctx, deps, opportunity, sizing as Sizing)
  }
}

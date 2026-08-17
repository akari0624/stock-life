import type { GameSystem, Phase, SystemCtx } from '../GameSystem.js'
import type { Command } from '../../turn/Command.js'
import type { FacadeField } from '../../facade/FacadeField.js'
import type { RngStream } from '../../rng/SeededRng.js'
import { addStat } from '../../state/stats.js'
import { isSatisfied } from '../../expr/evaluate.js'
import { findChoice, successChance, type EventDef } from './EventDef.js'
import type { PendingEvent } from './PendingEvent.js'
import { applyContentEffects, type ContentEffectDeps } from '../content/applyContentEffects.js'
import type { OpportunityIndex } from '../opportunity/Opportunity.js'
import type { PositionDeps } from '../position/PositionSystem.js'
import { MOMENT_EVENT_RESOLVE, pushMoment } from '../trait/moments.js'

// §7.2. Two ways an event reaches the player: drawn at random (weighted), or
// queued by id through `event.trigger` — which is how position trials (§7.1)
// arrive on the exact same pipeline as everything else.

export const EVENT_SYSTEM_ID = 'event'
export const EVENT_SYSTEM_ORDER = 90

export const COUNTER_EVENTS_RESOLVED = 'events_resolved'
export const COUNTER_EVENTS_GOOD = 'events_good'
export const COUNTER_EVENTS_BAD = 'events_bad'
export const counterForEventChoice = (choice: string): string => `chose_${choice}`

/** What an unanswered event resolves to when the player just moves on. */
export const DEFAULT_CHOICE = 'normal'

export interface EventSystemOptions {
  events: readonly EventDef[]
  opportunities: OpportunityIndex
  position: PositionDeps
}

function weightedPick(candidates: readonly EventDef[], rng: RngStream): EventDef | undefined {
  const total = candidates.reduce((sum, e) => sum + e.weight, 0)
  if (total <= 0) return undefined
  let roll = rng.next() * total
  for (const event of candidates) {
    roll -= event.weight
    if (roll < 0) return event
  }
  return candidates[candidates.length - 1]
}

function toPending(event: EventDef): PendingEvent {
  return {
    eventId: event.id,
    choices: event.choices.map((choice) => ({
      id: choice.id,
      label: choice.label,
      // Same call the roll makes — see successChance()'s note.
      chance: successChance(choice),
      mag: choice.mag,
    })),
  }
}

const EVENT_FACADE_FIELDS: readonly FacadeField[] = [
  { path: `counter.${COUNTER_EVENTS_RESOLVED}`, label: 'Events resolved', type: 'number' },
  { path: `counter.${COUNTER_EVENTS_GOOD}`, label: 'Events that went well', type: 'number' },
  { path: `counter.${COUNTER_EVENTS_BAD}`, label: 'Events that went badly', type: 'number' },
  { path: `counter.${counterForEventChoice('safe')}`, label: 'Times the safe option was taken', type: 'number' },
  { path: `counter.${counterForEventChoice('normal')}`, label: 'Times the neutral option was taken', type: 'number' },
  { path: `counter.${counterForEventChoice('bold')}`, label: 'Times the bold option was taken', type: 'number' },
]

export function createEventSystem(options: EventSystemOptions): GameSystem {
  const byId = new Map(options.events.map((e) => [e.id, e]))

  const effectDeps: ContentEffectDeps = {
    opportunities: options.opportunities,
    position: options.position,
    enqueueEvent: (ctx, eventId) => {
      ctx.state.events.queue.push(eventId)
    },
  }

  const resolve = (ctx: SystemCtx, pending: PendingEvent, choiceId: string): void => {
    const event = byId.get(pending.eventId)
    ctx.state.events.pending = ctx.state.events.pending.filter((p) => p !== pending)
    if (!event) return

    const choice = findChoice(event, choiceId) ?? findChoice(event, DEFAULT_CHOICE) ?? event.choices[0]
    if (!choice) return

    const view = pending.choices.find((c) => c.id === choice.id)
    // The displayed number is what gets rolled — never a recomputed variant.
    const chance = view?.chance ?? successChance(choice)
    const good = ctx.rng.chance(chance / 100)
    const outcome = good ? event.good : event.bad

    if (event.scene.bg) ctx.emit({ type: 'scene.bg', id: event.scene.bg })
    if (event.scene.actor) ctx.emit({ type: 'scene.actor', id: event.scene.actor })
    ctx.emit({ type: 'scene.say', actor: event.scene.actor ?? 'narrator', text: outcome.text })
    if (event.scene.sfx) ctx.emit({ type: 'scene.sfx', id: event.scene.sfx })
    if (event.scene.fx) ctx.emit({ type: 'scene.fx', id: event.scene.fx })

    applyContentEffects(ctx, outcome.effects, effectDeps, choice.mag)

    for (const [key, value] of [
      [COUNTER_EVENTS_RESOLVED, 1],
      [good ? COUNTER_EVENTS_GOOD : COUNTER_EVENTS_BAD, 1],
      [counterForEventChoice(choice.id), 1],
    ] as const) {
      addStat(ctx.state, key, value)
      ctx.emit({ type: 'stat.add', key, value })
    }

    pushMoment(ctx.state, MOMENT_EVENT_RESOLVE)
  }

  const drainQueue = (ctx: SystemCtx): void => {
    const queued = ctx.state.events.queue
    ctx.state.events.queue = []
    for (const id of queued) {
      const event = byId.get(id)
      // An unknown id is a content problem, not a crash: the trigger is
      // simply dropped (§6.2 keeps hard failures at load time).
      if (event) ctx.state.events.pending.push(toPending(event))
    }
  }

  return {
    id: EVENT_SYSTEM_ID,
    order: EVENT_SYSTEM_ORDER,

    onPhase(phase: Phase, ctx: SystemCtx): void {
      if (phase === 'turn.start') {
        // Whatever the player didn't answer resolves as the neutral option,
        // so a skipped decision is still a defined one.
        for (const pending of [...ctx.state.events.pending]) {
          resolve(ctx, pending, DEFAULT_CHOICE)
        }
        return
      }

      if (phase !== 'mid') return

      drainQueue(ctx)
      if (ctx.state.events.pending.length > 0) return

      const eligible = options.events.filter(
        (event) => event.weight > 0 && isSatisfied(event.require, { state: ctx.state, rng: ctx.rng }),
      )
      const drawn = weightedPick(eligible, ctx.rng)
      if (drawn) ctx.state.events.pending.push(toPending(drawn))
    },

    onCommand(command: Command, ctx: SystemCtx): void {
      // advanceTurn is handled by the phases below. Draining here as well
      // would push a freshly queued trial into `pending` *before* turn.start
      // runs, and turn.start would immediately auto-resolve it — the player
      // would never see the decision.
      if (command.type === 'advanceTurn') return

      if (command.type === 'resolveEvent') {
        const pending = ctx.state.events.pending[0]
        if (pending) resolve(ctx, pending, command.choice)
      }

      // Trials queued by PositionSystem during this same command, plus any
      // event.trigger chained by the outcome just applied.
      drainQueue(ctx)
    },

    facadeFields(): FacadeField[] {
      return [...EVENT_FACADE_FIELDS]
    },
  }
}

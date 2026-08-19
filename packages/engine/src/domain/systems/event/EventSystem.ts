import type { GameSystem, Phase, SystemCtx } from '../GameSystem.js'
import type { GameState, QueuedEvent } from '../../state/GameState.js'
import type { Command } from '../../turn/Command.js'
import type { FacadeField } from '../../facade/FacadeField.js'
import type { RngStream } from '../../rng/SeededRng.js'
import { addStat } from '../../state/stats.js'
import { isSatisfied } from '../../expr/evaluate.js'
import { NARRATOR_ACTOR } from '../../expr/sceneIds.js'
import { findChoice, successChance, type EventDef, type EventLink } from './EventDef.js'
import type { PendingEvent } from './PendingEvent.js'
import { applyContentEffects, type ContentEffectDeps } from '../content/applyContentEffects.js'
import type { OpportunityIndex } from '../opportunity/Opportunity.js'
import type { PositionDeps } from '../position/PositionSystem.js'
import { MOMENT_EVENT_RESOLVE, pushMoment } from '../trait/moments.js'

// §7.2. Two ways an event reaches the player: drawn at random (weighted), or
// queued — by an outcome's `next`, or by a system, which is how position
// trials (§7.1) arrive on the exact same pipeline as everything else.

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
    ...(event.prompt === undefined ? {} : { prompt: event.prompt }),
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

export interface EnqueueOptions {
  /** Turns to wait. Defaults to 0 — drained on the very next pass. */
  turnsLeft?: number
  /** Defaults to false: a same-year continuation does not re-check `require`. */
  checkRequire?: boolean
  orElse?: string
}

/**
 * Puts an event in the inbox EventSystem drains each turn.
 *
 * Exported because there are two callers and they must not diverge: an
 * outcome's `next` (§7.2) and PositionSystem's yearly trial (§7.1 — "trials
 * 走一般事件管線"). Emitting `event.trigger` is how the *performance* hears
 * about it; this is how the *game* does.
 */
export function enqueueEvent(state: GameState, eventId: string, options: EnqueueOptions = {}): void {
  state.events.queue.push({
    eventId,
    turnsLeft: Math.max(0, options.turnsLeft ?? 0),
    checkRequire: options.checkRequire ?? false,
    ...(options.orElse === undefined ? {} : { orElse: options.orElse }),
  })
}

export function createEventSystem(options: EventSystemOptions): GameSystem {
  const byId = new Map(options.events.map((e) => [e.id, e]))

  const effectDeps: ContentEffectDeps = {
    opportunities: options.opportunities,
    position: options.position,
  }

  const spent = (ctx: SystemCtx, event: EventDef): boolean =>
    event.once === true && ctx.state.events.fired.includes(event.id)

  /**
   * §7.2's story-graph edge. `afterYears` decides both *when* it lands and
   * whether `require` gets a say when it does — see {@link EventLink}.
   */
  const enqueueLink = (ctx: SystemCtx, link: EventLink): void => {
    const afterYears = link.afterYears ?? 0
    enqueueEvent(ctx.state, link.id, {
      turnsLeft: afterYears * options.position.turnsPerYear,
      checkRequire: afterYears >= 1,
      ...(link.orElse === undefined ? {} : { orElse: link.orElse }),
    })
    ctx.emit({ type: 'event.trigger', eventId: link.id })
  }

  /**
   * §7.2's first half: an event is *presented* before it is answered.
   * The stage gets the scene and the situation here; the outcome comes later,
   * in `resolve()`. Without this the player decides while looking at nothing.
   */
  const present = (ctx: SystemCtx, event: EventDef): void => {
    // Spend `once` on presentation, not on resolution: an event the player
    // was shown has happened to them, whichever way the roll then went.
    if (event.once === true && !ctx.state.events.fired.includes(event.id)) {
      ctx.state.events.fired.push(event.id)
    }
    ctx.state.events.pending.push(toPending(event))

    if (event.scene.bg) ctx.emit({ type: 'scene.bg', id: event.scene.bg })
    if (event.scene.actor) ctx.emit({ type: 'scene.actor', id: event.scene.actor })
    if (event.prompt) {
      ctx.emit({ type: 'scene.say', actor: event.scene.actor ?? NARRATOR_ACTOR, text: event.prompt })
    }
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
    // Effects are shared by the three choices (scaled by mag); the sentence is
    // the one written for *this* choice, so it matches the action taken (§7.2).
    const outcome = good ? event.good : event.bad
    const text = good ? choice.good : choice.bad

    // The stage was already dressed when the event was presented, and the
    // director keeps it between plans — so this half only speaks the outcome.
    ctx.emit({ type: 'scene.say', actor: event.scene.actor ?? NARRATOR_ACTOR, text })
    if (event.scene.sfx) ctx.emit({ type: 'scene.sfx', id: event.scene.sfx })
    if (event.scene.fx) ctx.emit({ type: 'scene.fx', id: event.scene.fx })

    applyContentEffects(ctx, outcome.effects, effectDeps, choice.mag)
    if (outcome.next) enqueueLink(ctx, outcome.next)

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
    const held: QueuedEvent[] = []
    ctx.state.events.queue = []

    for (const entry of queued) {
      // Scheduled for a later turn — leave it in the inbox untouched.
      if (entry.turnsLeft > 0) {
        held.push(entry)
        continue
      }

      const event = byId.get(entry.eventId)
      // An unknown id is a content problem, not a crash: the link is simply
      // dropped (§6.2 keeps hard failures at load time, and merge.ts refuses
      // a pack whose `next` points nowhere).
      const blocked =
        event === undefined ||
        spent(ctx, event) ||
        (entry.checkRequire && !isSatisfied(event.require, { state: ctx.state, rng: ctx.rng }))

      if (event !== undefined && !blocked) {
        present(ctx, event)
        continue
      }

      // The author's designated safety net. It is played as written — running
      // its `require` too would just move the same problem one step along.
      const fallback = entry.orElse === undefined ? undefined : byId.get(entry.orElse)
      if (fallback && !spent(ctx, fallback)) present(ctx, fallback)
    }

    ctx.state.events.queue = [...held, ...ctx.state.events.queue]
  }

  return {
    id: EVENT_SYSTEM_ID,
    order: EVENT_SYSTEM_ORDER,

    onPhase(phase: Phase, ctx: SystemCtx): void {
      if (phase === 'turn.start') {
        // One tick of the schedule, before anything else this turn can look at
        // it — so a link written as "three years later" lands on the third
        // turn the player actually plays, not the fourth.
        for (const entry of ctx.state.events.queue) {
          if (entry.turnsLeft > 0) entry.turnsLeft -= 1
        }

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
        (event) =>
          event.weight > 0 &&
          // 去年抽過的今年不抽：情境現在是看得見的，連續兩年同一句會像壞掉
          event.id !== ctx.state.events.lastDrawn &&
          !spent(ctx, event) &&
          isSatisfied(event.require, { state: ctx.state, rng: ctx.rng }),
      )
      const drawn = weightedPick(eligible, ctx.rng)
      // 沒得抽就是安靜的一年——寧可沒事發生，也不要同一件事再演一次
      ctx.state.events.lastDrawn = drawn?.id
      if (drawn) present(ctx, drawn)
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

      // Trials queued by PositionSystem during this same command, plus the
      // `next` chained by the outcome just applied.
      drainQueue(ctx)
    },

    facadeFields(): FacadeField[] {
      return [...EVENT_FACADE_FIELDS]
    },
  }
}

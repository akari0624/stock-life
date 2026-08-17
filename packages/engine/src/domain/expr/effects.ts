import type { GameState } from '../state/GameState.js'
import { cloneGameState } from '../state/GameState.js'
import type { RngStream } from '../rng/SeededRng.js'

// §6.3: Effect splits into two unions that must never blend. StateEffect is
// what the reducer actually applies; SceneHint is purely a note to the
// director and is guaranteed inert with respect to state (see the test that
// proves this in evaluate.test.ts's sibling suite).

export type Sizing = 'light' | 'normal' | 'heavy' | 'leveraged'

export type StateEffect =
  | { type: 'stat.add'; key: string; value: number }
  | { type: 'capital.mul'; value: number }
  | { type: 'flag.set'; key: string }
  | { type: 'trait.grant'; id: string }
  | { type: 'position.open'; opportunityId: string; sizing: Sizing }
  | { type: 'event.trigger'; eventId: string }

export type SceneHint =
  | { type: 'scene.bg'; id: string }
  | { type: 'scene.actor'; id: string; emote?: string; at?: 'left' | 'right' }
  | { type: 'scene.say'; actor: string; text: string }
  | { type: 'scene.sfx'; id: string; priority?: 'high' | 'normal'; dedupeMs?: number }
  | { type: 'scene.bgm'; id: string; fadeMs?: number }
  | { type: 'scene.fx'; id: string }

export type Effect = StateEffect | SceneHint

const STATE_EFFECT_TYPES = new Set<StateEffect['type']>([
  'stat.add',
  'capital.mul',
  'flag.set',
  'trait.grant',
  'position.open',
  'event.trigger',
])

export function isStateEffect(effect: Effect): effect is StateEffect {
  return STATE_EFFECT_TYPES.has(effect.type as StateEffect['type'])
}

export function isSceneHint(effect: Effect): effect is SceneHint {
  return !isStateEffect(effect)
}

/**
 * Applies one StateEffect to state, purely: returns a new GameState and
 * never mutates the one passed in.
 *
 * `position.open` only bumps the summary count here — per-position trial
 * tracking (tier: "life", drawdowns, leverage default chains) is S9's
 * system to build. `event.trigger` is a no-op on state: the turn scheduler
 * (S6) reads it out of the returned effects[] and hands it to EventSystem
 * (S10) directly, so nothing needs to be queued in GameState itself yet.
 */
export function applyStateEffect(state: GameState, effect: StateEffect, _rng: RngStream): GameState {
  const next = cloneGameState(state)

  switch (effect.type) {
    case 'stat.add':
      next.counters[effect.key] = (next.counters[effect.key] ?? 0) + effect.value
      return next
    case 'capital.mul':
      next.capitalState.capital *= effect.value
      return next
    case 'flag.set':
      next.flags[effect.key] = true
      return next
    case 'trait.grant':
      if (!next.traits.unlocked.includes(effect.id)) {
        next.traits.unlocked.push(effect.id)
      }
      return next
    case 'position.open':
      next.positions.count += 1
      return next
    case 'event.trigger':
      return next
  }
}

export interface NamedEffectContext {
  state: GameState
  rng: RngStream
  params?: Record<string, unknown>
}

export type NamedEffectFn = (ctx: NamedEffectContext) => Effect[]

/**
 * §11 error 4: content refers to effects by name; the actual logic lives
 * here in TypeScript, registered once, never inlined into content data.
 */
export class EffectRegistry {
  private readonly effects = new Map<string, NamedEffectFn>()

  register(name: string, fn: NamedEffectFn): void {
    if (this.effects.has(name)) {
      throw new Error(`Effect "${name}" is already registered`)
    }
    this.effects.set(name, fn)
  }

  has(name: string): boolean {
    return this.effects.has(name)
  }

  /** Names of everything registered so far — useful for schema enum generation (S5). */
  names(): string[] {
    return [...this.effects.keys()]
  }

  /** Looks up and runs a named effect, producing the Effect[] it stands for. */
  expand(name: string, ctx: NamedEffectContext): Effect[] {
    const fn = this.effects.get(name)
    if (!fn) throw new Error(`Unknown named effect: "${name}"`)
    return fn(ctx)
  }
}

import type { GameSystem, SystemCtx } from '../GameSystem.js'
import type { FacadeField } from '../../facade/FacadeField.js'
import type { StateEffect } from '../../expr/effects.js'
import { addStat, isStatKey } from '../../state/stats.js'
import type { EventDef } from '../event/EventDef.js'
import type { TraitDef } from '../trait/TraitDef.js'

// §7.5: "計數器是一等公民". `counter.*` is an open namespace, so anything
// written there is already readable by a condition tree. What this system
// adds is *discoverability*: one enumerable list of the counters actually in
// play — the engine's own plus every one the loaded content invents — so the
// fill-in editor (TODO.md #1) can offer them and a mod author can build a
// trait on someone else's bookkeeping.

export const COUNTER_SYSTEM_ID = 'counter'
export const COUNTER_SYSTEM_ORDER = 95

export interface CounterDeclaration {
  key: string
  label: string
}

export interface CounterSystemOptions {
  /** Counters the engine's own systems keep, when they aren't self-declaring. */
  declarations?: readonly CounterDeclaration[]
  /** Scanned for `stat.add` keys that are counters rather than stats. */
  events?: readonly EventDef[]
  traits?: readonly TraitDef[]
}

function collectFrom(effects: readonly StateEffect[], into: Set<string>): void {
  for (const effect of effects) {
    if (effect.type === 'stat.add' && !isStatKey(effect.key)) into.add(effect.key)
  }
}

/** Every counter key the given content writes to. */
export function collectContentCounters(
  events: readonly EventDef[] = [],
  traits: readonly TraitDef[] = [],
): string[] {
  const keys = new Set<string>()
  for (const event of events) {
    collectFrom(event.good.effects, keys)
    collectFrom(event.bad.effects, keys)
  }
  for (const trait of traits) collectFrom(trait.grants, keys)
  return [...keys].sort()
}

export function createCounterSystem(options: CounterSystemOptions = {}): GameSystem {
  const byKey = new Map<string, string>()
  for (const key of collectContentCounters(options.events, options.traits)) {
    byKey.set(key, `Counter: ${key}`)
  }
  // Explicit declarations win, so an engine counter keeps its real label.
  for (const declaration of options.declarations ?? []) {
    byKey.set(declaration.key, declaration.label)
  }

  const fields: FacadeField[] = [...byKey].map(([key, label]) => ({
    path: `counter.${key}`,
    label,
    type: 'number',
  }))

  return {
    id: COUNTER_SYSTEM_ID,
    order: COUNTER_SYSTEM_ORDER,
    facadeFields: () => [...fields],
  }
}

/** Adds to a counter and emits the matching effect — the one-liner systems repeat. */
export function bumpCounter(ctx: SystemCtx, key: string, value = 1): void {
  addStat(ctx.state, key, value)
  ctx.emit({ type: 'stat.add', key, value })
}

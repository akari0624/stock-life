import type { GameSystem, Phase, SystemCtx } from '../GameSystem.js'
import type { Command } from '../../turn/Command.js'
import type { FacadeField } from '../../facade/FacadeField.js'
import { addStat } from '../../state/stats.js'
import { isSatisfied } from '../../expr/evaluate.js'
import { applyContentEffects, type ContentEffectDeps } from '../content/applyContentEffects.js'
import type { OpportunityIndex } from '../opportunity/Opportunity.js'
import type { PositionDeps } from '../position/PositionSystem.js'
import type { TraitDef } from './TraitDef.js'
import { drainMoments, MOMENT_TURN_END, pushMoment } from './moments.js'

// §7.5: "the system saw how you played". Traits are thresholds over
// behaviour counters, checked at the moments the *data* names — this file
// contains no list of when to check anything.

export const TRAIT_SYSTEM_ID = 'trait'
export const TRAIT_SYSTEM_ORDER = 100

export const COUNTER_TRAITS_UNLOCKED = 'traits_unlocked'

export interface TraitSystemOptions {
  traits: readonly TraitDef[]
  opportunities: OpportunityIndex
  position: PositionDeps
}

const TRAIT_FACADE_FIELDS: readonly FacadeField[] = [
  { path: `counter.${COUNTER_TRAITS_UNLOCKED}`, label: 'Traits unlocked', type: 'number' },
]

export function createTraitSystem(options: TraitSystemOptions): GameSystem {
  const effectDeps: ContentEffectDeps = {
    opportunities: options.opportunities,
    position: options.position,
    enqueueEvent: (ctx, eventId) => {
      ctx.state.events.queue.push(eventId)
    },
  }

  const unlock = (ctx: SystemCtx, trait: TraitDef): void => {
    const { state } = ctx
    state.traits.unlocked.push(trait.id)
    ctx.emit({ type: 'trait.grant', id: trait.id })

    // §7.5: opposing personalities cannot both hold. The newly earned one
    // wins; what it displaces goes on `removed[]` so the summary screen can
    // strike it through.
    for (const excludedId of trait.exclude) {
      if (!state.traits.unlocked.includes(excludedId)) continue
      state.traits.unlocked = state.traits.unlocked.filter((id) => id !== excludedId)
      if (!state.traits.removed.includes(excludedId)) state.traits.removed.push(excludedId)
    }

    applyContentEffects(ctx, trait.grants, effectDeps)

    if (trait.scene.fx) ctx.emit({ type: 'scene.fx', id: trait.scene.fx })
    if (trait.scene.sfx) ctx.emit({ type: 'scene.sfx', id: trait.scene.sfx, priority: 'high' })

    addStat(state, COUNTER_TRAITS_UNLOCKED, 1)
    ctx.emit({ type: 'stat.add', key: COUNTER_TRAITS_UNLOCKED, value: 1 })
  }

  const check = (ctx: SystemCtx): void => {
    const moments = drainMoments(ctx.state)
    if (moments.length === 0) return
    const fired = new Set(moments)

    for (const trait of options.traits) {
      if (!trait.checkOn.some((moment) => fired.has(moment))) continue
      if (ctx.state.traits.unlocked.includes(trait.id)) continue
      // Something already displaced it — losing a personality is permanent.
      if (ctx.state.traits.removed.includes(trait.id)) continue
      if (!isSatisfied(trait.require, { state: ctx.state, rng: ctx.rng })) continue
      unlock(ctx, trait)
    }
  }

  return {
    id: TRAIT_SYSTEM_ID,
    order: TRAIT_SYSTEM_ORDER,

    onPhase(phase: Phase, ctx: SystemCtx): void {
      if (phase === MOMENT_TURN_END) pushMoment(ctx.state, MOMENT_TURN_END)
      check(ctx)
    },

    onCommand(_command: Command, ctx: SystemCtx): void {
      // Runs last in the registry, so moments published by the systems that
      // handled this command are already on the bus.
      check(ctx)
    },

    facadeFields(): FacadeField[] {
      return [...TRAIT_FACADE_FIELDS]
    },
  }
}

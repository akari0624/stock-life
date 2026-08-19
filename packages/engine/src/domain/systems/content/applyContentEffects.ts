import type { SystemCtx } from '../GameSystem.js'
import type { StateEffect } from '../../expr/effects.js'
import { addStat } from '../../state/stats.js'
import type { OpportunityIndex } from '../opportunity/Opportunity.js'
import { openPosition, type PositionDeps } from '../position/PositionSystem.js'
import type { Sizing } from '../../expr/effects.js'

// One place where content-authored StateEffects become state changes. Both
// event outcomes (§7.2) and trait grants (§7.5) go through it, so a mod can
// never find an effect that works in one and silently does nothing in the
// other.

export interface ContentEffectDeps {
  opportunities: OpportunityIndex
  position: PositionDeps
}

/**
 * @param scale multiplies numeric effects — an event choice's `mag` (§7.2).
 */
export function applyContentEffects(
  ctx: SystemCtx,
  effects: readonly StateEffect[],
  deps: ContentEffectDeps,
  scale = 1,
): void {
  for (const effect of effects) {
    switch (effect.type) {
      case 'stat.add': {
        const applied = addStat(ctx.state, effect.key, effect.value * scale)
        if (applied !== 0) ctx.emit({ type: 'stat.add', key: effect.key, value: applied })
        break
      }
      case 'capital.mul': {
        const before = ctx.state.capitalState.capital
        ctx.state.capitalState.capital = before * effect.value
        ctx.emit({ type: 'capital.mul', value: effect.value })
        break
      }
      case 'flag.set': {
        ctx.state.flags[effect.key] = true
        ctx.emit({ type: 'flag.set', key: effect.key })
        break
      }
      case 'trait.grant': {
        if (!ctx.state.traits.unlocked.includes(effect.id)) {
          ctx.state.traits.unlocked.push(effect.id)
          ctx.emit({ type: 'trait.grant', id: effect.id })
        }
        break
      }
      case 'position.open': {
        // Routed to PositionSystem's own opener rather than reimplemented —
        // this is the second caller that S9 left room for.
        const opportunity = deps.opportunities.get(effect.opportunityId)
        if (opportunity) openPosition(ctx, deps.position, opportunity, effect.sizing as Sizing)
        break
      }
    }
  }
}

import type { Expr } from '../../expr/evaluate.js'
import type { SceneRef, StateEffect } from '../../expr/effects.js'

// §7.5: a trait is a function of how you played, not a random drop. The
// engine publishes moments; the data decides which ones it listens to.

/**
 * The checkpoints the engine publishes. Adding one here is an engine change;
 * *choosing* one is content's call — which is the whole point of `checkOn`
 * (yakyulife hardcoded the timing inside `checkTraitsMid()`).
 */
export const TRAIT_MOMENTS = ['turn.end', 'position.close', 'event.resolve'] as const

export type TraitMoment = (typeof TRAIT_MOMENTS)[number]

export interface TraitDef {
  id: string
  name: string
  /** Free-form: 'gold', 'bad', … — presentation decides what it looks like. */
  tone: string
  require: Expr
  /** Opposing personalities that cannot hold at once (§7.5). */
  exclude: string[]
  grants: StateEffect[]
  text: string
  scene: SceneRef
  checkOn: TraitMoment[]
}

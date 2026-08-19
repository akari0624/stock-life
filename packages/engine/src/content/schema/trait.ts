import { z } from 'zod'
import { exprSchema } from './expr.js'
import { stateEffectSchema, sceneRefSchema } from './effect.js'
import { eventLinkSchema } from './event.js'
import { TRAIT_MOMENTS, type TraitDef } from '../../domain/systems/trait/TraitDef.js'

// §7.5: traits are behavior counters + a threshold, not random drops.
// `checkOn` keeps the check timing data-driven (yakyulife hardcoded this).

// Generated from the engine's published checkpoints — never a second
// hand-written list (TODO.md #1).
const checkOnSchema = z.array(z.enum(TRAIT_MOMENTS)).min(1)

export const traitSchema: z.ZodType<TraitDef> = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  tone: z.string().min(1),
  require: exprSchema,
  exclude: z.array(z.string()).default([]),
  grants: z.array(stateEffectSchema),
  next: eventLinkSchema.optional(),
  text: z.string().min(1),
  scene: sceneRefSchema,
  checkOn: checkOnSchema,
})

export type {
  TraitDef,
  TraitDef as Trait,
  TraitMoment,
} from '../../domain/systems/trait/TraitDef.js'

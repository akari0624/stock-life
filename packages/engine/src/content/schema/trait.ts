import { z } from 'zod'
import { exprSchema } from './expr.js'
import { stateEffectSchema, sceneRefSchema } from './effect.js'

// §7.5: traits are behavior counters + a threshold, not random drops.
// `checkOn` keeps the check timing data-driven (yakyulife hardcoded this).

const checkOnSchema = z.array(z.enum(['turn.end', 'position.close', 'event.resolve'])).min(1)

export const traitSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  tone: z.string().min(1),
  require: exprSchema,
  exclude: z.array(z.string()).default([]),
  grants: z.array(stateEffectSchema),
  text: z.string().min(1),
  scene: sceneRefSchema,
  checkOn: checkOnSchema,
})

export type Trait = z.infer<typeof traitSchema>

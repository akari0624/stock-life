import { z } from 'zod'
import { exprSchema } from './expr.js'
import { stateEffectSchema, sceneRefSchema } from './effect.js'
import type { EventDef } from '../../domain/systems/event/EventDef.js'

// §7.2: the yakyulife three-tier risk shape — choices are always exactly
// safe/normal/bold, each appearing once, so success rate and what's shown
// to the player stay the same source of truth by construction.

const choiceSchema = z.object({
  id: z.enum(['safe', 'normal', 'bold']),
  label: z.string().min(1),
  odds: z.string().regex(/^[+-]?\d+$/, 'odds must be a signed integer string, e.g. "+20", "0", "-15"'),
  mag: z.number(),
})

const outcomeSchema = z.object({
  text: z.string().min(1),
  effects: z.array(stateEffectSchema),
})

export const eventSchema: z.ZodType<EventDef> = z.object({
  id: z.string().min(1),
  require: exprSchema,
  // 0 means "never drawn at random" — the event is only reachable through an
  // explicit `event.trigger` (position trials work this way, §7.1).
  weight: z.number().nonnegative(),
  choices: z
    .array(choiceSchema)
    .length(3)
    .refine((choices) => new Set(choices.map((c) => c.id)).size === 3, {
      message: 'choices must contain exactly one each of safe, normal, bold',
    }),
  good: outcomeSchema,
  bad: outcomeSchema,
  scene: sceneRefSchema,
})

export type {
  EventDef,
  EventDef as Event,
  EventChoice,
  EventChoiceId,
  EventOutcome,
} from '../../domain/systems/event/EventDef.js'

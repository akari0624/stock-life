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
  // 文案 per-choice：擲骰成功/失敗各一句，隨玩家實際選的動作走（§7.2）。
  good: z.string().min(1),
  bad: z.string().min(1),
})

// 效果共用：一個事件的 good/bad 各一組 effects，三個選項共享（由各自的 mag 縮放）。
const outcomeSchema = z.object({
  effects: z.array(stateEffectSchema),
})

export const eventSchema: z.ZodType<EventDef> = z.object({
  id: z.string().min(1),
  require: exprSchema,
  // 0 means "never drawn at random" — the event is only reachable through an
  // explicit `event.trigger` (position trials work this way, §7.1).
  weight: z.number().nonnegative(),
  // §7.2: the situation the player reads **before** choosing. Required —
  // without it a decision is three verbs and three percentages, and the
  // outcome text cannot stand in for it (it is only readable afterwards).
  prompt: z.string().min(1, '每個事件都要有 prompt：玩家做決定時看得到的情境（§7.2）'),
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

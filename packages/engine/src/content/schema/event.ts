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

// §7.2 的故事圖的一條邊。`next` 掛在 outcome 上而不是 event 上，成功與失敗
// 才能通往不同的地方——三個選項共用一組 outcome，這是事件僅有的分岔。
export const eventLinkSchema = z.strictObject({
  id: z.string().min(1),
  // 省略或 0 = 同一年立刻接上，且不驗目標的 require；>= 1 = 排進未來那一年，
  // 到期時要驗 require，不成立就走 orElse（§7.2）。
  afterYears: z.number().int().nonnegative().optional(),
  orElse: z.string().min(1).optional(),
})

// 效果共用：一個事件的 good/bad 各一組 effects，三個選項共享（由各自的 mag 縮放）。
const outcomeSchema = z.object({
  effects: z.array(stateEffectSchema),
  next: eventLinkSchema.optional(),
})

export const eventSchema: z.ZodType<EventDef> = z.object({
  id: z.string().min(1),
  require: exprSchema,
  // 0 means "never drawn at random" — the event is only reachable as some
  // outcome's `next`, or from a system (position trials work this way, §7.1).
  weight: z.number().nonnegative(),
  // 一輩子只演一次，不分成功失敗。「重試到成功為止」不是這個欄位，那是
  // require + 只在 good 設的 flag（`meet_someone` 就該每年再來一次）。
  once: z.boolean().default(false),
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
  EventLink,
  EventOutcome,
} from '../../domain/systems/event/EventDef.js'

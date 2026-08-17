import { z } from 'zod'
import { exprSchema } from './expr.js'
import { sizingSchema, sceneRefSchema } from './effect.js'

// §7.1: `truth` is deliberately schema-validated even though the player
// never sees it — it's still content data, seeded/derived per-era at S9,
// but must round-trip through the same loader as everything else.

const truthSchema = z.object({
  multiple: z.tuple([z.number().positive(), z.number().positive()]),
  years: z.tuple([z.number().positive(), z.number().positive()]),
  ruinChance: z.number().min(0).max(100),
})

const signalRevealSchema = z.enum(['theme', 'valuation', 'risk'])

const signalLevelSchema = z.object({
  text: z.string().min(1),
  reveal: z.array(signalRevealSchema).default([]),
})

export const signalSchema = z
  .object({
    low: signalLevelSchema.optional(),
    mid: signalLevelSchema.optional(),
    high: signalLevelSchema.optional(),
  })
  .refine((s) => s.low !== undefined || s.mid !== undefined || s.high !== undefined, {
    message: 'signal must fill in at least one of low/mid/high',
  })

export const opportunitySchema = z.object({
  id: z.string().min(1),
  tier: z.enum(['life', 'normal']),
  window: z.object({
    eraPhase: z.array(z.string()).default([]),
    themes: z.array(z.string()).default([]),
  }),
  require: exprSchema,
  sourcedBy: z.array(z.string()).min(1),
  truth: truthSchema,
  signal: signalSchema,
  sizing: z.array(sizingSchema).min(1),
  trials: z.array(z.string()).default([]),
  scene: sceneRefSchema,
})

export type Opportunity = z.infer<typeof opportunitySchema>

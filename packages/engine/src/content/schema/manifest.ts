import { z } from 'zod'

// §6.4: pack.json manifest.

const assetMapSchema = z.record(z.string(), z.unknown()).default({})

export const manifestSchema = z.object({
  id: z.string().min(1),
  version: z.string().min(1),
  engineApi: z.string().min(1),
  facadeVersion: z.number().int().positive(),
  provides: z.object({
    events: z.number().int().nonnegative(),
    opportunities: z.number().int().nonnegative(),
    careers: z.number().int().nonnegative(),
    traits: z.number().int().nonnegative(),
    worldGenerators: z.array(z.string()),
  }),
  requires: z.array(z.object({ id: z.string().min(1), version: z.string().min(1) })),
  assets: z
    .object({
      actors: assetMapSchema,
      bg: assetMapSchema,
      sfx: assetMapSchema,
    })
    .default({ actors: {}, bg: {}, sfx: {} }),
})

export type Manifest = z.infer<typeof manifestSchema>

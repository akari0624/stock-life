import { z } from 'zod'

// §6.4: pack.json manifest.

const assetMapSchema = z.record(z.string(), z.unknown()).default({})

/**
 * TODO.md #2: a pack needs a **stable id + semver**, because those two strings
 * are what the seed's fingerprint is computed from (§5.1). "v2" and "2.0" being
 * the same release would quietly break "same seed = same life".
 */
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/

export const manifestSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9][a-z0-9._-]*$/, 'pack id 只能用小寫英數與 . _ -（它會進指紋，必須穩定）'),
  version: z.string().regex(SEMVER, 'version 必須是 semver，例如 1.0.0'),
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

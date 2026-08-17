import { z } from 'zod'
import { exprSchema } from './expr.js'
import type { CareerGraph } from '../../domain/systems/career/CareerGraph.js'

// §7.3: career is a directed graph, not a linear array (TODO.md #3).
// The shape itself is declared in domain/ (where the system that consumes it
// lives); this file only proves incoming JSON conforms to it — which is why
// the schema is annotated with the domain type rather than inferring its own.

const careerNodeSchema = z.object({
  id: z.string().min(1),
  industry: z.string().min(1),
  rank: z.number().int().nonnegative(),
  income: z.tuple([z.number().nonnegative(), z.number().nonnegative()]),
})

const careerEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  require: exprSchema,
  // S8 ships only "opportunity" — the union is here so content can be
  // authored ahead of engine support without a schema migration later.
  surfacedAs: z.enum(['opportunity']),
})

/**
 * Deliberately *no* per-pack minimum and no per-pack "edges must point at
 * known nodes" rule: a mod that only adds events should not have to invent a
 * career node, and a mod whose whole point is a new branch off core-tw's graph
 * must be able to name a node it did not author (S18).
 *
 * Both invariants are real — they just belong to the **merged** content set,
 * where the graph is actually complete. `validateMergedContent()` checks them
 * there, once, for every pack combination the player has loaded.
 */
export const careerGraphSchema: z.ZodType<CareerGraph> = z.object({
  nodes: z.array(careerNodeSchema),
  edges: z.array(careerEdgeSchema),
})

export type { CareerGraph, CareerNode, CareerEdge } from '../../domain/systems/career/CareerGraph.js'

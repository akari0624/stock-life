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

export const careerGraphSchema: z.ZodType<CareerGraph> = z
  .object({
    nodes: z.array(careerNodeSchema).min(1),
    edges: z.array(careerEdgeSchema),
  })
  .refine(
    (graph) => {
      const ids = new Set(graph.nodes.map((n) => n.id))
      return graph.edges.every((e) => ids.has(e.from) && ids.has(e.to))
    },
    { message: 'every edge must reference node ids that exist in nodes[]' },
  )

export type { CareerGraph, CareerNode, CareerEdge } from '../../domain/systems/career/CareerGraph.js'

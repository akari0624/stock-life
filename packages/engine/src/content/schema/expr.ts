import { z } from 'zod'
import type { Expr } from '../../domain/expr/evaluate.js'
import { facadePathSchema } from './facadePath.js'

// §6.2: operator set is fixed. Left-hand sides are always run through
// facadePathSchema, so an unknown path is rejected at load time, not when
// the tree happens to get evaluated mid-game.

const comparableValueSchema = z.union([z.string(), z.number(), z.boolean()])

export const exprSchema: z.ZodType<Expr> = z.lazy(() =>
  z.union([
    z.strictObject({ all: z.array(exprSchema) }),
    z.strictObject({ any: z.array(exprSchema) }),
    z.strictObject({ not: exprSchema }),
    z.strictObject({ '==': z.tuple([facadePathSchema, comparableValueSchema]) }),
    z.strictObject({ '!=': z.tuple([facadePathSchema, comparableValueSchema]) }),
    z.strictObject({ '>': z.tuple([facadePathSchema, z.number()]) }),
    z.strictObject({ '>=': z.tuple([facadePathSchema, z.number()]) }),
    z.strictObject({ '<': z.tuple([facadePathSchema, z.number()]) }),
    z.strictObject({ '<=': z.tuple([facadePathSchema, z.number()]) }),
    z.strictObject({ in: z.tuple([facadePathSchema, z.array(comparableValueSchema)]) }),
    z.strictObject({ flag: z.string().min(1) }),
    z.strictObject({ chance: z.number().min(0).max(1) }),
  ]),
) as z.ZodType<Expr>

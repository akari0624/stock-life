import { z } from 'zod'
import { manifestSchema } from './manifest.js'
import { opportunitySchema } from './opportunity.js'
import { eventSchema } from './event.js'
import { careerGraphSchema } from './career.js'
import { traitSchema } from './trait.js'

/**
 * Exports the content schemas as JSON Schema — the same artifact a future
 * fill-in-the-blank editor (TODO.md #1) and mod-author docs both consume.
 */
export function exportContentJSONSchemas(): Record<string, unknown> {
  return {
    manifest: z.toJSONSchema(manifestSchema),
    opportunity: z.toJSONSchema(opportunitySchema),
    event: z.toJSONSchema(eventSchema),
    careerGraph: z.toJSONSchema(careerGraphSchema),
    trait: z.toJSONSchema(traitSchema),
  }
}

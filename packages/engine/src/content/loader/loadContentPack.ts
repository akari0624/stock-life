import { z } from 'zod'
import { manifestSchema, type Manifest } from '../schema/manifest.js'
import { opportunitySchema, type Opportunity } from '../schema/opportunity.js'
import { eventSchema, type Event } from '../schema/event.js'
import { careerGraphSchema, type CareerGraph } from '../schema/career.js'
import { traitSchema, type Trait } from '../schema/trait.js'
import { checkCompatibility } from './compatibility.js'
import type { ContentSource } from './ContentSource.js'

export type ContentValidationSection =
  | 'manifest'
  | 'opportunities'
  | 'events'
  | 'careerGraph'
  | 'traits'
  | 'compatibility'

export interface ContentValidationIssue {
  section: ContentValidationSection
  /** Structural path (§6.2). Line/column mapping needs a CST parser — future work. */
  path: (string | number)[]
  message: string
  line?: number
  column?: number
}

export interface LoadedContentPack {
  manifest: Manifest
  opportunities: Opportunity[]
  events: Event[]
  careerGraph: CareerGraph
  traits: Trait[]
}

export type LoadResult = { ok: true; pack: LoadedContentPack } | { ok: false; errors: ContentValidationIssue[] }

function collectIssues(section: ContentValidationSection, error: z.ZodError | undefined): ContentValidationIssue[] {
  if (!error) return []
  return error.issues.map((issue) => ({
    section,
    path: issue.path as (string | number)[],
    message: issue.message,
  }))
}

/**
 * Validates and loads one content pack from a source. Official content
 * (core-tw) and third-party mods go through this exact same function —
 * there is no privileged path (§6.4 dogfooding).
 */
export async function loadContentPack(source: ContentSource): Promise<LoadResult> {
  const raw = await source.load()

  const manifestResult = manifestSchema.safeParse(raw.manifest)
  const opportunitiesResult = z.array(opportunitySchema).safeParse(raw.opportunities)
  const eventsResult = z.array(eventSchema).safeParse(raw.events)
  const careerGraphResult = careerGraphSchema.safeParse(raw.careerGraph)
  const traitsResult = z.array(traitSchema).safeParse(raw.traits)

  const errors: ContentValidationIssue[] = [
    ...collectIssues('manifest', manifestResult.success ? undefined : manifestResult.error),
    ...collectIssues('opportunities', opportunitiesResult.success ? undefined : opportunitiesResult.error),
    ...collectIssues('events', eventsResult.success ? undefined : eventsResult.error),
    ...collectIssues('careerGraph', careerGraphResult.success ? undefined : careerGraphResult.error),
    ...collectIssues('traits', traitsResult.success ? undefined : traitsResult.error),
  ]

  if (manifestResult.success) {
    for (const issue of checkCompatibility(manifestResult.data)) {
      errors.push({ section: 'compatibility', path: [], message: issue.message })
    }
  }

  if (errors.length > 0 || !manifestResult.success || !opportunitiesResult.success || !eventsResult.success || !careerGraphResult.success || !traitsResult.success) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    pack: {
      manifest: manifestResult.data,
      opportunities: opportunitiesResult.data,
      events: eventsResult.data,
      careerGraph: careerGraphResult.data,
      traits: traitsResult.data,
    },
  }
}

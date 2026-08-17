import { Calendar, type Granularity } from '../domain/Calendar.js'
import { SeededRng } from '../domain/rng/SeededRng.js'
import { SystemRegistry } from '../domain/systems/SystemRegistry.js'
import { createInitialGameState, DEFAULT_STARTING_CAPITAL } from '../domain/state/createGameState.js'
import { indexOpportunities } from '../domain/systems/opportunity/Opportunity.js'
import { createEraSystem, eraStateFor } from '../domain/systems/world/EraSystem.js'
import { WORLD_RNG_STREAM, type WorldGeneratorRegistry } from '../domain/systems/world/WorldGenerator.js'
import { createDefaultWorldGeneratorRegistry } from '../domain/systems/world/RandomWorldGenerator.js'
import type { Timeline } from '../domain/systems/world/Timeline.js'
import { createDiceSystem } from '../domain/systems/economy/DiceSystem.js'
import { createCapitalSystem } from '../domain/systems/economy/CapitalSystem.js'
import { createCognitionSystem } from '../domain/systems/economy/CognitionSystem.js'
import { createNetworkSystem } from '../domain/systems/economy/NetworkSystem.js'
import { createCareerSystem } from '../domain/systems/career/CareerSystem.js'
import { createOpportunitySystem } from '../domain/systems/opportunity/OpportunitySystem.js'
import { createPositionSystem, positionOpener, type PositionDeps } from '../domain/systems/position/PositionSystem.js'
import { createEventSystem } from '../domain/systems/event/EventSystem.js'
import { createCounterSystem } from '../domain/systems/counter/CounterSystem.js'
import { createTraitSystem } from '../domain/systems/trait/TraitSystem.js'
import { loadContentPack, type ContentValidationIssue, type LoadedContentPack } from '../content/loader/loadContentPack.js'
import { mergeContentPacks, type MergedContent } from '../content/loader/merge.js'
import type { ContentSource } from '../content/loader/ContentSource.js'
import { Sim } from './Sim.js'

// The one place the whole engine is wired together. Both the headless runner
// (S11) and the app (S16) go through it, so "what a game is made of" has a
// single definition and the two can never drift.

export interface LifeOptions {
  seed: string | number
  sources: readonly ContentSource[]
  name?: string
  startAge?: number
  endAge?: number
  startYear?: number
  granularity?: Granularity
  worldGeneratorId?: string
  worldGenerators?: WorldGeneratorRegistry
  /** Career node a fresh character starts on; defaults to the graph's first node. */
  startNodeId?: string
}

export interface Life {
  sim: Sim
  calendar: Calendar
  timeline: Timeline
  content: MergedContent
  /** Half of the share code (§5.1) — the other half is the seed. */
  fingerprint: number
  /** Turns in a full life, from startAge to endAge inclusive. */
  totalTurns: number
}

export type CreateLifeResult = { ok: true; life: Life } | { ok: false; errors: ContentValidationIssue[] }

export const DEFAULT_START_AGE = 18
export const DEFAULT_END_AGE = 65
export const DEFAULT_START_YEAR = 1990

/**
 * Loads content, generates the world and registers every system, in order.
 * Async because content loading is (TODO.md #2) — a remote pack must be a
 * drop-in later, not a rewrite of this function.
 */
export async function createLife(options: LifeOptions): Promise<CreateLifeResult> {
  const packs: LoadedContentPack[] = []
  const errors: ContentValidationIssue[] = []
  for (const source of options.sources) {
    const result = await loadContentPack(source)
    if (result.ok) packs.push(result.pack)
    else errors.push(...result.errors)
  }
  if (errors.length > 0) return { ok: false, errors }

  const { content, fingerprint } = mergeContentPacks(packs)

  const startAge = options.startAge ?? DEFAULT_START_AGE
  const endAge = options.endAge ?? DEFAULT_END_AGE
  const startYear = options.startYear ?? DEFAULT_START_YEAR
  const granularity = options.granularity ?? 'year'
  const calendar = new Calendar({ granularity, startYear, startAge })
  const totalTurns = (endAge - startAge) * calendar.turnsPerYear

  const rng = new SeededRng(options.seed)
  const generators = options.worldGenerators ?? createDefaultWorldGeneratorRegistry()
  const generator = generators.get(options.worldGeneratorId ?? 'random')
  const timeline = generator.generate(rng.stream(WORLD_RNG_STREAM), {
    startYear,
    endYear: startYear + (endAge - startAge),
  })

  const opportunities = indexOpportunities(content.opportunities)
  const positionDeps: PositionDeps = { turnsPerYear: calendar.turnsPerYear }
  const startNodeId = options.startNodeId ?? content.careerGraph.nodes[0]?.id
  if (!startNodeId) return { ok: false, errors: [{ section: 'careerGraph', path: ['nodes'], message: 'no career nodes to start from' }] }

  const registry = new SystemRegistry()
  registry.register(createEraSystem({ timeline }))
  registry.register(createDiceSystem())
  registry.register(createCapitalSystem())
  registry.register(createCognitionSystem())
  registry.register(createNetworkSystem())
  registry.register(createCareerSystem({ graph: content.careerGraph, startNodeId }))
  registry.register(
    createOpportunitySystem({
      opportunities: content.opportunities,
      onAccept: positionOpener(positionDeps),
    }),
  )
  registry.register(createPositionSystem())
  registry.register(createEventSystem({ events: content.events, opportunities, position: positionDeps }))
  registry.register(createCounterSystem({ events: content.events, traits: content.traits }))
  registry.register(createTraitSystem({ traits: content.traits, opportunities, position: positionDeps }))

  const initialState = createInitialGameState({
    name: options.name ?? 'Player',
    calendar,
    era: eraStateFor(timeline, startYear),
    capital: { ...DEFAULT_STARTING_CAPITAL },
  })

  const sim = new Sim({ seed: options.seed, initialState, registry, calendar })

  return { ok: true, life: { sim, calendar, timeline, content, fingerprint, totalTurns } }
}

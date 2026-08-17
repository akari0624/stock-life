import { MemorySource } from '../../loader/MemorySource.js'
import type { RawContentPack } from '../../loader/ContentSource.js'
import { coreTwManifest } from './manifest.js'
import { coreTwOpportunities } from './opportunities.js'
import { coreTwEvents } from './events.js'
import { coreTwCareerGraph } from './careerGraph.js'
import { coreTwTraits } from './traits.js'

const coreTwRawPack: RawContentPack = {
  manifest: coreTwManifest,
  opportunities: coreTwOpportunities,
  events: coreTwEvents,
  careerGraph: coreTwCareerGraph,
  traits: coreTwTraits,
}

/** core-tw goes through `loadContentPack()` exactly like a third-party mod would (§6.4). */
export function createCoreTwSource(): MemorySource {
  return new MemorySource('core-tw', coreTwRawPack)
}

import { computeFingerprint } from './fingerprint.js'
import type { LoadedContentPack } from './loadContentPack.js'
import type { Opportunity } from '../schema/opportunity.js'
import type { Event } from '../schema/event.js'
import type { CareerGraph } from '../schema/career.js'
import type { Trait } from '../schema/trait.js'
import type { Manifest } from '../schema/manifest.js'

export interface MergedContent {
  opportunities: Opportunity[]
  events: Event[]
  careerGraph: CareerGraph
  traits: Trait[]
  /**
   * The manifests behind this content set, in load order. Presentation needs
   * them for the `assets` block (§6.4): SceneHints carry ids only, and the
   * AssetResolver (S14) / AudioResolver (S15) turn those ids into files —
   * or into a fallback when the manifest has no entry.
   */
  manifests: Manifest[]
}

export interface MergeResult {
  content: MergedContent
  /** Feeds directly into the seed's share code (§5.1). */
  fingerprint: number
}

/** Combines already-validated packs into one content set + its fingerprint. */
export function mergeContentPacks(packs: readonly LoadedContentPack[]): MergeResult {
  const content: MergedContent = {
    opportunities: packs.flatMap((p) => p.opportunities),
    events: packs.flatMap((p) => p.events),
    careerGraph: {
      nodes: packs.flatMap((p) => p.careerGraph.nodes),
      edges: packs.flatMap((p) => p.careerGraph.edges),
    },
    traits: packs.flatMap((p) => p.traits),
    manifests: packs.map((p) => p.manifest),
  }

  const fingerprint = computeFingerprint(packs.map((p) => ({ id: p.manifest.id, version: p.manifest.version })))

  return { content, fingerprint }
}

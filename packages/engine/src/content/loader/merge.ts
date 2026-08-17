import { computeFingerprint } from './fingerprint.js'
import type { ContentValidationIssue, LoadedContentPack } from './loadContentPack.js'
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

/**
 * Rules that only make sense once every pack is on the table (S18).
 *
 * A single pack is allowed to be a fragment — only events, or an edge into a
 * node another pack authored. What the *game* needs is a complete graph, so
 * that is checked here, against the combination the player actually loaded.
 */
export function validateMergedContent(content: MergedContent): ContentValidationIssue[] {
  const issues: ContentValidationIssue[] = []

  if (content.careerGraph.nodes.length === 0) {
    issues.push({ section: 'careerGraph', path: ['nodes'], message: '這組內容包沒有任何職涯節點，開不了局' })
  }

  const ids = new Set(content.careerGraph.nodes.map((node) => node.id))
  content.careerGraph.edges.forEach((edge, index) => {
    for (const end of ['from', 'to'] as const) {
      if (!ids.has(edge[end])) {
        issues.push({
          section: 'careerGraph',
          path: ['edges', index, end],
          message: `職涯轉換指向不存在的節點「${edge[end]}」（是不是少載入了它所屬的內容包？）`,
        })
      }
    }
  })

  return issues
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

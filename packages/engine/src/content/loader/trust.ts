import type { LoadedContentPack } from './loadContentPack.js'

/**
 * TODO.md #2 keeps two questions apart on purpose:
 *
 * - **格式合法** — does this parse against the schema? (`loadContentPack`)
 * - **內容可信** — is it *reasonable*? Not enormous, not a recursive trigger
 *   chain, not hostile. That question needs a marketplace's worth of context
 *   to answer properly, so the first version only draws the cheap, obvious
 *   lines — and does it **here**, in one named place, so that the day there is
 *   a registry the checks have somewhere to go.
 *
 * The two are separate return values, never one merged "invalid": a pack that
 * fails a trust check is well-formed content that we chose not to run.
 */

export interface ContentTrustPolicy {
  maxOpportunities: number
  maxEvents: number
  maxTraits: number
  maxCareerNodes: number
  maxBytes: number
}

export const DEFAULT_TRUST_POLICY: ContentTrustPolicy = {
  maxOpportunities: 2_000,
  maxEvents: 5_000,
  maxTraits: 1_000,
  maxCareerNodes: 2_000,
  maxBytes: 2_000_000,
}

export interface TrustIssue {
  rule: string
  message: string
}

export interface TrustInput {
  pack: LoadedContentPack
  /** What the source reported, when it knows (PasteSource/FileSource do). */
  bytes?: number
  policy?: ContentTrustPolicy
}

export function checkTrust({ pack, bytes, policy = DEFAULT_TRUST_POLICY }: TrustInput): TrustIssue[] {
  const issues: TrustIssue[] = []
  const limit = (rule: string, actual: number, max: number, what: string): void => {
    if (actual > max) issues.push({ rule, message: `${what} 太多（${actual} > ${max}）` })
  }

  limit('maxOpportunities', pack.opportunities.length, policy.maxOpportunities, '機會')
  limit('maxEvents', pack.events.length, policy.maxEvents, '事件')
  limit('maxTraits', pack.traits.length, policy.maxTraits, '特性')
  limit('maxCareerNodes', pack.careerGraph.nodes.length, policy.maxCareerNodes, '職涯節點')
  if (bytes !== undefined) limit('maxBytes', bytes, policy.maxBytes, '檔案大小（位元組）')

  return issues
}

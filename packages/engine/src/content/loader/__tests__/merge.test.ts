import { describe, it, expect } from 'vitest'
import { loadContentPack } from '../loadContentPack.js'
import { mergeContentPacks } from '../merge.js'
import { MemorySource } from '../MemorySource.js'
import { createCoreTwSource } from '../../packs/core-tw/index.js'
import { computeFingerprint } from '../fingerprint.js'
import { ENGINE_API_VERSION } from '../compatibility.js'
import { FACADE_VERSION } from '../../../domain/facade/ModStateView.js'

function extraPackRaw(id: string, version: string) {
  return {
    manifest: {
      id,
      version,
      engineApi: `^${ENGINE_API_VERSION}`,
      facadeVersion: FACADE_VERSION,
      provides: { events: 0, opportunities: 0, careers: 0, traits: 0, worldGenerators: [] },
      requires: [],
      assets: { actors: {}, bg: {}, sfx: {} },
    },
    opportunities: [],
    events: [],
    careerGraph: { nodes: [{ id: `${id}-node`, industry: 'tech', rank: 1, income: [1, 2] }], edges: [] },
    traits: [],
  }
}

describe('mergeContentPacks', () => {
  it('combines content arrays and career graphs across packs', async () => {
    const coreResult = await loadContentPack(createCoreTwSource())
    const extraResult = await loadContentPack(new MemorySource('extra', extraPackRaw('extra-pack', '1.0.0')))
    if (!coreResult.ok || !extraResult.ok) throw new Error('fixture packs failed to load')

    const { content } = mergeContentPacks([coreResult.pack, extraResult.pack])
    expect(content.events).toHaveLength(coreResult.pack.events.length + extraResult.pack.events.length)
    expect(content.opportunities).toHaveLength(
      coreResult.pack.opportunities.length + extraResult.pack.opportunities.length,
    )
    expect(content.traits).toHaveLength(coreResult.pack.traits.length + extraResult.pack.traits.length)
    expect(content.careerGraph.nodes.map((n) => n.id)).toEqual(
      expect.arrayContaining(['engineer_junior', 'engineer_senior', 'extra-pack-node']),
    )
  })

  it('computes a fingerprint equal to computeFingerprint() over the loaded manifests, order-independent', async () => {
    const coreResult = await loadContentPack(createCoreTwSource())
    const extraResult = await loadContentPack(new MemorySource('extra', extraPackRaw('extra-pack', '1.0.0')))
    if (!coreResult.ok || !extraResult.ok) throw new Error('fixture packs failed to load')

    const forward = mergeContentPacks([coreResult.pack, extraResult.pack])
    const backward = mergeContentPacks([extraResult.pack, coreResult.pack])
    const expected = computeFingerprint([
      { id: 'core-tw', version: coreResult.pack.manifest.version },
      { id: 'extra-pack', version: '1.0.0' },
    ])

    expect(forward.fingerprint).toBe(expected)
    expect(backward.fingerprint).toBe(expected)
  })

  it('fingerprint changes when a pack version changes (share codes must break on content drift, §5.1)', async () => {
    const coreResult = await loadContentPack(createCoreTwSource())
    const v1 = await loadContentPack(new MemorySource('extra', extraPackRaw('extra-pack', '1.0.0')))
    const v2 = await loadContentPack(new MemorySource('extra', extraPackRaw('extra-pack', '2.0.0')))
    if (!coreResult.ok || !v1.ok || !v2.ok) throw new Error('fixture packs failed to load')

    const a = mergeContentPacks([coreResult.pack, v1.pack])
    const b = mergeContentPacks([coreResult.pack, v2.pack])
    expect(a.fingerprint).not.toBe(b.fingerprint)
  })
})

import { describe, it, expect } from 'vitest'
import { loadContentPack } from '../loadContentPack.js'
import { MemorySource } from '../MemorySource.js'
import { createCoreTwSource } from '../../packs/core-tw/index.js'
import type { RawContentPack } from '../ContentSource.js'
import { ENGINE_API_VERSION } from '../compatibility.js'
import { FACADE_VERSION } from '../../../domain/facade/ModStateView.js'

function validManifest() {
  return {
    id: 'test-pack',
    version: '1.0.0',
    engineApi: `^${ENGINE_API_VERSION}`,
    facadeVersion: FACADE_VERSION,
    provides: { events: 0, opportunities: 0, careers: 0, traits: 0, worldGenerators: [] },
    requires: [],
    assets: { actors: {}, bg: {}, sfx: {} },
  }
}

function emptyRawPack(overrides: Partial<RawContentPack> = {}): RawContentPack {
  return {
    manifest: validManifest(),
    opportunities: [],
    events: [],
    careerGraph: { nodes: [{ id: 'n1', industry: 'tech', rank: 1, income: [1, 2] }], edges: [] },
    traits: [],
    ...overrides,
  }
}

describe('loadContentPack', () => {
  it('successfully loads and validates core-tw (dogfooding: same loader as any mod)', async () => {
    const result = await loadContentPack(createCoreTwSource())
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.pack.manifest.id).toBe('core-tw')
      // Asserted against the manifest rather than a literal, so growing the
      // pack can't silently drift from what it advertises (§6.4).
      const { provides } = result.pack.manifest
      expect(result.pack.events).toHaveLength(provides.events)
      expect(result.pack.opportunities).toHaveLength(provides.opportunities)
      expect(result.pack.careerGraph.nodes).toHaveLength(provides.careers)
      expect(result.pack.traits).toHaveLength(provides.traits)
    }
  })

  it('loads a minimal valid pack', async () => {
    const result = await loadContentPack(new MemorySource('test', emptyRawPack()))
    expect(result.ok).toBe(true)
  })

  it('rejects a pack referencing an unknown facade path, with a structural path and readable message', async () => {
    const raw = emptyRawPack({
      events: [
        {
          id: 'bad_event',
          require: { '>=': ['state.love.caught', 0] },
          weight: 1,
          choices: [
            { id: 'safe', label: 's', odds: '0', mag: 1, good: 'g', bad: 'b' },
            { id: 'normal', label: 'n', odds: '0', mag: 1, good: 'g', bad: 'b' },
            { id: 'bold', label: 'b', odds: '0', mag: 1, good: 'g', bad: 'b' },
          ],
          good: { effects: [] },
          bad: { effects: [] },
          scene: {},
        },
      ],
    })
    const result = await loadContentPack(new MemorySource('bad', raw))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      const issue = result.errors.find((e) => e.section === 'events')
      expect(issue).toBeDefined()
      expect(issue!.path.length).toBeGreaterThan(0)
      expect(typeof issue!.message).toBe('string')
      expect(issue!.message.length).toBeGreaterThan(0)
    }
  })

  it('rejects a pack referencing an unknown effect name, with a structural path', async () => {
    const raw = emptyRawPack({
      traits: [
        {
          id: 'bad_trait',
          name: 'Bad',
          tone: 'gold',
          require: { flag: 'x' },
          grants: [{ type: 'hack.exploit', value: 1 }],
          text: 't',
          scene: {},
          checkOn: ['turn.end'],
        },
      ],
    })
    const result = await loadContentPack(new MemorySource('bad', raw))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      const issue = result.errors.find((e) => e.section === 'traits')
      expect(issue).toBeDefined()
      expect(issue!.path.length).toBeGreaterThan(0)
    }
  })

  it('rejects a pack missing a required field, with a structural path pointing at it', async () => {
    const raw = emptyRawPack({
      opportunities: [
        {
          id: 'incomplete_opportunity',
          tier: 'normal',
          window: {},
          require: { chance: 1 },
          sourcedBy: ['forum'],
          // truth is missing entirely
          signal: { mid: { text: 'x', reveal: [] } },
          sizing: ['light'],
          scene: {},
        },
      ],
    })
    const result = await loadContentPack(new MemorySource('bad', raw))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      const issue = result.errors.find((e) => e.section === 'opportunities')
      expect(issue).toBeDefined()
      expect(issue!.path).toContain('truth')
    }
  })

  it('reports multiple independent issues in one pass, not just the first', async () => {
    const raw = emptyRawPack({
      manifest: { ...validManifest(), id: '' }, // invalid
      traits: [
        { id: 't1', name: '', tone: 'gold', require: { flag: 'x' }, grants: [], text: 'x', scene: {}, checkOn: [] }, // empty name + empty checkOn
      ],
    })
    const result = await loadContentPack(new MemorySource('bad', raw))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      const sections = new Set(result.errors.map((e) => e.section))
      expect(sections.has('manifest')).toBe(true)
      expect(sections.has('traits')).toBe(true)
    }
  })

  it('rejects on engineApi incompatibility with a clear compatibility issue', async () => {
    const raw = emptyRawPack({ manifest: { ...validManifest(), engineApi: '^999' } })
    const result = await loadContentPack(new MemorySource('bad', raw))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      const issue = result.errors.find((e) => e.section === 'compatibility')
      expect(issue).toBeDefined()
      expect(issue!.message).toMatch(/engineApi/)
    }
  })

  it('rejects on facadeVersion incompatibility with a clear compatibility issue', async () => {
    const raw = emptyRawPack({ manifest: { ...validManifest(), facadeVersion: FACADE_VERSION + 1 } })
    const result = await loadContentPack(new MemorySource('bad', raw))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      const issue = result.errors.find((e) => e.section === 'compatibility')
      expect(issue).toBeDefined()
      expect(issue!.message).toMatch(/facadeVersion/)
    }
  })

  it('accepts a pack whose career edge points outside itself — that is a merge-time question (S18)', async () => {
    // A mod that adds a branch off core-tw's graph names a node it did not
    // author. Rejecting that per-pack would make such a mod impossible;
    // `validateMergedContent()` checks the assembled graph instead.
    const raw = emptyRawPack({
      careerGraph: {
        nodes: [{ id: 'n1', industry: 'tech', rank: 1, income: [1, 2] }],
        edges: [{ from: 'n1', to: 'from_another_pack', require: { chance: 1 }, surfacedAs: 'opportunity' }],
      },
    })
    const result = await loadContentPack(new MemorySource('bad', raw))
    expect(result.ok).toBe(true)
  })
})

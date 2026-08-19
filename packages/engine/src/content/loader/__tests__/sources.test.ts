import { describe, it, expect } from 'vitest'
import { PasteSource, FileSource, normalizePackFile, serializePackFile } from '../PasteSource.js'
import { checkTrust, DEFAULT_TRUST_POLICY } from '../trust.js'
import { loadContentPack } from '../loadContentPack.js'
import { MemorySource } from '../MemorySource.js'
import { ENGINE_API_VERSION } from '../compatibility.js'
import { FACADE_VERSION } from '../../../domain/facade/ModStateView.js'
import { createCoreTwSource } from '../../packs/core-tw/index.js'
import { createLife } from '../../../sim/createLife.js'

const manifest = (overrides: Record<string, unknown> = {}) => ({
  id: 'friend-pack',
  version: '2.1.0',
  engineApi: `^${ENGINE_API_VERSION}`,
  facadeVersion: FACADE_VERSION,
  provides: { events: 1, opportunities: 0, careers: 0, traits: 0, worldGenerators: [] },
  requires: [],
  assets: { actors: {}, bg: {}, sfx: {} },
  ...overrides,
})

const anEvent = (id: string) => ({
  id,
  require: { '>=': ['age', 18] },
  weight: 1,
  prompt: '有件事發生了。',
  choices: [
    { id: 'safe', label: '算了', odds: '+10', mag: 1, good: '還不錯。', bad: '不太妙。' },
    { id: 'normal', label: '看看', odds: '0', mag: 2, good: '還不錯。', bad: '不太妙。' },
    { id: 'bold', label: '梭了', odds: '-20', mag: 3, good: '還不錯。', bad: '不太妙。' },
  ],
  good: { effects: [] },
  bad: { effects: [] },
  scene: {},
})

const packText = (extra: Record<string, unknown> = {}) =>
  JSON.stringify({ manifest: manifest(), events: [anEvent('friend_event')], ...extra })

describe('PasteSource', () => {
  it('loads a pasted pack through the exact same loader official content uses', async () => {
    const result = await loadContentPack(new PasteSource('貼上的內容', packText()))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.pack.manifest.id).toBe('friend-pack')
    expect(result.pack.events).toHaveLength(1)
  })

  it('fills in the sections a pack chose not to ship', () => {
    const normalized = normalizePackFile({ manifest: manifest() })
    expect(normalized.opportunities).toEqual([])
    expect(normalized.events).toEqual([])
    expect(normalized.traits).toEqual([])
    expect(normalized.careerGraph).toEqual({ nodes: [], edges: [] })
  })

  it('turns unreadable input into a validation error, not a thrown exception', async () => {
    const broken = await loadContentPack(new PasteSource('貼上的內容', '{ not json'))
    expect(broken.ok).toBe(false)
    if (broken.ok) return
    expect(broken.errors[0].section).toBe('source')
    expect(broken.errors[0].path).toEqual(['貼上的內容'])
    expect(broken.errors[0].message).toContain('JSON')

    const notAnObject = await loadContentPack(new PasteSource('陣列', '[1,2,3]'))
    expect(notAnObject.ok).toBe(false)
  })

  it('refuses an absurdly large payload before parsing it', async () => {
    const huge = new PasteSource('巨檔', packText(), { maxBytes: 10 })
    const result = await loadContentPack(huge)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors[0].message).toContain('太大')
  })

  it('round-trips: export → paste → load', async () => {
    const original = normalizePackFile(JSON.parse(packText()))
    const text = serializePackFile(original)
    const result = await loadContentPack(new PasteSource('往返', text))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.pack.events[0].id).toBe('friend_event')
  })
})

describe('FileSource', () => {
  it('reads a file-shaped thing without the engine ever mentioning the DOM', async () => {
    // Structurally typed: a browser File satisfies this, and so does this stub.
    const file = { name: 'friend-pack.json', text: () => Promise.resolve(packText()) }
    const result = await loadContentPack(new FileSource(file))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.pack.manifest.id).toBe('friend-pack')
  })

  it('reports a file that cannot be read as a source error', async () => {
    const file = { name: 'broken.json', text: () => Promise.reject(new Error('讀不到檔案')) }
    const result = await loadContentPack(new FileSource(file))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors[0]).toMatchObject({ section: 'source', message: '讀不到檔案' })
  })
})

describe('trust checks (TODO.md #2: 格式合法 ≠ 內容可信)', () => {
  it('is a separate verdict from schema validity', async () => {
    const pack = {
      manifest: manifest(),
      opportunities: [],
      events: Array.from({ length: 5 }, (_, index) => anEvent(`e${index}`)),
      careerGraph: { nodes: [], edges: [] },
      traits: [],
    }

    // The same pack: well-formed either way, only the policy changes.
    const loose = await loadContentPack(new MemorySource('ok', pack))
    expect(loose.ok).toBe(true)

    const strict = await loadContentPack(new MemorySource('ok', pack), {
      trustPolicy: { ...DEFAULT_TRUST_POLICY, maxEvents: 2 },
    })
    expect(strict.ok).toBe(false)
    if (strict.ok) return
    expect(strict.errors[0]).toMatchObject({ section: 'trust', path: ['maxEvents'] })
  })

  it('counts the bytes a source reports', () => {
    const pack = { manifest: manifest(), opportunities: [], events: [], careerGraph: { nodes: [], edges: [] }, traits: [] }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const issues = checkTrust({ pack: pack as any, bytes: 9_000_000 })
    expect(issues.map((issue) => issue.rule)).toContain('maxBytes')
  })
})

describe('每個事件都要有情境（§7.2）', () => {
  it('沒有 prompt 的事件載不進來——那正是「不知道自己在選什麼」的來源', async () => {
    const bare = anEvent('bare_event') as Record<string, unknown>
    delete bare.prompt
    const result = await loadContentPack(
      new PasteSource('no-prompt', JSON.stringify({ manifest: manifest(), events: [bare] })),
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors[0]).toMatchObject({ section: 'events', path: [0, 'prompt'] })
  })
})

describe('manifest identity (TODO.md #2: 穩定 id + semver)', () => {
  it('rejects a version that is not semver, because the fingerprint depends on it', async () => {
    const result = await loadContentPack(new PasteSource('v2', JSON.stringify({ manifest: manifest({ version: 'v2' }) })))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.some((issue) => issue.message.includes('semver'))).toBe(true)
  })

  it('rejects an id that would not survive being written down', async () => {
    const result = await loadContentPack(new PasteSource('bad id', JSON.stringify({ manifest: manifest({ id: 'My Pack!' }) })))
    expect(result.ok).toBe(false)
  })
})

describe('cross-pack composition (S18)', () => {
  it('a pack may be a fragment: only events, no career graph of its own', async () => {
    const created = await createLife({
      seed: 'fragment',
      sources: [createCoreTwSource(), new PasteSource('friend-pack.json', packText())],
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    // The imported event really is in the game's content, not just "loaded"
    expect(created.life.content.events.map((event) => event.id)).toContain('friend_event')
    // …and the fingerprint moved, so share codes from the core-only set no
    // longer claim to describe this world (§5.1)
    const coreOnly = await createLife({ seed: 'fragment', sources: [createCoreTwSource()] })
    expect(coreOnly.ok && coreOnly.life.fingerprint).not.toBe(created.life.fingerprint)
  })

  it('but the assembled set still has to make sense', async () => {
    const dangling = JSON.stringify({
      manifest: manifest(),
      careerGraph: {
        nodes: [],
        edges: [{ from: 'nowhere', to: 'nohow', require: { chance: 1 }, surfacedAs: 'opportunity' }],
      },
    })
    const created = await createLife({ seed: 'dangling', sources: [createCoreTwSource(), new PasteSource('x', dangling)] })
    expect(created.ok).toBe(false)
    if (created.ok) return
    expect(created.errors[0].message).toContain('不存在的節點')
  })

  it('refuses to start a game with no career nodes at all', async () => {
    const created = await createLife({
      seed: 'empty',
      sources: [new PasteSource('events-only', packText())],
    })
    expect(created.ok).toBe(false)
    if (created.ok) return
    expect(created.errors[0].message).toContain('職涯節點')
  })
})

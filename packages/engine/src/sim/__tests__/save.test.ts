import { describe, it, expect } from 'vitest'
import {
  createSaveFile,
  deserializeSave,
  migrateSave,
  parseSaveFile,
  restoreLife,
  serializeSave,
  describePacks,
  commandSchema,
  SAVE_SCHEMA_VERSION,
  type SaveFile,
} from '../save.js'
import { createLife } from '../createLife.js'
import { runLife, summariseLife } from '../headless.js'
import { defaultPolicy } from '../policy.js'
import { createCoreTwSource } from '../../content/packs/core-tw/index.js'
import { MemorySource } from '../../content/loader/MemorySource.js'
import type { Command } from '../../domain/turn/Command.js'
import { coreTwManifest } from '../../content/packs/core-tw/manifest.js'
import { coreTwEvents } from '../../content/packs/core-tw/events.js'
import { coreTwOpportunities } from '../../content/packs/core-tw/opportunities.js'
import { coreTwCareerGraph } from '../../content/packs/core-tw/careerGraph.js'
import { coreTwTraits } from '../../content/packs/core-tw/traits.js'

const sources = () => [createCoreTwSource()]

/**
 * One command of every kind. The `Record<Command['type'], …>` is the point:
 * adding a variant to the union without teaching the schema about it is a
 * compile error here, so a save can never contain a command the parser drops.
 */
const SAMPLE_COMMANDS: Record<Command['type'], Command> = {
  allocateDice: { type: 'allocateDice', assignment: { study: 2, work: 1 } },
  resolveEvent: { type: 'resolveEvent', choice: 'bold' },
  takeOpportunity: { type: 'takeOpportunity', id: 'offer:1', sizing: 'leveraged' },
  declineOpportunity: { type: 'declineOpportunity', id: 'offer:2' },
  resolveTrial: { type: 'resolveTrial', positionId: 'pos:1', choice: 'hold' },
  advanceTurn: { type: 'advanceTurn' },
}

const halfALife = async (seed: string) => {
  const created = await createLife({ seed, sources: sources() })
  if (!created.ok) throw new Error('createLife failed')
  const life = created.life
  const policy = defaultPolicy()

  for (let turn = 0; turn < 20; turn++) {
    for (let step = 0; step < 32; step++) {
      const command = policy({ view: life.sim.getPlayerView(), turn })
      if (!command || command.type === 'advanceTurn') break
      life.sim.dispatch(command)
    }
    life.sim.dispatch({ type: 'advanceTurn' })
  }
  return life
}

describe('command schema', () => {
  it('round-trips every command variant through JSON', () => {
    for (const command of Object.values(SAMPLE_COMMANDS)) {
      const parsed = commandSchema.safeParse(JSON.parse(JSON.stringify(command)))
      expect(parsed.success, JSON.stringify(command)).toBe(true)
      expect(parsed.success && parsed.data).toEqual(command)
    }
  })

  it('rejects a command type the engine does not have', () => {
    expect(commandSchema.safeParse({ type: 'undoTurn' }).success).toBe(false)
  })
})

describe('save format', () => {
  it('stores seed + fingerprint + commandLog, and no state snapshot', async () => {
    const life = await halfALife('save-shape')
    const save = createSaveFile(life, 1_700_000_000_000)

    expect(save.schemaVersion).toBe(SAVE_SCHEMA_VERSION)
    expect(save.seed).toBe('save-shape')
    expect(save.fingerprint).toBe(life.fingerprint)
    expect(save.packs).toEqual([{ id: 'core-tw', version: '1.0.0' }])
    expect(save.commandLog).toEqual([...life.sim.getCommandLog()])

    // The whole point of TODO #4: nothing about the internal GameState shape
    // is in the file, so refactoring it cannot break old saves.
    const text = serializeSave(save)
    for (const internals of ['capitalState', 'counters', 'positions', 'secret', 'traits']) {
      expect(text, internals).not.toContain(internals)
    }
  })

  it('round-trips through JSON', async () => {
    const life = await halfALife('round-trip')
    const save = createSaveFile(life, 42)
    const parsed = deserializeSave(serializeSave(save))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.save).toEqual(save)
  })

  it('rejects junk with a readable reason instead of throwing', () => {
    expect(deserializeSave('not json').ok).toBe(false)
    expect(parseSaveFile(null)).toMatchObject({ ok: false, error: { kind: 'malformed' } })
    expect(parseSaveFile({ seed: 1 })).toMatchObject({ ok: false, error: { kind: 'malformed' } })
    const message = parseSaveFile({ schemaVersion: 1, seed: 1 })
    expect(message.ok).toBe(false)
    if (!message.ok) expect(message.error.message).toMatch(/invalid/)
  })
})

describe('schemaVersion + migration hook', () => {
  it('runs registered migrations in order, one version at a time', () => {
    const migrated = migrateSave(
      { schemaVersion: 1, marker: [] },
      {
        targetVersion: 3,
        migrations: {
          1: (save) => ({ ...save, marker: [...(save.marker as string[]), '1→2'] }),
          2: (save) => ({ ...save, marker: [...(save.marker as string[]), '2→3'] }),
        },
      },
    )

    expect(migrated.ok).toBe(true)
    if (!migrated.ok) return
    expect(migrated.save.schemaVersion).toBe(3)
    expect(migrated.save.marker).toEqual(['1→2', '2→3'])
  })

  it('says so when a version cannot be migrated, rather than loading it anyway', () => {
    expect(migrateSave({ schemaVersion: 1 }, { targetVersion: 2, migrations: {} })).toMatchObject({
      ok: false,
      error: { kind: 'no_migration' },
    })
    expect(migrateSave({ schemaVersion: 9 })).toMatchObject({ ok: false, error: { kind: 'from_the_future' } })
  })
})

describe('restoreLife', () => {
  it('replays a save back to the exact same life', async () => {
    const life = await halfALife('restore-me')
    const before = summariseLife(life)
    const save = createSaveFile(life, 1)

    const restored = await restoreLife({ save, sources: sources() })
    expect(restored.ok).toBe(true)
    if (!restored.ok) return

    expect(summariseLife(restored.life)).toEqual(before)
    expect([...restored.life.sim.getCommandLog()]).toEqual(save.commandLog)
  })

  it('survives a full life, not just the first few turns', async () => {
    const run = await runLife({ seed: 'whole-life-save', sources: sources() })
    expect(run.ok).toBe(true)
    if (!run.ok) return

    const save = createSaveFile(run.result.life, 7)
    const restored = await restoreLife({ save, sources: sources() })
    expect(restored.ok).toBe(true)
    if (!restored.ok) return
    expect(summariseLife(restored.life)).toEqual(run.result.summary)
  })

  it('can hand back the log unapplied, for a replay that performs each command', async () => {
    const life = await halfALife('replay-mode')
    const save = createSaveFile(life, 1)

    const restored = await restoreLife({ save, sources: sources(), applyLog: false })
    expect(restored.ok).toBe(true)
    if (!restored.ok) return
    expect(restored.life.sim.getSnapshot().state.turnIndex).toBe(0)
    expect(restored.commandLog).toEqual(save.commandLog)

    // …and playing it out lands in the same place as applying it in one go
    for (const command of restored.commandLog) restored.life.sim.dispatch(command)
    expect(summariseLife(restored.life)).toEqual(summariseLife(life))
  })

  it('refuses a save from a different content set, naming the packs it needs', async () => {
    const life = await halfALife('mismatch')
    const save: SaveFile = {
      ...createSaveFile(life, 1),
      fingerprint: 123456,
      packs: [
        { id: 'core-tw', version: '1.0.0' },
        { id: 'friend-pack', version: '2.1.0' },
      ],
    }

    const restored = await restoreLife({ save, sources: sources() })
    expect(restored.ok).toBe(false)
    if (restored.ok) return
    expect(restored.error.kind).toBe('fingerprint_mismatch')
    expect(restored.error.message).toContain('friend-pack v2.1.0')
    expect(restored.error.required).toEqual(save.packs)
    expect(restored.error.loaded).toEqual([{ id: 'core-tw', version: '1.0.0' }])
  })

  it('reports content errors instead of replaying into a broken game', async () => {
    const life = await halfALife('broken-content')
    const save = createSaveFile(life, 1)
    const broken = new MemorySource('broken', {
      manifest: { id: 'broken' },
      opportunities: [],
      events: [],
      careerGraph: { nodes: [], edges: [] },
      traits: [],
    })

    const restored = await restoreLife({ save, sources: [broken] })
    expect(restored.ok).toBe(false)
    if (restored.ok) return
    expect(restored.error.kind).toBe('content_invalid')
    expect(restored.error.issues?.length).toBeGreaterThan(0)
  })

  it('a bumped pack version invalidates the save (that is the point of the fingerprint)', async () => {
    const life = await halfALife('version-bump')
    const save = createSaveFile(life, 1)

    const bumped = new MemorySource('core-tw@next', {
      manifest: { ...coreTwManifest, version: '1.1.0' },
      opportunities: coreTwOpportunities,
      events: coreTwEvents,
      careerGraph: coreTwCareerGraph,
      traits: coreTwTraits,
    })

    const restored = await restoreLife({ save, sources: [bumped] })
    expect(restored.ok).toBe(false)
    if (restored.ok) return
    expect(restored.error.kind).toBe('fingerprint_mismatch')
    expect(restored.error.message).toContain('core-tw v1.0.0')
    expect(restored.error.message).toContain('core-tw v1.1.0')
  })
})

describe('describePacks', () => {
  it('reads like something a user can act on', () => {
    expect(describePacks([{ id: 'core-tw', version: '1.0.0' }])).toBe('core-tw v1.0.0')
    expect(
      describePacks([
        { id: 'core-tw', version: '1.0.0' },
        { id: 'xxx', version: '2.1' },
      ]),
    ).toBe('core-tw v1.0.0 + xxx v2.1')
  })
})

import { describe, it, expect } from 'vitest'
import { runLife, replayLife, outcomeFor } from '../headless.js'
import { defaultPolicy, splitDice } from '../policy.js'
import { createLife } from '../createLife.js'
import { runBalance, summariseRuns } from '../balance.js'
import { createCoreTwSource } from '../../content/packs/core-tw/index.js'
import { MemorySource } from '../../content/loader/MemorySource.js'
import { computeFingerprint } from '../../content/loader/fingerprint.js'
import { coreTwManifest } from '../../content/packs/core-tw/manifest.js'

const sources = () => [createCoreTwSource()]

describe('createLife', () => {
  it('wires a complete game from content, and reports the fingerprint the share code needs', async () => {
    const created = await createLife({ seed: 'wire', sources: sources() })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    expect(created.life.fingerprint).toBe(computeFingerprint([{ id: coreTwManifest.id, version: coreTwManifest.version }]))
    expect(created.life.totalTurns).toBe(47) // 18 → 65, one turn a year (§2)
    expect(created.life.sim.getSnapshot().state.era.phase).not.toBe('unknown')
  })

  it('reports content errors instead of starting a broken game', async () => {
    const broken = new MemorySource('broken', {
      manifest: { id: 'broken' },
      opportunities: [],
      events: [],
      careerGraph: { nodes: [], edges: [] },
      traits: [],
    })
    const created = await createLife({ seed: 'broken', sources: [broken] })
    expect(created.ok).toBe(false)
    if (created.ok) return
    expect(created.errors.length).toBeGreaterThan(0)
  })
})

describe('splitDice', () => {
  it('spends every pip, never proposing an all-zero allocation', () => {
    for (let pool = 1; pool <= 12; pool++) {
      const assignment = splitDice(pool, { study: 3, social: 1, work: 1, rest: 1 })
      const total = Object.values(assignment).reduce((sum, v) => sum + v, 0)
      expect(total).toBe(pool)
    }
    expect(splitDice(0, { study: 1, social: 1, work: 1, rest: 1 })).toEqual({})
  })
})

describe('runLife', () => {
  it('plays a whole life to retirement in node, with no browser anywhere on the path', async () => {
    const outcome = await runLife({ seed: 'full-life', sources: sources() })
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return

    const { summary, commandLog } = outcome.result
    expect(summary.finalAge).toBe(65)
    expect(summary.finalYear).toBe(1990 + 47)
    expect(commandLog.filter((c) => c.type === 'advanceTurn')).toHaveLength(47)
    // §4.2's estimate: ~100–200 commands for a life.
    expect(commandLog.length).toBeGreaterThan(80)
    expect(summary.careerRank).toBeGreaterThan(0)
    expect(summary.outcome).toBe(outcomeFor(summary.netWorth))
  })

  it('needs no DOM whatsoever — §3.1\'s final acceptance', async () => {
    // The engine's own lint rules ban DOM imports; this asserts the runtime
    // side of the same promise: a full life plays out with no browser
    // globals in existence at all.
    expect('window' in globalThis).toBe(false)
    expect('document' in globalThis).toBe(false)
    const outcome = await runLife({ seed: 'headless', sources: sources() })
    expect(outcome.ok).toBe(true)
    expect('window' in globalThis).toBe(false)
  })

  it('is a golden test: seed + fingerprint + commandLog reproduce the same settlement', async () => {
    const outcome = await runLife({ seed: 'golden-seed', sources: sources() })
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.result.summary).toMatchSnapshot()
  })

  it('replays a recorded log to exactly the same summary', async () => {
    const first = await runLife({ seed: 'replay-seed', sources: sources() })
    expect(first.ok).toBe(true)
    if (!first.ok) return

    const replayed = await replayLife({ seed: 'replay-seed', sources: sources() }, first.result.commandLog)
    expect(replayed.ok).toBe(true)
    if (!replayed.ok) return

    expect(replayed.result.summary).toEqual(first.result.summary)
    expect(replayed.result.life.sim.getSnapshot().state).toEqual(first.result.life.sim.getSnapshot().state)
  })

  it('gives different seeds different lives', async () => {
    const a = await runLife({ seed: 'life-a', sources: sources() })
    const b = await runLife({ seed: 'life-b', sources: sources() })
    if (!a.ok || !b.ok) throw new Error('runs failed')
    expect(a.result.summary).not.toEqual(b.result.summary)
  })

  it('lets the policy change the life without changing the engine', async () => {
    const cautious = await runLife({
      seed: 'policy',
      sources: sources(),
      policy: defaultPolicy({ risk: 'safe', takesOpportunities: false, diceWeights: { study: 4 } }),
    })
    const reckless = await runLife({
      seed: 'policy',
      sources: sources(),
      policy: defaultPolicy({ risk: 'bold', sizing: 'leveraged', holdsThroughTrials: false }),
    })
    if (!cautious.ok || !reckless.ok) throw new Error('runs failed')
    expect(cautious.result.summary.opportunitiesTaken).toBe(0)
    expect(cautious.result.summary.netWorth).not.toBe(reckless.result.summary.netWorth)
  })

  it('never lets the policy see an open position\'s truth', async () => {
    let sawSecret = false
    const spy = defaultPolicy()
    const outcome = await runLife({
      seed: 'no-peeking',
      sources: sources(),
      policy: (ctx) => {
        for (const position of ctx.view.positions.open) {
          if ('secret' in position) sawSecret = true
        }
        return spy(ctx)
      },
    })
    expect(outcome.ok).toBe(true)
    expect(sawSecret).toBe(false)
  })
})

describe('balance runs (TODO.md #8)', () => {
  it('aggregates a distribution that would make a broken game obvious', async () => {
    const report = await runBalance({ runs: 40, seedPrefix: 'test-balance' })
    expect(report.runs).toBe(40)
    expect(report.netWorth.min).toBeLessThanOrEqual(report.netWorth.median)
    expect(report.netWorth.median).toBeLessThanOrEqual(report.netWorth.max)
    const outcomeShare = Object.values(report.outcomes).reduce((sum, v) => sum + v, 0)
    expect(outcomeShare).toBeCloseTo(1, 6)
    expect(report.averageCommands).toBeGreaterThan(0)
  })

  it('computes shares from summaries without running anything', () => {
    const report = summariseRuns([
      {
        seed: 'a', fingerprint: 1, name: 'a', finalYear: 2037, finalAge: 65,
        capital: 100, debt: 0, netWorth: 100, income: 50, cognition: 10, network: 10, nerve: 50,
        careerId: 'x', careerRank: 1, traits: ['diamond_hands'], removedTraits: [],
        opportunitiesSeen: 2, opportunitiesTaken: 1, opportunitiesDeclined: 1,
        positionsClosed: 1, positionsRuined: 0, leveragedWipeouts: 0,
        outcome: 'scraping_by', commandCount: 100,
      },
      {
        seed: 'b', fingerprint: 1, name: 'b', finalYear: 2037, finalAge: 65,
        capital: 0, debt: 500, netWorth: -500, income: 0, cognition: 1, network: 1, nerve: 10,
        careerId: 'x', careerRank: 1, traits: [], removedTraits: ['diamond_hands'],
        opportunitiesSeen: 2, opportunitiesTaken: 2, opportunitiesDeclined: 0,
        positionsClosed: 2, positionsRuined: 1, leveragedWipeouts: 1,
        outcome: 'in_debt', commandCount: 120,
      },
    ])
    expect(report.outcomes.in_debt).toBe(0.5)
    expect(report.traitUnlockRate['diamond_hands']).toBe(0.5)
    expect(report.opportunityAcceptRate).toBe(0.75)
    expect(report.ruinRate).toBe(0.5)
    expect(report.wipeoutRate).toBe(0.5)
  })
})

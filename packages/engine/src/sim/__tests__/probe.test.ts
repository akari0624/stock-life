import { describe, it, expect } from 'vitest'
import { probeEvents } from '../probe.js'
import { MemorySource } from '../../content/loader/MemorySource.js'
import type { RawContentPack } from '../../content/loader/ContentSource.js'
import { FACADE_VERSION } from '../../domain/facade/ModStateView.js'
import { ENGINE_API_VERSION } from '../../content/loader/compatibility.js'

// §6.5.3 第一優先的驗收：作者問的兩個問題「會不會出現」「幾歲出現」，
// 這支測試就是在證明 probeEvents 答得出來，而且答得對。

const choices = [
  { id: 'safe', label: '安全', odds: '+20', mag: 1, good: 'g', bad: 'b' },
  { id: 'normal', label: '普通', odds: '0', mag: 2, good: 'g', bad: 'b' },
  { id: 'bold', label: '大膽', odds: '-20', mag: 3, good: 'g', bad: 'b' },
]

const always = { '>=': ['age', 0] }

function pack(events: unknown[]): RawContentPack {
  return {
    manifest: {
      id: 'probe-test',
      version: '1.0.0',
      engineApi: `^${ENGINE_API_VERSION}`,
      facadeVersion: FACADE_VERSION,
      provides: { events: events.length, opportunities: 0, careers: 1, traits: 0, worldGenerators: [] },
      requires: [],
      assets: { actors: {}, bg: {}, sfx: {} },
    },
    opportunities: [],
    events,
    careerGraph: {
      nodes: [{ id: 'only_job', industry: 'none', rank: 1, income: [40, 40] }],
      edges: [],
    },
    traits: [],
  }
}

/** 一段兩格的故事：入口靠抽籤，第二格隔一年、只走箭頭。 */
const arc = [
  {
    id: 'entry',
    require: always,
    weight: 8,
    once: true,
    prompt: '入口',
    choices,
    good: { effects: [], next: { id: 'beat_two', afterYears: 1 } },
    bad: { effects: [], next: { id: 'beat_two', afterYears: 1 } },
    scene: {},
  },
  {
    id: 'beat_two',
    require: always,
    weight: 0,
    once: true,
    prompt: '第二格',
    choices,
    good: { effects: [] },
    bad: { effects: [] },
    scene: {},
  },
]

const sources = (events: unknown[]) => () => [new MemorySource('probe-test', pack(events))]

describe('probeEvents', () => {
  it('分開回報「入口靠抽籤」與「段落走箭頭」的兩種數字（§6.5.2）', async () => {
    const result = await probeEvents({ runs: 30, sources: sources(arc) })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const byId = new Map(result.report.events.map((e) => [e.id, e]))
    const entry = byId.get('entry')!
    const beat = byId.get('beat_two')!

    expect(entry.entry).toBe(true)
    expect(beat.entry).toBe(false)

    // 抽籤是機率的：這是這個包裡唯一的入口，47 回合抽得到的機率很高，
    // 但斷言只鎖「有出現、且 once 讓它每局最多一次」。
    expect(entry.reachRate).toBeGreaterThan(0)
    expect(entry.perLifeWhenSeen).toBe(1)

    // 鏈接是精確的：只要入口演過，隔年那一格保證演——所以兩者局數必須相等。
    expect(beat.lives).toBe(entry.lives)
    // 而且平均剛好晚一歲（afterYears: 1）
    expect(beat.firstAge! - entry.firstAge!).toBeCloseTo(1, 5)
  })

  it('出現率 0 的事件照樣列出來——那正是作者最需要看到的一行', async () => {
    const unreachable = [
      ...arc,
      {
        id: 'never',
        // 一輩子不可能成立的條件
        require: { '>=': ['age', 999] },
        weight: 50,
        once: false,
        prompt: '演不到',
        choices,
        good: { effects: [] },
        bad: { effects: [] },
        scene: {},
      },
    ]
    const result = await probeEvents({ runs: 5, sources: sources(unreachable) })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const never = result.report.events.find((e) => e.id === 'never')!
    expect(never.lives).toBe(0)
    expect(never.reachRate).toBe(0)
    expect(never.firstAge).toBeUndefined()
    expect(never.averageAge).toBeUndefined()
  })

  it('年齡取樣在日曆換年之前——不然每一格都會被記成大一歲', async () => {
    // 只在 30 歲成立、once 的單格事件：出現時的年齡只能是 30。
    const atThirty = [
      {
        id: 'exactly_thirty',
        require: { all: [{ '>=': ['age', 30] }, { '<=': ['age', 30] }] },
        weight: 100,
        once: true,
        prompt: '三十歲',
        choices,
        good: { effects: [] },
        bad: { effects: [] },
        scene: {},
      },
    ]
    const result = await probeEvents({ runs: 5, sources: sources(atThirty) })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const event = result.report.events[0]!
    expect(event.lives).toBe(5)
    expect(event.firstAge).toBe(30)
    expect(event.averageAge).toBe(30)
  })

  it('載入失敗回傳錯誤而不是 throw——作者手上的包本來就經常是壞的', async () => {
    const result = await probeEvents({
      runs: 1,
      sources: () => [new MemorySource('broken', { manifest: { id: 'broken' }, opportunities: [], events: [], careerGraph: { nodes: [], edges: [] }, traits: [] })],
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.length).toBeGreaterThan(0)
  })
})

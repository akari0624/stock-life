import { describe, it, expect } from 'vitest'
import { loadContentPack } from '../../../loader/loadContentPack.js'
import { createCoreTwSource } from '../index.js'
import { coreTwEvents, coreTwTrialIds } from '../events.js'
import { coreTwOpportunities } from '../opportunities.js'
import { coreTwTraits } from '../traits.js'
import { coreTwCareerGraph } from '../careerGraph.js'
import { runLife } from '../../../../sim/headless.js'
import { defaultPolicy } from '../../../../sim/policy.js'
import { nextDecision } from '../../../../sim/decisions.js'
import { DEFAULT_THEME_POOL } from '../../../../domain/systems/world/cycles.js'
import { ERA_PHASES } from '../../../../domain/systems/world/Timeline.js'
import { TRAIT_MOMENTS } from '../../../../domain/systems/trait/TraitDef.js'

// S19's acceptance: the pipeline is full enough to actually play, and the
// content obeys the two rules the design cares about — hint never name (§2),
// and everything a piece of content points at must exist.

const sources = () => [createCoreTwSource()]

describe('core-tw 的規模（S19 目標）', () => {
  it('80–150 事件 / 20+ 機會 / 25+ 特性 / 完整職涯圖', () => {
    expect(coreTwEvents.length).toBeGreaterThanOrEqual(80)
    expect(coreTwEvents.length).toBeLessThanOrEqual(150)
    expect(coreTwOpportunities.length).toBeGreaterThanOrEqual(20)
    expect(coreTwTraits.length).toBeGreaterThanOrEqual(25)
    expect(coreTwCareerGraph.nodes.length).toBeGreaterThanOrEqual(20)
    expect(coreTwCareerGraph.edges.length).toBeGreaterThanOrEqual(25)
  })

  it('載入器接受它，而且 manifest 宣告的數量就是包裡真的有的', async () => {
    const result = await loadContentPack(createCoreTwSource())
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const { provides } = result.pack.manifest
    expect(result.pack.events).toHaveLength(provides.events)
    expect(result.pack.opportunities).toHaveLength(provides.opportunities)
    expect(result.pack.careerGraph.nodes).toHaveLength(provides.careers)
    expect(result.pack.traits).toHaveLength(provides.traits)
  })
})

describe('內容的內部一致性', () => {
  it('沒有重複的 id', () => {
    for (const [label, ids] of [
      ['events', coreTwEvents.map((e) => e.id)],
      ['opportunities', coreTwOpportunities.map((o) => o.id)],
      ['traits', coreTwTraits.map((t) => t.id)],
      ['career nodes', coreTwCareerGraph.nodes.map((n) => n.id)],
    ] as const) {
      expect(new Set(ids).size, label).toBe(ids.length)
    }
  })

  it('機會的 trials 都指向真的存在、而且不會被隨機抽到的事件（§7.1 weight: 0）', () => {
    const trials = new Set(coreTwTrialIds)
    for (const opportunity of coreTwOpportunities) {
      for (const trial of opportunity.trials) {
        expect(trials, `${opportunity.id} → ${trial}`).toContain(trial)
      }
    }
    for (const id of trials) {
      expect(coreTwEvents.find((event) => event.id === id)?.weight, id).toBe(0)
    }
  })

  it('機會的 window 只用兩個產生器真的會產出的字彙', () => {
    for (const opportunity of coreTwOpportunities) {
      for (const phase of opportunity.window.eraPhase) {
        expect(ERA_PHASES, opportunity.id).toContain(phase)
      }
      for (const theme of opportunity.window.themes) {
        // S11 的平衡報表指出的問題：內容的主題與世界的主題池對不上，
        // 機會就永遠不會出現。這條測試讓那件事不可能再悄悄發生。
        expect(DEFAULT_THEME_POOL, opportunity.id).toContain(theme)
      }
    }
  })

  it('每個主題與每個時代相位都至少有一個機會在等著', () => {
    const anyWindow = coreTwOpportunities.filter((o) => o.window.themes.length === 0)
    for (const theme of DEFAULT_THEME_POOL) {
      const matching = coreTwOpportunities.filter((o) => (o.window.themes as string[]).includes(theme))
      expect(matching.length + anyWindow.length, theme).toBeGreaterThan(0)
    }
    for (const phase of ERA_PHASES) {
      const matching = coreTwOpportunities.filter(
        (o) => o.window.eraPhase.length === 0 || (o.window.eraPhase as string[]).includes(phase),
      )
      expect(matching.length, phase).toBeGreaterThan(0)
    }
  })

  it('特性的 exclude 指向存在的特性，checkOn 是引擎公布的檢查點', () => {
    const ids = new Set(coreTwTraits.map((t) => t.id))
    for (const trait of coreTwTraits) {
      for (const excluded of trait.exclude) expect(ids, `${trait.id} excludes`).toContain(excluded)
      for (const moment of trait.checkOn) expect(TRAIT_MOMENTS, trait.id).toContain(moment)
    }
  })

  it('職涯圖從起點走得到每一個節點（沒有孤島）', () => {
    const start = coreTwCareerGraph.nodes[0]!.id
    const reachable = new Set([start])
    let grew = true
    while (grew) {
      grew = false
      for (const edge of coreTwCareerGraph.edges) {
        if (reachable.has(edge.from) && !reachable.has(edge.to)) {
          reachable.add(edge.to)
          grew = true
        }
      }
    }
    const orphans = coreTwCareerGraph.nodes.map((n) => n.id).filter((id) => !reachable.has(id))
    expect(orphans).toEqual([])
  })

  it('每個事件都有情境，而且不是把結局先講出來（§7.2）', () => {
    for (const event of coreTwEvents) {
      expect(event.prompt, event.id).toBeTruthy()
      // 一到兩句：太短說不出畫面，太長玩家不會讀
      expect(event.prompt.length, event.id).toBeGreaterThan(8)
      expect(event.prompt.length, event.id).toBeLessThan(60)
      // 情境不能是結局的複製貼上——那等於先爆雷
      expect(event.prompt, event.id).not.toBe(event.good.text)
      expect(event.prompt, event.id).not.toBe(event.bad.text)
    }
  })

  it('每個事件的三個選項都在，機率顯示得出來', () => {
    for (const event of coreTwEvents) {
      expect(event.choices.map((c) => c.id).sort(), event.id).toEqual(['bold', 'normal', 'safe'])
      for (const choice of event.choices) {
        expect(choice.odds, `${event.id}/${choice.id}`).toMatch(/^[+-]?\d+$/)
      }
    }
  })
})

describe('§2 暗示但不指名', () => {
  // 真實公司、股票代號、人名一律不出現在任何玩家看得到的字串裡。
  const FORBIDDEN = [
    /台積電/, /鴻海/, /聯發科/, /宏達電/, /國巨/, /長榮/, /陽明/, /大立光/, /聯電/, /華碩/,
    /\b2330\b/, /\b2317\b/, /\b0050\b/, /TSMC/i, /Foxconn/i, /Nvidia/i, /Bitcoin/i,
  ]

  const strings: string[] = []
  for (const event of coreTwEvents) {
    strings.push(...event.choices.map((c) => c.label), event.good.text, event.bad.text, event.prompt)
  }
  for (const opportunity of coreTwOpportunities) {
    for (const level of [opportunity.signal.low, opportunity.signal.mid, opportunity.signal.high]) {
      if (level) strings.push(level.text)
    }
  }
  for (const trait of coreTwTraits) strings.push(trait.name, trait.text)

  it('玩家看得到的每一句話都沒有指名任何真實標的', () => {
    for (const text of strings) {
      for (const pattern of FORBIDDEN) {
        expect(text, text).not.toMatch(pattern)
      }
    }
  })

  it('文案是給人讀的，不是佔位字串', () => {
    for (const text of strings) {
      expect(text.trim().length, text).toBeGreaterThan(1)
      expect(text, text).not.toMatch(/TODO|FIXME|lorem/i)
    }
  })
})

describe('§1.2 訊號分層是能力的函數', () => {
  it('大多數機會三版都寫滿了（官方內容是 mod 作者的示範）', () => {
    const complete = coreTwOpportunities.filter((o) => o.signal.low && o.signal.mid && o.signal.high)
    expect(complete.length / coreTwOpportunities.length).toBeGreaterThan(0.9)
  })

  it('高認知那一版才看得到 valuation / risk', () => {
    for (const opportunity of coreTwOpportunities) {
      expect(opportunity.signal.low?.reveal ?? [], opportunity.id).not.toContain('risk')
      expect(opportunity.signal.high?.reveal ?? [], opportunity.id).toContain('risk')
    }
  })
})

describe('兩種世界都玩得完一整局', () => {
  for (const world of ['random', 'tw-history'] as const) {
    it(`${world}：18 歲玩到 65 歲，拿得到結算`, async () => {
      const outcome = await runLife({
        seed: `whole-life-${world}`,
        sources: sources(),
        startYear: 1990,
        worldGeneratorId: world,
      })
      expect(outcome.ok).toBe(true)
      if (!outcome.ok) return

      const { summary } = outcome.result
      expect(summary.finalAge).toBe(65)
      expect(summary.careerRank).toBeGreaterThan(0)
      expect(summary.outcome).toBeTruthy()
      // §4.2 的估計：一輩子 100–200 個玩家決策
      expect(summary.commandCount).toBeGreaterThan(100)
      expect(summary.commandCount).toBeLessThan(260)
    })
  }
})

describe('重玩不會出戲', () => {
  /** 用一個會偷記事件 id 的 policy 走完一局。 */
  async function eventsOf(seed: string): Promise<string[]> {
    const seen: string[] = []
    const base = defaultPolicy()
    const outcome = await runLife({
      seed,
      sources: sources(),
      policy: (ctx) => {
        const decision = nextDecision(ctx.view)
        if (decision?.kind === 'event') seen.push(decision.eventId)
        return base(ctx)
      },
    })
    if (!outcome.ok) throw new Error('run failed')
    return seen
  }

  it('三局各自看到三十種上下的事件，彼此重疊不到七成', async () => {
    const lives = await Promise.all(['replay-a', 'replay-b', 'replay-c'].map(eventsOf))

    for (const life of lives) {
      expect(life.length).toBeGreaterThan(30)
      // 一局裡的「不同事件」數量——低於這個就會開始覺得在重播
      expect(new Set(life).size).toBeGreaterThanOrEqual(25)
    }

    const overlap = (a: string[], b: string[]): number => {
      const setB = new Set(b)
      const setA = [...new Set(a)]
      return setA.filter((id) => setB.has(id)).length / setA.length
    }
    expect(overlap(lives[0]!, lives[1]!)).toBeLessThan(0.7)
    expect(overlap(lives[0]!, lives[2]!)).toBeLessThan(0.7)

    // 三局加起來要用掉內容庫的一大塊，否則寫了也沒人看到
    const union = new Set(lives.flat())
    expect(union.size).toBeGreaterThan(45)
  })
})

/**
 * S16 的兩條主要判準，用真的走一遍畫面狀態機來驗：
 *
 * 1. 能從標題開始，玩完一整局人生到結算
 * 2. 同一組分享碼 + 同樣的選擇 → 同一段人生
 *
 * 這裡刻意**不用 `runLife()`**（那是引擎自己的路徑），而是走 UI 真正用的
 * `AppStore` → `GameSession` → `nextDecision()`，否則就證明不了畫面接對了。
 */
import { beforeEach, describe, expect, it } from 'vitest'
import type { Decision, Sizing } from '@stock-life/engine'
import { AppStore, parseSeedInput } from '../AppStore.ts'
import type { GameSession } from '../GameSession.ts'
import { AudioEngine } from '../../presentation/audio/AudioEngine.ts'
import { setAudioEngine } from '../../presentation/audio/playSound.ts'
import { FakeOutput } from '../../presentation/audio/__tests__/fakeOutput.ts'

const MAX_STEPS = 5_000

beforeEach(() => {
  // jsdom 沒有 Web Audio；用假 output 讓測試輸出保持乾淨
  setAudioEngine(new AudioEngine({ output: new FakeOutput(), logMissing: false }))
})

/** 一個「玩家」：對每種決策都給固定答案，所以同種子必然走出同一段人生。 */
const decide = (session: GameSession, decision: Decision): void => {
  switch (decision.kind) {
    case 'event':
      session.resolveEvent('normal')
      break
    case 'trial':
      session.resolveTrial(decision.positionId, 'hold')
      break
    case 'dice': {
      const assignment: Record<string, number> = {}
      // 全部丟給第一個通道：一個明確、可重現的選擇
      assignment[decision.channels[0]] = decision.pool
      session.allocateDice(assignment)
      break
    }
    case 'offer': {
      const sizing = (decision.offer.sizing[0] ?? 'normal') as Sizing
      session.takeOffer(decision.offer.id, sizing)
      break
    }
  }
}

const playToSettlement = (session: GameSession): void => {
  for (let step = 0; step < MAX_STEPS; step += 1) {
    const snapshot = session.getSnapshot()
    if (snapshot.finished) return
    if (snapshot.decision) decide(session, snapshot.decision)
    else session.advanceTurn()
  }
  throw new Error('一局跑不完（超過步數上限）')
}

const startWith = async (seedInput: string, worldMode: 'random' | 'history' = 'random') => {
  const store = new AppStore()
  store.setSettings({ name: '測試員', startYear: 1990, seedInput, worldMode })
  await store.startLife()
  const snapshot = store.getSnapshot()
  if (!snapshot.session) throw new Error(`開始人生失敗：${snapshot.error ?? '未知原因'}`)
  return { store, session: snapshot.session }
}

describe('從標題玩到結算', () => {
  it('走完 48 個回合，拿到結算摘要', async () => {
    const { store, session } = await startWith('20260817')

    expect(store.getSnapshot().screen).toBe('game')
    expect(session.getSnapshot().turn).toBe(0)

    playToSettlement(session)
    store.finish()

    const snapshot = session.getSnapshot()
    expect(store.getSnapshot().screen).toBe('settlement')
    expect(snapshot.finished).toBe(true)
    expect(snapshot.summary?.finalAge).toBe(65)
    expect(snapshot.summary?.outcome).toBeTruthy()
    // 文字流真的長出東西了
    expect(snapshot.entries.length).toBeGreaterThan(20)
    session.dispose()
  })

  it('台股歷史模式也玩得完一整局（S19 的第二個世界）', async () => {
    const { session } = await startWith('1990', 'history')
    expect(session.life.timeline.generatorId).toBe('tw-history')
    // 崩盤在該來的年份來，不是隨機的
    expect(session.life.timeline.phases.find((p) => p.startYear === 1990)?.phase).toBe('crash')

    playToSettlement(session)
    expect(session.getSnapshot().summary?.finalAge).toBe(65)
    session.dispose()
  })

  it('文字流按年份分組，年份遞增', async () => {
    const { session } = await startWith('771')
    playToSettlement(session)

    const years = [...new Set(session.getSnapshot().entries.map((entry) => entry.year))]
    expect(years.length).toBeGreaterThan(5)
    expect([...years].sort((a, b) => a - b)).toEqual(years)
    session.dispose()
  })

  it('拒絕機會之後那個機會不再出現（不可逆）', async () => {
    const { session } = await startWith('4242')

    let declined: string | undefined
    for (let step = 0; step < MAX_STEPS; step += 1) {
      const snapshot = session.getSnapshot()
      if (snapshot.finished) break
      const decision = snapshot.decision
      if (!decision) {
        session.advanceTurn()
        continue
      }
      if (decision.kind === 'offer' && decision.offer.source === 'opportunity' && !declined) {
        declined = decision.offer.ref
        session.declineOffer(decision.offer.id)
        continue
      }
      if (decision.kind === 'offer' && decision.offer.ref === declined) {
        throw new Error(`拒絕過的機會又出現了：${declined}`)
      }
      decide(session, decision)
    }

    session.dispose()
  })
})

describe('同分享碼 + 同選擇 = 同一段人生', () => {
  it('兩局的 commandLog 與結算摘要完全相同', async () => {
    const first = await startWith('123456')
    playToSettlement(first.session)
    const firstSummary = first.session.getSnapshot().summary
    const firstLog = [...first.session.life.sim.getCommandLog()]
    const shareCode = first.session.shareCode
    first.session.dispose()

    // 用第一局吐出來的分享碼重新開一局
    const second = await startWith(shareCode)
    playToSettlement(second.session)
    const secondSummary = second.session.getSnapshot().summary

    expect(second.session.seed).toBe(first.session.seed)
    expect([...second.session.life.sim.getCommandLog()]).toEqual(firstLog)
    expect(secondSummary).toEqual(firstSummary)
    second.session.dispose()
  })

  it('不同種子會走出不同人生', async () => {
    const a = await startWith('1')
    const b = await startWith('2')
    playToSettlement(a.session)
    playToSettlement(b.session)

    expect(b.session.getSnapshot().summary).not.toEqual(a.session.getSnapshot().summary)
    a.session.dispose()
    b.session.dispose()
  })

  it('指紋不符的分享碼給出可行動的錯誤訊息，而不是靜默跑錯', async () => {
    const store = new AppStore()
    store.setSettings({ seedInput: 'zzzz.abc' })
    await store.startLife()

    const snapshot = store.getSnapshot()
    expect(snapshot.session).toBeUndefined()
    expect(snapshot.error).toContain('另一套內容包')
  })
})

describe('種子輸入', () => {
  it('接分享碼、純數字、留空三種寫法', () => {
    expect(parseSeedInput('  42 ')).toEqual({ seed: 42 })
    expect(parseSeedInput('1kf3.9x2p')).toMatchObject({ seed: Number.parseInt('9x2p', 36) })
    expect(parseSeedInput('').seed).toBeGreaterThanOrEqual(0)
  })

  it('亂打的種子給錯誤訊息', () => {
    expect(parseSeedInput('abc').error).toBeTruthy()
    expect(parseSeedInput('-1').error).toBeTruthy()
    expect(parseSeedInput('a.b.c').error).toBeTruthy()
  })
})

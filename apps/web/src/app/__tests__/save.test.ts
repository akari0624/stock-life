/**
 * S17 的判準，全部用真的畫面狀態機（`AppStore`）驗：
 *
 * 1. 關掉瀏覽器再回來能續玩（存檔存的是 `seed + 指紋 + commandLog`，不是狀態快照）
 * 2. 貼上別人的分享碼能得到相同人生（`?s=` 進網址列）
 * 3. 內容包版本不符時給**明確可行動**的錯誤訊息，而不是靜默跑錯
 * 4. 重播模式把 log 演出來，且演完的狀態與存檔當下相同
 */
import { beforeEach, describe, expect, it } from 'vitest'
import {
  createSaveFile,
  serializeSave,
  type Decision,
  type SaveFile,
  type Sizing,
} from '@stock-life/engine'
import { AppStore, explainSaveError } from '../AppStore.ts'
import type { GameSession } from '../GameSession.ts'
import { SaveStorage, SAVE_KEY, type KeyValueStore } from '../save/SaveStorage.ts'
import { readShareCode } from '../save/shareUrl.ts'
import { AudioEngine } from '../../presentation/audio/AudioEngine.ts'
import { setAudioEngine } from '../../presentation/audio/playSound.ts'
import { FakeOutput } from '../../presentation/audio/__tests__/fakeOutput.ts'

const MAX_STEPS = 5_000

class MemoryStore implements KeyValueStore {
  readonly map = new Map<string, string>()
  getItem(key: string): string | null {
    return this.map.get(key) ?? null
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value)
  }
  removeItem(key: string): void {
    this.map.delete(key)
  }
}

beforeEach(() => {
  setAudioEngine(new AudioEngine({ output: new FakeOutput(), logMissing: false }))
})

/** 一個「玩家」：對每種決策都給固定答案（與 playthrough.test.ts 同一套規則）。 */
const decide = (session: GameSession, decision: Decision): void => {
  switch (decision.kind) {
    case 'event':
      session.resolveEvent('normal')
      break
    case 'trial':
      session.resolveTrial(decision.positionId, 'hold')
      break
    case 'dice':
      session.allocateDice({ [decision.channels[0]]: decision.pool })
      break
    case 'offer':
      session.takeOffer(decision.offer.id, (decision.offer.sizing[0] ?? 'normal') as Sizing)
      break
  }
}

/** 玩 `turns` 個回合就停手，模擬「玩到一半關掉瀏覽器」。 */
const playTurns = (session: GameSession, turns: number): void => {
  const target = session.getSnapshot().turn + turns
  for (let step = 0; step < MAX_STEPS; step += 1) {
    const snapshot = session.getSnapshot()
    if (snapshot.finished || snapshot.turn >= target) return
    if (snapshot.decision) decide(session, snapshot.decision)
    else session.advanceTurn()
  }
  throw new Error('回合推不動')
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

const newStore = (store: MemoryStore, seedInput = '20260817'): AppStore =>
  new AppStore({
    storage: new SaveStorage({ store, now: () => 1_700_000_000_000 }),
    search: `?s=${seedInput}`,
    syncUrl: false,
  })

const startedSession = async (app: AppStore): Promise<GameSession> => {
  await app.startLife()
  const session = app.getSnapshot().session
  if (!session) throw new Error(`開始人生失敗：${app.getSnapshot().error ?? '未知原因'}`)
  return session
}

describe('關掉瀏覽器再回來', () => {
  it('續玩接得回同一段人生，連文字流都長回來', async () => {
    const store = new MemoryStore()

    // 第一次開：玩 12 年就「關掉瀏覽器」
    const first = newStore(store)
    const firstSession = await startedSession(first)
    playTurns(firstSession, 12)
    const beforeLog = [...firstSession.life.sim.getCommandLog()]
    const beforeView = firstSession.getSnapshot().view
    const beforeEntries = firstSession.getSnapshot().entries.length
    firstSession.dispose()

    // 第二次開：同一個 localStorage，什麼都沒帶過來
    const second = newStore(store)
    const saved = second.getSnapshot().saved
    expect(saved?.commandLog).toEqual(beforeLog)
    expect(saved?.meta.turn).toBe(beforeView.turnIndex)

    await second.continueSave()
    const resumed = second.getSnapshot().session
    expect(second.getSnapshot().screen).toBe('game')
    if (!resumed) throw new Error(second.getSnapshot().error)

    expect([...resumed.life.sim.getCommandLog()]).toEqual(beforeLog)
    expect(resumed.getSnapshot().view).toEqual(beforeView)
    // 這輩子發生過的事沒有跟著瀏覽器一起關掉
    expect(resumed.getSnapshot().entries.length).toBe(beforeEntries)

    // …而且真的還能繼續玩下去
    playToSettlement(resumed)
    expect(resumed.getSnapshot().summary?.finalAge).toBe(65)
    resumed.dispose()
  })

  it('每個決策之後都自動存檔（不需要按儲存）', async () => {
    const store = new MemoryStore()
    const app = newStore(store)
    const session = await startedSession(app)

    const lengthAfter = (): number => JSON.parse(store.getItem(SAVE_KEY) ?? '{}').commandLog.length
    const before = lengthAfter()
    playTurns(session, 3)
    expect(lengthAfter()).toBeGreaterThan(before)
    expect(lengthAfter()).toBe(session.life.sim.getCommandLog().length)
    session.dispose()
  })

  it('開新的一局會蓋掉舊存檔（第一版只有一格）', async () => {
    const store = new MemoryStore()
    const app = newStore(store)
    const session = await startedSession(app)
    playTurns(session, 5)
    session.dispose()

    const fresh = newStore(store)
    const restarted = await startedSession(fresh)
    expect(restarted.life.sim.getCommandLog()).toHaveLength(0)
    expect(JSON.parse(store.getItem(SAVE_KEY) ?? '{}').commandLog).toEqual([])
    restarted.dispose()
  })

  it('壞掉的存檔只是沒有存檔，不會讓標題頁掛掉', () => {
    const store = new MemoryStore()
    store.setItem(SAVE_KEY, '{"schemaVersion":1,"seed":')
    const app = newStore(store)
    expect(app.getSnapshot().saved).toBeUndefined()
    expect(app.getSnapshot().saveIssue).toContain('存檔讀不出來')
  })

  it('刪除存檔之後就沒有「繼續」可按了', async () => {
    const store = new MemoryStore()
    const app = newStore(store)
    const session = await startedSession(app)
    playTurns(session, 2)
    session.dispose()
    app.backToTitle()
    expect(app.getSnapshot().saved).toBeDefined()

    app.clearSave()
    expect(app.getSnapshot().saved).toBeUndefined()
    expect(store.getItem(SAVE_KEY)).toBeNull()
  })
})

describe('分享碼 URL', () => {
  it('`?s=` 直接變成種子輸入', () => {
    expect(readShareCode('?s=1kf3.9x2p')).toBe('1kf3.9x2p')
    expect(readShareCode('?other=1')).toBe('')
    expect(readShareCode('')).toBe('')

    const app = new AppStore({ storage: new SaveStorage({ store: new MemoryStore() }), search: '?s=123456', syncUrl: false })
    expect(app.getSnapshot().settings.seedInput).toBe('123456')
  })

  it('用網址帶來的分享碼開局，得到的是那組種子的人生', async () => {
    const store = new MemoryStore()
    const first = await startedSession(newStore(store, '4242'))
    playTurns(first, 6)
    const shareCode = first.shareCode
    const view = first.getSnapshot().view
    const log = [...first.life.sim.getCommandLog()]
    first.dispose()

    // 「把網址貼給朋友」——朋友那台機器上什麼存檔都沒有
    const friend = await startedSession(newStore(new MemoryStore(), shareCode))
    for (const command of log) friend.life.sim.dispatch(command)
    expect(friend.life.sim.getPlayerView()).toEqual(view)
    friend.dispose()
  })
})

describe('內容包不符', () => {
  it('說出這個存檔需要哪些包，而不是靜默跑出另一段人生', async () => {
    const store = new MemoryStore()
    const app = newStore(store)
    const session = await startedSession(app)
    playTurns(session, 3)

    // 手動把存檔改成「別人用另一套內容包存的」
    const tampered: SaveFile = {
      ...createSaveFile(session.life, 1),
      fingerprint: 987654,
      packs: [
        { id: 'core-tw', version: '1.0.0' },
        { id: 'friend-pack', version: '2.1.0' },
      ],
    }
    session.dispose()
    store.setItem(SAVE_KEY, serializeSave(tampered))

    const reopened = newStore(store)
    await reopened.continueSave()
    const snapshot = reopened.getSnapshot()
    expect(snapshot.session).toBeUndefined()
    expect(snapshot.error).toContain('friend-pack v2.1.0')
    expect(snapshot.error).toContain('core-tw v1.0.0')
  })

  it('錯誤訊息說得出下一步該做什麼', () => {
    expect(
      explainSaveError({
        kind: 'fingerprint_mismatch',
        message: 'x',
        required: [{ id: 'xxx', version: '1.2' }],
        loaded: [{ id: 'core-tw', version: '1.0.0' }],
      }),
    ).toContain('xxx v1.2')
    expect(explainSaveError({ kind: 'from_the_future', message: 'x' })).toContain('更新版本')
    expect(explainSaveError({ kind: 'no_migration', message: 'x' })).toContain('太舊')
  })
})

describe('重播模式', () => {
  it('把 commandLog 一步一步演出來，演完落在存檔當下的狀態', async () => {
    const store = new MemoryStore()
    const app = newStore(store)
    const played = await startedSession(app)
    playTurns(played, 10)
    const expectedView = played.getSnapshot().view
    const expectedLog = [...played.life.sim.getCommandLog()]
    played.dispose()

    const reopened = newStore(store)
    await reopened.replaySave()
    const replay = reopened.getSnapshot().session
    if (!replay) throw new Error(reopened.getSnapshot().error)

    // 重播從頭開始，而且不讓玩家做決定（選擇已經寫在 log 裡了）
    expect(replay.getSnapshot().turn).toBe(0)
    expect(replay.getSnapshot().decision).toBeUndefined()
    expect(replay.getSnapshot().replay).toMatchObject({ index: 0, total: expectedLog.length, done: false })

    for (let step = 0; step < expectedLog.length; step += 1) replay.replayStep()

    expect(replay.getSnapshot().replay?.done).toBe(true)
    expect(replay.getSnapshot().view).toEqual(expectedView)
    expect([...replay.life.sim.getCommandLog()]).toEqual(expectedLog)
    // 演出真的有東西可看
    expect(replay.getSnapshot().entries.length).toBeGreaterThan(5)
    replay.dispose()
  })

  it('快轉到底與逐步演出落在同一個狀態', async () => {
    const store = new MemoryStore()
    const app = newStore(store)
    const played = await startedSession(app)
    playTurns(played, 8)
    const expectedView = played.getSnapshot().view
    played.dispose()

    const reopened = newStore(store)
    await reopened.replaySave()
    const replay = reopened.getSnapshot().session
    if (!replay) throw new Error(reopened.getSnapshot().error)

    replay.replayStep()
    replay.replaySkipToEnd()
    expect(replay.getSnapshot().view).toEqual(expectedView)
    replay.dispose()
  })

  it('可以從重播接手繼續玩，而且重播期間不覆蓋存檔', async () => {
    const store = new MemoryStore()
    const app = newStore(store)
    const played = await startedSession(app)
    playTurns(played, 9)
    const savedLog = JSON.parse(store.getItem(SAVE_KEY) ?? '{}').commandLog
    played.dispose()

    const reopened = newStore(store)
    await reopened.replaySave()
    const replay = reopened.getSnapshot().session
    if (!replay) throw new Error(reopened.getSnapshot().error)

    replay.replayStep()
    replay.replayStep()
    // 重播才走兩步，存檔不該被截短
    expect(JSON.parse(store.getItem(SAVE_KEY) ?? '{}').commandLog).toEqual(savedLog)

    replay.takeOver()
    expect(replay.getSnapshot().mode).toBe('play')
    expect(replay.getSnapshot().replay).toBeUndefined()
    expect(replay.getSnapshot().decision ?? replay.getSnapshot().finished).toBeTruthy()

    // 接手之後照樣玩得完，而且存檔又開始跟著走
    playToSettlement(replay)
    expect(replay.getSnapshot().summary?.finalAge).toBe(65)
    expect(JSON.parse(store.getItem(SAVE_KEY) ?? '{}').commandLog.length).toBeGreaterThan(savedLog.length)
    replay.dispose()
  })

  it('播放會自己往前走，暫停就停', async () => {
    const store = new MemoryStore()
    const app = newStore(store)
    const played = await startedSession(app)
    playTurns(played, 4)
    played.dispose()

    const reopened = newStore(store)
    await reopened.replaySave()
    const replay = reopened.getSnapshot().session
    if (!replay) throw new Error(reopened.getSnapshot().error)

    replay.replayPlay()
    expect(replay.getSnapshot().replay?.index).toBeGreaterThan(0)
    expect(replay.getSnapshot().replay?.playing).toBe(true)

    replay.replayPause()
    const paused = replay.getSnapshot().replay?.index ?? 0
    expect(replay.getSnapshot().replay?.playing).toBe(false)
    expect(replay.getSnapshot().replay?.index).toBe(paused)
    replay.dispose()
  })
})

import { describe, expect, it, vi } from 'vitest'
import type { Effect } from '@stock-life/engine'
import { compile } from '../compile.ts'
import { Director, type Cue } from '../Director.ts'
import { FakeAnimation, FakeClock } from './fakeClock.ts'

const EFFECTS: Effect[] = [
  { type: 'scene.bg', id: 'office' },
  { type: 'scene.say', actor: 'colleague', text: '下季展望很好' },
  { type: 'scene.sfx', id: 'whisper', priority: 'normal' },
  { type: 'stat.add', key: 'capital', value: -300_000 },
  { type: 'capital.mul', value: 2 },
  { type: 'trait.grant', id: 'diamond_hands' },
]

const setup = () => {
  const clock = new FakeClock()
  const director = new Director(clock.options)
  const plan = compile(EFFECTS)
  const cues: Cue[] = []
  director.onCue((cue) => cues.push(cue))
  director.load(plan)
  return { clock, director, plan, cues }
}

describe('Director 時間軸', () => {
  it('play 之後邏輯時間跟著牆上時間走', () => {
    const { clock, director } = setup()
    director.play()
    clock.advance(320)

    expect(director.currentTime()).toBeCloseTo(320, 5)
    expect(director.isPlaying()).toBe(true)
  })

  it('rate(4) 演出加速四倍', () => {
    const { clock, director } = setup()
    director.rate(4)
    director.play()
    clock.advance(300)

    expect(director.currentRate()).toBe(4)
    expect(director.currentTime()).toBeCloseTo(1_200, 5)
  })

  it('改變倍率不會回頭套用到已經播過的區間', () => {
    const { clock, director } = setup()
    director.play()
    clock.advance(200) // 1x → 200
    director.rate(4)
    clock.advance(200) // 4x → +800

    expect(director.currentTime()).toBeCloseTo(1_000, 5)
  })

  it('pause 之後時間停住，play 之後不會補跳', () => {
    const { clock, director } = setup()
    director.play()
    clock.advance(200)
    director.pause()
    clock.advance(5_000)

    expect(director.currentTime()).toBeCloseTo(200, 5)
    expect(director.isPlaying()).toBe(false)

    director.play()
    clock.advance(100)
    expect(director.currentTime()).toBeCloseTo(300, 5)
  })

  it('finish() 立刻跳到結果', () => {
    const { director, plan } = setup()
    director.finish()

    expect(director.currentTime()).toBe(plan.duration)
    expect(director.isFinished()).toBe(true)
    expect(director.isPlaying()).toBe(false)

    const stage = director.getStage()
    // 數字全部演完 → 沒有任何待補的差額
    expect(stage.pendingStats).toEqual({})
    expect(stage.pendingCapitalFactor).toBe(1)
  })

  it('播完之後的狀態與 finish() 完全相同', () => {
    const { clock, director } = setup()
    director.play()
    clock.runUntil(() => director.isFinished())
    const played = director.getStage()

    const skipped = setup()
    skipped.director.finish()

    expect({ ...played, time: 0 }).toEqual({ ...skipped.director.getStage(), time: 0 })
    expect(played.pendingStats).toEqual({})
  })
})

describe('Director cue', () => {
  it('跨過 scene 起點時發 cue，且只發一次', () => {
    const { clock, director, cues } = setup()
    director.play()
    clock.runUntil(() => director.isFinished())

    expect(cues.map((c) => c.scene.kind)).toEqual(['bg', 'say', 'sfx', 'stat', 'multiply', 'badge'])
    expect(cues.every((c) => c.skipped === false)).toBe(true)
  })

  it('finish() 把剩下的 cue 一次補發並標記 skipped（S15 靠這個取消排程音效）', () => {
    const { clock, director, cues } = setup()
    director.play()
    clock.advance(100) // 只播到 bg / say / sfx
    const before = cues.length
    director.finish()

    expect(before).toBeGreaterThan(0)
    expect(cues.length).toBeGreaterThan(before)
    expect(cues.slice(0, before).every((c) => !c.skipped)).toBe(true)
    expect(cues.slice(before).every((c) => c.skipped)).toBe(true)
  })

  it('seek 往前補發、往回不重播', () => {
    const { director, cues, plan } = setup()
    director.seek(plan.duration)
    const afterForward = cues.length
    expect(afterForward).toBe(plan.scenes.length)

    director.seek(0)
    expect(cues).toHaveLength(afterForward)

    // 往回之後再往前，才會重新發（游標被移回去了）
    director.seek(plan.duration)
    expect(cues.length).toBeGreaterThan(afterForward)
  })
})

describe('Director 與 WAAPI', () => {
  it('attach 的動畫跟著倍率、暫停、跳過', () => {
    const { clock, director } = setup()
    const animation = new FakeAnimation()
    director.attach(animation, 0)

    expect(animation.pauseCalls).toBe(1) // 尚未 play

    director.play()
    expect(animation.playCalls).toBe(1)

    director.rate(2)
    expect(animation.playbackRate).toBe(2)

    clock.advance(100)
    director.pause()
    expect(animation.pauseCalls).toBe(2)

    director.finish()
    expect(animation.finishCalls).toBe(1)
  })

  it('seek 會把動畫的 currentTime 換算回去（減掉它的起點）', () => {
    const { director } = setup()
    const animation = new FakeAnimation()
    director.attach(animation, 500)

    director.seek(800)
    expect(animation.currentTime).toBe(300)

    director.seek(200) // 還沒到它的起點
    expect(animation.currentTime).toBe(0)
  })

  it('finish() 丟例外的動畫不會弄壞演出', () => {
    const { director } = setup()
    const animation = new FakeAnimation()
    animation.finish = () => {
      throw new Error('infinite animation')
    }
    director.attach(animation)

    expect(() => director.finish()).not.toThrow()
    expect(director.isFinished()).toBe(true)
  })

  it('detach 之後不再被控制', () => {
    const { director } = setup()
    const animation = new FakeAnimation()
    const detach = director.attach(animation)
    detach()

    director.rate(3)
    expect(animation.playbackRate).toBe(1)
  })
})

describe('Director 投影', () => {
  it('數字從「最終值減掉未演到的差額」開始跳', () => {
    const { clock, director } = setup()
    const final = 500_000

    director.play()
    let stage = director.getStage()
    // 時間 0：capital 的 -300000 還沒演，所以畫面上要顯示演出前的數字
    expect(final - stage.pendingStats.capital).toBe(800_000)

    clock.runUntil(() => director.isFinished())
    stage = director.getStage()
    expect(final - (stage.pendingStats.capital ?? 0)).toBe(final)
  })

  it('capital.mul 用倍率回推，不是用差額', () => {
    const { director } = setup()
    const stage = director.getStage()

    // ×2 還沒演 → 畫面上是最終值的一半
    expect(1_000 / stage.pendingCapitalFactor).toBe(500)
  })

  it('對話逐字顯示，說完留在畫面上', () => {
    const { clock, director } = setup()
    director.play()
    clock.runUntil(() => (director.getStage().say?.reveal ?? 0) > 0.2)

    const mid = director.getStage().say
    expect(mid?.actor).toBe('colleague')
    expect(mid?.done).toBe(false)

    clock.runUntil(() => director.isFinished())
    expect(director.getStage().say?.done).toBe(true)
  })

  it('getStage 在沒有變化時回傳同一個物件（useSyncExternalStore 的要求）', () => {
    const { director } = setup()
    const first = director.getStage()
    expect(director.getStage()).toBe(first)

    director.seek(100)
    const afterSeek = director.getStage()
    expect(afterSeek).not.toBe(first)
    expect(director.getStage()).toBe(afterSeek)
  })

  it('subscribe 會在時間推進時被通知', () => {
    const { clock, director } = setup()
    const listener = vi.fn()
    const unsubscribe = director.subscribe(listener)

    director.play()
    clock.advance(64)
    expect(listener).toHaveBeenCalled()

    unsubscribe()
    const calls = listener.mock.calls.length
    clock.advance(64)
    expect(listener.mock.calls).toHaveLength(calls)
  })

  it('rate 必須大於 0', () => {
    const { director } = setup()
    expect(() => director.rate(0)).toThrow(RangeError)
    expect(() => director.rate(-1)).toThrow(RangeError)
  })
})

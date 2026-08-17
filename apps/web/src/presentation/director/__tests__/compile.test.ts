import { describe, expect, it } from 'vitest'
import type { Effect } from '@stock-life/engine'
import { compile } from '../compile.ts'
import { SAY_BASE_MS, SAY_MS_PER_CHAR, SCENE_BEATS, sayDuration, sceneEnd } from '../Scene.ts'

describe('compile', () => {
  it('SceneHint 排成演出，StateEffect 排成數字怎麼跳', () => {
    const effects: Effect[] = [
      { type: 'scene.bg', id: 'office' },
      { type: 'scene.actor', id: 'colleague', at: 'right', emote: 'smug' },
      { type: 'scene.say', actor: 'colleague', text: '下季展望很好' },
      { type: 'stat.add', key: 'capital', value: -300_000 },
      { type: 'capital.mul', value: 1.8 },
      { type: 'trait.grant', id: 'diamond_hands' },
    ]

    const plan = compile(effects)

    expect(plan.scenes.map((s) => s.kind)).toEqual(['bg', 'actor', 'say', 'stat', 'multiply', 'badge'])
    expect(plan.scenes[0].start).toBe(0)
    // 起點嚴格遞增（每個 beat 都有 advance）
    for (let i = 1; i < plan.scenes.length; i += 1) {
      expect(plan.scenes[i].start).toBeGreaterThan(plan.scenes[i - 1].start)
    }
    expect(plan.duration).toBe(Math.max(...plan.scenes.map(sceneEnd)))
  })

  it('對話長度隨字數增加，並且會擋住時間軸', () => {
    const short = compile([{ type: 'scene.say', actor: 'a', text: '嗯' }])
    const long = compile([{ type: 'scene.say', actor: 'a', text: '嗯'.repeat(40) }])

    expect(short.duration).toBe(SAY_BASE_MS + SAY_MS_PER_CHAR)
    expect(long.duration).toBeGreaterThan(short.duration)

    // 下一個 scene 要等說完
    const plan = compile([
      { type: 'scene.say', actor: 'a', text: '一二三' },
      { type: 'scene.fx', id: 'crash' },
    ])
    expect(plan.scenes[1].start).toBe(sayDuration('一二三'))
  })

  it('音效與 BGM 是瞬間 cue，不佔時間軸', () => {
    const plan = compile([
      { type: 'scene.sfx', id: 'coin', priority: 'high' },
      { type: 'scene.bgm', id: 'boom', fadeMs: 800 },
      { type: 'stat.add', key: 'nerve', value: 5 },
    ])

    expect(plan.scenes[0]).toMatchObject({ kind: 'sfx', start: 0, duration: 0, priority: 'high' })
    expect(plan.scenes[1]).toMatchObject({ kind: 'bgm', start: 0, fadeMs: 800 })
    // stat 沒有被音效往後推
    expect(plan.scenes[2].start).toBe(0)
    expect(plan.duration).toBe(SCENE_BEATS.stat.duration)
  })

  it('badge 依種類有不同節奏：拿到人格是大事，設 flag 不是', () => {
    const trait = compile([{ type: 'trait.grant', id: 'x' }])
    const flag = compile([{ type: 'flag.set', key: 'leveraged_wipeout' }])
    const queued = compile([{ type: 'event.trigger', eventId: 'drawdown_50' }])

    expect(trait.duration).toBeGreaterThan(flag.duration)
    // 排進佇列的事件只是個標記，它自己的演出等結算時才播
    expect(queued.duration).toBe(0)
  })

  it('effect 的四種 id 都被帶進 badge', () => {
    const plan = compile([
      { type: 'trait.grant', id: 'diamond_hands' },
      { type: 'position.open', opportunityId: 'memory_boom', sizing: 'heavy' },
      { type: 'flag.set', key: 'declined_x' },
      { type: 'event.trigger', eventId: 'family_emergency' },
    ])

    expect(plan.scenes.map((s) => (s.kind === 'badge' ? [s.badge, s.id] : null))).toEqual([
      ['trait', 'diamond_hands'],
      ['position', 'memory_boom'],
      ['flag', 'declined_x'],
      ['event', 'family_emergency'],
    ])
  })

  it('是純函式：同一批 effects 編譯兩次完全相同', () => {
    const effects: Effect[] = [
      { type: 'scene.bg', id: 'crash' },
      { type: 'scene.fx', id: 'red_flash' },
      { type: 'stat.add', key: 'capital', value: -1 },
    ]

    expect(compile(effects)).toEqual(compile(effects))
    // 也不會改到傳進來的東西
    expect(effects).toHaveLength(3)
  })

  it('startAt 可以把演出接在既有時間軸後面', () => {
    const plan = compile([{ type: 'scene.fx', id: 'x' }], { startAt: 1_000 })

    expect(plan.scenes[0].start).toBe(1_000)
    expect(plan.duration).toBe(1_000 + SCENE_BEATS.fx.duration)
  })

  it('空的 effects 編譯出空演出', () => {
    expect(compile([])).toEqual({ scenes: [], duration: 0 })
  })
})

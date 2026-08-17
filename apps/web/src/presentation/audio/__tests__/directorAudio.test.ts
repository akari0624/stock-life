/**
 * §10.7 那七件「最容易做錯、必須實測」的事，這裡測的是與 director 互動的那幾條。
 */
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  createCoreTwSource,
  createLife,
  runLife,
  type Command,
  type ContentSource,
  type Effect,
} from '@stock-life/engine'
import { compile } from '../../director/compile.ts'
import { Director } from '../../director/Director.ts'
import { FakeClock } from '../../director/__tests__/fakeClock.ts'
import { AudioBus } from '../AudioBus.ts'
import { AudioEngine } from '../AudioEngine.ts'
import { AudioResolver } from '../AudioResolver.ts'
import { bindDirectorAudio } from '../directorAudio.ts'
import { FakeOutput, MemoryStorage } from './fakeOutput.ts'

const CONTENT_SFX = {
  whisper: { url: '/audio/whisper.webm', dedupeMs: 0 },
  crash: { url: '/audio/crash.webm', dedupeMs: 0 },
  tick: { url: '/audio/tick.webm', dedupeMs: 150 },
  chime: { url: '/audio/chime.webm', dedupeMs: 0 },
  boom_bgm: { url: '/audio/boom.webm' },
}

const EFFECTS: Effect[] = [
  { type: 'scene.bgm', id: 'boom_bgm', fadeMs: 600 },
  { type: 'scene.sfx', id: 'whisper' },
  { type: 'scene.say', actor: 'colleague', text: '下季展望很好' },
  { type: 'scene.sfx', id: 'crash', priority: 'normal' },
  { type: 'scene.fx', id: 'crash_red' },
  { type: 'scene.sfx', id: 'chime', priority: 'high' },
  { type: 'trait.grant', id: 'diamond_hands' },
]

const setup = (effects: Effect[] = EFFECTS) => {
  const clock = new FakeClock()
  // 音效時鐘與 director 的邏輯時鐘是同一條時間軸
  const output = new FakeOutput(() => clock.time)
  const resolver = new AudioResolver({ contentSfx: CONTENT_SFX })
  for (const entry of Object.values(CONTENT_SFX)) output.available.add(entry.url)
  for (const id of resolver.knownIds()) {
    const url = resolver.resolve(id)?.url
    if (url) output.available.add(url)
  }

  const engine = new AudioEngine({
    output,
    bus: new AudioBus(new MemoryStorage()),
    resolver,
    logMissing: false,
  })
  const director = new Director(clock.options)
  const unbind = bindDirectorAudio(director, engine)
  director.load(compile(effects))

  return {
    clock,
    output,
    engine,
    director,
    unbind,
    advance: (ms: number, step = 16) => clock.advance(ms, step),
  }
}

describe('演出音效', () => {
  it('cue 跨過時發聲', () => {
    const { director, output, advance } = setup()
    director.play()
    advance(3_000)

    expect(output.played.map((request) => request.id)).toContain('whisper')
    expect(output.played.map((request) => request.id)).toContain('crash')
  })

  it('BGM 走 bgm bus，且**沒有任何速率參數**（4× 不變調）', () => {
    const { director, output, advance } = setup()
    director.rate(4)
    director.play()
    advance(3_000)

    const bgm = output.played.filter((request) => request.bus === 'bgm')
    expect(bgm).toHaveLength(1)
    expect(bgm[0]).toMatchObject({ id: 'boom_bgm', fadeMs: 600 })
    // PlayRequest 裡根本沒有速率欄位——結構上不可能變調
    expect(Object.keys(bgm[0])).not.toContain('playbackRate')
    expect(Object.keys(bgm[0])).not.toContain('rate')
  })

  it('rate(4) 不需要「按倍率過濾」：cue 變密，靠 leading-edge debounce 稀釋', () => {
    // 同一個 id 每 220ms 一次（stat scene 的 advance），dedupeMs 150：
    // 1× 時每次都在窗口外 → 全部發聲；4× 時實際間隔只有 55ms → 被稀釋掉
    const ticks: Effect[] = Array.from({ length: 6 }, () => [
      { type: 'scene.sfx', id: 'tick' } as Effect,
      { type: 'stat.add', key: 'nerve', value: 1 } as Effect,
    ]).flat()

    const slow = setup(ticks)
    slow.director.play()
    slow.advance(4_000)

    const fast = setup(ticks)
    fast.director.rate(4)
    fast.director.play()
    fast.advance(4_000)

    const count = (played: { id: string }[]) => played.filter((request) => request.id === 'tick').length
    expect(count(slow.output.played)).toBe(6)
    expect(count(fast.output.played)).toBeLessThan(3)
  })
})

describe('跳過', () => {
  it('沒有音效爆發：normal 不播、high 存活', () => {
    const { director, output } = setup()
    director.play()
    director.finish()

    const ids = output.played.map((request) => request.id)
    // 收合掉的幾十個 cue 裡，只有 high 與 bgm 活下來
    expect(ids).toContain('chime')
    expect(ids).not.toContain('crash')
    expect(ids).toContain('boom_bgm')
  })

  it('跳過同時取消排程中的 normal（debounce 幫不上忙的那一半）', () => {
    const { director, engine, output } = setup()
    director.play()

    // 有人排了一個「200ms 後的定音」與一個 high
    engine.playSound('ui_click', { when: 200, bus: 'sfx', dedupeMs: 0 })
    engine.playSound('ui_error', { when: 200, bus: 'sfx', priority: 'high', dedupeMs: 0 })

    director.finish()

    expect(output.stopped).toContain('ui_click')
    expect(output.stopped).not.toContain('ui_error')
  })

  it('seek 往回不重播（避免回捲時的音爆）', () => {
    const { director, output, advance } = setup()
    director.play()
    advance(4_000)
    const before = output.played.length

    director.seek(0)
    expect(output.played).toHaveLength(before)
  })
})

describe('ui bus 完全不受演出控制影響', () => {
  it('rate(4) 進行中按按鈕仍有音', () => {
    const { director, engine, output, advance } = setup()
    director.rate(4)
    director.play()
    advance(200)

    const before = output.played.length
    engine.playSound('ui_click')
    expect(output.played.length).toBe(before + 1)
    expect(output.played.at(-1)).toMatchObject({ id: 'ui_click', bus: 'ui' })
  })

  it('finish() 之後按按鈕仍有音（最容易做錯的一條）', () => {
    const { director, engine, output } = setup()
    director.play()
    director.finish()

    const before = output.played.length
    engine.playSound('ui_option_select')
    expect(output.played.length).toBe(before + 1)
    expect(output.stopped).not.toContain('ui_option_select')
  })
})

describe('音效不影響模擬', () => {
  it('綁了音效之後，跳過 vs 播完的最終 state 仍然相同', async () => {
    const sources: readonly ContentSource[] = [createCoreTwSource()]
    const outcome = await runLife({ seed: 'audio-s15', sources })
    if (!outcome.ok) throw new Error('runLife failed')
    const commandLog: readonly Command[] = outcome.result.commandLog

    const replay = async (mode: 'play' | 'skip') => {
      const created = await createLife({ seed: 'audio-s15', sources })
      if (!created.ok) throw new Error('createLife failed')

      const clock = new FakeClock()
      const output = new FakeOutput()
      const resolver = new AudioResolver({ contentSfx: CONTENT_SFX })
      for (const entry of Object.values(CONTENT_SFX)) output.available.add(entry.url)
      const engine = new AudioEngine({
        output,
        bus: new AudioBus(new MemoryStorage()),
        resolver,
        logMissing: false,
      })
      const director = new Director(clock.options)
      bindDirectorAudio(director, engine)

      for (const command of commandLog) {
        director.load(compile(created.life.sim.dispatch(command)))
        if (mode === 'skip') director.finish()
        else {
          director.play()
          clock.runUntil(() => director.isFinished())
        }
      }

      return { state: created.life.sim.getSnapshot().state, played: output.played.length }
    }

    const played = await replay('play')
    const skipped = await replay('skip')

    expect(skipped.state).toEqual(played.state)
  })
})

describe('presentation/audio 的紀律', () => {
  const AUDIO_DIR = path.resolve(import.meta.dirname, '..')

  const sources = async (): Promise<{ file: string; content: string }[]> => {
    const entries = await readdir(AUDIO_DIR, { withFileTypes: true })
    return Promise.all(
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
        .map(async (entry) => ({
          file: entry.name,
          content: await readFile(path.join(AUDIO_DIR, entry.name), 'utf8'),
        })),
    )
  }

  it('不得 import 任何 SeededRng / RngStream —— 那會讓同種子跑出不同人生', async () => {
    for (const { file, content } of await sources()) {
      expect(content, file).not.toMatch(/SeededRng|RngStream|rng\.stream/)
    }
  })

  it('不得出現 playbackRate / detune —— BGM 加速不變調是靠「沒有這條程式碼」保證的', async () => {
    for (const { file, content } of await sources()) {
      const code = content
        .split('\n')
        .filter((line) => !/^\s*(?:\/\/|\/\*|\*)/.test(line))
        .join('\n')
      expect(code, file).not.toMatch(/playbackRate|detune/)
    }
  })
})

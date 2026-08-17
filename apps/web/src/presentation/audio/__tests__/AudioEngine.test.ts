import { describe, expect, it, vi } from 'vitest'
import { AudioBus } from '../AudioBus.ts'
import { AudioEngine, MAX_CONCURRENT } from '../AudioEngine.ts'
import { AudioResolver } from '../AudioResolver.ts'
import { UI_SOUNDS, contentSfx, uiActionIds } from '../uiSounds.ts'
import { FakeOutput, MemoryStorage } from './fakeOutput.ts'

interface Harness {
  engine: AudioEngine
  output: FakeOutput
  bus: AudioBus
}

const setup = (options: { contentSfx?: Record<string, { url: string; dedupeMs?: number }> } = {}): Harness => {
  const output = new FakeOutput()
  const bus = new AudioBus(new MemoryStorage())
  const resolver = new AudioResolver({ contentSfx: options.contentSfx ?? {} })
  const engine = new AudioEngine({ output, bus, resolver, logMissing: false })

  // 假設所有已知 id 的音檔都存在（要測政策，不是測缺檔）
  for (const id of resolver.knownIds()) {
    const url = resolver.resolve(id)?.url
    if (url) output.available.add(url)
  }

  return { engine, output, bus }
}

describe('零音檔狀態', () => {
  it('缺音檔就什麼都不做，並記進 would-play 清單', () => {
    const output = new FakeOutput() // available 是空的
    const engine = new AudioEngine({ output, logMissing: false })

    engine.playSound('ui_click')
    engine.playSound('ui_click')
    engine.playSound('ui_transition')

    expect(output.played).toHaveLength(0)
    expect(engine.wouldPlay()).toEqual([
      { id: 'ui_click', count: 2 },
      { id: 'ui_transition', count: 1 },
    ])
  })

  it('完全未知的 id 也只是靜音（不丟例外）', () => {
    const { engine, output } = setup()

    expect(() => engine.playSound(contentSfx('mod_never_heard_of_this'))).not.toThrow()
    expect(output.played).toHaveLength(0)
    expect(engine.wouldPlay().map((entry) => entry.id)).toContain('mod_never_heard_of_this')
  })

  it('dev 模式印 would-play，production 不印', () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {})

    new AudioEngine({ output: new FakeOutput(), logMissing: true }).playSound('ui_click')
    expect(debug).toHaveBeenCalledWith('[audio] would play: ui_click')

    debug.mockClear()
    new AudioEngine({ output: new FakeOutput(), logMissing: false }).playSound('ui_click')
    expect(debug).not.toHaveBeenCalled()

    debug.mockRestore()
  })
})

describe('leading-edge debounce', () => {
  it('第一次呼叫**立即**發聲（不是等窗口結束才發）', () => {
    const { engine, output } = setup()
    engine.playSound('ui_click')

    expect(output.played).toHaveLength(1)
    expect(output.played[0].delayMs).toBe(0)
  })

  it('連續觸發同一個 id 20 次只響少數幾次', () => {
    const { engine, output } = setup()

    for (let i = 0; i < 20; i += 1) {
      output.time += 5 // ui_click 的 dedupeMs 是 40
      engine.playSound('ui_click')
    }

    expect(output.played.length).toBeGreaterThan(0)
    expect(output.played.length).toBeLessThanOrEqual(3)
  })

  it('去重是 per-id 的，不同 id 互不影響', () => {
    const { engine, output } = setup()

    engine.playSound('ui_click')
    engine.playSound('ui_option_select')
    engine.playSound('ui_transition')

    expect(output.played.map((request) => request.id)).toEqual([
      'ui_click',
      'ui_option_select',
      'ui_transition',
    ])
  })

  it('窗口過了就能再響', () => {
    const { engine, output } = setup()

    engine.playSound('ui_click')
    output.time += UI_SOUNDS.ui_click.dedupeMs + 1
    engine.playSound('ui_click')

    expect(output.played).toHaveLength(2)
  })

  it('呼叫端可以覆寫 dedupeMs', () => {
    const { engine, output } = setup()

    engine.playSound('ui_click', { dedupeMs: 0 })
    engine.playSound('ui_click', { dedupeMs: 0 })

    expect(output.played).toHaveLength(2)
  })
})

describe('全域併發上限', () => {
  const manyIds = Object.fromEntries(
    Array.from({ length: 20 }, (_, index) => [`sfx_${index}`, { url: `/audio/sfx_${index}.webm` }]),
  )

  it('同時觸發 20 個**不同** id：per-id 去重完全擋不住，靠上限 8 擋', () => {
    const { engine, output } = setup({ contentSfx: manyIds })

    for (const id of Object.keys(manyIds)) engine.playSound(contentSfx(id), { bus: 'sfx' })

    // 每一個都是它自己的「第一次」，所以 20 個都通過了 debounce
    expect(output.played).toHaveLength(20)
    // 但同時發聲的數量被壓在 8
    expect(output.sounding()).toHaveLength(MAX_CONCURRENT)
    expect(engine.activeCount()).toBe(MAX_CONCURRENT)
    expect(output.stopped).toHaveLength(20 - MAX_CONCURRENT)
  })

  it('丟掉的是最舊的 normal，high 不會被犧牲', () => {
    const { engine, output } = setup({ contentSfx: manyIds })

    engine.playSound(contentSfx('sfx_0'), { bus: 'sfx', priority: 'high' })
    for (let i = 1; i < 12; i += 1) engine.playSound(contentSfx(`sfx_${i}`), { bus: 'sfx' })

    expect(output.stopped).not.toContain('sfx_0')
    expect(output.sounding()).toContain('sfx_0')
  })

  it('聲音結束後額度會回來', () => {
    const { engine, output } = setup({ contentSfx: manyIds })

    for (let i = 0; i < 8; i += 1) engine.playSound(contentSfx(`sfx_${i}`), { bus: 'sfx' })
    expect(engine.activeCount()).toBe(8)

    output.time += output.soundMs + 1
    expect(engine.activeCount()).toBe(0)
  })

  it('BGM 不佔併發額度（同時只有一首，交叉淡入由 output 處理）', () => {
    const { engine, output } = setup({ contentSfx: { ...manyIds, bgm_boom: { url: '/audio/bgm.webm' } } })

    for (let i = 0; i < 8; i += 1) engine.playSound(contentSfx(`sfx_${i}`), { bus: 'sfx' })
    engine.playSound(contentSfx('bgm_boom'), { bus: 'bgm', fadeMs: 800 })

    expect(output.played.at(-1)).toMatchObject({ id: 'bgm_boom', bus: 'bgm', fadeMs: 800 })
  })
})

describe('排程與取消', () => {
  const scheduled = { sfx_settle: { url: '/audio/settle.webm' }, sfx_stinger: { url: '/audio/stinger.webm' } }

  it('有 when 就是排程播', () => {
    const { engine, output } = setup({ contentSfx: scheduled })
    engine.playSound(contentSfx('sfx_settle'), { when: 200, bus: 'sfx' })

    expect(output.played[0]).toMatchObject({ delayMs: 200, bus: 'sfx' })
  })

  it('cancelScheduled 取消還沒發聲的 normal，high 存活', () => {
    const { engine, output } = setup({ contentSfx: scheduled })

    engine.playSound(contentSfx('sfx_settle'), { when: 500, bus: 'sfx' })
    engine.playSound(contentSfx('sfx_stinger'), { when: 500, bus: 'sfx', priority: 'high' })

    expect(engine.cancelScheduled('normal')).toBe(1)
    expect(output.stopped).toEqual(['sfx_settle'])
  })

  it('已經在發聲的不會被取消（那會變成硬切）', () => {
    const { engine, output } = setup({ contentSfx: scheduled })

    engine.playSound(contentSfx('sfx_settle'), { when: 0, bus: 'sfx' })
    output.time += 10

    expect(engine.cancelScheduled('normal')).toBe(0)
    expect(output.stopped).toHaveLength(0)
  })

  it('ui bus 永遠不會被取消——按鈕回饋音不該因跳過而消失', () => {
    const { engine, output } = setup()

    engine.playSound('ui_click', { when: 500, bus: 'ui' })
    engine.cancelScheduled('all')

    expect(output.stopped).toHaveLength(0)
  })
})

describe('bus 路由', () => {
  it('沒有 when 就是互動音效（ui bus）', () => {
    const { engine, output } = setup()
    engine.playSound('ui_click')

    expect(output.played[0].bus).toBe('ui')
  })

  it('內容包的 sfx 預設走 sfx bus', () => {
    const { engine, output } = setup({ contentSfx: { crash: { url: '/audio/crash.webm' } } })
    engine.playSound(contentSfx('crash'))

    expect(output.played[0].bus).toBe('sfx')
  })

  it('內容包不能覆寫介面音（介面音不屬於遊戲內容）', () => {
    const { engine, output } = setup({ contentSfx: { ui_click: { url: '/audio/mod_click.webm' } } })
    engine.playSound('ui_click')

    expect(output.played[0].url).toBe(UI_SOUNDS.ui_click.url)
    expect(engine.resolver().blockedOverrides()).toEqual(['ui_click'])
  })

  it('audio sprite 的 offset/duration 會傳下去', () => {
    const output = new FakeOutput()
    const resolver = new AudioResolver({
      contentSfx: { coin: { url: '/audio/sprite.webm', offset: 1.5, duration: 0.4 } },
    })
    output.available.add('/audio/sprite.webm')
    const engine = new AudioEngine({ output, resolver, logMissing: false })

    engine.playSound(contentSfx('coin'))
    expect(output.played[0]).toMatchObject({ offset: 1.5, duration: 0.4 })
  })
})

describe('音量與靜音', () => {
  it('靜音是把 gain 歸零，不是逐一操作 source', () => {
    const { engine, output } = setup()

    engine.setMuted('sfx', true)
    expect(engine.gain('sfx')).toBe(0)
    // ui 跟著 sfx（玩家想安靜就是想安靜）
    expect(engine.gain('ui')).toBe(0)
    expect(engine.gain('bgm')).toBeGreaterThan(0)

    // 靜音之後 source 照樣建立（gain 決定聽不聽得到）
    engine.playSound('ui_click')
    expect(output.played).toHaveLength(1)
  })

  it('bgm 與 sfx 的設定分開，且存進 storage', () => {
    const storage = new MemoryStorage()
    const first = new AudioEngine({ output: new FakeOutput(), bus: new AudioBus(storage), logMissing: false })

    first.setVolume('bgm', 0.2)
    first.setMuted('sfx', true)

    const second = new AudioEngine({ output: new FakeOutput(), bus: new AudioBus(storage), logMissing: false })
    expect(second.settings('bgm')).toEqual({ volume: 0.2, muted: false })
    expect(second.settings('sfx')).toEqual({ volume: 0.8, muted: true })
  })

  it('gain 變化會同步到 output（GainNode）', () => {
    const output = new FakeOutput()
    const bus = new AudioBus(new MemoryStorage())
    // WebAudioOutput 是靠 bus.onChange 同步的；這裡直接驗 bus 的通知
    const seen: [string, number][] = []
    bus.onChange((target, gain) => seen.push([target, gain]))
    bus.setMuted('bgm', true)

    expect(seen).toContainEqual(['bgm', 0])
    expect(output.played).toHaveLength(0)
  })
})

describe('autoplay unlock', () => {
  it('手勢之前是 locked，unlock() 之後才 running', async () => {
    const { engine, output } = setup()

    expect(engine.isLocked()).toBe(true)
    await engine.unlock()
    expect(output.unlockCalls).toBe(1)
    expect(engine.isLocked()).toBe(false)
  })
})

describe('ActionId 型別', () => {
  it('列得出所有互動音效 id（dev 測試頁用）', () => {
    expect(uiActionIds()).toContain('ui_click')
    expect(uiActionIds().every((id) => id.startsWith('ui_'))).toBe(true)
  })

  it('打錯字是編譯期錯誤', () => {
    const { engine } = setup()
    // @ts-expect-error 'ui_clik' 不是 ActionId —— 這一行的錯誤就是本測試的斷言
    engine.playSound('ui_clik')
  })
})

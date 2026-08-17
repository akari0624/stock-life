import { AudioBus } from './AudioBus.ts'
import { BUSES, type AudioOutput, type Bus, type PlayHandle, type PlayRequest } from './types.ts'

/**
 * 真正發聲的那一層：`AudioContext` + 預先 decode 的 `AudioBuffer` +
 * `source.start(when)`——取樣級精確排程，能跟 director 的時間軸對齊。
 *
 * **不用 `<audio>` 元素**（§10.7）：播放延遲不可預測，且大量並發會失控。
 *
 * ⚠️ 這個檔案**永遠不設定 `playbackRate` / `detune`**。
 * 4× 音高聽起來就是壞掉，所以「BGM 加速不變調」是靠「根本沒有這條程式碼」保證的，
 * 不是靠某個 if。有一個測試掃這個目錄擋掉這兩個屬性。
 */

const CONTEXT_UNAVAILABLE = 'AudioContext unavailable'

export class WebAudioOutput implements AudioOutput {
  readonly bus: AudioBus
  private context: AudioContext | undefined
  private gains = new Map<Bus, GainNode>()
  private readonly buffers = new Map<string, AudioBuffer>()
  private readonly failed = new Set<string>()
  private current = new Map<Bus, AudioBufferSourceNode>()

  constructor(bus: AudioBus = new AudioBus()) {
    this.bus = bus
    this.bus.onChange((target, gain) => {
      const node = this.gains.get(target)
      if (node && this.context) node.gain.setTargetAtTime(gain, this.context.currentTime, 0.02)
    })
  }

  nowMs(): number {
    return performance.now()
  }

  isLocked(): boolean {
    // 還沒建 context 也算 locked：使用者手勢之前不可能有聲音
    return this.context?.state !== 'running'
  }

  /** 首次使用者手勢時呼叫（S16 把它綁在「開始人生」按鈕上）。 */
  async unlock(): Promise<void> {
    const context = this.ensureContext()
    if (!context) return
    if (context.state !== 'running') await context.resume()
  }

  setGain(bus: Bus, value: number): void {
    const node = this.gains.get(bus)
    if (node && this.context) node.gain.setTargetAtTime(value, this.context.currentTime, 0.02)
  }

  async load(urls: readonly string[]): Promise<void> {
    const context = this.ensureContext()
    if (!context) return

    await Promise.all(
      [...new Set(urls)].map(async (url) => {
        if (this.buffers.has(url) || this.failed.has(url)) return
        try {
          const response = await fetch(url)
          if (!response.ok) throw new Error(String(response.status))
          this.buffers.set(url, await context.decodeAudioData(await response.arrayBuffer()))
        } catch {
          // 缺檔就是缺檔：記下來別再試，production 不印警告（§10.7）
          this.failed.add(url)
        }
      }),
    )
  }

  play(request: PlayRequest): PlayHandle | undefined {
    const context = this.ensureContext()
    const buffer = this.buffers.get(request.url)
    if (!context || !buffer) return undefined

    const gain = this.gains.get(request.bus)
    if (!gain) return undefined

    const source = context.createBufferSource()
    source.buffer = buffer

    const startAt = context.currentTime + Math.max(0, request.delayMs) / 1000
    const duration = request.duration ?? buffer.duration - (request.offset ?? 0)

    if (request.bus === 'bgm') {
      source.loop = true
      this.crossfade(context, gain, source, request.fadeMs ?? 0, startAt)
    } else {
      source.connect(gain)
    }

    source.start(startAt, request.offset ?? 0, request.bus === 'bgm' ? undefined : duration)

    return {
      endsAt: this.nowMs() + Math.max(0, request.delayMs) + duration * 1000,
      stop: () => {
        try {
          source.stop()
        } catch {
          // 已經結束的 source 再 stop 會丟
        }
      },
    }
  }

  private crossfade(
    context: AudioContext,
    busGain: GainNode,
    next: AudioBufferSourceNode,
    fadeMs: number,
    startAt: number,
  ): void {
    const fade = Math.max(0, fadeMs) / 1000
    const envelope = context.createGain()
    envelope.gain.setValueAtTime(fade > 0 ? 0 : 1, startAt)
    if (fade > 0) envelope.gain.linearRampToValueAtTime(1, startAt + fade)
    next.connect(envelope).connect(busGain)

    const previous = this.current.get('bgm')
    if (previous) {
      try {
        previous.stop(startAt + fade)
      } catch {
        // 同上
      }
    }
    this.current.set('bgm', next)
  }

  private ensureContext(): AudioContext | undefined {
    if (this.context) return this.context
    if (typeof AudioContext === 'undefined') return undefined

    try {
      const context = new AudioContext()
      this.context = context
      this.gains = new Map(
        BUSES.map((bus) => {
          const node = context.createGain()
          node.gain.value = this.bus.gain(bus)
          node.connect(context.destination)
          return [bus, node]
        }),
      )
      return context
    } catch {
      // jsdom／舊瀏覽器：整套維持靜音運作
      if (import.meta.env.DEV) console.debug(`[audio] ${CONTEXT_UNAVAILABLE}`)
      return undefined
    }
  }
}

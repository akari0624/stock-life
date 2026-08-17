import { AudioBus } from './AudioBus.ts'
import { AudioResolver } from './AudioResolver.ts'
import type { AssetManifest } from '../assets/AssetManifest.ts'
import type { ActionId } from './uiSounds.ts'
import type {
  AudioOutput,
  Bus,
  BusSettings,
  PersistedBus,
  PlayHandle,
  PlayOptions,
  Priority,
} from './types.ts'

/**
 * 音效的**政策層**（§10.7）。所有規則只有這一個地方需要正確：
 *
 * - **leading-edge** per-id 去重（不是 trailing——trailing 會讓 click 音遲到）
 * - **全域併發上限 8**，爆掉時丟最舊的 `normal`
 *   （per-id 去重擋不住幾十個**不同** id 同時湧入）
 * - **跳過取消**排程中的 `normal`，`high` 存活
 *   （這條也不能用 debounce 代替，理由同上）
 * - 缺檔就什麼都不做，dev 模式記 would-play
 *
 * ⚠️ `ui` bus **完全不受 rate/finish 影響**——它根本不走 director。
 * 按鈕回饋音因為快轉而消失，介面會感覺壞掉。
 */

export const MAX_CONCURRENT = 8
export const DEFAULT_DEDUPE_MS = 80

interface ActiveSound {
  id: string
  bus: Bus
  priority: Priority
  /** 何時開始發聲（ms，output 時鐘） */
  startsAt: number
  handle: PlayHandle
}

export interface AudioEngineOptions {
  output: AudioOutput
  /** 音量／靜音設定（與 output 共用同一個實例，output 負責把 gain 同步到 GainNode） */
  bus?: AudioBus
  resolver?: AudioResolver
  /** dev 模式印 would-play；測試裡關掉 */
  logMissing?: boolean
  maxConcurrent?: number
  defaultDedupeMs?: number
}

export class AudioEngine {
  private readonly output: AudioOutput
  private readonly buses: AudioBus
  private resolverRef: AudioResolver
  private readonly logMissing: boolean
  private readonly maxConcurrent: number
  private readonly defaultDedupeMs: number

  private readonly lastPlayed = new Map<string, number>()
  private active: ActiveSound[] = []

  constructor(options: AudioEngineOptions) {
    this.output = options.output
    this.buses = options.bus ?? new AudioBus()
    this.resolverRef = options.resolver ?? new AudioResolver()
    this.logMissing = options.logMissing ?? import.meta.env.DEV
    this.maxConcurrent = options.maxConcurrent ?? MAX_CONCURRENT
    this.defaultDedupeMs = options.defaultDedupeMs ?? DEFAULT_DEDUPE_MS
  }

  /**
   * **全專案唯一的音效入口。** 互動音效與演出音效共用它，差別只在有沒有 `when`。
   */
  playSound(id: ActionId, options: PlayOptions = {}): void {
    const sound = this.resolverRef.resolve(id)
    if (!sound) {
      this.missing(id)
      return
    }

    const bus: Bus = options.bus ?? sound.bus ?? (options.when === undefined ? 'ui' : 'sfx')
    const priority: Priority = options.priority ?? sound.priority ?? 'normal'
    const dedupeMs = options.dedupeMs ?? sound.dedupeMs ?? this.defaultDedupeMs
    const delayMs = Math.max(0, options.when ?? 0)
    const now = this.output.nowMs()
    const startsAt = now + delayMs

    // leading-edge：立刻發聲，然後在 dedupeMs 內抑制同 id 的重複
    const previous = this.lastPlayed.get(id)
    if (previous !== undefined && startsAt - previous < dedupeMs) return

    this.prune(now)
    if (!this.makeRoom(bus)) return

    const handle = this.output.play({
      id,
      url: sound.url,
      bus,
      delayMs,
      offset: sound.offset,
      duration: sound.duration,
      fadeMs: options.fadeMs,
    })

    if (!handle) {
      // manifest 有這筆但沒有 buffer（還沒補音檔）→ 同樣是 would-play
      this.missing(id)
      return
    }

    this.lastPlayed.set(id, startsAt)
    this.active.push({ id, bus, priority, startsAt, handle })
  }

  /**
   * 跳過／`finish()` 時呼叫：取消**排程中**（還沒發聲）的音效。
   * 預設只取消 `normal`——按下跳過，玩家還是會想聽到結算那一下的定音。
   * `ui` bus 永不受影響。
   */
  cancelScheduled(priority: Priority | 'all' = 'normal'): number {
    const now = this.output.nowMs()
    const survivors: ActiveSound[] = []
    let cancelled = 0

    for (const sound of this.active) {
      const scheduled = sound.startsAt > now
      const matches = priority === 'all' || sound.priority === priority
      if (scheduled && matches && sound.bus !== 'ui') {
        sound.handle.stop()
        cancelled += 1
        continue
      }
      survivors.push(sound)
    }

    this.active = survivors
    return cancelled
  }

  /** 目前正在發聲或已排程的數量（併發上限的觀測點）。 */
  activeCount(): number {
    this.prune(this.output.nowMs())
    return this.active.length
  }

  isLocked(): boolean {
    return this.output.isLocked()
  }

  unlock(): Promise<void> {
    return this.output.unlock()
  }

  resolver(): AudioResolver {
    return this.resolverRef
  }

  /** 內容包載入後注入它的 `assets.sfx`（S16 的組裝點會呼叫）。 */
  useContentSfx(contentSfx: AssetManifest['sfx']): void {
    this.resolverRef.useContentSfx(contentSfx)
    void this.output.load(
      this.resolverRef
        .knownIds()
        .map((id) => this.resolverRef.resolve(id)?.url)
        .filter((url): url is string => Boolean(url)),
    )
  }

  wouldPlay(): { id: string; count: number }[] {
    return this.resolverRef.wouldPlay()
  }

  settings(bus: PersistedBus): BusSettings {
    return this.buses.get(bus)
  }

  setVolume(bus: PersistedBus, volume: number): void {
    this.buses.setVolume(bus, volume)
  }

  setMuted(bus: PersistedBus, muted: boolean): void {
    this.buses.setMuted(bus, muted)
  }

  toggleMuted(bus: PersistedBus): boolean {
    return this.buses.toggleMuted(bus)
  }

  /** 目前這條 bus 的實際 gain（靜音時是 0）。 */
  gain(bus: Bus): number {
    return this.buses.gain(bus)
  }

  // ── 內部 ──────────────────────────────────────────────────────────────────

  private missing(id: string): void {
    this.resolverRef.recordWouldPlay(id)
    if (this.logMissing) console.debug(`[audio] would play: ${id}`)
  }

  private prune(now: number): void {
    this.active = this.active.filter((sound) => sound.handle.endsAt > now)
  }

  /**
   * 併發上限。滿了就丟最舊的 `normal`；一個 `normal` 都沒有時
   * （八個都是 `high`）就放棄新的那個——不能拿 `high` 去換 `high`。
   */
  private makeRoom(bus: Bus): boolean {
    // BGM 同時只有 1，換掉舊的那首是 output 的 crossfade 在做，不佔併發額度
    if (bus === 'bgm') return true
    if (this.active.length < this.maxConcurrent) return true

    let oldestIndex = -1
    for (const [index, sound] of this.active.entries()) {
      if (sound.priority !== 'normal') continue
      if (oldestIndex === -1 || sound.startsAt < this.active[oldestIndex].startsAt) oldestIndex = index
    }
    if (oldestIndex === -1) return false

    this.active[oldestIndex].handle.stop()
    this.active.splice(oldestIndex, 1)
    return true
  }
}

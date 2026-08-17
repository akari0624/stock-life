import { BUSES, PERSISTED_BUSES, type Bus, type BusSettings, type PersistedBus } from './types.ts'

/**
 * 三條獨立匯流排（§10.7）：`bgm` / `sfx` / `ui`，各一個 GainNode。
 *
 * 把 BGM 和 SFX 混在一起是這類系統最常見的錯誤——生命週期、並發數、
 * 音量控制、持久化偏好全都不同。
 *
 * 這個 class 只管「音量設定與持久化」這件事；真正的 GainNode 由
 * WebAudioOutput 建立並訂閱這裡的變化，所以政策層在沒有 AudioContext 時也能測。
 */

export const STORAGE_PREFIX = 'stock-life.audio.'

const DEFAULT_SETTINGS: Record<PersistedBus, BusSettings> = {
  bgm: { volume: 0.5, muted: false },
  sfx: { volume: 0.8, muted: false },
}

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const isBusSettings = (value: unknown): value is BusSettings =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as BusSettings).volume === 'number' &&
  typeof (value as BusSettings).muted === 'boolean'

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value))

export class AudioBus {
  private readonly settings: Record<PersistedBus, BusSettings>
  private readonly storage: StorageLike | undefined
  private readonly listeners = new Set<(bus: Bus, gain: number) => void>()

  constructor(storage: StorageLike | undefined = defaultStorage()) {
    this.storage = storage
    this.settings = {
      bgm: this.read('bgm'),
      sfx: this.read('sfx'),
    }
  }

  /** `ui` 沒有自己的持久化設定，跟著 `sfx`（§10.7 只要求 bgm 與 sfx 分開）。 */
  private settingsFor(bus: Bus): BusSettings {
    return bus === 'bgm' ? this.settings.bgm : this.settings.sfx
  }

  gain(bus: Bus): number {
    const settings = this.settingsFor(bus)
    return settings.muted ? 0 : settings.volume
  }

  get(bus: PersistedBus): BusSettings {
    return { ...this.settings[bus] }
  }

  setVolume(bus: PersistedBus, volume: number): void {
    this.settings[bus] = { ...this.settings[bus], volume: clamp01(volume) }
    this.persist(bus)
  }

  setMuted(bus: PersistedBus, muted: boolean): void {
    this.settings[bus] = { ...this.settings[bus], muted }
    this.persist(bus)
  }

  toggleMuted(bus: PersistedBus): boolean {
    const next = !this.settings[bus].muted
    this.setMuted(bus, next)
    return next
  }

  /** WebAudioOutput 用這個把 gain 同步到 GainNode。 */
  onChange(listener: (bus: Bus, gain: number) => void): () => void {
    this.listeners.add(listener)
    for (const bus of BUSES) listener(bus, this.gain(bus))
    return () => {
      this.listeners.delete(listener)
    }
  }

  private persist(bus: PersistedBus): void {
    try {
      this.storage?.setItem(`${STORAGE_PREFIX}${bus}`, JSON.stringify(this.settings[bus]))
    } catch {
      // 無痕視窗可能連 setItem 都會丟——音量記不住不是錯誤
    }
    for (const target of BUSES) {
      if (target === 'bgm' ? bus === 'bgm' : bus === 'sfx') {
        for (const listener of this.listeners) listener(target, this.gain(target))
      }
    }
  }

  private read(bus: PersistedBus): BusSettings {
    try {
      const raw = this.storage?.getItem(`${STORAGE_PREFIX}${bus}`)
      if (raw) {
        const parsed: unknown = JSON.parse(raw)
        if (isBusSettings(parsed)) return { volume: clamp01(parsed.volume), muted: parsed.muted }
      }
    } catch {
      // 壞掉的設定就當沒有
    }
    return { ...DEFAULT_SETTINGS[bus] }
  }
}

export const persistedBuses = (): readonly PersistedBus[] => PERSISTED_BUSES

function defaultStorage(): StorageLike | undefined {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

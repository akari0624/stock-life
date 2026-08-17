import {
  createCoreTwSource,
  createLife,
  decodeShareCode,
  type ContentSource,
  type Manifest,
} from '@stock-life/engine'
import { themes, type Theme } from '@stock-life/tokens/keys'
import { GameSession } from './GameSession.ts'
import { audioEngine, isAudioLocked, playSound, unlockAudio } from '../presentation/audio/playSound.ts'

/**
 * 畫面狀態機（**無 router**：§10.1）+ 一局遊戲的生命週期。
 *
 * 這是 app 的唯一組裝點：把內容包、引擎（`createLife`）、演出、音效接起來。
 * UI 用 `useSyncExternalStore` 訂閱這裡，所以沒有任何狀態管理套件。
 */

/** `dev` 不是遊戲畫面，是 S12／S15 的手動驗證頁（`src/dev/`）。 */
export type Screen = 'title' | 'game' | 'settlement' | 'packs' | 'dev'

export type WorldMode = 'random' | 'history'

export interface TitleSettings {
  name: string
  startYear: number
  worldMode: WorldMode
  seedInput: string
  theme: Theme
}

export interface AppSnapshot {
  screen: Screen
  settings: TitleSettings
  session: GameSession | undefined
  /** 內容包載入或分享碼解不開時的可行動訊息 */
  error: string | undefined
  starting: boolean
  audioLocked: boolean
  packs: readonly Manifest[]
}

export const START_YEARS = [1990, 2000, 2010] as const

const DEFAULT_SETTINGS: TitleSettings = {
  name: '無名氏',
  startYear: 1990,
  worldMode: 'random',
  seedInput: '',
  theme: 'default',
}

/**
 * 種子輸入接三種寫法：分享碼（`指紋.種子`）、純數字、或留空（隨機）。
 * ⚠️ 這裡的 `Math.random()` 是**選種子**用的，不是遊戲邏輯——種子一旦定了，
 * 整局就完全決定（§5.1）。`presentation`／`app` 層允許用它（§5.3 只擋 engine）。
 */
export interface ParsedSeed {
  seed: number
  /** 分享碼裡帶的指紋，用來事後比對 */
  fingerprint?: number
  error?: string
}

export function parseSeedInput(input: string): ParsedSeed {
  const trimmed = input.trim()
  if (trimmed.length === 0) return { seed: Math.floor(Math.random() * 2 ** 31) }

  if (trimmed.includes('.')) {
    const decoded = decodeShareCode(trimmed)
    if (!decoded.ok) return { seed: 0, error: `分享碼格式不對：${trimmed}` }
    return { seed: decoded.seed, fingerprint: decoded.fingerprint }
  }

  const numeric = Number.parseInt(trimmed, 10)
  if (!Number.isSafeInteger(numeric) || numeric < 0) {
    return { seed: 0, error: `種子要是非負整數或分享碼，收到「${trimmed}」` }
  }
  return { seed: numeric }
}

export class AppStore {
  private readonly listeners = new Set<() => void>()
  private readonly sources: readonly ContentSource[]
  private snapshot: AppSnapshot = {
    screen: 'title',
    settings: DEFAULT_SETTINGS,
    session: undefined,
    error: undefined,
    starting: false,
    audioLocked: true,
    packs: [],
  }

  constructor(sources: readonly ContentSource[] = [createCoreTwSource()]) {
    this.sources = sources
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = (): AppSnapshot => this.snapshot

  setSettings(patch: Partial<TitleSettings>): void {
    this.patch({ settings: { ...this.snapshot.settings, ...patch } })
    if (patch.theme && themes.includes(patch.theme)) {
      document.documentElement.dataset.theme = patch.theme
    }
  }

  goto(screen: Screen): void {
    playSound(screen === 'title' ? 'ui_back' : 'ui_transition')
    this.patch({ screen })
  }

  /**
   * 「開始人生」——**這個按鈕同時是 audio unlock 的手勢**（§10.7）。
   * autoplay 政策要求首次手勢才能 resume()，標題頁的這一下天然就是那個手勢。
   */
  async startLife(): Promise<void> {
    if (this.snapshot.starting) return

    void unlockAudio().then(() => this.refreshAudioLock())
    playSound('ui_life_start')

    const { settings } = this.snapshot
    const parsed = parseSeedInput(settings.seedInput)
    if (parsed.error) {
      this.patch({ error: parsed.error })
      return
    }

    this.patch({ starting: true, error: undefined })

    const created = await createLife({
      seed: parsed.seed,
      sources: this.sources,
      name: settings.name.trim() || DEFAULT_SETTINGS.name,
      startYear: settings.startYear,
    })

    if (!created.ok) {
      this.patch({
        starting: false,
        error: `內容包載入失敗：${created.errors.map((issue) => `${issue.path}: ${issue.message}`).join('；')}`,
      })
      return
    }

    // 分享碼帶的指紋不符 → 明確說出來，不要靜默跑出另一段人生（§5.1）
    if (parsed.fingerprint !== undefined && parsed.fingerprint !== created.life.fingerprint) {
      this.patch({
        starting: false,
        error: '這組分享碼是用另一套內容包產生的，同一段人生無法重現（請確認已載入相同的內容包與版本）。',
      })
      return
    }

    this.snapshot.session?.dispose()
    this.patch({
      starting: false,
      screen: 'game',
      session: new GameSession({ life: created.life, seed: parsed.seed, audio: audioEngine() }),
      packs: created.life.content.manifests,
      error: undefined,
    })
  }

  /** 一局結束 → 結算畫面。 */
  finish(): void {
    playSound('ui_transition')
    this.patch({ screen: 'settlement' })
  }

  backToTitle(): void {
    playSound('ui_back')
    this.snapshot.session?.dispose()
    this.patch({ screen: 'title', session: undefined })
  }

  refreshAudioLock(): void {
    const locked = isAudioLocked()
    if (locked !== this.snapshot.audioLocked) this.patch({ audioLocked: locked })
  }

  dismissError(): void {
    if (this.snapshot.error) this.patch({ error: undefined })
  }

  private patch(patch: Partial<AppSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch }
    for (const listener of this.listeners) listener()
  }
}

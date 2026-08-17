import {
  createCoreTwSource,
  createLife,
  decodeShareCode,
  describePacks,
  restoreLife,
  type ContentSource,
  type Manifest,
  type SaveError,
  type SaveFile,
} from '@stock-life/engine'
import { themes, type Theme } from '@stock-life/tokens/keys'
import { GameSession } from './GameSession.ts'
import { SaveStorage } from './save/SaveStorage.ts'
import { readShareCode, writeShareCode } from './save/shareUrl.ts'
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
  /** 上一局的存檔（`seed + 指紋 + commandLog`），標題頁用它決定要不要顯示「繼續」 */
  saved: SaveFile | undefined
  /** 存檔壞掉／版本不合時的說明，讓玩家知道為什麼沒有「繼續」可按 */
  saveIssue: string | undefined
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

export interface AppStoreOptions {
  sources?: readonly ContentSource[]
  storage?: SaveStorage
  /** 測試注入查詢字串；預設讀網址列的 `?s=` */
  search?: string
  /** 續玩／重播時要不要改網址列（測試關掉） */
  syncUrl?: boolean
}

/**
 * 存檔錯誤 → 玩家能據以行動的中文訊息（判準：不可以靜默跑錯）。
 * 引擎給的是結構化錯誤（含它需要哪些包），這裡只負責把它說成人話。
 */
export function explainSaveError(error: SaveError): string {
  switch (error.kind) {
    case 'fingerprint_mismatch':
      return `這個存檔需要 ${describePacks(error.required ?? [])}，但目前載入的是 ${describePacks(
        error.loaded ?? [],
      )}。請載入相同的內容包與版本再繼續，否則同一段人生無法重現。`
    case 'content_invalid':
      return `存檔要的內容包載不起來：${(error.issues ?? [])
        .slice(0, 3)
        .map((issue) => `${issue.section}/${issue.path.join('.')}: ${issue.message}`)
        .join('；')}`
    case 'from_the_future':
      return '這個存檔是更新版本的遊戲寫的，這一版讀不了。'
    case 'no_migration':
      return '這個存檔的格式太舊，沒有可用的升級路徑。'
    default:
      return `存檔讀不出來：${error.message}`
  }
}

export class AppStore {
  private readonly listeners = new Set<() => void>()
  private readonly sources: readonly ContentSource[]
  private readonly storage: SaveStorage
  private readonly syncUrl: boolean
  private unsubscribeSession: (() => void) | undefined
  private snapshot: AppSnapshot = {
    screen: 'title',
    settings: DEFAULT_SETTINGS,
    session: undefined,
    error: undefined,
    starting: false,
    audioLocked: true,
    packs: [],
    saved: undefined,
    saveIssue: undefined,
  }

  constructor(options: AppStoreOptions = {}) {
    this.sources = options.sources ?? [createCoreTwSource()]
    this.storage = options.storage ?? new SaveStorage()
    this.syncUrl = options.syncUrl ?? true

    // 網址列裡的 `?s=<分享碼>` 直接變成種子輸入——貼連結給朋友就是這樣運作的
    const shared = readShareCode(options.search)
    const settings = shared ? { ...DEFAULT_SETTINGS, seedInput: shared } : DEFAULT_SETTINGS

    const read = this.storage.read()
    this.snapshot = {
      ...this.snapshot,
      settings,
      saved: read.status === 'ok' ? read.save : undefined,
      saveIssue: read.status === 'invalid' ? `存檔讀不出來（${read.message}），只能重新開始。` : undefined,
    }
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

    // 新的一局蓋掉舊存檔（存檔只有一格：第一版沒有多存檔位）
    this.storage.clear()
    this.attach(new GameSession({ life: created.life, seed: parsed.seed, audio: audioEngine() }), created.life.content.manifests)
  }

  /**
   * 續玩：把存檔的 commandLog 快轉重播回來（§5.1 / TODO #4）。
   * 存的不是狀態快照，所以這裡走的是與當初一模一樣的模擬路徑。
   */
  async continueSave(): Promise<void> {
    await this.resume('continue')
  }

  /** 重播模式：同一份 log，交給 director 一步一步演出來。 */
  async replaySave(): Promise<void> {
    await this.resume('replay')
  }

  clearSave(): void {
    playSound('ui_back')
    this.storage.clear()
    this.patch({ saved: undefined, saveIssue: undefined })
  }

  private async resume(mode: 'continue' | 'replay'): Promise<void> {
    const save = this.snapshot.saved
    if (!save || this.snapshot.starting) return

    void unlockAudio().then(() => this.refreshAudioLock())
    playSound('ui_life_start')
    this.patch({ starting: true, error: undefined })

    // 兩種模式都由 GameSession 自己餵 command：續玩是一次快轉、重播是一步一步演，
    // 走的都是同一條 `sim.dispatch()`，所以兩者落在同一個狀態上。
    const restored = await restoreLife({ save, sources: this.sources, applyLog: false })
    if (!restored.ok) {
      this.patch({ starting: false, error: explainSaveError(restored.error) })
      return
    }

    const seed = typeof save.seed === 'number' ? save.seed : Number(save.seed)
    this.attach(
      new GameSession({
        life: restored.life,
        seed: Number.isFinite(seed) ? seed : 0,
        audio: audioEngine(),
        ...(mode === 'continue' ? { restore: restored.commandLog } : { replay: restored.commandLog }),
      }),
      restored.life.content.manifests,
    )
  }

  /** 一局結束 → 結算畫面。 */
  finish(): void {
    playSound('ui_transition')
    this.patch({ screen: 'settlement' })
  }

  backToTitle(): void {
    playSound('ui_back')
    this.detachSession()
    const read = this.storage.read()
    this.patch({
      screen: 'title',
      session: undefined,
      saved: read.status === 'ok' ? read.save : undefined,
      saveIssue: read.status === 'invalid' ? `存檔讀不出來（${read.message}），只能重新開始。` : undefined,
    })
  }

  /**
   * 接上一個新 session：進遊戲畫面、把分享碼寫進網址列、並在**每個 command 之後**
   * 自動存檔。存檔便宜（一串 command），所以不需要「儲存」按鈕。
   */
  private attach(session: GameSession, packs: readonly Manifest[]): void {
    this.detachSession()

    const autosave = (): void => {
      if (session.getSnapshot().mode !== 'play') return // 重播中不覆蓋存檔
      const written = this.storage.write(session.life)
      // 刻意不 patch()：存檔每個 command 發生一次，通知會讓整個畫面白重繪一輪。
      // 標題頁下次要看存檔時是重新讀 storage 的（`backToTitle`）。
      if (written) this.snapshot = { ...this.snapshot, saved: written }
    }
    this.unsubscribeSession = session.subscribe(autosave)
    autosave()

    if (this.syncUrl) writeShareCode(session.shareCode)

    this.patch({ starting: false, screen: 'game', session, packs, error: undefined })
  }

  private detachSession(): void {
    this.unsubscribeSession?.()
    this.unsubscribeSession = undefined
    this.snapshot.session?.dispose()
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

/**
 * 音效的共用型別（DESIGN.md §10.7）。
 *
 * 分層：`playSound()` → `AudioEngine`（政策：去重、併發上限、排程取消、靜音）
 * → `AudioOutput`（真正發聲：Web Audio 的 AudioContext / GainNode / AudioBuffer）。
 *
 * 政策全部在 engine，output 很薄——所以「跳過不爆音」「同 id 去重」這些規則
 * 可以在沒有 AudioContext 的環境（jsdom）裡被測到。
 */

export type Bus = 'bgm' | 'sfx' | 'ui'
export type Priority = 'high' | 'normal'

export const BUSES: readonly Bus[] = ['bgm', 'sfx', 'ui']

export interface PlayOptions {
  /**
   * 演出音效：從現在起算幾毫秒後發聲（對齊 director 的節拍）。
   * **有沒有 `when` 是兩條路徑的分水嶺**：沒有 = 互動音效（`ui` bus、不受 rate/finish 影響），
   * 有 = 排程音效（可被跳過取消）。
   */
  when?: number
  bus?: Bus
  priority?: Priority
  /** leading-edge 去重視窗；沒給就用 manifest 的設定 */
  dedupeMs?: number
  /** BGM 交叉淡入淡出 */
  fadeMs?: number
}

export interface PlayRequest {
  id: string
  url: string
  bus: Bus
  /** 0 = 立刻 */
  delayMs: number
  /** audio sprite：從檔案的第幾秒開始、播多長（秒） */
  offset?: number
  duration?: number
  fadeMs?: number
}

export interface PlayHandle {
  /** 大約什麼時候結束（與 `AudioOutput.nowMs()` 同一個時鐘） */
  endsAt: number
  stop(): void
}

export interface AudioOutput {
  nowMs(): number
  /** autoplay 政策：使用者手勢前一定是 locked（§10.7 的頭號坑） */
  isLocked(): boolean
  unlock(): Promise<void>
  setGain(bus: Bus, value: number): void
  /**
   * 真的發聲。**沒有這個 url 的 buffer 就回 `undefined`——什麼都不做**
   * （不報錯、production 不印警告）。零音檔狀態下整套流程照跑。
   */
  play(request: PlayRequest): PlayHandle | undefined
  /** 預先 decode。沒有音檔時是 no-op */
  load(urls: readonly string[]): Promise<void>
}

export interface BusSettings {
  volume: number
  muted: boolean
}

/** `bgm` 與 `sfx` 分開存（§10.7）；`ui` 跟著 `sfx`——玩家想安靜就是想安靜。 */
export type PersistedBus = 'bgm' | 'sfx'

export const PERSISTED_BUSES: readonly PersistedBus[] = ['bgm', 'sfx']

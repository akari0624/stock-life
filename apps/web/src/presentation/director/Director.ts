import { EMPTY_PLAN, type Scene, type ScenePlan } from './Scene.ts'
import { project, type StageState } from './StageState.ts'

/**
 * Director —— rAF 驅動的**邏輯時間軸**（DESIGN.md §4、§10.4）。
 *
 * 它只做三件事：往前推邏輯時間、在跨過 scene 起點時發 cue、把當前狀態投影成 StageState。
 * 元素動態交給 WAAPI（`attach()` 之後由 director 同步 `playbackRate` / `currentTime` /
 * `finish()`），所以加速與跳過對真正的動畫也生效。
 *
 * **它完全不認識 sim。** 演出多長、有沒有被跳過，因此不可能影響任何模擬結果。
 */

/** `Animation` 結構上就滿足這個介面；測試可以塞假的。 */
export interface ControllableAnimation {
  playbackRate: number
  currentTime: CSSNumberish | null
  play(): void
  pause(): void
  finish(): void
}

export interface Cue {
  scene: Scene
  /** 跨過這個 cue 時的邏輯時間 */
  time: number
  /** 是被 `finish()`／跳過一次收合掉的嗎（S15 要用這個決定取消還是播） */
  skipped: boolean
}

export type CueListener = (cue: Cue) => void

export interface DirectorOptions {
  now?: () => number
  schedule?: (callback: () => void) => number
  cancel?: (handle: number) => void
  rate?: number
}

const defaultNow = (): number => performance.now()
const defaultSchedule = (callback: () => void): number => requestAnimationFrame(() => callback())
const defaultCancel = (handle: number): void => cancelAnimationFrame(handle)

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value))

interface Attachment {
  animation: ControllableAnimation
  startAt: number
}

export class Director {
  private plan: ScenePlan = EMPTY_PLAN
  /** 依 start 排序後的 scene，供 cue 游標線性掃描 */
  private cues: Scene[] = []
  private cueIndex = 0
  private time = 0
  private playbackRate: number
  private playing = false
  private finishedFlag = true
  private frame: number | undefined
  private lastTick = 0
  private planVersion = 0

  private readonly listeners = new Set<() => void>()
  private readonly cueListeners = new Set<CueListener>()
  private readonly attachments = new Set<Attachment>()

  private readonly now: () => number
  private readonly schedule: (callback: () => void) => number
  private readonly cancelFrame: (handle: number) => void

  private stageCache: { key: string; stage: StageState } | undefined

  constructor(options: DirectorOptions = {}) {
    this.now = options.now ?? defaultNow
    this.schedule = options.schedule ?? defaultSchedule
    this.cancelFrame = options.cancel ?? defaultCancel
    this.playbackRate = options.rate ?? 1
  }

  /** 載入一段演出並回到時間 0（不自動播）。 */
  load(plan: ScenePlan): void {
    this.stopLoop()
    this.plan = plan
    this.cues = [...plan.scenes].sort((a, b) => a.start - b.start)
    this.cueIndex = 0
    this.time = 0
    this.playing = false
    this.finishedFlag = plan.duration <= 0 && plan.scenes.length === 0
    this.planVersion += 1
    this.syncAnimations()
    this.notify()
  }

  play(): void {
    // 時間 0 上的 cue（例如開場音效）在這一刻才發
    this.fireCuesUpTo(this.time, false)

    if (this.time >= this.plan.duration) {
      this.finishedFlag = true
      this.notify()
      return
    }

    this.playing = true
    this.finishedFlag = false
    this.lastTick = this.now()
    for (const { animation } of this.attachments) animation.play()
    this.startLoop()
    this.notify()
  }

  pause(): void {
    if (!this.playing) return
    this.playing = false
    this.stopLoop()
    for (const { animation } of this.attachments) animation.pause()
    this.notify()
  }

  /** 演出速度倍率。邏輯時間軸與 WAAPI 動畫一起變速。 */
  rate(value: number): void {
    if (!(value > 0)) throw new RangeError(`rate 必須大於 0（收到 ${value}）`)
    // 先把已經跑掉的時間結算，否則倍率會回頭套用到過去的區間
    if (this.playing) this.tick()
    this.playbackRate = value
    for (const { animation } of this.attachments) animation.playbackRate = value
    this.notify()
  }

  currentRate(): number {
    return this.playbackRate
  }

  /**
   * 跳到某個邏輯時間。往前會把中間的 cue 補發；**往回不重播**（§10.7 也是這條規則），
   * 只把游標移回去。
   */
  seek(time: number): void {
    const target = clamp(time, 0, this.plan.duration)

    if (target < this.time) {
      this.cueIndex = this.cues.findIndex((scene) => scene.start > target)
      if (this.cueIndex === -1) this.cueIndex = this.cues.length
      this.time = target
      this.finishedFlag = false
    } else {
      this.time = target
      this.fireCuesUpTo(target, false)
      if (target >= this.plan.duration) this.settleFinished()
    }

    this.lastTick = this.now()
    this.syncAnimations()
    this.notify()
  }

  /** 跳過：立刻到結果。剩下的 cue 一次補發並標記 `skipped`。 */
  finish(): void {
    this.time = this.plan.duration
    this.fireCuesUpTo(this.time, true)
    this.settleFinished()
    for (const { animation } of this.attachments) {
      try {
        animation.finish()
      } catch {
        // 無限動畫 finish() 會丟——演出不該因此中斷
      }
    }
    this.notify()
  }

  isPlaying(): boolean {
    return this.playing
  }

  isFinished(): boolean {
    return this.finishedFlag
  }

  currentTime(): number {
    return this.time
  }

  /** 給 useSyncExternalStore 用：沒變化時回傳同一個物件（§10.1）。 */
  getStage(): StageState {
    const key = `${this.planVersion}|${this.time}|${this.playbackRate}|${this.playing}|${this.finishedFlag}`
    if (this.stageCache?.key !== key) {
      this.stageCache = {
        key,
        stage: project(this.plan, this.time, {
          rate: this.playbackRate,
          playing: this.playing,
          finished: this.finishedFlag,
        }),
      }
    }
    return this.stageCache.stage
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** scene 起點被跨過時通知（S15 的音效、S16 的文字流都吃這個）。 */
  onCue(listener: CueListener): () => void {
    this.cueListeners.add(listener)
    return () => {
      this.cueListeners.delete(listener)
    }
  }

  /**
   * 把一個 WAAPI 動畫交給 director 管速度與跳過。
   * `startAt` 是它在邏輯時間軸上的起點，用來換算 seek 後的 currentTime。
   */
  attach(animation: ControllableAnimation, startAt = 0): () => void {
    const attachment: Attachment = { animation, startAt }
    this.attachments.add(attachment)
    animation.playbackRate = this.playbackRate
    if (this.playing) animation.play()
    else animation.pause()
    return () => {
      this.attachments.delete(attachment)
    }
  }

  // ── 內部 ──────────────────────────────────────────────────────────────────

  private startLoop(): void {
    if (this.frame !== undefined) return
    const loop = (): void => {
      this.frame = undefined
      if (!this.playing) return
      this.tick()
      if (this.playing) this.frame = this.schedule(loop)
    }
    this.frame = this.schedule(loop)
  }

  private stopLoop(): void {
    if (this.frame === undefined) return
    this.cancelFrame(this.frame)
    this.frame = undefined
  }

  private tick(): void {
    const now = this.now()
    const elapsed = (now - this.lastTick) * this.playbackRate
    this.lastTick = now
    if (elapsed <= 0) {
      this.fireCuesUpTo(this.time, false)
      return
    }

    this.time = Math.min(this.plan.duration, this.time + elapsed)
    this.fireCuesUpTo(this.time, false)
    if (this.time >= this.plan.duration) this.settleFinished()
    this.notify()
  }

  private settleFinished(): void {
    this.playing = false
    this.finishedFlag = true
    this.stopLoop()
  }

  private fireCuesUpTo(time: number, skipped: boolean): void {
    while (this.cueIndex < this.cues.length && this.cues[this.cueIndex].start <= time) {
      const scene = this.cues[this.cueIndex]
      this.cueIndex += 1
      for (const listener of this.cueListeners) listener({ scene, time, skipped })
    }
  }

  private syncAnimations(): void {
    for (const { animation, startAt } of this.attachments) {
      animation.currentTime = Math.max(0, this.time - startAt)
    }
  }

  private notify(): void {
    for (const listener of this.listeners) listener()
  }
}

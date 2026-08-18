import {
  encodeShareCode,
  nextDecision,
  OPENING_BG,
  summariseLife,
  type Command,
  type Decision,
  type Effect,
  type Life,
  type LifeSummary,
  type PlayerView,
  type Sizing,
} from '@stock-life/engine'
import { Director } from '../presentation/director/Director.ts'
import { compile } from '../presentation/director/compile.ts'
import { EMPTY_PLAN } from '../presentation/director/Scene.ts'
import { AssetResolver } from '../presentation/assets/AssetResolver.ts'
import { mergeAssetManifests } from '../presentation/assets/AssetManifest.ts'
import { bindDirectorAudio } from '../presentation/audio/directorAudio.ts'
import { audioEngine, playSound } from '../presentation/audio/playSound.ts'
import type { AudioEngine } from '../presentation/audio/AudioEngine.ts'
import { STAT_LABELS, SIZING_LABELS, signed } from './format.ts'

/**
 * 一局遊戲的持有者：sim（引擎）+ director（演出）+ 音效，接成一個訂閱源。
 *
 * UI 只是它的投影（§4）：所有畫面都從 `getSnapshot()` / `director.getStage()` 讀，
 * 不自己保存任何遊戲狀態。**不直接 import `domain/`**——只走 `@stock-life/engine` 的公開 API。
 */

export interface LogEntry {
  id: number
  year: number
  age: number
  kind: 'say' | 'stat' | 'trait' | 'position' | 'turn'
  text: string
  tone?: 'gain' | 'loss' | 'neutral'
}

/**
 * `play` 是正常玩；`replay` 是把一份 commandLog 一步一步演出來（S17）。
 * 兩者共用同一條 `sim.dispatch()` 路徑——重播不是另一套模擬，只是不讓玩家選。
 */
export type SessionMode = 'play' | 'replay'

export interface ReplayState {
  /** 已經演到第幾個 command */
  index: number
  total: number
  playing: boolean
  done: boolean
}

export interface SessionSnapshot {
  version: number
  mode: SessionMode
  view: PlayerView
  decision: Decision | undefined
  entries: readonly LogEntry[]
  finished: boolean
  summary: LifeSummary | undefined
  shareCode: string
  turn: number
  totalTurns: number
  replay: ReplayState | undefined
}

export interface GameSessionOptions {
  life: Life
  seed: number
  audio?: AudioEngine
  /**
   * 續玩：把存檔的 commandLog 快轉套用（不演出），文字流順便長回來。
   * 演出與否對模擬零影響（S13 判準），所以快轉是安全的。
   */
  restore?: readonly Command[]
  /** 重播：同一份 log，改成一步一步交給 director 演。 */
  replay?: readonly Command[]
  /** 重播時每一步之間的節拍；測試注入同步版本。 */
  schedule?: (callback: () => void) => void
}

/** 重播時兩個 command 之間的停頓（ms） */
export const REPLAY_GAP = 240

/** 只有這些 stat 值得進文字流；其餘（counter.*）是內部計數。 */
const LOGGED_STATS = new Set(['capital', 'income', 'debt', 'cognition', 'network', 'nerve'])

export class GameSession {
  readonly life: Life
  readonly seed: number
  readonly director: Director
  readonly assets: AssetResolver
  readonly shareCode: string

  private readonly audio: AudioEngine
  private readonly listeners = new Set<() => void>()
  /** 不可變：React Compiler 會用識別碼判斷要不要重繪，原地 push 會讓文字流卡住 */
  private entries: readonly LogEntry[] = []
  private readonly unbindAudio: () => void
  private readonly unbindDirector: () => void
  private readonly schedule: (callback: () => void) => void
  private entryId = 0
  private version = 0
  private mode: SessionMode = 'play'
  private replayLog: readonly Command[] = []
  private replayIndex = 0
  private replayPlaying = false
  private stepping = false
  private snapshot: SessionSnapshot

  constructor(options: GameSessionOptions) {
    this.life = options.life
    this.seed = options.seed
    this.audio = options.audio ?? audioEngine()
    this.director = new Director()
    this.assets = AssetResolver.fromManifests(this.life.content.manifests)
    this.shareCode = encodeShareCode(this.life.fingerprint, this.seed)
    this.schedule = options.schedule ?? ((callback) => void setTimeout(callback, REPLAY_GAP))

    // 內容包自帶的演出音效（S15 的第二個 id 來源）
    this.audio.useContentSfx(mergeAssetManifests(this.life.content.manifests))
    this.unbindAudio = bindDirectorAudio(this.director, this.audio)
    // 重播的自動前進：一段演完了才演下一段
    this.unbindDirector = this.director.subscribe(() => this.onDirectorChange())

    // 開場先佈一個景：否則第一個事件結算之前，舞台是一個純黑的方塊。
    // 之後每一段演出都靠 director 的 carry 接住（見 StageCarry）。
    this.director.load(compile([{ type: 'scene.bg', id: OPENING_BG }]))
    this.director.play()

    if (options.restore) this.fastForward(options.restore)
    if (options.replay) {
      this.mode = 'replay'
      this.replayLog = [...options.replay]
    }

    this.snapshot = this.build()
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = (): SessionSnapshot => this.snapshot

  dispose(): void {
    this.replayPlaying = false
    this.unbindAudio()
    this.unbindDirector()
    this.director.pause()
    this.listeners.clear()
  }

  // ── 玩家決策（每一個都是一個 Command，都會進 commandLog） ──────────────────

  resolveEvent(choice: 'safe' | 'normal' | 'bold'): void {
    playSound('ui_option_select')
    this.dispatch({ type: 'resolveEvent', choice })
  }

  resolveTrial(positionId: string, choice: string): void {
    playSound('ui_option_select')
    this.dispatch({ type: 'resolveTrial', positionId, choice })
  }

  allocateDice(assignment: Record<string, number>): void {
    playSound('ui_option_select')
    this.dispatch({ type: 'allocateDice', assignment })
  }

  takeOffer(id: string, sizing: Sizing): void {
    playSound('ui_option_select')
    this.dispatch({ type: 'takeOpportunity', id, sizing })
  }

  declineOffer(id: string): void {
    playSound('ui_back')
    this.dispatch({ type: 'declineOpportunity', id })
  }

  advanceTurn(): void {
    playSound('ui_transition')
    this.dispatch({ type: 'advanceTurn' })
  }

  // ── 演出控制（不是 command，不進 log：§4.2） ──────────────────────────────

  skip(): void {
    playSound('ui_click')
    this.director.finish()
  }

  setRate(rate: number): void {
    playSound('ui_toggle')
    this.director.rate(rate)
  }

  // ── 重播模式（S17）：同一份 commandLog，交給 director 一步一步演 ─────────────

  replayPlay(): void {
    if (this.mode !== 'replay' || this.replayIndex >= this.replayLog.length) return
    this.replayPlaying = true
    this.replayStep()
  }

  replayPause(): void {
    if (!this.replayPlaying) return
    this.replayPlaying = false
    this.publish()
  }

  /** 手動走一步（也是測試驅動重播的方式，不必等計時器）。 */
  replayStep(): void {
    if (this.mode !== 'replay' || this.stepping) return
    const command = this.replayLog[this.replayIndex]
    if (!command) {
      this.replayPlaying = false
      this.publish()
      return
    }

    this.stepping = true
    try {
      this.replayIndex += 1
      this.dispatch(command)
    } finally {
      this.stepping = false
    }

    // 零長度的演出（例如純數值的一回合）不會再有 tick 通知，這裡自己接上
    if (this.replayPlaying && this.director.isFinished()) this.onDirectorChange()
  }

  /** 快轉到底：剩下的 command 一次套用完，不演出。 */
  replaySkipToEnd(): void {
    if (this.mode !== 'replay') return
    this.replayPlaying = false
    const rest = this.replayLog.slice(this.replayIndex)
    this.replayIndex = this.replayLog.length
    this.fastForward(rest)
    this.director.load(EMPTY_PLAN)
    this.publish()
  }

  /**
   * 從重播接手：重播把 commandLog 原樣重跑了一遍，所以到這裡的狀態
   * 與存檔當下逐位元相同——直接切回 play 模式就能繼續玩。
   */
  takeOver(): void {
    if (this.mode !== 'replay') return
    if (this.replayIndex < this.replayLog.length) this.replaySkipToEnd()
    this.mode = 'play'
    this.replayPlaying = false
    this.publish()
  }

  traitName(id: string): string {
    return this.life.content.traits.find((trait) => trait.id === id)?.name ?? id
  }

  traitText(id: string): string | undefined {
    return this.life.content.traits.find((trait) => trait.id === id)?.text
  }

  private dispatch(command: Command): void {
    const effects = this.life.sim.dispatch(command)
    this.record(effects)

    // 模擬瞬間完成，演出慢慢播（§4）
    this.director.load(compile(effects))
    this.director.play()

    this.publish()
  }

  /**
   * 續玩用：把一份 commandLog 直接套進 sim，不演出。文字流照樣長回來——
   * 那些條目本來就是從 effects 記的，所以重開瀏覽器不會失去這輩子的紀錄。
   */
  private fastForward(log: readonly Command[]): void {
    for (const command of log) this.record(this.life.sim.dispatch(command))
  }

  private onDirectorChange(): void {
    if (this.mode !== 'replay' || !this.replayPlaying || this.stepping) return
    if (!this.director.isFinished()) return
    if (this.replayIndex >= this.replayLog.length) {
      this.replayPlaying = false
      this.publish()
      return
    }
    // 排程而不是直接遞迴：一連串「零長度演出」的 command 不該堆成一疊呼叫堆疊
    this.schedule(() => {
      if (this.replayPlaying) this.replayStep()
    })
  }

  private publish(): void {
    this.snapshot = this.build()
    this.version += 1
    for (const listener of this.listeners) listener()
  }

  private build(): SessionSnapshot {
    const view = this.life.sim.getPlayerView()
    const turn = view.turnIndex
    const finished = turn >= this.life.totalTurns
    const replaying = this.mode === 'replay'

    return {
      version: this.version,
      mode: this.mode,
      view,
      // 重播中不給決策：這段人生的選擇已經寫在 log 裡了
      decision: finished || replaying ? undefined : nextDecision(view),
      entries: this.entries,
      finished,
      summary: finished ? summariseLife(this.life, String(this.seed)) : undefined,
      shareCode: this.shareCode,
      turn,
      totalTurns: this.life.totalTurns,
      replay: replaying
        ? {
            index: this.replayIndex,
            total: this.replayLog.length,
            playing: this.replayPlaying,
            done: this.replayIndex >= this.replayLog.length,
          }
        : undefined,
    }
  }

  /** 把這一批 effects 轉成文字流的條目（年度分組、可摺疊，參考 yakyulife）。 */
  private record(effects: readonly Effect[]): void {
    const view = this.life.sim.getPlayerView()
    const batch: LogEntry[] = []
    const push = (kind: LogEntry['kind'], text: string, tone?: LogEntry['tone']): void => {
      this.entryId += 1
      batch.push({ id: this.entryId, year: view.year, age: view.player.age, kind, text, tone })
    }

    for (const effect of effects) {
      switch (effect.type) {
        case 'scene.say':
          push('say', effect.text)
          break
        case 'stat.add': {
          if (!LOGGED_STATS.has(effect.key) || effect.value === 0) break
          const label = STAT_LABELS[effect.key] ?? effect.key
          const tone = effect.key === 'debt' ? (effect.value > 0 ? 'loss' : 'gain') : effect.value > 0 ? 'gain' : 'loss'
          push('stat', `${label} ${signed(effect.value)}`, tone)
          break
        }
        case 'capital.mul':
          push(
            'stat',
            `本金 ×${effect.value.toFixed(2)}`,
            effect.value >= 1 ? 'gain' : 'loss',
          )
          break
        case 'trait.grant':
          push('trait', `獲得投資人格：${this.traitName(effect.id)}`, 'neutral')
          break
        case 'position.open':
          push('position', `進場：${effect.opportunityId}（${SIZING_LABELS[effect.sizing] ?? effect.sizing}）`, 'neutral')
          break
        default:
          break
      }
    }

    if (batch.length > 0) this.entries = [...this.entries, ...batch]
  }
}

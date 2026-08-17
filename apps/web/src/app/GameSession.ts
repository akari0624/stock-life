import {
  encodeShareCode,
  nextDecision,
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

export interface SessionSnapshot {
  version: number
  view: PlayerView
  decision: Decision | undefined
  entries: readonly LogEntry[]
  finished: boolean
  summary: LifeSummary | undefined
  shareCode: string
  turn: number
  totalTurns: number
}

export interface GameSessionOptions {
  life: Life
  seed: number
  audio?: AudioEngine
}

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
  private entryId = 0
  private version = 0
  private snapshot: SessionSnapshot

  constructor(options: GameSessionOptions) {
    this.life = options.life
    this.seed = options.seed
    this.audio = options.audio ?? audioEngine()
    this.director = new Director()
    this.assets = AssetResolver.fromManifests(this.life.content.manifests)
    this.shareCode = encodeShareCode(this.life.fingerprint, this.seed)

    // 內容包自帶的演出音效（S15 的第二個 id 來源）
    this.audio.useContentSfx(mergeAssetManifests(this.life.content.manifests))
    this.unbindAudio = bindDirectorAudio(this.director, this.audio)

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
    this.unbindAudio()
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

    this.snapshot = this.build()
    this.version += 1
    for (const listener of this.listeners) listener()
  }

  private build(): SessionSnapshot {
    const view = this.life.sim.getPlayerView()
    const turn = view.turnIndex
    const finished = turn >= this.life.totalTurns

    return {
      version: this.version,
      view,
      decision: finished ? undefined : nextDecision(view),
      entries: this.entries,
      finished,
      summary: finished ? summariseLife(this.life, String(this.seed)) : undefined,
      shareCode: this.shareCode,
      turn,
      totalTurns: this.life.totalTurns,
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

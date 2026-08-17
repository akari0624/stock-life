import type { GameSession } from '../GameSession.ts'
import type { StageState } from '../../presentation/director/StageState.ts'
import { BUTTON, BUTTON_ACTIVE } from '../ui.ts'
import { cn } from '../../styles/cn.ts'

/**
 * 跳過／速度控制。這些**不是 command**，不進 commandLog（§4.2）——
 * 演出多快、有沒有跳過，對模擬結果零影響（S13 的判準）。
 */

const RATES = [1, 2, 4] as const

export function PlaybackControls({ session, stage }: { session: GameSession; stage: StageState }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-caption text-at-text-muted">演出</span>
      {RATES.map((rate) => (
        <button
          key={rate}
          type="button"
          className={cn(BUTTON, stage.rate === rate && BUTTON_ACTIVE)}
          onClick={() => session.setRate(rate)}
        >
          {rate}×
        </button>
      ))}
      <button type="button" className={BUTTON} onClick={() => session.skip()} disabled={stage.finished}>
        跳過
      </button>
      {!stage.finished && (
        <span className="text-caption text-at-text-muted">
          {Math.round((stage.duration > 0 ? stage.time / stage.duration : 1) * 100)}%
        </span>
      )}
    </div>
  )
}

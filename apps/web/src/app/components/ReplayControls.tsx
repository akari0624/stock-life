import type { GameSession, ReplayState } from '../GameSession.ts'
import { BUTTON, CARD, PRIMARY } from '../ui.ts'
import { cn } from '../../styles/cn.ts'

/**
 * 重播模式的操作列（取代決策區）。
 *
 * 重播不是另一套模擬：它把存檔裡的 commandLog 原樣再 dispatch 一次，
 * 所以演到底的狀態與當初逐位元相同——「接手繼續玩」因此是安全的。
 */
export function ReplayControls({ session, replay }: { session: GameSession; replay: ReplayState }) {
  return (
    <section className={cn(CARD, 'flex flex-col gap-3 p-4')}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-title text-at-text-primary">重播中</h2>
        <span className="text-numeric text-caption text-at-text-muted">
          {replay.index} / {replay.total} 個決策
        </span>
      </div>

      {replay.done ? (
        <p className="text-caption text-at-text-secondary">重播結束——這就是存檔當下的狀態。</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {replay.playing ? (
            <button type="button" className={BUTTON} onClick={() => session.replayPause()}>
              暫停
            </button>
          ) : (
            <button type="button" className={BUTTON} onClick={() => session.replayPlay()}>
              播放
            </button>
          )}
          <button type="button" className={BUTTON} onClick={() => session.replayStep()}>
            下一步
          </button>
          <button type="button" className={BUTTON} onClick={() => session.replaySkipToEnd()}>
            快轉到底
          </button>
        </div>
      )}

      <button type="button" className={PRIMARY} onClick={() => session.takeOver()}>
        從這裡接手
      </button>
    </section>
  )
}

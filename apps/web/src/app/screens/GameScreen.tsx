import type { GameSession } from '../GameSession.ts'
import { useSession, useStage, useStore } from '../hooks.ts'
import { Stage } from '../../presentation/stage/Stage.tsx'
import { CapitalPanel } from '../components/CapitalPanel.tsx'
import { Decisions } from '../components/Decisions.tsx'
import { Timeline } from '../components/Timeline.tsx'
import { PlaybackControls } from '../components/PlaybackControls.tsx'
import { AudioControls } from '../components/AudioControls.tsx'
import { BUTTON } from '../ui.ts'
import { cn } from '../../styles/cn.ts'

/**
 * 遊戲主畫面 —— 全部都是 sim + director 的投影（§4）。
 * 這個元件自己不保存任何遊戲狀態，也沒有任何 setState 影響模擬。
 */
export function GameScreen({ session }: { session: GameSession }) {
  const store = useStore()
  const snapshot = useSession(session)
  const stage = useStage(session)

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PlaybackControls session={session} stage={stage} />
        <AudioControls />
      </div>

      <Stage stage={stage} resolver={session.assets} />

      <CapitalPanel view={snapshot.view} stage={stage} />

      <Decisions
        session={session}
        view={snapshot.view}
        decision={snapshot.decision}
        finished={snapshot.finished}
        onSettle={() => store.finish()}
      />

      <Timeline entries={snapshot.entries} currentYear={snapshot.view.year} />

      <footer className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-caption text-at-text-muted">
          第 {snapshot.turn + 1} / {snapshot.totalTurns} 年 · 種子 {session.shareCode}
        </span>
        <button type="button" className={cn(BUTTON)} onClick={() => store.backToTitle()}>
          放棄這局
        </button>
      </footer>
    </div>
  )
}

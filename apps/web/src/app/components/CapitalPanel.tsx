import type { PlayerView } from '@stock-life/engine'
import type { StageState } from '../../presentation/director/StageState.ts'
import { ERA_LABELS, int, money, percent } from '../format.ts'
import { CARD } from '../ui.ts'
import { cn } from '../../styles/cn.ts'

/**
 * 三種資本面板（§1.1）。
 *
 * 數字**跟著演出跳**：sim 的 state 早就是最終值了，所以顯示值是
 * `最終值 - 還沒演到的差額`（S13 的 `pendingStats` / `pendingCapitalFactor`）。
 * 演完之後兩者相等，跳過也會立刻相等——所以演出長度不影響任何數字的正確性。
 */

interface Props {
  view: PlayerView
  stage: StageState
}

const shown = (final: number, pending: number | undefined): number => final - (pending ?? 0)

function Stat({
  label,
  value,
  tone,
  ticking,
}: {
  label: string
  value: string
  tone?: 'gain' | 'loss'
  ticking?: boolean
}) {
  return (
    <div>
      <span className="text-caption block text-at-text-muted">{label}</span>
      <span
        className={cn(
          'text-numeric block',
          tone === 'gain' && 'text-at-gain',
          tone === 'loss' && 'text-at-loss',
          !tone && 'text-at-text-primary',
          ticking && 'text-at-accent-default',
        )}
      >
        {value}
      </span>
    </div>
  )
}

export function CapitalPanel({ view, stage }: Props) {
  const { capitalState: capital, player } = view
  const isTicking = (key: string): boolean => stage.ticking.some((tick) => tick.key === key)
  const displayedCapital = shown(capital.capital, stage.pendingStats.capital) / stage.pendingCapitalFactor

  return (
    <section className={cn(CARD, 'p-4')}>
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-title text-at-text-primary">
          {int(view.year)} 年 · {player.age} 歲
        </h2>
        <span className="text-caption text-at-text-muted">
          {ERA_LABELS[view.era.phase] ?? view.era.phase}
          {view.era.themes.length > 0 && ` · ${view.era.themes.join('、')}`}
        </span>
      </header>

      <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
        <Stat
          label="本金"
          value={money(displayedCapital)}
          ticking={isTicking('capital')}
          tone={displayedCapital > 0 ? 'gain' : undefined}
        />
        <Stat label="年收" value={money(shown(capital.income, stage.pendingStats.income))} ticking={isTicking('income')} />
        <Stat
          label="負債"
          value={money(shown(capital.debt, stage.pendingStats.debt))}
          tone={capital.debt > 0 ? 'loss' : undefined}
          ticking={isTicking('debt')}
        />
        <Stat label="儲蓄率" value={percent(capital.savingsRate * 100)} />
        <Stat label="認知" value={int(shown(capital.cognition, stage.pendingStats.cognition))} ticking={isTicking('cognition')} />
        <Stat label="人脈" value={int(shown(capital.network, stage.pendingStats.network))} ticking={isTicking('network')} />
        <Stat label="膽識" value={int(shown(player.nerve, stage.pendingStats.nerve))} ticking={isTicking('nerve')} />
        <Stat label="持倉" value={int(view.positions.open.length)} />
      </div>

      {view.positions.open.length > 0 && (
        <ul className="text-caption mt-3 flex flex-col gap-1 text-at-text-muted">
          {view.positions.open.map((position) => (
            <li key={position.id}>
              {position.opportunityId} · 投入 {money(position.stake)}
              {position.pendingTrial && (
                <span className="text-at-warn"> · 考驗中（帳面 −{percent(position.pendingTrial.drawdown * 100)}）</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

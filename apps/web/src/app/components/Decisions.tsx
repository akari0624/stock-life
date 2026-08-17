import { useState } from 'react'
import type { Decision, PlayerView, Sizing } from '@stock-life/engine'
import type { GameSession } from '../GameSession.ts'
import { DICE_LABELS, SIZING_LABELS, TRIAL_LABELS, int, money, percent } from '../format.ts'
import { BUTTON, BUTTON_ACTIVE, CARD, OPTION, PRIMARY } from '../ui.ts'
import { cn } from '../../styles/cn.ts'

/**
 * 玩家決策區。**每一個按鈕都對應一個 Command**（§4.2 的玩家決策級顆粒度），
 * 面板展開、骰點加減這些 UI 互動則不進 commandLog。
 *
 * 要顯示什麼由引擎的 `nextDecision(view)` 決定（同一個函式也餵無頭 runner 的 policy），
 * 所以 UI 與模擬玩家看到的決策點不可能不一致。
 */

interface Props {
  session: GameSession
  view: PlayerView
  decision: Decision | undefined
  finished: boolean
  onSettle: () => void
}

export function Decisions({ session, view, decision, finished, onSettle }: Props) {
  if (finished) {
    return (
      <section className={cn(CARD, 'flex flex-col items-start gap-3 p-4')}>
        <p className="text-body text-at-text-primary">六十五歲了。該算總帳了。</p>
        <button type="button" className={PRIMARY} onClick={onSettle}>
          看結算
        </button>
      </section>
    )
  }

  if (!decision) {
    return (
      <section className={cn(CARD, 'flex flex-col items-start gap-3 p-4')}>
        <p className="text-caption text-at-text-muted">這一年沒有需要你決定的事了。</p>
        <button type="button" className={PRIMARY} onClick={() => session.advanceTurn()}>
          過下一年
        </button>
      </section>
    )
  }

  switch (decision.kind) {
    case 'event':
      return (
        <section className={cn(CARD, 'p-4')}>
          <header className="mb-3">
            <h3 className="text-title text-at-text-primary">你要怎麼做</h3>
            {/* 成功率是引擎算好給的那一個數字，擲骰用的就是它（§7.2 所見即所得） */}
            <p className="text-caption text-at-text-muted">機率就是實際擲骰的數字</p>
          </header>
          <div className="flex flex-col gap-2">
            {decision.choices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                className={OPTION}
                onClick={() => session.resolveEvent(choice.id)}
              >
                <span className="text-body">{choice.label}</span>
                <span className="text-numeric shrink-0 text-at-text-muted">
                  {percent(choice.chance)} · ×{choice.mag}
                </span>
              </button>
            ))}
          </div>
        </section>
      )

    case 'trial': {
      const position = view.positions.open.find((open) => open.id === decision.positionId)
      return (
        <section className={cn(CARD, 'p-4')}>
          <header className="mb-3">
            <h3 className="text-title text-at-text-primary">持倉考驗</h3>
            <p className="text-caption text-at-text-muted">
              {decision.opportunityId}
              {position && ` · 投入 ${money(position.stake)}`}
              {position?.pendingTrial && ` · 帳面 −${percent(position.pendingTrial.drawdown * 100)}`}
            </p>
          </header>
          <div className="flex flex-col gap-2">
            {decision.choices.map((choice) => (
              <button
                key={choice}
                type="button"
                className={OPTION}
                onClick={() => session.resolveTrial(decision.positionId, choice)}
              >
                <span className="text-body">{TRIAL_LABELS[choice] ?? choice}</span>
              </button>
            ))}
          </div>
          <p className="text-caption mt-3 text-at-text-muted">不回答等於抱住——下一年會自動結算。</p>
        </section>
      )
    }

    case 'dice':
      return <DiceAllocation session={session} pool={decision.pool} channels={decision.channels} />

    case 'offer': {
      const offer = decision.offer
      return (
        <section className={cn(CARD, 'p-4')}>
          <header className="mb-3">
            <h3 className="text-title text-at-text-primary">
              {offer.source === 'career' ? '一個機會：換工作' : '一個機會'}
            </h3>
            <p className="text-body mt-1 text-at-text-primary">{offer.label}</p>
            {offer.detail && (
              <ul className="text-caption mt-2 flex flex-wrap gap-x-4 text-at-text-muted">
                {Object.entries(offer.detail).map(([key, value]) => (
                  <li key={key}>
                    {key}：{Array.isArray(value) ? value.join('、') : String(value)}
                  </li>
                ))}
              </ul>
            )}
          </header>

          <div className="flex flex-col gap-2">
            {offer.sizing.map((sizing) => (
              <button
                key={sizing}
                type="button"
                className={OPTION}
                onClick={() => session.takeOffer(offer.id, sizing as Sizing)}
              >
                <span className="text-body">
                  {offer.source === 'career' ? '接下這份工作' : SIZING_LABELS[sizing] ?? sizing}
                </span>
                {offer.source !== 'career' && (
                  <span className="text-numeric shrink-0 text-at-text-muted">{SIZING_HINT[sizing] ?? ''}</span>
                )}
              </button>
            ))}
            <button type="button" className={cn(OPTION, 'text-at-text-muted')} onClick={() => session.declineOffer(offer.id)}>
              <span className="text-body">不了</span>
              <span className="text-caption shrink-0">拒絕之後不會再出現</span>
            </button>
          </div>
        </section>
      )
    }
  }
}

/** 各檔倉位吃掉多少本金——與引擎的 SIZING_FRACTION 對應的玩家說法。 */
const SIZING_HINT: Record<string, string> = {
  light: '一成本金',
  normal: '三成本金',
  heavy: '八成本金',
  leveraged: '全押 + 借一倍',
}

function DiceAllocation({
  session,
  pool,
  channels,
}: {
  session: GameSession
  pool: number
  channels: readonly string[]
}) {
  const [assignment, setAssignment] = useState<Record<string, number>>({})
  const spent = Object.values(assignment).reduce((sum, value) => sum + value, 0)
  const remaining = pool - spent

  const bump = (channel: string, delta: number): void => {
    setAssignment((current) => {
      const next = Math.max(0, (current[channel] ?? 0) + delta)
      if (delta > 0 && remaining <= 0) return current
      return { ...current, [channel]: next }
    })
  }

  return (
    <section className={cn(CARD, 'p-4')}>
      <header className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="text-title text-at-text-primary">這一年的時間怎麼分</h3>
        <span className="text-numeric text-at-accent-default">剩 {int(remaining)} 點</span>
      </header>

      <div className="flex flex-col gap-2">
        {channels.map((channel) => (
          <div key={channel} className="flex items-center justify-between gap-3">
            <span className="text-body text-at-text-primary">{DICE_LABELS[channel] ?? channel}</span>
            <div className="flex items-center gap-2">
              <button type="button" className={BUTTON} onClick={() => bump(channel, -1)} disabled={(assignment[channel] ?? 0) === 0}>
                −
              </button>
              <span className="text-numeric w-8 text-center text-at-text-primary">{assignment[channel] ?? 0}</span>
              <button type="button" className={BUTTON} onClick={() => bump(channel, 1)} disabled={remaining <= 0}>
                ＋
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={cn(PRIMARY, 'text-caption px-4 py-2')}
          disabled={spent === 0}
          onClick={() => {
            session.allocateDice(assignment)
            setAssignment({})
          }}
        >
          確認分配
        </button>
        <button
          type="button"
          className={cn(BUTTON, spent === 0 && BUTTON_ACTIVE)}
          onClick={() => {
            const even: Record<string, number> = {}
            let left = pool
            for (const [index, channel] of channels.entries()) {
              const share = Math.floor(pool / channels.length) + (index < pool % channels.length ? 1 : 0)
              even[channel] = share
              left -= share
            }
            if (left > 0) even[channels[0]] = (even[channels[0]] ?? 0) + left
            setAssignment(even)
          }}
        >
          平均分配
        </button>
      </div>
    </section>
  )
}

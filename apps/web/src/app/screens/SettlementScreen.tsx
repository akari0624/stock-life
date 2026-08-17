import { useState } from 'react'
import type { GameSession } from '../GameSession.ts'
import { useSession, useStore } from '../hooks.ts'
import { OUTCOME_LABELS, int, money } from '../format.ts'
import { BUTTON, CARD, PRIMARY } from '../ui.ts'
import { cn } from '../../styles/cn.ts'

/**
 * 結算畫面。摘要用的是引擎的 `summariseLife()`——**與平衡跑分器同一份定義**，
 * 所以「UI 說你有多少錢」與「跑分報表說的」不可能不一致。
 */
export function SettlementScreen({ session }: { session: GameSession }) {
  const store = useStore()
  const { summary } = useSession(session)
  const [copied, setCopied] = useState(false)

  if (!summary) {
    return (
      <div className="mx-auto max-w-xl px-6 py-12">
        <p className="text-body text-at-text-secondary">這局還沒結束。</p>
        <button type="button" className={cn(BUTTON, 'mt-4')} onClick={() => store.goto('game')}>
          回到遊戲
        </button>
      </div>
    )
  }

  const rows: [string, string][] = [
    ['本金', money(summary.capital)],
    ['負債', money(summary.debt)],
    ['淨資產', money(summary.netWorth)],
    ['年收', money(summary.income)],
    ['認知', int(summary.cognition)],
    ['人脈', int(summary.network)],
    ['膽識', int(summary.nerve)],
    ['遇到的機會', int(summary.opportunitiesSeen)],
    ['接下的機會', int(summary.opportunitiesTaken)],
    ['放掉的機會', int(summary.opportunitiesDeclined)],
    ['結清的持倉', int(summary.positionsClosed)],
    ['歸零的持倉', int(summary.positionsRuined)],
  ]

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-12">
      <header>
        <p className="text-caption text-at-text-muted">
          {summary.name} · {summary.finalYear} 年 · {summary.finalAge} 歲
        </p>
        <h1 className="text-display text-at-accent-default">
          {OUTCOME_LABELS[summary.outcome] ?? summary.outcome}
        </h1>
      </header>

      <section className={cn(CARD, 'grid grid-cols-2 gap-4 p-6 sm:grid-cols-3')}>
        {rows.map(([label, value]) => (
          <div key={label}>
            <span className="text-caption block text-at-text-muted">{label}</span>
            <span className="text-numeric block text-at-text-primary">{value}</span>
          </div>
        ))}
      </section>

      <section className={cn(CARD, 'p-6')}>
        <h2 className="text-title mb-3 text-at-text-primary">投資人格</h2>
        {summary.traits.length === 0 && summary.removedTraits.length === 0 ? (
          <p className="text-caption text-at-text-muted">這輩子沒有長出明顯的投資人格。</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {summary.traits.map((id) => (
              <li key={id}>
                <span className="text-body text-at-accent-default">{session.traitName(id)}</span>
                {session.traitText(id) && (
                  <span className="text-caption ml-2 text-at-text-muted">{session.traitText(id)}</span>
                )}
              </li>
            ))}
            {/* 被互斥取代掉的人格畫刪除線——你曾經是那樣的人（§7.5） */}
            {summary.removedTraits.map((id) => (
              <li key={id} className="text-caption text-at-text-muted line-through">
                {session.traitName(id)}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={cn(CARD, 'flex flex-col gap-3 p-6')}>
        <h2 className="text-title text-at-text-primary">分享這段人生</h2>
        <p className="text-caption text-at-text-muted">
          分享碼含內容指紋：對方載入同一套內容包時，同樣的選擇會走出同一段人生。
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="text-numeric rounded border border-at-border-subtle bg-at-surface-overlay px-3 py-2 text-at-text-primary">
            {summary.fingerprint.toString(36)}.{Number(summary.seed).toString(36)}
          </code>
          <button
            type="button"
            className={BUTTON}
            onClick={() => {
              void navigator.clipboard?.writeText(session.shareCode).then(() => setCopied(true))
            }}
          >
            {copied ? '已複製' : '複製'}
          </button>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <button type="button" className={PRIMARY} onClick={() => store.backToTitle()}>
          再來一局
        </button>
        <button type="button" className={BUTTON} onClick={() => store.goto('game')}>
          回顧時間軸
        </button>
      </div>
    </div>
  )
}

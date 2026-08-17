import type { LogEntry } from '../GameSession.ts'
import { CARD } from '../ui.ts'
import { cn } from '../../styles/cn.ts'

/**
 * 文字流時間軸（年度可摺疊，版面參考 yakyulife）。
 *
 * 條目是 `dispatch()` 當下從 `effects[]` 記下來的，**不是**從 state 反推的——
 * 所以「那一年發生了什麼」跟演出看到的是同一份資料。
 */

interface Props {
  entries: readonly LogEntry[]
  currentYear: number
}

interface YearGroup {
  year: number
  age: number
  entries: LogEntry[]
}

function groupByYear(entries: readonly LogEntry[]): YearGroup[] {
  const groups: YearGroup[] = []
  for (const entry of entries) {
    const last = groups.at(-1)
    if (last?.year === entry.year) last.entries.push(entry)
    else groups.push({ year: entry.year, age: entry.age, entries: [entry] })
  }
  return groups
}

const TONE_CLASS: Record<string, string> = {
  gain: 'text-at-gain',
  loss: 'text-at-loss',
  neutral: 'text-at-accent-default',
}

export function Timeline({ entries, currentYear }: Props) {
  const groups = groupByYear(entries)

  if (groups.length === 0) {
    return (
      <section className={cn(CARD, 'p-4')}>
        <p className="text-caption text-at-text-muted">人生還沒開始寫。做一個決定，這裡就會長出第一行。</p>
      </section>
    )
  }

  return (
    <section className={cn(CARD, 'divide-y divide-at-border-subtle')}>
      {groups.map((group) => (
        <details key={group.year} open={group.year === currentYear} className="px-4 py-3">
          <summary className="text-caption cursor-pointer text-at-text-muted marker:text-at-accent-subtle">
            {group.year} 年 · {group.age} 歲
            <span className="ml-2 text-at-text-muted/70">（{group.entries.length}）</span>
          </summary>
          <ul className="mt-2 flex flex-col gap-1.5">
            {group.entries.map((entry) => (
              <li
                key={entry.id}
                className={cn(
                  entry.kind === 'say' ? 'text-body' : 'text-caption',
                  entry.tone ? TONE_CLASS[entry.tone] : 'text-at-text-secondary',
                )}
              >
                {entry.kind === 'stat' ? <span className="text-numeric">{entry.text}</span> : entry.text}
              </li>
            ))}
          </ul>
        </details>
      ))}
    </section>
  )
}

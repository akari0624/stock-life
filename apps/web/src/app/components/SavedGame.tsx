import type { SaveFile } from '@stock-life/engine'
import { useStore } from '../hooks.ts'
import { money } from '../format.ts'
import { BUTTON, CARD, PRIMARY } from '../ui.ts'
import { cn } from '../../styles/cn.ts'

/**
 * 標題頁的「上一局」。存檔裡只有 `seed + 指紋 + commandLog`，這些數字是
 * 存檔當下順手記的**顯示用**摘要（`meta`）——真正的狀態要重播才算得出來。
 */
export function SavedGame({ save, disabled }: { save: SaveFile; disabled?: boolean }) {
  const store = useStore()
  const { meta } = save

  return (
    <section className={cn(CARD, 'flex flex-col gap-3 p-6')}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-title text-at-text-primary">上一局</h2>
        <span className="text-caption text-at-text-muted">
          {save.packs.map((pack) => `${pack.id} v${pack.version}`).join(' + ')}
        </span>
      </div>

      <p className="text-caption text-at-text-secondary">
        {meta.name} · {meta.year} 年 · {meta.age} 歲 · 第 {meta.turn + 1}/{meta.totalTurns} 年 · 淨資產{' '}
        <span className="text-numeric">{money(meta.netWorth)}</span>
      </p>

      <div className="flex flex-wrap gap-2">
        <button type="button" className={PRIMARY} disabled={disabled} onClick={() => void store.continueSave()}>
          繼續這局
        </button>
        <button type="button" className={BUTTON} disabled={disabled} onClick={() => void store.replaySave()}>
          重播這段人生
        </button>
        <button type="button" className={BUTTON} disabled={disabled} onClick={() => store.clearSave()}>
          刪除存檔
        </button>
      </div>
    </section>
  )
}

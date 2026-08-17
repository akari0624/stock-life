import { useApp, useStore } from '../hooks.ts'
import { BUTTON, CARD } from '../ui.ts'
import { cn } from '../../styles/cn.ts'

/**
 * 內容包畫面。S16 只做「看得到已載入什麼」——
 * 匯入／匯出／啟用停用是 S18（那一步會把 FileSource / PasteSource 接進來）。
 */
export function PacksScreen() {
  const store = useStore()
  const { packs, session } = useApp()

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-6 py-12">
      <header className="flex items-baseline justify-between gap-3">
        <h1 className="text-display text-at-text-primary">內容包</h1>
        <button type="button" className={BUTTON} onClick={() => store.goto(session ? 'game' : 'title')}>
          回去
        </button>
      </header>

      {packs.length === 0 ? (
        <p className="text-caption text-at-text-muted">還沒開始過人生，所以還沒載入任何內容包。</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {packs.map((manifest) => (
            <li key={manifest.id} className={cn(CARD, 'p-4')}>
              <h2 className="text-title text-at-text-primary">
                {manifest.id} <span className="text-numeric text-at-text-muted">v{manifest.version}</span>
              </h2>
              <p className="text-caption mt-1 text-at-text-muted">
                事件 {manifest.provides.events} · 機會 {manifest.provides.opportunities} · 職涯{' '}
                {manifest.provides.careers} · 特性 {manifest.provides.traits}
              </p>
              <p className="text-caption text-at-text-muted">
                engineApi {manifest.engineApi} · facade v{manifest.facadeVersion}
              </p>
            </li>
          ))}
        </ul>
      )}

      <p className="text-caption text-at-text-muted">匯入／匯出內容包會在 S18 加上。</p>
    </div>
  )
}

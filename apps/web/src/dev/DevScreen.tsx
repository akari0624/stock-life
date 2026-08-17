import { useApp, useStore } from '../app/hooks.ts'
import { AudioControls } from '../app/components/AudioControls.tsx'
import { BUTTON } from '../app/ui.ts'
import { AudioLab } from './AudioLab.tsx'
import { TokenGallery } from './TokenGallery.tsx'

/**
 * 開發工具頁（不是遊戲畫面）：S12 的 token 示範與 S15 的音效測試頁。
 * 保留它們是因為兩步的判準需要一個能手動驗的地方——尤其是
 * autoplay unlock 那條只有真瀏覽器才驗得出來（§10.7）。
 */
export function DevScreen() {
  const store = useStore()
  const { session } = useApp()

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 py-12">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-display text-at-text-primary">開發工具</h1>
        <div className="flex items-center gap-2">
          <AudioControls />
          <button type="button" className={BUTTON} onClick={() => store.goto(session ? 'game' : 'title')}>
            回去
          </button>
        </div>
      </header>

      <TokenGallery />
      <AudioLab />
    </div>
  )
}

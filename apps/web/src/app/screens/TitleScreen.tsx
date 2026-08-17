import { themes } from '@stock-life/tokens/keys'
import { START_YEARS } from '../AppStore.ts'
import { useApp, useStore } from '../hooks.ts'
import { AudioControls } from '../components/AudioControls.tsx'
import { BUTTON, BUTTON_ACTIVE, CARD, INPUT, LABEL, PRIMARY } from '../ui.ts'
import { cn } from '../../styles/cn.ts'

export function TitleScreen() {
  const store = useStore()
  const { settings, starting, error } = useApp()

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-6 py-12">
      <header>
        <h1 className="text-display text-at-text-primary">投資人生</h1>
        <p className="text-body mt-2 text-at-text-secondary">
          你會遇到幾次真正的機會。問題從來不是有沒有遇到，而是遇到的時候你敢押多少。
        </p>
      </header>

      <section className={cn(CARD, 'flex flex-col gap-4 p-6')}>
        <div>
          <label className={LABEL} htmlFor="name">
            姓名
          </label>
          <input
            id="name"
            className={INPUT}
            value={settings.name}
            maxLength={12}
            onChange={(event) => store.setSettings({ name: event.target.value })}
          />
        </div>

        <div>
          <span className={LABEL}>起始年代</span>
          <div className="flex gap-2">
            {START_YEARS.map((year) => (
              <button
                key={year}
                type="button"
                className={cn(BUTTON, settings.startYear === year && BUTTON_ACTIVE)}
                onClick={() => store.setSettings({ startYear: year })}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className={LABEL}>世界</span>
          <div className="flex gap-2">
            <button
              type="button"
              className={cn(BUTTON, settings.worldMode === 'random' && BUTTON_ACTIVE)}
              onClick={() => store.setSettings({ worldMode: 'random' })}
            >
              隨機世界
            </button>
            {/* history 是 S19 的 tw-history 產生器，先擺著佔位 */}
            <button type="button" className={BUTTON} disabled title="S19 才會有">
              台股歷史（尚未開放）
            </button>
          </div>
        </div>

        <div>
          <label className={LABEL} htmlFor="seed">
            種子 / 分享碼（留空＝隨機）
          </label>
          <input
            id="seed"
            className={cn(INPUT, 'text-numeric')}
            placeholder="例如 1kf3.9x2p 或 123456"
            value={settings.seedInput}
            onChange={(event) => store.setSettings({ seedInput: event.target.value })}
          />
        </div>

        <div>
          <span className={LABEL}>主題</span>
          <div className="flex gap-2">
            {themes.map((theme) => (
              <button
                key={theme}
                type="button"
                className={cn(BUTTON, settings.theme === theme && BUTTON_ACTIVE)}
                onClick={() => store.setSettings({ theme })}
              >
                {theme}
              </button>
            ))}
          </div>
        </div>

        <AudioControls />

        {error && (
          <p className="text-caption rounded border border-at-loss bg-at-loss/10 p-3 text-at-loss" role="alert">
            {error}
          </p>
        )}

        {/* 這個按鈕同時是 audio unlock 的手勢（§10.7） */}
        <button type="button" className={PRIMARY} disabled={starting} onClick={() => void store.startLife()}>
          {starting ? '載入內容包…' : '開始人生'}
        </button>

        <div className="flex gap-2">
          <button type="button" className={BUTTON} onClick={() => store.goto('packs')}>
            內容包
          </button>
          <button type="button" className={BUTTON} onClick={() => store.goto('dev')}>
            開發工具
          </button>
        </div>
      </section>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { colorKeys, themes, type Theme } from '@stock-life/tokens/keys'
import { cn } from './styles/cn.ts'
import { AudioLab } from './dev/AudioLab.tsx'

/**
 * S12 的示範頁：展示所有 type role、所有 alias 色、以及主題切換。
 * S16 會用真正的遊戲畫面取代它。
 */

const TYPE_ROLES = [
  ['text-display', '一九九〇年，台股上萬點'],
  ['text-title', '你的第一個機會'],
  ['text-body', '同事在午餐時提到一家做記憶體的公司，說下季展望很好。你聽過這個名字，但不確定他是從哪裡聽來的。'],
  ['text-caption', '訊號品質是認知與人脈的函數'],
  ['text-numeric', '1,238,400 / 0.5%'],
] as const

const SECTION = 'rounded-lg border border-at-border-subtle bg-at-surface-raised p-6'

function Swatch({ token }: { token: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="size-9 shrink-0 rounded border border-at-border-subtle"
        // 色塊是用 token 變數直接畫的（迴圈裡的動態 class 掃不到，且這裡要展示的是 token 本身）
        style={{ backgroundColor: `var(--${token})` }}
      />
      <code className="text-caption text-at-text-muted">{token}</code>
    </div>
  )
}

export default function App() {
  const [theme, setTheme] = useState<Theme>('default')

  // 主題切換只覆寫 --at-*（§10.3），所以換一個屬性就整頁換色
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-display text-at-text-primary">Design Token</h1>
          <p className="text-caption text-at-text-muted">
            三層：gt（不進 utility）· at（語意）· ct（元件）
          </p>
        </div>
        <div className="flex gap-2">
          {themes.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setTheme(name)}
              className={cn(
                'text-caption rounded border border-at-border-strong px-3 py-2',
                'text-at-text-secondary hover:border-at-accent-default hover:text-at-accent-default',
                name === theme && 'border-at-accent-default text-at-accent-default',
              )}
            >
              {name}
            </button>
          ))}
        </div>
      </header>

      <section className={SECTION}>
        <h2 className="text-title mb-4 text-at-text-primary">Type roles</h2>
        <div className="flex flex-col gap-5">
          {TYPE_ROLES.map(([role, sample]) => (
            <div key={role}>
              <code className="text-caption text-at-text-muted">{role}</code>
              <p className={cn(role, 'text-at-text-primary')}>{sample}</p>
            </div>
          ))}
        </div>
        <p className="text-caption mt-5 text-at-text-muted">
          numeric 是 tabular——下面兩行的每一位數都必須對齊：
        </p>
        <p className="text-numeric text-at-gain">1,111,111</p>
        <p className="text-numeric text-at-loss">8,888,888</p>
      </section>

      <section className={SECTION}>
        <h2 className="text-title mb-4 text-at-text-primary">Alias 色（at + ct）</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {colorKeys.map((token) => (
            <Swatch key={token} token={token} />
          ))}
        </div>
      </section>

      <AudioLab />

      <section className={SECTION}>
        <h2 className="text-title mb-4 text-at-text-primary">Utility 實測</h2>
        <ul className="flex flex-col gap-3">
          <li className="rounded bg-at-loss/20 p-3 text-at-loss">
            <code className="text-caption">bg-at-loss/20</code> —— alpha 修飾符
          </li>
          <li className="rounded bg-ct-stage-actor_shadow p-3 text-at-text-secondary">
            <code className="text-caption">bg-ct-stage-actor_shadow</code> —— 含 `_` 的複合詞
          </li>
          <li className="text-caption rounded border border-at-border-subtle p-3 text-at-text-muted">
            <code>bg-gt-green-500</code> 刻意**不存在**——想繞過語意層直接用原色，語法上就辦不到
          </li>
        </ul>
      </section>
    </main>
  )
}

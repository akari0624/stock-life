import { colorKeys } from '@stock-life/tokens/keys'
import { cn } from '../styles/cn.ts'
import { CARD } from '../app/ui.ts'

/**
 * S12 的 token 示範：所有 type role、所有 alias 色。
 * 主題切換是真功能，在標題頁上；這裡只驗 token 本身。
 */

const TYPE_ROLES = [
  ['text-display', '一九九〇年，台股上萬點'],
  ['text-title', '你的第一個機會'],
  [
    'text-body',
    '同事在午餐時提到一家做記憶體的公司，說下季展望很好。你聽過這個名字，但不確定他是從哪裡聽來的。',
  ],
  ['text-caption', '訊號品質是認知與人脈的函數'],
  ['text-numeric', '1,238,400 / 0.5%'],
] as const

function Swatch({ token }: { token: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="size-9 shrink-0 rounded border border-at-border-subtle"
        // 迴圈裡的動態 class 掃不到，而這裡要展示的是 token 變數本身
        style={{ backgroundColor: `var(--${token})` }}
      />
      <code className="text-caption text-at-text-muted">{token}</code>
    </div>
  )
}

export function TokenGallery() {
  return (
    <>
      <section className={cn(CARD, 'p-6')}>
        <h2 className="text-title mb-4 text-at-text-primary">Type roles</h2>
        <div className="flex flex-col gap-5">
          {TYPE_ROLES.map(([role, sample]) => (
            <div key={role}>
              <code className="text-caption text-at-text-muted">{role}</code>
              <p className={cn(role, 'text-at-text-primary')}>{sample}</p>
            </div>
          ))}
        </div>
        <p className="text-caption mt-5 text-at-text-muted">numeric 是 tabular——每一位數都要對齊：</p>
        <p className="text-numeric text-at-gain">1,111,111</p>
        <p className="text-numeric text-at-loss">8,888,888</p>
      </section>

      <section className={cn(CARD, 'p-6')}>
        <h2 className="text-title mb-4 text-at-text-primary">Alias 色（at + ct）</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {colorKeys.map((token) => (
            <Swatch key={token} token={token} />
          ))}
        </div>
      </section>

      <section className={cn(CARD, 'p-6')}>
        <h2 className="text-title mb-4 text-at-text-primary">Utility 實測</h2>
        <ul className="flex flex-col gap-3">
          <li className="rounded bg-at-loss/20 p-3 text-at-loss">
            <code className="text-caption">bg-at-loss/20</code> —— alpha 修飾符
          </li>
          <li className="rounded bg-ct-stage-actor_shadow p-3 text-at-text-secondary">
            <code className="text-caption">bg-ct-stage-actor_shadow</code> —— 含 `_` 的複合詞
          </li>
          <li className="text-caption rounded border border-at-border-subtle p-3 text-at-text-muted">
            <code>bg-gt-green-500</code> 刻意不存在——想繞過語意層直接用原色，語法上就辦不到
          </li>
        </ul>
      </section>
    </>
  )
}

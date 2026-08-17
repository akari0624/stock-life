import clsx, { type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'
import { colorKeys, fontKeys, typeRoles } from '@stock-life/tokens/keys'

/**
 * tailwind-merge 必須認識我們自訂的 color / font-size key（DESIGN.md §10.3 ⭐）。
 *
 * 漏掉這步是個會**靜默壞掉**的坑：`cn('text-at-text-primary', 'text-at-text-muted')`
 * 不會去重，兩個 class 都留著，最終顏色由 CSS 順序而不是呼叫順序決定。
 *
 * key 清單由 token build 一併產出（v4 沒有 tailwind.config.ts 物件可以 Object.keys()），
 * 所以這裡不存在第二份手寫清單。
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      // 進了 @theme 的 --color-* → bg-/text-/border-… 的色彩 scale
      color: [...colorKeys],
      // --text-<role> → font-size scale（v4 的 theme key 就叫 text）
      text: [...typeRoles],
      // --font-<key> → font-family scale
      font: [...fontKeys],
    },
  },
})

export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs))

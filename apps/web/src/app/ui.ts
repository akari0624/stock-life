/** 共用的 class 組合。動態值一律走 CSS 變數（§10.4），這裡只有靜態樣式。 */

export const CARD = 'rounded-lg border border-at-border-subtle bg-at-surface-raised'

export const BUTTON =
  'text-caption rounded border border-at-border-strong px-3 py-2 text-at-text-secondary transition-colors hover:border-at-accent-default hover:text-at-accent-default disabled:opacity-40 disabled:hover:border-at-border-strong disabled:hover:text-at-text-muted'

export const BUTTON_ACTIVE = 'border-at-accent-default text-at-accent-default'

export const PRIMARY =
  'text-title rounded-md border border-at-accent-default bg-at-accent-default/10 px-6 py-3 text-at-accent-default transition-colors hover:bg-at-accent-default/20 disabled:opacity-40'

/** 決策選項：一整排、左右對齊，右邊放機率之類的數字 */
export const OPTION =
  'flex w-full items-center justify-between gap-4 rounded-md border border-at-border-subtle bg-at-surface-overlay px-4 py-3 text-left text-at-text-primary transition-colors hover:border-at-accent-default disabled:opacity-40'

export const INPUT =
  'w-full rounded border border-at-border-subtle bg-at-surface-base px-3 py-2 text-at-text-primary outline-none focus:border-at-focus'

export const LABEL = 'text-caption mb-1 block text-at-text-muted'

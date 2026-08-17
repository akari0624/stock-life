import type { Bus, Priority } from './types.ts'

/**
 * 互動音效的 **app 靜態 manifest**（§10.7 的兩個 id 來源之一）。
 *
 * 介面音不屬於遊戲內容，所以 **mod 不可覆寫**——載入內容包時會擋掉同名 id。
 * 現在一個音檔都沒有（`url` 指向未來的檔案位置），整套照樣運作：
 * 找不到 buffer 就什麼都不做，dev 模式印 would-play。
 */

export interface SoundEntry {
  /** 檔案位置。**只有 manifest 能寫路徑**（與 S14 的視覺素材同一條紀律） */
  url: string
  /** audio sprite：起點與長度（秒） */
  offset?: number
  duration?: number
  /** leading-edge 去重視窗（ms）。短促的 UI 音給小值，長尾的演出音給大值 */
  dedupeMs?: number
  bus?: Bus
  priority?: Priority
}

/**
 * ⚠️ 這裡就是 `ActionId` 型別的來源。新增互動音效**只要加一筆**，
 * `playSound('ui_那個新的')` 立刻通過型別檢查；打錯字則是編譯期錯誤。
 */
export const UI_SOUNDS = {
  ui_click: { url: '/audio/ui/click.webm', dedupeMs: 40, bus: 'ui' },
  ui_option_select: { url: '/audio/ui/option_select.webm', dedupeMs: 60, bus: 'ui' },
  ui_option_hover: { url: '/audio/ui/option_hover.webm', dedupeMs: 80, bus: 'ui' },
  ui_transition: { url: '/audio/ui/transition.webm', dedupeMs: 200, bus: 'ui' },
  ui_back: { url: '/audio/ui/back.webm', dedupeMs: 60, bus: 'ui' },
  ui_toggle: { url: '/audio/ui/toggle.webm', dedupeMs: 60, bus: 'ui' },
  ui_error: { url: '/audio/ui/error.webm', dedupeMs: 300, bus: 'ui', priority: 'high' },
  ui_life_start: { url: '/audio/ui/life_start.webm', dedupeMs: 500, bus: 'ui', priority: 'high' },
} as const satisfies Record<string, SoundEntry>

export type UiActionId = keyof typeof UI_SOUNDS

declare const contentSfxBrand: unique symbol

/**
 * 內容包帶來的 sfx id 沒辦法靜態檢查（它在 JSON 裡），所以做成 branded type：
 * 只能透過 `contentSfx()` 產生，而那個函式只有內容／director 管線會呼叫。
 * 於是 app 程式碼裡 `playSound('clik')` 仍然是**編譯期錯誤**。
 */
export type ContentSfxId = string & { readonly [contentSfxBrand]: true }

export type ActionId = UiActionId | ContentSfxId

/** 把內容包的 sfx id 標成 ActionId。未知 id 在載入時只警告不拒載（§10.7）。 */
export const contentSfx = (id: string): ContentSfxId => id as ContentSfxId

export const isUiActionId = (id: string): id is UiActionId => id in UI_SOUNDS

export const uiActionIds = (): UiActionId[] => Object.keys(UI_SOUNDS) as UiActionId[]

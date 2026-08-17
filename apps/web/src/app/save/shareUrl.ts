/**
 * 分享碼 URL：`?s=<code>`（§5.1）。
 *
 * 網址列裡的那一段就是分享碼本身——它已經含內容指紋，所以貼給別人時
 * 「要哪些內容包」是跟著走的，不需要另外講。
 */

export const SHARE_PARAM = 's'

/** 從查詢字串取出分享碼；沒有就回空字串。 */
export function readShareCode(search?: string): string {
  const query = search ?? (typeof location === 'undefined' ? '' : location.search)
  if (!query) return ''
  try {
    return new URLSearchParams(query).get(SHARE_PARAM)?.trim() ?? ''
  } catch {
    return ''
  }
}

/**
 * 把目前這局的分享碼寫回網址列（`replaceState`：不留下一堆上一頁）。
 * 失敗就算了——網址好不好看不值得打斷一局遊戲。
 */
export function writeShareCode(code: string): void {
  if (typeof location === 'undefined' || typeof history === 'undefined') return
  try {
    const url = new URL(location.href)
    url.searchParams.set(SHARE_PARAM, code)
    history.replaceState(null, '', url)
  } catch {
    // about:blank 之類沒有可寫網址的環境
  }
}

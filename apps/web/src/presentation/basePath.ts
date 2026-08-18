/**
 * 把 manifest 寫的路徑接上站台的 base（`vite.config.ts` 的 `base`）。
 *
 * 為什麼需要這個：GitHub Pages 的專案站台在 `/<repo>/` 底下，Vite 會改寫
 * **它自己打包到的**路徑（index.html、import 進來的檔案），但 `manifest.assets`
 * 裡的 `/art/bg/office.webp` 只是一段**資料字串**，Vite 沒看過它。
 * 於是 dev（base 是 `/`）一切正常，上線之後每一張圖都 404。
 *
 * 所以路徑一律在**解析成 URL 的那一刻**接 base，不在內容裡寫死站台位置——
 * 同一個內容包才能同時在 dev、GitHub Pages、和別人的網域底下運作。
 */

/** 已經指名協定的（http:、data:、blob:）或跨協定的 `//host/…` 就原樣放行。 */
const ABSOLUTE = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i

export function withBase(url: string, base: string = import.meta.env.BASE_URL): string {
  if (url.length === 0 || ABSOLUTE.test(url)) return url
  const prefix = base.endsWith('/') ? base : `${base}/`
  return prefix + url.replace(/^\/+/, '')
}

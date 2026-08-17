/**
 * 把一段文字交給瀏覽器下載。純前端、沒有後端（S18 的鐵則）。
 * 失敗就安靜放棄——沒能存成檔案不該讓畫面掛掉。
 */
export function downloadText(filename: string, text: string): boolean {
  try {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    return true
  } catch {
    return false
  }
}

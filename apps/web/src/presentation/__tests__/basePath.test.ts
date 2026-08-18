import { describe, expect, it } from 'vitest'
import { withBase } from '../basePath.ts'

// 這條 bug 只在**部署到子路徑之後**才看得到（dev 的 base 是 `/`，永遠正確），
// 所以一定要用測試把子路徑的情況釘住，不能靠開發時發現。
describe('withBase', () => {
  it('子路徑部署時，manifest 的絕對路徑要接上 base', () => {
    expect(withBase('/art/bg/office.webp', '/stock-life/')).toBe('/stock-life/art/bg/office.webp')
  })

  it('相對路徑也接得上', () => {
    expect(withBase('art/bg/office.webp', '/stock-life/')).toBe('/stock-life/art/bg/office.webp')
  })

  it('base 沒有結尾斜線也要接對', () => {
    expect(withBase('/art/x.webp', '/stock-life')).toBe('/stock-life/art/x.webp')
  })

  it('base 是根目錄時原樣', () => {
    expect(withBase('/art/x.webp', '/')).toBe('/art/x.webp')
  })

  it('已經指名協定的不動——mod 可以指向自己的 CDN', () => {
    for (const url of ['https://cdn.example.com/a.webp', 'data:image/webp;base64,AA', '//cdn.example.com/a.webp']) {
      expect(withBase(url, '/stock-life/')).toBe(url)
    }
  })
})

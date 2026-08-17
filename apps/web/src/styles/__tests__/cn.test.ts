/**
 * §10.3 ⭐ 的坑：自訂 color / font-size key 沒註冊進 tailwind-merge，
 * 去重會**靜默失效**——兩個 class 都留著，最終樣式由 CSS 順序而不是呼叫順序決定。
 */
import { describe, expect, it } from 'vitest'
import { colorKeys, typeRoles } from '@stock-life/tokens/keys'
import { cn } from '../cn.ts'

describe('cn', () => {
  it('同一組（文字色）只留後者', () => {
    expect(cn('text-at-text-primary', 'text-at-text-muted')).toBe('text-at-text-muted')
  })

  it('背景色、邊框色、type role 都會去重', () => {
    expect(cn('bg-at-surface-base', 'bg-at-surface-raised')).toBe('bg-at-surface-raised')
    expect(cn('border-at-border-subtle', 'border-at-border-strong')).toBe('border-at-border-strong')
    expect(cn('text-body', 'text-title')).toBe('text-title')
    expect(cn('font-sans', 'font-mono')).toBe('font-mono')
  })

  it('type role 與文字色是不同組，不互相吃掉', () => {
    expect(cn('text-body', 'text-at-loss')).toBe('text-body text-at-loss')
  })

  it('ct 層的複合詞 key 也認得', () => {
    expect(cn('bg-ct-stage-bg_wash', 'bg-ct-stage-actor_shadow')).toBe('bg-ct-stage-actor_shadow')
  })

  it('alpha 修飾符不影響分組', () => {
    expect(cn('bg-at-loss', 'bg-at-loss/20')).toBe('bg-at-loss/20')
  })

  it('保留 clsx 的條件語法', () => {
    const hidden: boolean = false
    expect(cn('p-2', hidden && 'hidden', ['text-caption', { 'text-at-warn': true }])).toBe(
      'p-2 text-caption text-at-warn',
    )
  })

  it('key 清單來自 token build，不是手寫的第二份', () => {
    expect(colorKeys).toContain('at-text-primary')
    expect(colorKeys.some((k) => k.startsWith('gt-'))).toBe(false)
    expect(typeRoles).toContain('numeric')
  })
})

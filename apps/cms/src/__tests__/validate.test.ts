import { describe, it, expect } from 'vitest'
import { emptyDraft, newEvent } from '../editor/draft.ts'
import { validateDraft, issueKey } from '../editor/validate.ts'

function filled(id: string) {
  const event = newEvent('entry', id)
  event.prompt = '情境'
  event.choices = event.choices.map((choice) => ({ ...choice, label: '動作', good: '好', bad: '壞' }))
  return event
}

describe('即時驗證', () => {
  it('用的是遊戲同一套 schema，錯誤訊息就是 schema 裡那句中文', () => {
    const draft = emptyDraft()
    const event = filled('a')
    event.prompt = ''
    draft.events = [event]

    const report = validateDraft(draft, new Set(['a']))
    expect(report.ok).toBe(false)
    const issues = report.byEvent.get(0) ?? []
    expect(issues.some((issue) => issueKey(issue.path) === 'prompt')).toBe(true)
    expect(issues.find((issue) => issueKey(issue.path) === 'prompt')?.message).toContain('每個事件都要有 prompt')
  })

  it('斷鏈在打字的當下就講，不等匯出（§6.5.3 #4）', () => {
    const draft = emptyDraft()
    const event = filled('a')
    event.good.next = { id: 'nowhere' }
    draft.events = [event]

    const report = validateDraft(draft, new Set(['a']))
    expect(report.brokenLinks).toEqual([{ eventId: 'a', branch: 'good', field: 'id', target: 'nowhere' }])
  })

  it('指到一起載入的官方包不算斷鏈——跨包接故事是合法的（§7.2）', () => {
    const draft = emptyDraft()
    const event = filled('a')
    event.good.next = { id: 'first_love', afterYears: 2, orElse: 'quiet_end' }
    draft.events = [event]

    const report = validateDraft(draft, new Set(['a', 'first_love', 'quiet_end']))
    expect(report.brokenLinks).toEqual([])
  })

  it('同一個包裡的重複 id 兩格都標紅——引擎還沒有防撞（§6.5.4）', () => {
    const draft = emptyDraft()
    draft.events = [filled('same'), filled('same')]

    const report = validateDraft(draft, new Set(['same']))
    expect(report.duplicateIds).toEqual(['same'])
    expect(report.byEvent.get(0)).toBeDefined()
    expect(report.byEvent.get(1)).toBeDefined()
  })

  it('填完的一格是乾淨的', () => {
    const draft = emptyDraft()
    draft.events = [filled('clean')]
    expect(validateDraft(draft, new Set(['clean'])).ok).toBe(true)
  })
})

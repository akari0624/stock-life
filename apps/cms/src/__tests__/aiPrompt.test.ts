import { describe, it, expect } from 'vitest'
import { BASE_SUCCESS_CHANCE, STAT_KEYS, type StateEffect } from '@stock-life/engine'
import { buildPrompt, DEFAULT_PROMPT_OPTIONS } from '../editor/aiPrompt.ts'
import { conditionFields } from '../editor/fields.ts'
import { emptyDraft, newEvent } from '../editor/draft.ts'
import type { Baseline } from '../editor/EditorStore.ts'

const EFFECT_TYPES: StateEffect['type'][] = [
  'stat.add',
  'capital.mul',
  'flag.set',
  'trait.grant',
  'position.open',
]

describe('給 AI 的提示詞（§6.5.6）', () => {
  it('條件欄位是算出來的，不是抄的——`listFacadeFields()` 有的每一個都在裡面', () => {
    const prompt = buildPrompt(DEFAULT_PROMPT_OPTIONS, emptyDraft(), undefined)
    for (const field of conditionFields()) {
      expect(prompt).toContain(`\`${field.path}\``)
    }
    // 反過來：選單刻意排除的 era.themes 不可以偷偷出現在提示詞裡
    // （固定運算子集合裡沒有「陣列包含」，給 AI 一個永遠不成立的條件比不給更糟）
    expect(prompt).not.toContain('era.themes')
  })

  it('效果型別與統計欄位名一個都不少，成功率基準跟引擎同一個數字', () => {
    const prompt = buildPrompt(DEFAULT_PROMPT_OPTIONS, emptyDraft(), undefined)
    for (const type of EFFECT_TYPES) expect(prompt).toContain(type)
    for (const key of STAT_KEYS) expect(prompt).toContain(key)
    expect(prompt).toContain(`${BASE_SUCCESS_CHANCE}%`)
  })

  it('範例事件取官方包裡真的在跑的那一則，不另外手抄一份', () => {
    const sample = newEvent('entry', 'real_event')
    sample.prompt = '大學同學找你吃飯'
    const baseline: Baseline = {
      eventIds: new Set(['real_event']),
      careerNodes: [{ id: 'analyst', industry: 'finance' }],
      opportunityIds: [],
      traitIds: [],
      manifests: [],
      sampleEvents: [sample as never],
    }

    const prompt = buildPrompt(DEFAULT_PROMPT_OPTIONS, emptyDraft(), baseline)
    expect(prompt).toContain('大學同學找你吃飯')
    // 職涯圖也進了條件欄位的候選值，跟條件建構器的下拉選單同一份來源
    expect(prompt).toContain('"analyst"')
  })

  it('草稿裡已經有的 id 會列出來，AI 才不會產一批撞名的', () => {
    const draft = emptyDraft()
    draft.events = [newEvent('entry', 'already_here')]
    expect(buildPrompt(DEFAULT_PROMPT_OPTIONS, draft, undefined)).toContain('already_here')
  })

  it('連續劇情跟一批獨立事件講的話不一樣', () => {
    const arc = buildPrompt({ count: 4, shape: 'arc', topic: '創業' }, emptyDraft(), undefined)
    const entries = buildPrompt({ count: 4, shape: 'entry', topic: '' }, emptyDraft(), undefined)
    expect(arc).toContain('連續劇情')
    expect(arc).toContain('創業')
    expect(entries).toContain('互不相關')
  })
})

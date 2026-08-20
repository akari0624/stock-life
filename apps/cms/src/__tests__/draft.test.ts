import { describe, it, expect } from 'vitest'
import { emptyDraft, newEvent, normalizeDraft, toPackFile, type PackDraft } from '../editor/draft.ts'

describe('草稿 ↔ 內容包檔案', () => {
  it('provides 從實際陣列算出來，不吃作者手寫的數字（§6.4）', () => {
    const draft = emptyDraft()
    draft.events = [newEvent('entry', 'a'), newEvent('beat', 'b')]
    draft.opportunities = [{ id: 'x' }]
    const file = toPackFile(draft) as { manifest: { provides: Record<string, unknown> } }
    expect(file.manifest.provides).toMatchObject({ events: 2, opportunities: 1, traits: 0 })
  })

  it('匯入 → 匯出不會吃掉編輯器不提供的東西', () => {
    // 手寫的包：計數器效果、旗標、嵌套條件、機會與特性——編輯器一個都不編輯，
    // 但它們必須原封不動地活過一次來回。這是「不提供」與「可以刪掉」的分界線。
    const authored = {
      manifest: { id: 'hand-written', version: '2.3.1', engineApi: '^1', facadeVersion: 1, requires: [], assets: { actors: {}, bg: {}, sfx: {} } },
      events: [
        {
          id: 'hand',
          require: { all: [{ '>=': ['age', 28] }, { not: { flag: 'burned' } }, { chance: 0.3 }] },
          weight: 6,
          once: true,
          prompt: '情境',
          choices: [
            { id: 'safe', label: 'a', odds: '+20', mag: 1, good: 'g', bad: 'b' },
            { id: 'normal', label: 'b', odds: '0', mag: 2, good: 'g', bad: 'b' },
            { id: 'bold', label: 'c', odds: '-20', mag: 3, good: 'g', bad: 'b' },
          ],
          good: {
            effects: [
              { type: 'stat.add', key: 'cofounded', value: 1 },
              { type: 'flag.set', key: 'went_in' },
            ],
            next: { id: 'later', afterYears: 5, orElse: 'quiet' },
          },
          bad: { effects: [] },
          scene: { bg: 'restaurant', actor: 'classmate' },
        },
      ],
      opportunities: [{ id: 'mem_supercycle' }],
      careerGraph: { nodes: [{ id: 'n' }], edges: [] },
      traits: [{ id: 'patient' }],
    }

    const draft = normalizeDraft(authored)
    const exported = toPackFile(draft) as Record<string, unknown>

    expect(exported.opportunities).toEqual(authored.opportunities)
    expect(exported.traits).toEqual(authored.traits)
    expect(exported.careerGraph).toEqual(authored.careerGraph)

    const event = (exported.events as Record<string, unknown>[])[0]!
    expect(event.require).toEqual(authored.events[0].require)
    expect(event.good).toEqual(authored.events[0].good)
    expect(event.scene).toEqual(authored.events[0].scene)
    // 版本不可以被編輯器悄悄改掉——指紋是 id@version 算出來的（§5.1）
    expect((exported.manifest as { version: string }).version).toBe('2.3.1')
  })

  it('afterYears 0 與空的 scene id 匯出時清掉——那是表單的中間狀態', () => {
    const draft: PackDraft = emptyDraft()
    const event = newEvent('entry', 'a')
    event.good.next = { id: 'b', afterYears: 0, orElse: '' }
    event.scene = { bg: '', actor: 'someone' }
    draft.events = [event]

    const exported = (toPackFile(draft).events as Record<string, unknown>[])[0]!
    expect(exported.good).toEqual({ effects: [], next: { id: 'b' } })
    expect(exported.scene).toEqual({ actor: 'someone' })
  })

  it('壞掉的 JSON 也進得來：缺欄位補預設，讓作者在編輯器裡修', () => {
    const draft = normalizeDraft({ events: [{ id: 'half' }] })
    expect(draft.events[0]!.id).toBe('half')
    expect(draft.events[0]!.choices).toHaveLength(3)
    expect(draft.events[0]!.choices.map((c) => c.id)).toEqual(['safe', 'normal', 'bold'])
  })
})

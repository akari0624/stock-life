import { describe, it, expect } from 'vitest'
import { listFacadeFields } from '../FacadeField.js'
import { readFacade } from '../ModStateView.js'
import { createInitialGameState } from '../../state/createGameState.js'
import { Calendar } from '../../Calendar.js'

describe('listFacadeFields', () => {
  it('returns a non-empty enumerable list', () => {
    const fields = listFacadeFields()
    expect(fields.length).toBeGreaterThan(0)
  })

  it('every listed field is actually readable via readFacade (S5 will consume this list to build its schema enum)', () => {
    const calendar = new Calendar({ granularity: 'year', startYear: 2000, startAge: 25 })
    const state = createInitialGameState({ name: 'Test Player', calendar })
    for (const field of listFacadeFields()) {
      expect(() => readFacade(state, field.path)).not.toThrow()
    }
  })

  it('offers age/year/stage but never turnIndex (TODO.md #4: content must not depend on turn granularity)', () => {
    const paths = listFacadeFields().map((field) => field.path)
    expect(paths).toEqual(expect.arrayContaining(['age', 'year', 'stage']))
    // A condition written against turnIndex would silently change meaning the
    // day the calendar switches to quarters. The whitelist makes that
    // impossible to write in the first place.
    expect(paths.filter((path) => /turn/i.test(path))).toEqual([])
  })

  it('returns a fresh array each call (callers cannot mutate the source list)', () => {
    const a = listFacadeFields()
    const b = listFacadeFields()
    expect(a).not.toBe(b)
    expect(a).toEqual(b)
  })

  it('enum fields declare their allowed values', () => {
    const stageField = listFacadeFields().find((f) => f.path === 'stage')
    expect(stageField?.type).toBe('enum')
    expect(stageField?.enum).toContain('retirement')
  })
})

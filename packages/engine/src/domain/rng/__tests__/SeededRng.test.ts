import { describe, it, expect } from 'vitest'
import { SeededRng } from '../SeededRng.js'

function take(stream: { next(): number }, n: number): number[] {
  return Array.from({ length: n }, () => stream.next())
}

describe('SeededRng', () => {
  it('is deterministic: same seed produces the same sequence', () => {
    const a = new SeededRng('life-42').stream('events')
    const b = new SeededRng('life-42').stream('events')
    expect(take(a, 20)).toEqual(take(b, 20))
  })

  it('different seeds produce different sequences', () => {
    const a = new SeededRng('life-42').stream('events')
    const b = new SeededRng('life-43').stream('events')
    expect(take(a, 20)).not.toEqual(take(b, 20))
  })

  it('different stream ids under the same seed are independent', () => {
    const rng = new SeededRng('life-42')
    const events = take(rng.stream('events'), 20)
    const era = take(rng.stream('era'), 20)
    expect(events).not.toEqual(era)
  })

  it('§5.2: adding a new stream does not change the sequence of an existing stream', () => {
    // Before: only 'events' is ever drawn from.
    const before = new SeededRng('life-42')
    const eventsBefore = take(before.stream('events'), 20)

    // After: a new stream ('career') is introduced, drawn from first.
    const after = new SeededRng('life-42')
    take(after.stream('career'), 5) // simulate a newly-added system consuming its own stream first
    const eventsAfter = take(after.stream('events'), 20)

    expect(eventsAfter).toEqual(eventsBefore)
  })

  it('golden: fixed seed, first 20 values per stream', () => {
    const rng = new SeededRng('golden-seed-1')
    const events = take(rng.stream('events'), 20)
    const era = take(rng.stream('era'), 20)
    const career = take(rng.stream('career'), 20)

    expect({ events, era, career }).toMatchSnapshot()
  })

  describe('RngStream helpers', () => {
    it('int(a, b) stays within [a, b] inclusive and is deterministic', () => {
      const a = new SeededRng('helpers').stream('s').int(1, 6)
      const b = new SeededRng('helpers').stream('s').int(1, 6)
      expect(a).toBe(b)
      expect(a).toBeGreaterThanOrEqual(1)
      expect(a).toBeLessThanOrEqual(6)
    })

    it('pick(arr) returns an element of the array, deterministically', () => {
      const arr = ['light', 'normal', 'heavy', 'leveraged']
      const a = new SeededRng('helpers').stream('s').pick(arr)
      const b = new SeededRng('helpers').stream('s').pick(arr)
      expect(a).toBe(b)
      expect(arr).toContain(a)
    })

    it('pick(empty) throws', () => {
      const s = new SeededRng('helpers').stream('s')
      expect(() => s.pick([])).toThrow()
    })

    it('chance(1) is always true and chance(0) is always false', () => {
      const s = new SeededRng('helpers').stream('s')
      for (let i = 0; i < 50; i++) expect(s.chance(1)).toBe(true)
      for (let i = 0; i < 50; i++) expect(s.chance(0)).toBe(false)
    })

    it('chance(p) is deterministic under the same seed', () => {
      const a = take2(new SeededRng('helpers2').stream('s'))
      const b = take2(new SeededRng('helpers2').stream('s'))
      expect(a).toEqual(b)

      function take2(s: { chance(p: number): boolean }): boolean[] {
        return Array.from({ length: 30 }, () => s.chance(0.5))
      }
    })

    it('normal(sd) is deterministic and centers roughly on the given mean', () => {
      const a = new SeededRng('normal-test').stream('s')
      const b = new SeededRng('normal-test').stream('s')
      const samplesA = Array.from({ length: 500 }, () => a.normal(1, 10))
      const samplesB = Array.from({ length: 500 }, () => b.normal(1, 10))
      expect(samplesA).toEqual(samplesB)

      const mean = samplesA.reduce((sum, v) => sum + v, 0) / samplesA.length
      expect(mean).toBeGreaterThan(9)
      expect(mean).toBeLessThan(11)
    })
  })
})

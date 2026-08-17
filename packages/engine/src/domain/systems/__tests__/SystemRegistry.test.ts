import { describe, it, expect } from 'vitest'
import { SystemRegistry } from '../SystemRegistry.js'
import type { GameSystem } from '../GameSystem.js'

function makeSystem(id: string, order: number, extra: Partial<GameSystem> = {}): GameSystem {
  return { id, order, ...extra }
}

describe('SystemRegistry', () => {
  it('lists systems sorted by order regardless of registration order', () => {
    const registry = new SystemRegistry()
    registry.register(makeSystem('c', 30))
    registry.register(makeSystem('a', 10))
    registry.register(makeSystem('b', 20))
    expect(registry.list().map((s) => s.id)).toEqual(['a', 'b', 'c'])
  })

  it('rejects registering the same system id twice', () => {
    const registry = new SystemRegistry()
    registry.register(makeSystem('a', 1))
    expect(() => registry.register(makeSystem('a', 2))).toThrow()
  })

  it('facadeFields() aggregates every registered system contribution', () => {
    const registry = new SystemRegistry()
    registry.register(
      makeSystem('a', 1, { facadeFields: () => [{ path: 'counter.a', label: 'A', type: 'number' }] }),
    )
    registry.register(
      makeSystem('b', 2, { facadeFields: () => [{ path: 'counter.b', label: 'B', type: 'number' }] }),
    )
    const fields = registry.facadeFields()
    expect(fields.map((f) => f.path).sort()).toEqual(['counter.a', 'counter.b'])
  })

  it('allFacadeFields() includes both the static whitelist and system contributions', () => {
    const registry = new SystemRegistry()
    registry.register(makeSystem('a', 1, { facadeFields: () => [{ path: 'counter.a', label: 'A', type: 'number' }] }))
    const all = registry.allFacadeFields()
    expect(all.some((f) => f.path === 'age')).toBe(true) // static
    expect(all.some((f) => f.path === 'counter.a')).toBe(true) // system-contributed
  })

  it('a system without facadeFields() contributes nothing, without throwing', () => {
    const registry = new SystemRegistry()
    registry.register(makeSystem('a', 1))
    expect(registry.facadeFields()).toEqual([])
  })
})

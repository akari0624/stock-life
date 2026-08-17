import { describe, it, expect } from 'vitest'
import * as engine from '../index.js'

describe('engine boundary', () => {
  it('runs in node without any DOM globals', () => {
    // Use 'in globalThis' instead of typeof — DOM types not in tsconfig
    expect('window' in globalThis).toBe(false)
    expect('document' in globalThis).toBe(false)
    expect('localStorage' in globalThis).toBe(false)
  })

  it('exports a public API without DOM dependencies', () => {
    expect(engine).toBeDefined()
    expect(typeof engine.ENGINE_VERSION).toBe('string')
  })
})

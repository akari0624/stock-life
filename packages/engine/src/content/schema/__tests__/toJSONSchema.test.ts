import { describe, it, expect } from 'vitest'
import { exportContentJSONSchemas } from '../toJSONSchema.js'

describe('exportContentJSONSchemas', () => {
  it('produces a JSON Schema document for each content shape', () => {
    const schemas = exportContentJSONSchemas()
    for (const key of ['manifest', 'opportunity', 'event', 'careerGraph', 'trait']) {
      const schema = schemas[key] as Record<string, unknown>
      expect(schema).toBeDefined()
      expect(schema['type']).toBe('object')
      expect(typeof schema['$schema']).toBe('string')
    }
  })

  it('is JSON-serializable (what schema:export writes to disk)', () => {
    const schemas = exportContentJSONSchemas()
    expect(() => JSON.stringify(schemas)).not.toThrow()
  })
})

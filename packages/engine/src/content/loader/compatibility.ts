import { FACADE_VERSION } from '../../domain/facade/ModStateView.js'
import type { Manifest } from '../schema/manifest.js'

// §6.4: engineApi / facadeVersion incompatibility must reject the load and
// say why — never a silent runtime surprise.

export const ENGINE_API_VERSION = 1

export interface CompatibilityIssue {
  type: 'engine_api_incompatible' | 'facade_version_incompatible'
  message: string
}

export function checkCompatibility(manifest: Pick<Manifest, 'engineApi' | 'facadeVersion'>): CompatibilityIssue[] {
  const issues: CompatibilityIssue[] = []

  const requiredMajor = parseCaretMajor(manifest.engineApi)
  if (requiredMajor === undefined || requiredMajor !== ENGINE_API_VERSION) {
    issues.push({
      type: 'engine_api_incompatible',
      message: `Pack requires engineApi "${manifest.engineApi}", but this engine is v${ENGINE_API_VERSION}.`,
    })
  }

  if (manifest.facadeVersion !== FACADE_VERSION) {
    issues.push({
      type: 'facade_version_incompatible',
      message: `Pack requires facadeVersion ${manifest.facadeVersion}, but this engine exposes facadeVersion ${FACADE_VERSION}.`,
    })
  }

  return issues
}

function parseCaretMajor(range: string): number | undefined {
  const match = /^\^(\d+)$/.exec(range.trim())
  if (!match) return undefined
  return Number(match[1])
}

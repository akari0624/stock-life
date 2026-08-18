import { BUILTIN_SCENE_IDS } from '../../domain/expr/sceneIds.js'
import type { SceneRef } from '../../domain/expr/effects.js'
import type { Manifest } from '../schema/manifest.js'
import type { MergedContent } from '../loader/merge.js'

/**
 * The demand side of §6.4's `assets` block (TODO.md #5a).
 *
 * Scene ids are written inline, next to the event that uses them — on purpose,
 * because an author should not have to register a background in a second file
 * before they can use it. The cost is that nobody can answer "how many
 * backgrounds does this pack need drawn" by reading a list, since there is no
 * list. This walks the loaded content and produces one.
 *
 * `manifest.assets` says what exists; this says what is *asked for*. An id with
 * `provided: false` is one the AssetResolver is currently faking.
 */

/** Deliberately the field names of `SceneRef`, so extraction is a lookup. */
export const ASSET_KINDS = ['bg', 'actor', 'sfx', 'fx'] as const

export type AssetKind = (typeof ASSET_KINDS)[number]

export interface AssetUsage {
  kind: AssetKind
  id: string
  /** How many content entries reference it. */
  count: number
  /** The content entries that reference it, sorted; `(engine)` for builtins. */
  usedBy: string[]
  /**
   * Whether some manifest maps the id to a file. `fx` is never provided —
   * FX are CSS animations and §6.4's assets block has no fx section.
   */
  provided: boolean
}

export type AssetRequirements = Record<AssetKind, AssetUsage[]>

export interface CollectAssetsOptions {
  /** Extra ids the host emits itself, on top of `BUILTIN_SCENE_IDS`. */
  extra?: Partial<Record<AssetKind, readonly string[]>>
  /** Set false to count only what the content asks for. Defaults to true. */
  builtins?: boolean
}

/** `fx` has no manifest section — see `AssetUsage.provided`. */
const MANIFEST_SECTION: Record<AssetKind, keyof Manifest['assets'] | undefined> = {
  bg: 'bg',
  actor: 'actors',
  sfx: 'sfx',
  fx: undefined,
}

/**
 * An entry counts as provided only when it actually carries a file. A
 * `{ label: '老王' }` entry customises the fallback colour block, it does not
 * replace it — mirrors `AssetResolver`'s `entry?.url ? 'manifest' : 'fallback'`.
 */
export function hasAssetFile(value: unknown): boolean {
  if (typeof value === 'string') return value.length > 0
  if (typeof value !== 'object' || value === null) return false
  const url = (value as { url?: unknown }).url
  return typeof url === 'string' && url.length > 0
}

interface Scened {
  id: string
  scene: SceneRef
}

export function collectRequiredAssets(
  content: MergedContent,
  options: CollectAssetsOptions = {},
): AssetRequirements {
  const usage = new Map<string, { kind: AssetKind; id: string; usedBy: Set<string> }>()

  const add = (kind: AssetKind, id: string | undefined, by: string): void => {
    if (!id) return
    const key = `${kind}:${id}`
    let entry = usage.get(key)
    if (!entry) {
      entry = { kind, id, usedBy: new Set() }
      usage.set(key, entry)
    }
    entry.usedBy.add(by)
  }

  const scened: Scened[] = [...content.events, ...content.opportunities, ...content.traits]
  for (const item of scened) {
    for (const kind of ASSET_KINDS) add(kind, item.scene[kind], item.id)
  }

  if (options.builtins !== false) {
    for (const kind of ASSET_KINDS) {
      for (const id of BUILTIN_SCENE_IDS[kind]) add(kind, id, '(engine)')
    }
  }
  for (const kind of ASSET_KINDS) {
    for (const id of options.extra?.[kind] ?? []) add(kind, id, '(host)')
  }

  const provided = providedIds(content.manifests)
  const requirements: AssetRequirements = { bg: [], actor: [], sfx: [], fx: [] }

  for (const entry of usage.values()) {
    const section = MANIFEST_SECTION[entry.kind]
    requirements[entry.kind].push({
      kind: entry.kind,
      id: entry.id,
      count: entry.usedBy.size,
      usedBy: [...entry.usedBy].sort(),
      provided: section !== undefined && provided[section].has(entry.id),
    })
  }

  // Most-used first: that is the order art should be produced in, because the
  // first background drawn should be the one the player stares at ten times.
  for (const kind of ASSET_KINDS) {
    requirements[kind].sort((a, b) => b.count - a.count || a.id.localeCompare(b.id))
  }

  return requirements
}

function providedIds(manifests: readonly Manifest[]): Record<keyof Manifest['assets'], Set<string>> {
  const provided = { actors: new Set<string>(), bg: new Set<string>(), sfx: new Set<string>() }
  for (const manifest of manifests) {
    for (const section of ['actors', 'bg', 'sfx'] as const) {
      for (const [id, value] of Object.entries(manifest.assets[section] ?? {})) {
        if (hasAssetFile(value)) provided[section].add(id)
      }
    }
  }
  return provided
}

/** Only the ids still running on a fallback — the actual to-produce list. */
export function missingAssets(requirements: AssetRequirements): AssetUsage[] {
  return ASSET_KINDS.flatMap((kind) => requirements[kind].filter((usage) => !usage.provided))
}

/**
 * A `manifest.assets` block with every asked-for id present and an empty path,
 * ready to paste into a pack and fill in. `fx` is left out (no section for it).
 */
export function assetManifestSkeleton(requirements: AssetRequirements): Manifest['assets'] {
  const skeleton: Manifest['assets'] = { actors: {}, bg: {}, sfx: {} }
  for (const kind of ASSET_KINDS) {
    const section = MANIFEST_SECTION[kind]
    if (!section) continue
    for (const usage of [...requirements[kind]].sort((a, b) => a.id.localeCompare(b.id))) {
      skeleton[section][usage.id] = ''
    }
  }
  return skeleton
}

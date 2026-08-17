import { z } from 'zod'
import type { Command } from '../domain/turn/Command.js'
import type { ContentSource } from '../content/loader/ContentSource.js'
import type { ContentValidationIssue } from '../content/loader/loadContentPack.js'
import type { PackIdentity } from '../content/loader/fingerprint.js'
import { createLife, type Life, type LifeOptions } from './createLife.js'

// §5.1 / TODO.md #4: a save is `seed + contentFingerprint + commandLog`, never
// a state snapshot. The state is a *function* of those three, so when the
// internal shape of GameState changes — and it will — every old save still
// replays. A snapshot would have to be migrated field by field forever.
//
// Nothing in here touches storage. Where the bytes live (localStorage, a file,
// a server one day) is the app's business; this module only owns the format.

export const SAVE_SCHEMA_VERSION = 1

/** Display-only. Recomputed by replaying — never trusted as truth. */
export interface SaveMeta {
  name: string
  turn: number
  totalTurns: number
  year: number
  age: number
  netWorth: number
}

export interface SaveFile {
  schemaVersion: number
  seed: string | number
  /** hash of the loaded packs (§5.1) — the fast "is this the same content?" check */
  fingerprint: number
  /** The same packs by name, so a mismatch can say *which* pack is missing. */
  packs: PackIdentity[]
  /** Everything except the seed that createLife() needs to line up again. */
  options: SaveLifeOptions
  commandLog: Command[]
  /** Injected by the caller — the engine has no clock (§5.3). */
  savedAt: number
  meta: SaveMeta
}

export interface SaveLifeOptions {
  name: string
  startAge: number
  endAge: number
  startYear: number
  granularity: 'year' | 'quarter'
  worldGeneratorId: string
  startNodeId: string
}

// ── Schema ──────────────────────────────────────────────────────────────────

/**
 * Annotated as `z.ZodType<Command>` so the schema can never *widen* past the
 * Command union. A missing variant is caught by `save.test.ts`, which builds a
 * `Record<Command['type'], Command>` — the compiler demands one of each.
 */
export const commandSchema: z.ZodType<Command> = z.discriminatedUnion('type', [
  z.object({ type: z.literal('allocateDice'), assignment: z.record(z.string(), z.number()) }),
  z.object({ type: z.literal('resolveEvent'), choice: z.enum(['safe', 'normal', 'bold']) }),
  z.object({
    type: z.literal('takeOpportunity'),
    id: z.string(),
    sizing: z.enum(['light', 'normal', 'heavy', 'leveraged']),
  }),
  z.object({ type: z.literal('declineOpportunity'), id: z.string() }),
  z.object({ type: z.literal('resolveTrial'), positionId: z.string(), choice: z.string() }),
  z.object({ type: z.literal('advanceTurn') }),
])

const packIdentitySchema = z.object({ id: z.string().min(1), version: z.string().min(1) })

const saveLifeOptionsSchema = z.object({
  name: z.string(),
  startAge: z.number().int(),
  endAge: z.number().int(),
  startYear: z.number().int(),
  granularity: z.enum(['year', 'quarter']),
  worldGeneratorId: z.string().min(1),
  startNodeId: z.string().min(1),
})

export const saveFileSchema = z.object({
  schemaVersion: z.number().int().positive(),
  seed: z.union([z.string(), z.number()]),
  fingerprint: z.number().int(),
  packs: z.array(packIdentitySchema),
  options: saveLifeOptionsSchema,
  commandLog: z.array(commandSchema),
  savedAt: z.number().int().nonnegative(),
  meta: z.object({
    name: z.string(),
    turn: z.number().int().nonnegative(),
    totalTurns: z.number().int().nonnegative(),
    year: z.number().int(),
    age: z.number().int(),
    netWorth: z.number(),
  }),
})

// ── Migration ───────────────────────────────────────────────────────────────

/** Rewrites a save one version forward. Registered in `SAVE_MIGRATIONS`. */
export type SaveMigration = (save: Record<string, unknown>) => Record<string, unknown>

/**
 * `fromVersion → migration`. Empty at v1 by definition: the hook exists so
 * that shipping v2 is one entry here plus nothing else, and saves written by
 * today's build keep loading (TODO.md #4).
 */
export const SAVE_MIGRATIONS: Readonly<Record<number, SaveMigration>> = {}

export type SaveErrorKind =
  | 'malformed'
  | 'no_migration'
  | 'from_the_future'
  | 'content_invalid'
  | 'fingerprint_mismatch'

export interface SaveError {
  kind: SaveErrorKind
  message: string
  /** `content_invalid` only. */
  issues?: ContentValidationIssue[]
  /** `fingerprint_mismatch` only — the packs the save was written with. */
  required?: PackIdentity[]
  /** `fingerprint_mismatch` only — the packs actually loaded right now. */
  loaded?: PackIdentity[]
}

export interface MigrateOptions {
  migrations?: Readonly<Record<number, SaveMigration>>
  targetVersion?: number
}

export type MigrateResult =
  | { ok: true; save: Record<string, unknown>; from: number }
  | { ok: false; error: SaveError }

/** Steps a raw save up to `targetVersion`, one registered migration at a time. */
export function migrateSave(raw: unknown, options: MigrateOptions = {}): MigrateResult {
  const migrations = options.migrations ?? SAVE_MIGRATIONS
  const target = options.targetVersion ?? SAVE_SCHEMA_VERSION

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, error: { kind: 'malformed', message: 'Save file is not an object.' } }
  }

  let save = { ...(raw as Record<string, unknown>) }
  const from = save.schemaVersion
  if (typeof from !== 'number' || !Number.isInteger(from) || from < 1) {
    return { ok: false, error: { kind: 'malformed', message: 'Save file has no usable schemaVersion.' } }
  }

  if (from > target) {
    return {
      ok: false,
      error: {
        kind: 'from_the_future',
        message: `Save file was written by a newer version (schemaVersion ${from} > ${target}).`,
      },
    }
  }

  for (let version = from; version < target; version++) {
    const migration = migrations[version]
    if (!migration) {
      return {
        ok: false,
        error: { kind: 'no_migration', message: `No migration from save schemaVersion ${version} to ${version + 1}.` },
      }
    }
    save = { ...migration(save), schemaVersion: version + 1 }
  }

  return { ok: true, save, from }
}

export type ParseSaveResult = { ok: true; save: SaveFile } | { ok: false; error: SaveError }

/** Migrates then validates. The only way to turn untrusted bytes into a SaveFile. */
export function parseSaveFile(raw: unknown, options: MigrateOptions = {}): ParseSaveResult {
  const migrated = migrateSave(raw, options)
  if (!migrated.ok) return migrated

  const parsed = saveFileSchema.safeParse(migrated.save)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    const where = first && first.path.length > 0 ? ` at ${first.path.join('.')}` : ''
    return {
      ok: false,
      error: { kind: 'malformed', message: `Save file is invalid${where}: ${first?.message ?? 'unknown reason'}` },
    }
  }

  return { ok: true, save: parsed.data }
}

export function serializeSave(save: SaveFile): string {
  return JSON.stringify(save)
}

export function deserializeSave(text: string, options: MigrateOptions = {}): ParseSaveResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: { kind: 'malformed', message: 'Save file is not valid JSON.' } }
  }
  return parseSaveFile(raw, options)
}

// ── Writing ─────────────────────────────────────────────────────────────────

/** Snapshots the *record* of a life in progress: seed, content, command log. */
export function createSaveFile(life: Life, savedAt: number): SaveFile {
  const view = life.sim.getPlayerView()

  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    seed: life.seed,
    fingerprint: life.fingerprint,
    packs: life.content.manifests.map((manifest) => ({ id: manifest.id, version: manifest.version })),
    options: { ...life.options },
    commandLog: [...life.sim.getCommandLog()],
    savedAt,
    meta: {
      name: view.player.name,
      turn: view.turnIndex,
      totalTurns: life.totalTurns,
      year: view.year,
      age: view.player.age,
      netWorth: view.capitalState.capital - view.capitalState.debt,
    },
  }
}

// ── Reading ─────────────────────────────────────────────────────────────────

export interface RestoreOptions {
  save: SaveFile
  sources: readonly ContentSource[]
  worldGenerators?: LifeOptions['worldGenerators']
  /**
   * Replay the log into the sim (default). `false` builds the life at turn 0
   * and hands the log back, for callers that want to play it out themselves —
   * the replay screen (S17) drives it one command at a time so the director
   * can perform each one.
   */
  applyLog?: boolean
}

export type RestoreResult =
  | { ok: true; life: Life; commandLog: Command[] }
  | { ok: false; error: SaveError }

/**
 * Rebuilds a life from a save. The fingerprint is checked *before* a single
 * command is dispatched: replaying a log against different content would
 * silently produce a different life, which is exactly the failure §5.1 exists
 * to prevent.
 */
export async function restoreLife(options: RestoreOptions): Promise<RestoreResult> {
  const { save, sources } = options

  const created = await createLife({
    seed: save.seed,
    sources,
    worldGenerators: options.worldGenerators,
    ...save.options,
  })

  if (!created.ok) {
    return {
      ok: false,
      error: {
        kind: 'content_invalid',
        message: 'The content packs this save needs did not load.',
        issues: created.errors,
      },
    }
  }

  const life = created.life
  if (life.fingerprint !== save.fingerprint) {
    return {
      ok: false,
      error: {
        kind: 'fingerprint_mismatch',
        message: `This save needs ${describePacks(save.packs)}; the loaded content is ${describePacks(
          life.content.manifests.map((manifest) => ({ id: manifest.id, version: manifest.version })),
        )}.`,
        required: save.packs,
        loaded: life.content.manifests.map((manifest) => ({ id: manifest.id, version: manifest.version })),
      },
    }
  }

  if (options.applyLog !== false) {
    for (const command of save.commandLog) life.sim.dispatch(command)
  }

  return { ok: true, life, commandLog: [...save.commandLog] }
}

/** "core-tw v1.0 + extra-pack v2.1" — the actionable half of a mismatch message. */
export function describePacks(packs: readonly PackIdentity[]): string {
  if (packs.length === 0) return '(no content packs)'
  return packs.map((pack) => `${pack.id} v${pack.version}`).join(' + ')
}

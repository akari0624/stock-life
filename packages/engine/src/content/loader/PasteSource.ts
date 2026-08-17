import type { ContentSource, RawContentPack } from './ContentSource.js'

// TODO.md #2: adding a source is adding an implementation. Nothing that calls
// `loadContentPack()` knows or cares where the bytes came from — which is why
// UrlSource/RegistrySource can show up later without touching a single caller.

/** One pack as it travels between people: a single JSON object. */
export interface ContentPackFile {
  manifest: unknown
  opportunities?: unknown[]
  events?: unknown[]
  careerGraph?: unknown
  traits?: unknown[]
}

export interface PasteSourceOptions {
  /** Refuse absurd payloads before parsing them (TODO.md #2: "超大檔"). */
  maxBytes?: number
}

export const DEFAULT_MAX_PACK_BYTES = 2_000_000

/**
 * Fills in the sections a pack chose not to ship. A pack with only events is a
 * perfectly good pack; it should not have to write four empty keys to say so.
 */
export function normalizePackFile(value: unknown): RawContentPack {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('內容包必須是一個 JSON 物件')
  }
  const file = value as ContentPackFile
  const array = (input: unknown): unknown[] => (Array.isArray(input) ? input : [])

  return {
    manifest: file.manifest,
    opportunities: array(file.opportunities),
    events: array(file.events),
    careerGraph: file.careerGraph ?? { nodes: [], edges: [] },
    traits: array(file.traits),
  }
}

/** Serialises a pack back into the shape `PasteSource` reads. */
export function serializePackFile(pack: RawContentPack): string {
  return JSON.stringify(pack, null, 2)
}

/** A pack pasted into a textarea (or read out of a file — see `FileSource`). */
export class PasteSource implements ContentSource {
  readonly label: string
  readonly sizeBytes: number
  private readonly text: string
  private readonly maxBytes: number

  constructor(label: string, text: string, options: PasteSourceOptions = {}) {
    this.label = label
    this.text = text
    this.sizeBytes = text.length
    this.maxBytes = options.maxBytes ?? DEFAULT_MAX_PACK_BYTES
  }

  load(): Promise<RawContentPack> {
    if (this.text.length > this.maxBytes) {
      return Promise.reject(new Error(`內容包太大（${this.text.length} > ${this.maxBytes} 位元組）`))
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(this.text)
    } catch (error) {
      return Promise.reject(new Error(`不是合法的 JSON：${(error as Error).message}`))
    }

    try {
      return Promise.resolve(normalizePackFile(parsed))
    } catch (error) {
      return Promise.reject(error as Error)
    }
  }
}

/**
 * The minimum a file has to look like. Typed structurally so the engine never
 * mentions `File` — the DOM stays out of `packages/engine` (§5.3), and any
 * `{ name, text() }` (a browser File, a node handle, a test double) fits.
 */
export interface ReadableFile {
  readonly name: string
  text(): Promise<string>
}

/** A pack imported from disk. Reading is async, so remote sources drop in later. */
export class FileSource implements ContentSource {
  readonly label: string
  private readonly file: ReadableFile
  private readonly options: PasteSourceOptions

  constructor(file: ReadableFile, options: PasteSourceOptions = {}) {
    this.file = file
    this.label = file.name
    this.options = options
  }

  async load(): Promise<RawContentPack> {
    const text = await this.file.text()
    return new PasteSource(this.label, text, this.options).load()
  }
}

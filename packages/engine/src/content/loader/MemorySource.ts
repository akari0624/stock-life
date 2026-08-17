import type { ContentSource, RawContentPack } from './ContentSource.js'

/** A ContentSource backed by an in-memory object — used for core-tw and tests. */
export class MemorySource implements ContentSource {
  readonly label: string
  private readonly pack: RawContentPack

  constructor(label: string, pack: RawContentPack) {
    this.label = label
    this.pack = pack
  }

  load(): Promise<RawContentPack> {
    return Promise.resolve(this.pack)
  }
}

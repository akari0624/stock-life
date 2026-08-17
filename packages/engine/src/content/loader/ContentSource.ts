// TODO.md #2: the abstraction that lets FileSource/PasteSource (S18) and
// eventually UrlSource/RegistrySource show up later as new implementations
// without ever touching the loader that calls them.

export interface RawContentPack {
  manifest: unknown
  opportunities: unknown[]
  events: unknown[]
  careerGraph: unknown
  traits: unknown[]
}

export interface ContentSource {
  /** A human-readable label for error messages (e.g. a filename or "memory"). */
  readonly label: string
  /** Always async — even the in-memory source — so remote sources are a drop-in later. */
  load(): Promise<RawContentPack>
}

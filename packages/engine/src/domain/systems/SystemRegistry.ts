import type { GameSystem } from './GameSystem.js'
import { listFacadeFields, type FacadeField } from '../facade/FacadeField.js'

export class SystemRegistry {
  private readonly systems: GameSystem[] = []

  register(system: GameSystem): void {
    if (this.systems.some((s) => s.id === system.id)) {
      throw new Error(`GameSystem "${system.id}" is already registered`)
    }
    this.systems.push(system)
    this.systems.sort((a, b) => a.order - b.order)
  }

  /** Systems in resolution order. */
  list(): readonly GameSystem[] {
    return this.systems
  }

  /** Just what registered systems contribute — see allFacadeFields() for the full whitelist. */
  facadeFields(): FacadeField[] {
    return this.systems.flatMap((s) => s.facadeFields?.() ?? [])
  }

  /**
   * The static fields (§3, §6.1) plus whatever every registered system
   * contributes — this is what grows automatically as S7+ adds systems,
   * with no manual sync required. A system contributing a path that already
   * exists statically replaces it (that's how EraSystem attaches the real
   * `era.phase` enum), so the result is deduped by path.
   */
  allFacadeFields(): FacadeField[] {
    const byPath = new Map<string, FacadeField>()
    for (const field of [...listFacadeFields(), ...this.facadeFields()]) {
      byPath.set(field.path, field)
    }
    return [...byPath.values()]
  }
}

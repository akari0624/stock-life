import { WorldGeneratorRegistry } from './WorldGenerator.js'
import { randomWorldGenerator } from './RandomWorldGenerator.js'
import { twHistoryWorldGenerator } from './TwHistoryWorldGenerator.js'

/**
 * A registry preloaded with the generators the engine itself ships (§7.4).
 * Its own file so that neither generator has to import the other — a mod's
 * generator registers here exactly the same way these two do.
 */
export function createDefaultWorldGeneratorRegistry(): WorldGeneratorRegistry {
  const registry = new WorldGeneratorRegistry()
  registry.register(randomWorldGenerator)
  registry.register(twHistoryWorldGenerator)
  return registry
}

import { FACADE_VERSION } from '../../../domain/facade/ModStateView.js'
import { ENGINE_API_VERSION } from '../../loader/compatibility.js'

export const coreTwManifest = {
  id: 'core-tw',
  version: '1.0.0',
  engineApi: `^${ENGINE_API_VERSION}`,
  facadeVersion: FACADE_VERSION,
  provides: {
    events: 3,
    opportunities: 1,
    careers: 2,
    traits: 1,
    // tw-history ships in S19; random world generation is engine-level (S7),
    // not something this pack provides content for yet.
    worldGenerators: [],
  },
  requires: [],
  assets: { actors: {}, bg: {}, sfx: {} },
}

import { FACADE_VERSION } from '../../../domain/facade/ModStateView.js'
import { ENGINE_API_VERSION } from '../../loader/compatibility.js'
import { coreTwEvents } from './events.js'
import { coreTwOpportunities } from './opportunities.js'
import { coreTwCareerGraph } from './careerGraph.js'
import { coreTwTraits } from './traits.js'

// §6.4. `provides` 從實際的陣列算出來，不是手寫的數字——內容長大時它自己
// 跟著長，「manifest 宣告的」與「包裡真的有的」不可能對不上。
//
// `assets` 是空的：第一版沒有任何素材，全部走 AssetResolver 的 fallback
// （S14／TODO #5）。美術補進來的時候只要往這裡加 id → 檔名，domain 零改動。

export const coreTwManifest = {
  id: 'core-tw',
  version: '1.0.0',
  engineApi: `^${ENGINE_API_VERSION}`,
  facadeVersion: FACADE_VERSION,
  provides: {
    events: coreTwEvents.length,
    opportunities: coreTwOpportunities.length,
    careers: coreTwCareerGraph.nodes.length,
    traits: coreTwTraits.length,
    // tw-history 與 random 都是引擎自己註冊的產生器（S7／S19），
    // 不是這個內容包提供的東西。
    worldGenerators: [],
  },
  requires: [],
  assets: { actors: {}, bg: {}, sfx: {} },
}

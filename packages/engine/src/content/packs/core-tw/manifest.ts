import { FACADE_VERSION } from '../../../domain/facade/ModStateView.js'
import { ENGINE_API_VERSION } from '../../loader/compatibility.js'
import { coreTwEvents } from './events.js'
import { coreTwOpportunities } from './opportunities.js'
import { coreTwCareerGraph } from './careerGraph.js'
import { coreTwTraits } from './traits.js'
import { coreTwAssets } from './assets.js'

// §6.4. `provides` 從實際的陣列算出來，不是手寫的數字——內容長大時它自己
// 跟著長，「manifest 宣告的」與「包裡真的有的」不可能對不上。
//
// `assets` 來自 `assets.ts`，那個檔案是 `art:install` 產生的（見 ART.md）。
// 沒有對照到檔案的 id 仍然走 AssetResolver 的 fallback（§6.3），所以這份表
// 可以只補一半——補多少就有多少張真圖，domain 零改動。

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
  assets: coreTwAssets,
}

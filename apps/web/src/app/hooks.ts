import { createContext, useContext, useSyncExternalStore } from 'react'
import type { AppSnapshot, AppStore } from './AppStore.ts'
import type { GameSession, SessionSnapshot } from './GameSession.ts'
import type { StageState } from '../presentation/director/StageState.ts'

/**
 * §10.1：狀態管理**沒有套件**——sim 持有狀態，UI 用 `useSyncExternalStore` 訂閱。
 *
 * 刻意分成三個 hook：
 * - `useApp()`    畫面狀態機（很少變）
 * - `useSession()` 每個 command 變一次（含深拷貝的 PlayerView）
 * - `useStage()`   每一 frame 變一次（很便宜，director 內部已快取）
 *
 * 如果全部塞進一個 snapshot，演出期間每一 frame 都要重算 PlayerView。
 */

const StoreContext = createContext<AppStore | undefined>(undefined)

export const StoreProvider = StoreContext.Provider

export function useStore(): AppStore {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore 必須在 StoreProvider 內使用')
  return store
}

// 第三個參數（getServerSnapshot）給的是同一個 getter：這些 store 都是純前端的，
// 沒有伺服器狀態可言。填它是因為 renderToStaticMarkup（畫面的冒煙測試用）會要求。

export function useApp(): AppSnapshot {
  const store = useStore()
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}

export function useSession(session: GameSession): SessionSnapshot {
  return useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot)
}

export function useStage(session: GameSession): StageState {
  const director = session.director
  const getStage = (): StageState => director.getStage()
  return useSyncExternalStore((listener) => director.subscribe(listener), getStage, getStage)
}

import { createContext, useContext, useSyncExternalStore } from 'react'
import type { EditorSnapshot, EditorStore } from './EditorStore.ts'

const StoreContext = createContext<EditorStore | undefined>(undefined)

export const StoreProvider = StoreContext.Provider

export function useStore(): EditorStore {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore 必須在 StoreProvider 內使用')
  return store
}

export function useEditor(): EditorSnapshot {
  const store = useStore()
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}

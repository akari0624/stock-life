import { useState } from 'react'
import { AppStore } from './AppStore.ts'
import { StoreProvider, useApp } from './hooks.ts'
import { TitleScreen } from './screens/TitleScreen.tsx'
import { GameScreen } from './screens/GameScreen.tsx'
import { SettlementScreen } from './screens/SettlementScreen.tsx'
import { PacksScreen } from './screens/PacksScreen.tsx'
import { DevScreen } from '../dev/DevScreen.tsx'

/**
 * 畫面狀態機（無 router：§10.1）。四個畫面：標題／遊戲／結算／內容包。
 */
function Screens() {
  const { screen, session } = useApp()

  if (screen === 'packs') return <PacksScreen />
  if (screen === 'dev') return <DevScreen />
  if (!session) return <TitleScreen />
  if (screen === 'settlement') return <SettlementScreen session={session} />
  if (screen === 'game') return <GameScreen session={session} />
  return <TitleScreen />
}

export default function Root() {
  const [store] = useState(() => new AppStore())

  return (
    <StoreProvider value={store}>
      <Screens />
    </StoreProvider>
  )
}

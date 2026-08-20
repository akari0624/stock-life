import { useEffect, useState } from 'react'
import { App as AntApp, Alert, ConfigProvider, Layout, Space, Tabs, theme } from 'antd'
import zhTW from 'antd/locale/zh_TW'
import { EditorStore } from './editor/EditorStore.ts'
import { StoreProvider, useEditor, useStore } from './editor/hooks.ts'
import { PackBar } from './components/PackBar.tsx'
import { EventList } from './components/EventList.tsx'
import { EventForm } from './components/EventForm.tsx'
import { EventPreview } from './components/EventPreview.tsx'
import { StoryGraph } from './components/StoryGraph.tsx'
import { TrialPanel } from './components/TrialPanel.tsx'

/**
 * 版面照 §6.5.3 的優先度排：**試跑／預覽的優先度高過表單本身**，所以預覽是
 * 常駐在右邊的一欄，不是要切過去才看得到的分頁；流程圖與統計試跑是整包層級的
 * 事，各自一個分頁。
 *
 * 無 router（§10.1 的同一個決定）：分頁就是狀態。
 */

function Workspace() {
  const { verify, notice } = useEditor()
  const store = useStore()
  const [tab, setTab] = useState('event')

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => store.dismissNotice(), 6000)
    return () => clearTimeout(timer)
  }, [notice, store])

  return (
    <Layout style={{ height: '100%' }}>
      <Layout.Header style={{ height: 'auto', padding: '10px 16px', lineHeight: 'normal' }}>
        <PackBar />
      </Layout.Header>

      <Layout>
        <Layout.Sider width={280} style={{ overflowY: 'auto' }} theme="dark">
          <EventList />
        </Layout.Sider>

        <Layout.Content style={{ padding: 16, overflowY: 'auto' }}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {notice && <Alert type={notice.kind === 'ok' ? 'success' : 'error'} showIcon message={notice.text} closable onClose={() => store.dismissNotice()} />}

            {verify.ok !== undefined && (
              <Alert
                type={verify.ok ? 'success' : 'error'}
                showIcon
                message={verify.ok ? '遊戲的載入器收下了這個包' : '遊戲的載入器拒收'}
                {...(verify.messages.length > 0 ? { description: verify.messages.join('\n') } : {})}
                style={{ whiteSpace: 'pre-wrap' }}
                closable
              />
            )}

            <Tabs
              activeKey={tab}
              onChange={setTab}
              items={[
                {
                  key: 'event',
                  label: '這一格',
                  children: (
                    <div className="editor-split">
                      <div className="editor-split-form">
                        <EventForm />
                      </div>
                      <div className="editor-split-preview">
                        <EventPreview />
                      </div>
                    </div>
                  ),
                },
                { key: 'graph', label: '流程圖', children: <StoryGraph /> },
                { key: 'trial', label: '統計試跑', children: <TrialPanel /> },
              ]}
            />
          </Space>
        </Layout.Content>
      </Layout>
    </Layout>
  )
}

export interface AppProps {
  /** 測試用：注入一個不去載官方包、不碰 localStorage 的 store */
  store?: EditorStore
}

export default function App({ store: injected }: AppProps = {}) {
  const [store] = useState(() => injected ?? new EditorStore())

  return (
    <ConfigProvider locale={zhTW} theme={{ algorithm: theme.darkAlgorithm }}>
      <AntApp style={{ height: '100%' }}>
        <StoreProvider value={store}>
          <Workspace />
        </StoreProvider>
      </AntApp>
    </ConfigProvider>
  )
}

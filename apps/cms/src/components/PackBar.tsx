import { useRef } from 'react'
import { App as AntApp, Button, Flex, Input, Popconfirm, Space, Tag, Tooltip, Typography } from 'antd'
import { useEditor, useStore } from '../editor/hooks.ts'

/**
 * 最上面那一條：這是誰的包、載得進遊戲了沒、匯入匯出。
 *
 * 「驗收」按鈕跑的是**遊戲真正在用的那個載入器**（§6.4 dogfooding）——
 * checkTrust 的上限、engineApi 相容性、跨包斷鏈，一次講完。自己重寫一套
 * 「可不可以上線」的判斷，遲早會跟遊戲的答案不一樣。
 */

export function PackBar() {
  const { draft, validation, verify, baseline } = useEditor()
  const store = useStore()
  const { message } = AntApp.useApp()
  const fileInput = useRef<HTMLInputElement>(null)

  const errorCount = [...validation.byEvent.values()].reduce((sum, issues) => sum + issues.length, 0) + validation.pack.length

  const download = (): void => {
    const blob = new Blob([store.exportText()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${draft.manifest.id}-${draft.manifest.version}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(store.exportText())
      message.success('已複製整包 JSON，可以直接貼進遊戲的「內容包」畫面')
    } catch {
      message.error('複製失敗，請用「下載」')
    }
  }

  return (
    <Flex align="center" justify="space-between" gap="middle" style={{ width: '100%' }} wrap>
      <Flex align="center" gap="small" wrap>
        <Typography.Text strong>事件編輯器</Typography.Text>
        <Input
          size="small"
          style={{ width: 150 }}
          value={draft.manifest.id}
          onChange={(event) => store.updateManifest({ id: event.target.value })}
          addonBefore="包 id"
        />
        <Tooltip title="指紋只雜湊 id@version（§5.1）。抽籤池變了就要升版，不升的話玩家的舊存檔會重播成另一段人生">
          <Input
            size="small"
            style={{ width: 130 }}
            value={draft.manifest.version}
            onChange={(event) => store.updateManifest({ version: event.target.value })}
            addonBefore="版本"
          />
        </Tooltip>
        <Tag>{draft.events.length} 個事件</Tag>
        {errorCount > 0 ? <Tag color="error">{errorCount} 個問題</Tag> : <Tag color="success">格式沒問題</Tag>}
        {!baseline && <Tag color="processing">載入官方包中…</Tag>}
      </Flex>

      <Space size="small">
        <Button size="small" loading={verify.checking} onClick={() => void store.verify()}>
          用遊戲的載入器驗收
        </Button>
        <Button size="small" onClick={() => fileInput.current?.click()}>匯入檔案</Button>
        <Button size="small" onClick={() => void copy()}>複製 JSON</Button>
        <Button size="small" type="primary" onClick={download}>下載</Button>
        <Popconfirm title="清空目前的草稿？" okText="清空" cancelText="取消" onConfirm={() => store.resetDraft()}>
          <Button size="small" danger type="text">清空</Button>
        </Popconfirm>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void store.importFile(file)
            event.target.value = ''
          }}
        />
      </Space>
    </Flex>
  )
}

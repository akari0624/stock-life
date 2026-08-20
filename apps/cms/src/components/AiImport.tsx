import { useMemo, useState } from 'react'
import {
  Alert,
  App as AntApp,
  Button,
  Card,
  Flex,
  Input,
  InputNumber,
  Modal,
  Radio,
  Segmented,
  Space,
  Tag,
  Typography,
} from 'antd'
import { useEditor, useStore } from '../editor/hooks.ts'
import { buildPrompt, DEFAULT_PROMPT_OPTIONS, SHAPE_LABELS, type PromptShape } from '../editor/aiPrompt.ts'
import { parsePasted, PASTED_KIND_LABELS } from '../editor/paste.ts'
import type { PasteMode } from '../editor/EditorStore.ts'

/**
 * §6.5.6 的那一個對話框：**產提示詞 → 貼回 JSON → 在表單裡改**。
 *
 * 兩格併在同一個對話框裡，因為它們是同一件事的兩半：作者複製完提示詞會離開去問
 * AI，回來時要能在原地把答案貼進去。拆成兩個入口只會讓第二步變得難找。
 *
 * 貼上的預覽在按下匯入**之前**就算好（`parsePasted` 是純函式，直接呼叫）——
 * 這跟 §6.5.3 #1「試跑／預覽的優先度高過表單本身」是同一個判斷：作者要先看見
 * 自己要收下的是什麼。
 */

export interface AiImportProps {
  open: boolean
  onClose: () => void
}

export function AiImport({ open, onClose }: AiImportProps) {
  const { draft, baseline } = useEditor()
  const store = useStore()
  const { message } = AntApp.useApp()

  const [options, setOptions] = useState(DEFAULT_PROMPT_OPTIONS)
  const [pasted, setPasted] = useState('')
  const [mode, setMode] = useState<PasteMode>('append')

  const prompt = useMemo(() => buildPrompt(options, draft, baseline), [options, draft, baseline])
  const parsed = useMemo(() => (pasted.trim().length === 0 ? undefined : parsePasted(pasted)), [pasted])

  const copyPrompt = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(prompt)
      message.success('已複製提示詞，貼給任何一個 AI 都可以')
    } catch {
      message.error('複製失敗，請手動選取下面那一塊文字')
    }
  }

  const doImport = (): void => {
    if (store.importPasted(pasted, mode)) {
      setPasted('')
      onClose()
    }
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={880}
      title="用 AI 產一批事件"
      destroyOnHidden={false}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Typography.Text type="secondary">
          先產一段提示詞拿去問 AI，再把它回你的 JSON 貼回來。貼進來壞掉是正常的——
          缺什麼、寫錯什麼，表單會直接標紅給你改。
        </Typography.Text>

        <Card size="small" title="1 · 把這段提示詞交給 AI">
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Flex gap="small" wrap align="center">
              <InputNumber
                size="small"
                min={1}
                max={30}
                value={options.count}
                onChange={(count) => setOptions({ ...options, count: count ?? 1 })}
                addonBefore="幾個"
              />
              <Segmented<PromptShape>
                size="small"
                value={options.shape}
                onChange={(shape) => setOptions({ ...options, shape })}
                options={(Object.keys(SHAPE_LABELS) as PromptShape[]).map((shape) => ({
                  value: shape,
                  label: SHAPE_LABELS[shape],
                }))}
              />
              <Input
                size="small"
                style={{ width: 260 }}
                placeholder="題材，例如：三十歲上下的職場"
                value={options.topic}
                onChange={(event) => setOptions({ ...options, topic: event.target.value })}
              />
              <Button size="small" type="primary" onClick={() => void copyPrompt()}>
                複製提示詞
              </Button>
            </Flex>

            <Input.TextArea readOnly value={prompt} autoSize={{ minRows: 8, maxRows: 14 }} style={{ fontSize: 12 }} />

            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {baseline
                ? '條件欄位、效果型別、素材 id 與範例事件都是從現在載入的官方包算出來的，不是寫死的一段字——所以它跟編輯器的下拉選單永遠是同一份。'
                : '官方包還在載入中，載完之後提示詞會補上素材清單與範例事件。'}
            </Typography.Text>
          </Space>
        </Card>

        <Card size="small" title="2 · 把 AI 回你的 JSON 貼回來">
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Input.TextArea
              value={pasted}
              onChange={(event) => setPasted(event.target.value)}
              autoSize={{ minRows: 6, maxRows: 14 }}
              placeholder={'{ "events": [ … ] }\n\n連前面那句「以下是您要的內容：」跟 ``` 一起貼進來也沒關係。'}
              style={{ fontSize: 12 }}
            />

            {parsed && !parsed.ok && <Alert type="error" showIcon message={parsed.problem} />}
            {parsed?.ok && (
              <Alert
                type="success"
                showIcon
                message={`認出${PASTED_KIND_LABELS[parsed.value.kind]}，共 ${parsed.value.events.length} 個事件`}
                description={
                  <Flex gap={4} wrap>
                    {parsed.value.events.map((event, index) => (
                      <Tag key={`${event.id}-${index}`} color={event.weight > 0 ? 'blue' : 'default'}>
                        {event.id.length > 0 ? event.id : '（沒有 id）'}
                        {event.weight > 0 ? ' · 入口' : ' · 段落'}
                      </Tag>
                    ))}
                  </Flex>
                }
              />
            )}

            <Flex gap="small" align="center" wrap>
              <Radio.Group
                size="small"
                value={mode}
                onChange={(event) => setMode(event.target.value as PasteMode)}
                options={[
                  { value: 'append', label: `加在現有的 ${draft.events.length} 個事件後面` },
                  { value: 'replace', label: '取代整份草稿' },
                ]}
                optionType="button"
              />
              <Button type="primary" disabled={!parsed?.ok} onClick={doImport}>
                匯入
              </Button>
            </Flex>

            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              撞到 id 時會改掉新來的那一批，並同步改掉它們內部指向彼此的箭頭——連續事件不會因為改名就斷掉。
            </Typography.Text>
          </Space>
        </Card>
      </Space>
    </Modal>
  )
}

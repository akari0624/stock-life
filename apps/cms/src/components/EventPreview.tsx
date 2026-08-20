import { useState } from 'react'
import { Alert, Card, Divider, Empty, Flex, InputNumber, Segmented, Space, Tag, Typography } from 'antd'
import {
  Calendar,
  createInitialGameState,
  evaluate,
  SeededRng,
  successChance,
  type GameState,
} from '@stock-life/engine'
import { CHOICE_LABELS, type DraftEvent } from '../editor/draft.ts'
import { describeEffects, describeLink } from '../editor/describe.ts'
import { assetCatalogue, sceneStatus } from '../editor/assets.ts'
import { useEditor } from '../editor/hooks.ts'

/**
 * §6.5.3 #1 的前半：**單事件預覽**。
 *
 * 塞一個假狀態，直接把這一格演出來——情境、三個選項、成功率、兩種結果。
 * 刻意**兩種結果都顯示**而不是擲一次骰：作者要檢查的是自己寫的兩句話，
 * 不是今天的手氣。
 *
 * 假狀態不是裝飾。`require` 到底成不成立是這一格會不會出現的前一半原因
 * （後一半是抽籤，那要靠統計試跑），所以上面那排數字要能調。
 */

interface FakeState {
  age: number
  capital: number
  income: number
  cognition: number
  network: number
  nerve: number
}

const DEFAULT_FAKE: FakeState = { age: 30, capital: 150, income: 80, cognition: 25, network: 20, nerve: 70 }

const FIELDS: { key: keyof FakeState; label: string }[] = [
  { key: 'age', label: '年齡' },
  { key: 'capital', label: '本金' },
  { key: 'income', label: '年收' },
  { key: 'cognition', label: '認知' },
  { key: 'network', label: '人脈' },
  { key: 'nerve', label: '心性' },
]

function stateFor(fake: FakeState): GameState {
  const calendar = new Calendar({ granularity: 'year', startYear: 1990, startAge: fake.age })
  const state = createInitialGameState({ name: '預覽', calendar })
  state.capitalState.capital = fake.capital
  state.capitalState.income = fake.income
  state.capitalState.cognition = fake.cognition
  state.capitalState.network = fake.network
  state.player.nerve = fake.nerve
  return state
}

export function EventPreview() {
  const { draft, selected, baseline } = useEditor()
  const [fake, setFake] = useState<FakeState>(DEFAULT_FAKE)
  const [choiceId, setChoiceId] = useState<string>('normal')

  const event = draft.events[selected]
  if (!event) return <Empty description="選一格看預覽" style={{ marginTop: 48 }} />

  const state = stateFor(fake)
  const rng = new SeededRng('preview').stream('preview')
  const result = evaluate(event.require, { state, rng })
  const eligible = result.ok && result.value

  const choice = event.choices.find((c) => c.id === choiceId) ?? event.choices[1] ?? event.choices[0]
  const catalogue = assetCatalogue(draft, baseline?.manifests ?? [])
  const scene = sceneStatus(event, catalogue)

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Card size="small" title="假狀態">
        <Flex gap="small" wrap>
          {FIELDS.map((field) => (
            <Flex key={field.key} align="center" gap={4}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>{field.label}</Typography.Text>
              <InputNumber
                size="small"
                style={{ width: 76 }}
                value={fake[field.key]}
                onChange={(value) => setFake({ ...fake, [field.key]: value ?? 0 })}
              />
            </Flex>
          ))}
        </Flex>
        <Divider style={{ margin: '10px 0' }} />
        {event.weight > 0 ? (
          eligible ? (
            <Alert type="success" showIcon message="這個狀態下有資格被抽到（但要不要被抽到是機率，看統計試跑）" />
          ) : (
            <Alert type="warning" showIcon message="這個狀態下沒有資格出現——條件不成立" />
          )
        ) : (
          <Alert
            type="info"
            showIcon
            message="段落事件：被箭頭指到時不驗條件"
            description={`不過「幾年後」的箭頭到期時會驗一次，那時的答案是：${eligible ? '成立' : '不成立（會走 orElse）'}`}
          />
        )}
        {!result.ok && <Alert type="error" showIcon message={result.error.message} style={{ marginTop: 8 }} />}
      </Card>

      <Card
        size="small"
        title="玩家看到的"
        extra={
          <Flex gap={4}>
            {scene.length === 0 ? (
              <Tag>沒有指定舞台</Tag>
            ) : (
              scene.map((entry) => (
                <Tag key={entry.kind} color={entry.provided ? 'green' : 'orange'}>
                  {entry.id}
                </Tag>
              ))
            )}
          </Flex>
        }
      >
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <div className="preview-stage">
            {scene.filter((entry) => entry.kind === 'bg' || entry.kind === 'actor').map((entry) => (
              <span key={entry.kind} className="preview-chip">
                {entry.kind === 'bg' ? '背景' : '角色'} {entry.id}
                {!entry.provided && ' · 佔位色塊'}
              </span>
            ))}
            {scene.length === 0 && <span className="preview-chip">預設舞台</span>}
          </div>

          <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
            {event.prompt.length > 0 ? event.prompt : <Typography.Text type="danger">（還沒有情境——玩家會只看到三個動詞加三個百分比）</Typography.Text>}
          </Typography.Paragraph>

          <Segmented
            block
            value={choice?.id}
            onChange={(value) => setChoiceId(String(value))}
            options={event.choices.map((c) => ({
              value: c.id,
              label: (
                <Flex vertical align="center" gap={0}>
                  <span>{c.label.length > 0 ? c.label : CHOICE_LABELS[c.id]}</span>
                  <Typography.Text type="secondary" style={{ fontSize: 11 }}>{successChance(c)}%</Typography.Text>
                </Flex>
              ),
            }))}
          />
        </Space>
      </Card>

      {choice && <OutcomeCards event={event} choice={choice} />}
    </Space>
  )
}

function OutcomeCards({ event, choice }: { event: DraftEvent; choice: DraftEvent['choices'][number] }) {
  return (
    <Flex gap="small" wrap>
      {(['good', 'bad'] as const).map((branch) => (
        <Card
          key={branch}
          size="small"
          style={{ flex: '1 1 240px' }}
          title={
            <Flex align="center" gap="small">
              <Tag color={branch === 'good' ? 'green' : 'red'}>{branch === 'good' ? '成功' : '失敗'}</Tag>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {branch === 'good' ? `${successChance(choice)}%` : `${100 - successChance(choice)}%`}
              </Typography.Text>
            </Flex>
          }
        >
          <Space direction="vertical" size={6} style={{ width: '100%' }}>
            <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
              {(branch === 'good' ? choice.good : choice.bad) || (
                <Typography.Text type="danger">（還沒寫這一句）</Typography.Text>
              )}
            </Typography.Paragraph>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {describeEffects(event[branch].effects, choice.mag)}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              → {describeLink(event[branch].next)}
            </Typography.Text>
          </Space>
        </Card>
      ))}
    </Flex>
  )
}

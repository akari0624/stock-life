import { Alert, Card, Empty, Flex, Input, InputNumber, Segmented, Space, Switch, Tag, Tooltip, Typography } from 'antd'
import { kindOf, type DraftEvent, type EventKind } from '../editor/draft.ts'
import { useEditor, useStore } from '../editor/hooks.ts'
import { assetCatalogue } from '../editor/assets.ts'
import { issueKey, type FieldIssue } from '../editor/validate.ts'
import { ConditionBuilder } from './ConditionBuilder.tsx'
import { ChoicesField } from './ChoicesField.tsx'
import { EffectsField } from './EffectsField.tsx'
import { NextField } from './NextField.tsx'
import { SceneField } from './SceneField.tsx'

/**
 * 一格事件的表單。
 *
 * 排版照作者寫故事的順序走：這是什麼框 → 什麼時候有資格出現 → 情境 →
 * 三個選項 → 成功／失敗各自的結果與去向 → 舞台。
 */

export function EventForm() {
  const { draft, selected, validation, baseline, withCoreTw } = useEditor()
  const store = useStore()
  const event = draft.events[selected]

  if (!event) {
    return <Empty description="左邊選一格，或按上面的「＋ 入口事件」開始寫" style={{ marginTop: 64 }} />
  }

  const issues = validation.byEvent.get(selected) ?? []
  const errorAt = (path: (string | number)[]): string | undefined =>
    issues.find((issue) => issueKey(issue.path) === issueKey(path))?.message

  const kind = kindOf(event)
  const patch = (next: Partial<DraftEvent>): void => store.updateEvent(selected, next)

  const eventIds = [
    ...draft.events.map((e) => e.id).filter((id) => id.length > 0),
    ...(withCoreTw && baseline ? [...baseline.eventIds] : []),
  ]
  const catalogue = assetCatalogue(draft, baseline?.manifests ?? [])

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <KindCard kind={kind} event={event} onKind={(next) => store.setKind(selected, next)} onPatch={patch} />

      <Card size="small" title="什麼時候有資格出現">
        <ConditionBuilder
          value={event.require}
          onChange={(require) => patch({ require })}
          {...(baseline ? { careerNodes: baseline.careerNodes } : {})}
          hint={
            kind === 'entry'
              ? '條件成立的年份才進抽籤池。條件越嚴，出現率越低——右邊的試跑會告訴你低到什麼程度。'
              : '被箭頭指到時「不檢查」這個條件；只有「幾年後」的箭頭到期時才會驗。所以段落通常不需要條件。'
          }
        />
      </Card>

      <Card size="small" title="情境" extra={<Hint text="玩家做決定時看得到的唯一依據。結局文字取代不了它（§7.2）" />}>
        <Input.TextArea
          autoSize={{ minRows: 2, maxRows: 6 }}
          placeholder="大學同學找你吃飯，講到一半才說：「我想自己出來做。」"
          value={event.prompt}
          onChange={(e) => patch({ prompt: e.target.value })}
          status={errorAt(['prompt']) ? 'error' : undefined}
        />
        {errorAt(['prompt']) && (
          <Typography.Text type="danger" style={{ fontSize: 12 }}>{errorAt(['prompt'])}</Typography.Text>
        )}
      </Card>

      <Card size="small" title="三個選項" extra={<Hint text="形狀是 schema 鎖死的：保守／普通／大膽各一個。文案跟著選項走，效果跟著成功失敗走" />}>
        <ChoicesField value={event.choices} onChange={(choices) => patch({ choices })} />
      </Card>

      {(['good', 'bad'] as const).map((branch) => (
        <Card
          key={branch}
          size="small"
          title={branch === 'good' ? '成功之後' : '失敗之後'}
          extra={<Hint text="效果三個選項共用，由各自的 mag 縮放（§7.2）" />}
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <EffectsField
              value={event[branch].effects}
              onChange={(effects) => patch({ [branch]: { ...event[branch], effects } } as Partial<DraftEvent>)}
              {...(baseline ? { traitIds: baseline.traitIds, opportunityIds: baseline.opportunityIds } : {})}
            />
            <NextField
              value={event[branch].next}
              onChange={(next) =>
                patch({ [branch]: { ...event[branch], ...(next ? { next } : { next: undefined }) } } as Partial<DraftEvent>)
              }
              eventIds={eventIds}
              selfId={event.id}
            />
          </Space>
        </Card>
      ))}

      <Card size="small" title="舞台" extra={<Hint text="只填 id。素材不存在時會 fallback 成色塊，同一份內容日後補圖就變成大富翁式演出（§6.3）" />}>
        <SceneField value={event.scene} onChange={(scene) => patch({ scene })} catalogue={catalogue} />
      </Card>

      <OtherIssues issues={issues} />
    </Space>
  )
}

interface KindCardProps {
  kind: EventKind
  event: DraftEvent
  onKind: (kind: EventKind) => void
  onPatch: (patch: Partial<DraftEvent>) => void
}

/**
 * §6.5.2：兩種框必須長得不一樣。
 *
 * ⚠️ 鏈接是精確的，入場是機率的。這兩件事在作者腦中會混在一起，然後他會抱怨
 * 「我的故事沒出現」——所以這張卡片是整個表單最上面的東西。
 */
function KindCard({ kind, event, onKind, onPatch }: KindCardProps) {
  return (
    <Card size="small">
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        <Flex align="center" gap="middle" wrap>
          <Segmented
            value={kind}
            onChange={(next) => onKind(next as EventKind)}
            options={[
              { label: '入口事件', value: 'entry' },
              { label: '劇情段落', value: 'beat' },
            ]}
          />
          <Flex align="center" gap={4}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>id</Typography.Text>
            <Input
              size="small"
              style={{ width: 220 }}
              value={event.id}
              onChange={(e) => onPatch({ id: e.target.value })}
              placeholder="cofounder_pitch"
            />
          </Flex>
          <Tooltip title="一輩子只演一次，不分成功失敗，在「提出」的當下就算用掉。「重試到成功為止」不是這個欄位">
            <Flex align="center" gap={4}>
              <Switch size="small" checked={event.once} onChange={(once) => onPatch({ once })} />
              <Typography.Text style={{ fontSize: 12 }}>一輩子只演一次</Typography.Text>
            </Flex>
          </Tooltip>
          {kind === 'entry' && (
            <Flex align="center" gap={4}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>抽籤權重</Typography.Text>
              <InputNumber
                size="small"
                style={{ width: 76 }}
                min={1}
                max={100}
                value={event.weight}
                onChange={(weight) => onPatch({ weight: weight ?? 1 })}
              />
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>（core-tw 常見值 6–14）</Typography.Text>
            </Flex>
          )}
        </Flex>

        {kind === 'entry' ? (
          <Alert
            type="warning"
            showIcon
            message="入場是機率的"
            description="這一格要跟其他八十幾個事件搶那一年唯一的抽籤位。實測：四段故事、第一段權重 8，29% 的人生從頭到尾沒遇到第一段——但只要遇到了，96% 會把四段講完。按右邊的「統計試跑」看你這一格的真實數字。"
          />
        ) : (
          <Alert
            type="info"
            showIcon
            message="鏈接是精確的"
            description="權重 0，永遠不進隨機池，只走箭頭進來——而箭頭之後的每一格保證會演。被指到時不檢查條件（除非是「幾年後」的箭頭）。"
          />
        )}
      </Space>
    </Card>
  )
}

function OtherIssues({ issues }: { issues: readonly FieldIssue[] }) {
  const shown = new Set(['prompt'])
  const rest = issues.filter((issue) => !shown.has(issueKey(issue.path)))
  if (rest.length === 0) return null
  return (
    <Alert
      type="error"
      showIcon
      message="這一格還載不進遊戲"
      description={
        <Space direction="vertical" size={2}>
          {rest.map((issue, index) => (
            <Typography.Text key={index} style={{ fontSize: 12 }}>
              <Tag>{issueKey(issue.path) || '整格'}</Tag>
              {issue.message}
            </Typography.Text>
          ))}
        </Space>
      }
    />
  )
}

function Hint({ text }: { text: string }) {
  return (
    <Tooltip title={text}>
      <Typography.Text type="secondary" style={{ fontSize: 12, cursor: 'help' }}>說明</Typography.Text>
    </Tooltip>
  )
}

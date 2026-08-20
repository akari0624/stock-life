import { Card, Flex, Input, InputNumber, Space, Tag, Tooltip, Typography } from 'antd'
import { CHOICE_LABELS, type DraftChoice } from '../editor/draft.ts'
import { describeOdds } from '../editor/describe.ts'

/**
 * 三檔選項。**形狀是 schema 鎖死的**（`.length(3)`，safe/normal/bold 各一個），
 * 所以這裡沒有「新增選項」按鈕——§6.5.5 那條分岔還沒定案，編輯器不預設答案。
 *
 * 文案 per-choice、效果 per-outcome（§7.2）：成功／失敗那兩句話寫在**選項**上，
 * 才跟玩家真的做了什麼對得起來。所以這張卡片上有文字，沒有效果。
 */

export interface ChoicesFieldProps {
  value: DraftChoice[]
  onChange: (choices: DraftChoice[]) => void
}

export function ChoicesField({ value, onChange }: ChoicesFieldProps) {
  const patch = (index: number, next: Partial<DraftChoice>): void => {
    onChange(value.map((choice, at) => (at === index ? { ...choice, ...next } : choice)))
  }

  return (
    <Space direction="vertical" size="small" style={{ width: '100%' }}>
      {value.map((choice, index) => (
        <Card key={choice.id} size="small" styles={{ body: { padding: 12 } }}>
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Flex align="center" gap="small" wrap>
              <Tag color={choice.id === 'bold' ? 'volcano' : choice.id === 'safe' ? 'green' : 'blue'}>
                {CHOICE_LABELS[choice.id]}
              </Tag>
              <Input
                size="small"
                style={{ width: 220 }}
                placeholder="按鈕上的動作，例如「我跟你一起做」"
                value={choice.label}
                onChange={(event) => patch(index, { label: event.target.value })}
              />
              <Tooltip title="成功率相對 50% 的偏移。畫面上顯示的與真正擲骰的是同一個數字（§7.2）">
                <Flex align="center" gap={4}>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>成功率</Typography.Text>
                  <InputNumber
                    size="small"
                    style={{ width: 78 }}
                    min={-50}
                    max={50}
                    value={Number.parseInt(choice.odds, 10) || 0}
                    formatter={(v) => (Number(v) >= 0 ? `+${v}` : `${v}`)}
                    onChange={(offset) => patch(index, { odds: signedString(offset ?? 0) })}
                  />
                  <Tag>{describeOdds(choice.odds)}</Tag>
                </Flex>
              </Tooltip>
              <Tooltip title="結果的倍率：效果裡的「數值變化」會被乘上它（本金倍數不會）">
                <Flex align="center" gap={4}>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>倍率 mag</Typography.Text>
                  <InputNumber
                    size="small"
                    style={{ width: 64 }}
                    min={0}
                    step={0.5}
                    value={choice.mag}
                    onChange={(mag) => patch(index, { mag: mag ?? 1 })}
                  />
                </Flex>
              </Tooltip>
            </Flex>

            <Input.TextArea
              size="small"
              autoSize={{ minRows: 1, maxRows: 3 }}
              placeholder="成功時讀到的那一句"
              value={choice.good}
              onChange={(event) => patch(index, { good: event.target.value })}
            />
            <Input.TextArea
              size="small"
              autoSize={{ minRows: 1, maxRows: 3 }}
              placeholder="失敗時讀到的那一句"
              value={choice.bad}
              onChange={(event) => patch(index, { bad: event.target.value })}
            />
          </Space>
        </Card>
      ))}
    </Space>
  )
}

function signedString(offset: number): string {
  const rounded = Math.round(offset)
  return rounded >= 0 ? `+${rounded}` : `${rounded}`
}

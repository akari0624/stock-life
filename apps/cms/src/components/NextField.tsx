import { Alert, Flex, InputNumber, Segmented, Select, Space, Switch, Typography } from 'antd'
import type { DraftLink } from '../editor/draft.ts'

/**
 * §6.5.1 的前三列：作者說的是「A 之後接 B」「過幾年才 B」「成功接 B、失敗接 C」。
 * 這個元件就是那三句話的表單，編譯出來的是 outcome 上的 `next`（§7.2）。
 *
 * ⚠️ 「同一年馬上」與「幾年後」不只是時間差，是**兩種不同的語意**：
 * 馬上接不檢查目標的 require（鏡頭還沒切走），幾年後接到期時要檢查。
 * 這件事必須寫在畫面上，因為它決定了作者要不要寫 `orElse`。
 */

export interface NextFieldProps {
  value: DraftLink | undefined
  onChange: (link: DraftLink | undefined) => void
  /** 可以被指到的事件 id（草稿 + 一起載入的官方包） */
  eventIds: readonly string[]
  /** 自己的 id，排除掉：一格指向自己是無窮迴圈 */
  selfId: string
}

export function NextField({ value, onChange, eventIds, selfId }: NextFieldProps) {
  const options = eventIds.filter((id) => id !== selfId).map((id) => ({ label: id, value: id }))
  const later = (value?.afterYears ?? 0) >= 1
  const unknownTarget = value !== undefined && value.id.length > 0 && !eventIds.includes(value.id)

  if (!value) {
    return (
      <Flex align="center" gap="small">
        <Switch size="small" checked={false} onChange={() => onChange({ id: '' })} />
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>故事在這裡結束</Typography.Text>
      </Flex>
    )
  }

  return (
    <Space direction="vertical" size={6} style={{ width: '100%' }}>
      <Flex align="center" gap="small" wrap>
        <Switch size="small" checked onChange={() => onChange(undefined)} />
        <Typography.Text style={{ fontSize: 12 }}>接下一格</Typography.Text>
        <Select
          size="small"
          style={{ minWidth: 220 }}
          value={value.id.length > 0 ? value.id : undefined}
          onChange={(id) => onChange({ ...value, id })}
          options={options}
          showSearch
          placeholder="選一格"
          status={unknownTarget ? 'error' : undefined}
        />
        <Segmented
          size="small"
          value={later ? 'later' : 'now'}
          onChange={(mode) => onChange({ ...value, afterYears: mode === 'later' ? 1 : 0 })}
          options={[
            { label: '同一年馬上', value: 'now' },
            { label: '幾年後', value: 'later' },
          ]}
        />
        {later && (
          <InputNumber
            size="small"
            style={{ width: 90 }}
            min={1}
            max={40}
            addonAfter="年"
            value={value.afterYears ?? 1}
            onChange={(years) => onChange({ ...value, afterYears: years ?? 1 })}
          />
        )}
      </Flex>

      {unknownTarget && (
        <Alert type="error" showIcon message={`指向不存在的事件「${value.id}」——載入器會直接拒收這個包`} />
      )}

      {later ? (
        <Space direction="vertical" size={2} style={{ width: '100%' }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            排到 {value.afterYears ?? 1} 年後，到期時<strong>會檢查目標的條件</strong>——那麼久足夠玩家離婚、破產、換產業。
            演不成的話要有退路：
          </Typography.Text>
          <Flex align="center" gap="small">
            <Typography.Text style={{ fontSize: 12 }}>演不成就改演</Typography.Text>
            <Select
              size="small"
              style={{ minWidth: 200 }}
              allowClear
              value={value.orElse && value.orElse.length > 0 ? value.orElse : undefined}
              onChange={(orElse) => onChange({ ...value, ...(orElse ? { orElse } : { orElse: undefined }) })}
              options={options}
              showSearch
              placeholder="（不填就是什麼都不演）"
            />
          </Flex>
        </Space>
      ) : (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          同一年立刻接上，<strong>不檢查目標的條件</strong>：鏡頭還沒切走，世界沒有變。
        </Typography.Text>
      )}
    </Space>
  )
}

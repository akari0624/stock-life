import { Button, Flex, InputNumber, Select, Space, Tag, Tooltip, Typography } from 'antd'
import { isStatKey, type StateEffect } from '@stock-life/engine'
import { describeEffect, isAdvanced, STAT_LABELS, EDITABLE_STAT_KEYS } from '../editor/describe.ts'

/**
 * 一個 outcome 的效果清單（§6.3 的 StateEffect）。
 *
 * 編輯器提供四種：數值變化、本金倍數、給特性、開倉。
 * **`flag.set` 與寫到計數器的 `stat.add` 不提供**（§6.5.1 的總則：它們是編譯產物），
 * 但匯入的包裡有的話會顯示成唯讀的一列並照樣匯出。
 */

export interface EffectsFieldProps {
  value: StateEffect[]
  onChange: (effects: StateEffect[]) => void
  /** 給「獲得特性」用的候選 id */
  traitIds?: readonly string[]
  /** 給「開倉」用的候選 id */
  opportunityIds?: readonly string[]
  /** 這一組效果在畫面上會被乘上的倍率（選項的 mag），只用來顯示 */
  scale?: number
}

type EffectType = StateEffect['type']

const TYPE_LABELS: Record<EffectType, string> = {
  'stat.add': '數值變化',
  'capital.mul': '本金倍數',
  'trait.grant': '獲得特性',
  'position.open': '開倉',
  'flag.set': '旗標（進階）',
}

const OFFERED: readonly EffectType[] = ['stat.add', 'capital.mul', 'trait.grant', 'position.open']

const SIZINGS = ['light', 'normal', 'heavy', 'leveraged'] as const

export function EffectsField({ value, onChange, traitIds, opportunityIds, scale = 1 }: EffectsFieldProps) {
  const patch = (index: number, effect: StateEffect): void => {
    onChange(value.map((current, at) => (at === index ? effect : current)))
  }

  const remove = (index: number): void => {
    onChange(value.filter((_, at) => at !== index))
  }

  const add = (type: EffectType): void => {
    onChange([...value, blankEffect(type, traitIds, opportunityIds)])
  }

  return (
    <Space direction="vertical" size={4} style={{ width: '100%' }}>
      {value.map((effect, index) =>
        isAdvanced(effect) ? (
          <Flex key={index} align="center" gap="small">
            <Tag>進階</Tag>
            <Typography.Text code style={{ fontSize: 12 }}>{describeEffect(effect, scale)}</Typography.Text>
            <Tooltip title="計數器與旗標是編譯產物，編輯器不提供編輯，但會原樣保留並匯出">
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>唯讀</Typography.Text>
            </Tooltip>
            <Button size="small" type="text" danger onClick={() => remove(index)}>移除</Button>
          </Flex>
        ) : (
          <EffectRow
            key={index}
            effect={effect}
            traitIds={traitIds}
            opportunityIds={opportunityIds}
            onChange={(next) => patch(index, next)}
            onRemove={() => remove(index)}
          />
        ),
      )}

      <Flex gap="small" wrap>
        {OFFERED.map((type) => (
          <Button key={type} size="small" type="dashed" onClick={() => add(type)}>
            ＋ {TYPE_LABELS[type]}
          </Button>
        ))}
      </Flex>
    </Space>
  )
}

interface EffectRowProps {
  effect: StateEffect
  traitIds?: readonly string[]
  opportunityIds?: readonly string[]
  onChange: (effect: StateEffect) => void
  onRemove: () => void
}

function EffectRow({ effect, traitIds, opportunityIds, onChange, onRemove }: EffectRowProps) {
  return (
    <Flex align="center" gap="small" wrap>
      <Tag color="blue">{TYPE_LABELS[effect.type]}</Tag>

      {effect.type === 'stat.add' && (
        <>
          <Select
            size="small"
            style={{ width: 120 }}
            value={isStatKey(effect.key) ? effect.key : undefined}
            onChange={(key) => onChange({ ...effect, key })}
            options={EDITABLE_STAT_KEYS.map((key) => ({ label: STAT_LABELS[key] ?? key, value: key }))}
          />
          <InputNumber
            size="small"
            style={{ width: 100 }}
            value={effect.value}
            onChange={(value) => onChange({ ...effect, value: value ?? 0 })}
          />
          <Tooltip title="這個數字會被選項的 mag 乘上：mag 3 的「大膽」拿到的是三倍">
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>× mag</Typography.Text>
          </Tooltip>
        </>
      )}

      {effect.type === 'capital.mul' && (
        <>
          <InputNumber
            size="small"
            style={{ width: 100 }}
            min={0}
            step={0.05}
            value={effect.value}
            onChange={(value) => onChange({ ...effect, value: value ?? 1 })}
          />
          <Tooltip title="⚠️ 本金倍數不會被 mag 縮放（applyContentEffects）——三個選項的倍數完全一樣">
            <Typography.Text type="warning" style={{ fontSize: 12 }}>不隨 mag 變</Typography.Text>
          </Tooltip>
        </>
      )}

      {effect.type === 'trait.grant' && (
        <Select
          size="small"
          style={{ width: 200 }}
          value={effect.id}
          onChange={(id) => onChange({ ...effect, id })}
          options={(traitIds ?? []).map((id) => ({ label: id, value: id }))}
          showSearch
          placeholder="選一個特性"
        />
      )}

      {effect.type === 'position.open' && (
        <>
          <Select
            size="small"
            style={{ width: 200 }}
            value={effect.opportunityId}
            onChange={(opportunityId) => onChange({ ...effect, opportunityId })}
            options={(opportunityIds ?? []).map((id) => ({ label: id, value: id }))}
            showSearch
            placeholder="選一個機會"
          />
          <Select
            size="small"
            style={{ width: 100 }}
            value={effect.sizing}
            onChange={(sizing) => onChange({ ...effect, sizing })}
            options={SIZINGS.map((sizing) => ({ label: sizing, value: sizing }))}
          />
        </>
      )}

      <Button size="small" type="text" danger onClick={onRemove}>移除</Button>
    </Flex>
  )
}

function blankEffect(type: EffectType, traitIds?: readonly string[], opportunityIds?: readonly string[]): StateEffect {
  switch (type) {
    case 'stat.add':
      return { type: 'stat.add', key: 'cognition', value: 2 }
    case 'capital.mul':
      return { type: 'capital.mul', value: 1 }
    case 'trait.grant':
      return { type: 'trait.grant', id: traitIds?.[0] ?? '' }
    case 'position.open':
      return { type: 'position.open', opportunityId: opportunityIds?.[0] ?? '', sizing: 'normal' }
    case 'flag.set':
      return { type: 'flag.set', key: '' }
  }
}

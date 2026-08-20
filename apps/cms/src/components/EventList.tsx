import { Badge, Button, Empty, Flex, Input, Space, Tag, Typography } from 'antd'
import { useState } from 'react'
import { kindOf } from '../editor/draft.ts'
import { useEditor, useStore } from '../editor/hooks.ts'

/**
 * 左邊的事件清單。入口與段落**分成兩段**，不混在一起——§6.5.2 的整個重點是
 * 這兩種框要長得不一樣，清單上混著排就等於把那件事又搓回去了。
 */

export function EventList() {
  const { draft, selected, validation } = useEditor()
  const store = useStore()
  const [keyword, setKeyword] = useState('')

  const rows = draft.events
    .map((event, index) => ({ event, index }))
    .filter(({ event }) => {
      if (keyword.length === 0) return true
      const needle = keyword.toLowerCase()
      return event.id.toLowerCase().includes(needle) || event.prompt.toLowerCase().includes(needle)
    })

  const entries = rows.filter(({ event }) => kindOf(event) === 'entry')
  const beats = rows.filter(({ event }) => kindOf(event) === 'beat')

  return (
    <Space direction="vertical" size="small" style={{ width: '100%', padding: 12 }}>
      <Input
        size="small"
        allowClear
        placeholder="找 id 或情境"
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
      />

      <Flex gap="small">
        <Button size="small" type="primary" onClick={() => store.addEvent('entry')} style={{ flex: 1 }}>
          ＋ 入口事件
        </Button>
        <Button size="small" onClick={() => store.addEvent('beat')} style={{ flex: 1 }}>
          ＋ 劇情段落
        </Button>
      </Flex>

      {draft.events.length === 0 && <Empty description="還沒有事件" style={{ marginTop: 32 }} />}

      <Section title="入口事件" subtitle="靠抽籤進來" rows={entries} selected={selected} validation={validation} onSelect={(index) => store.select(index)} onRemove={(index) => store.removeEvent(index)} onDuplicate={(index) => store.duplicateEvent(index)} />
      <Section title="劇情段落" subtitle="只走箭頭" rows={beats} selected={selected} validation={validation} onSelect={(index) => store.select(index)} onRemove={(index) => store.removeEvent(index)} onDuplicate={(index) => store.duplicateEvent(index)} />
    </Space>
  )
}

interface SectionProps {
  title: string
  subtitle: string
  rows: { event: { id: string; prompt: string; weight: number; once: boolean }; index: number }[]
  selected: number
  validation: { byEvent: Map<number, unknown[]> }
  onSelect: (index: number) => void
  onRemove: (index: number) => void
  onDuplicate: (index: number) => void
}

function Section({ title, subtitle, rows, selected, validation, onSelect, onRemove, onDuplicate }: SectionProps) {
  if (rows.length === 0) return null
  return (
    <Space direction="vertical" size={4} style={{ width: '100%' }}>
      <Flex align="baseline" gap={6} style={{ marginTop: 8 }}>
        <Typography.Text strong style={{ fontSize: 12 }}>{title}</Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: 11 }}>{subtitle} · {rows.length}</Typography.Text>
      </Flex>

      {rows.map(({ event, index }) => {
        const issues = validation.byEvent.get(index)?.length ?? 0
        return (
          <div
            key={index}
            className={`event-row${index === selected ? ' is-selected' : ''}`}
            onClick={() => onSelect(index)}
          >
            <Flex align="center" justify="space-between" gap={4}>
              <Flex align="center" gap={6} style={{ minWidth: 0 }}>
                {issues > 0 && <Badge count={issues} size="small" />}
                <Typography.Text ellipsis style={{ fontSize: 12 }}>
                  {event.id.length > 0 ? event.id : '（還沒有 id）'}
                </Typography.Text>
              </Flex>
              <Flex gap={2}>
                {event.once && <Tag style={{ marginInlineEnd: 0, fontSize: 10, lineHeight: '16px' }}>一次</Tag>}
                {event.weight > 0 && <Tag color="blue" style={{ marginInlineEnd: 0, fontSize: 10, lineHeight: '16px' }}>{event.weight}</Tag>}
              </Flex>
            </Flex>
            <Typography.Text type="secondary" ellipsis style={{ fontSize: 11, display: 'block' }}>
              {event.prompt.length > 0 ? event.prompt : '（還沒有情境）'}
            </Typography.Text>
            <Flex gap={4} className="event-row-actions">
              <Button size="small" type="text" onClick={(e) => { e.stopPropagation(); onDuplicate(index) }}>複製</Button>
              <Button size="small" type="text" danger onClick={(e) => { e.stopPropagation(); onRemove(index) }}>刪除</Button>
            </Flex>
          </div>
        )
      })}
    </Space>
  )
}

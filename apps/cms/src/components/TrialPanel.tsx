import { Alert, Button, Card, Flex, InputNumber, Progress, Segmented, Space, Switch, Table, Tag, Tooltip, Typography } from 'antd'
import type { EventChoiceId, EventProbe } from '@stock-life/engine'
import { useEditor, useStore } from '../editor/hooks.ts'

/**
 * §6.5.3 #1 的後半：**統計試跑**。優先度高過表單本身。
 *
 * 作者現在沒有任何辦法知道「我的事件會不會出現」——這張表就是答案。
 * 每一列是一個事件，重點是三個數字：出現率、平均年齡、平均出現幾次。
 *
 * ⚠️ 入口與段落的數字要用完全不同的方式讀，所以表上分兩種標籤：
 * 入口的出現率是「有沒有被抽到」（機率），段落的出現率是「上一格有沒有走到這條線」
 * （精確）。把兩者混在一起看，就會得到 §6.5.2 那個「我的故事沒出現」的抱怨。
 */

export function TrialPanel() {
  const { trial, withCoreTw, draft } = useEditor()
  const store = useStore()
  const draftIds = new Set(draft.events.map((event) => event.id))

  const rows = (trial.report?.events ?? []).filter((probe) => draftIds.has(probe.id))
  const others = (trial.report?.events ?? []).length - rows.length

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Card size="small">
        <Flex gap="middle" wrap align="center">
          <Flex align="center" gap={4}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>跑幾局</Typography.Text>
            <InputNumber
              size="small"
              style={{ width: 90 }}
              min={10}
              max={2000}
              step={50}
              value={trial.runs}
              onChange={(runs) => store.setTrialOptions({ runs: runs ?? 200 })}
            />
          </Flex>

          <Flex align="center" gap={4}>
            <Tooltip title="代打玩家的風險偏好。同一份內容在保守與大膽玩家手上會走到不同的分支">
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>代打玩家</Typography.Text>
            </Tooltip>
            <Segmented
              size="small"
              value={trial.risk}
              onChange={(risk) => store.setTrialOptions({ risk: risk as EventChoiceId })}
              options={[
                { label: '保守', value: 'safe' },
                { label: '普通', value: 'normal' },
                { label: '大膽', value: 'bold' },
              ]}
            />
          </Flex>

          <Tooltip title="關掉的話，你的事件是抽籤池裡唯一的一個，出現率會漂亮得毫無意義">
            <Flex align="center" gap={4}>
              <Switch size="small" checked={withCoreTw} onChange={(value) => store.setWithCoreTw(value)} />
              <Typography.Text style={{ fontSize: 12 }}>一起載入官方包 core-tw</Typography.Text>
            </Flex>
          </Tooltip>

          <Button type="primary" size="small" loading={trial.running} onClick={() => void store.runTrial()}>
            {trial.running ? '跑著…' : '統計試跑'}
          </Button>
        </Flex>
      </Card>

      {trial.errors && (
        <Alert
          type="error"
          showIcon
          message="跑不起來——這份內容包載不進遊戲"
          description={
            <Space direction="vertical" size={0}>
              {trial.errors.map((error, index) => (
                <Typography.Text key={index} style={{ fontSize: 12 }}>{error}</Typography.Text>
              ))}
            </Space>
          }
        />
      )}

      {trial.report && (
        <>
          <Table<EventProbe>
            size="small"
            rowKey="id"
            dataSource={rows}
            pagination={false}
            locale={{ emptyText: '這份草稿裡的事件一個都沒被跑到' }}
            columns={[
              {
                title: '事件',
                dataIndex: 'id',
                render: (id: string, probe) => (
                  <Flex align="center" gap="small">
                    <Tag color={probe.entry ? 'blue' : 'purple'}>{probe.entry ? '入口' : '段落'}</Tag>
                    <Typography.Text style={{ fontSize: 12 }}>{id}</Typography.Text>
                  </Flex>
                ),
              },
              {
                title: '出現率',
                dataIndex: 'reachRate',
                sorter: (a, b) => a.reachRate - b.reachRate,
                render: (rate: number, probe) => (
                  <Tooltip title={probe.entry ? '有多少比例的人生抽到過這一格' : '有多少比例的人生走到過這一格'}>
                    <Flex align="center" gap="small">
                      <Progress
                        percent={Math.round(rate * 100)}
                        size="small"
                        style={{ width: 90, marginBottom: 0 }}
                        status={rate === 0 ? 'exception' : 'normal'}
                      />
                    </Flex>
                  </Tooltip>
                ),
              },
              {
                title: '平均年齡',
                dataIndex: 'firstAge',
                sorter: (a, b) => (a.firstAge ?? 999) - (b.firstAge ?? 999),
                render: (age: number | undefined) => (age === undefined ? '—' : `${age.toFixed(1)} 歲`),
              },
              {
                title: '平均出現',
                dataIndex: 'perLife',
                render: (perLife: number, probe) => (
                  <Tooltip title={`遇到的那些人生裡平均 ${probe.perLifeWhenSeen.toFixed(2)} 次`}>
                    <span>{perLife.toFixed(2)} 次／局</span>
                  </Tooltip>
                ),
              },
              {
                title: '權重',
                dataIndex: 'weight',
                render: (weight: number) => (weight > 0 ? weight : '—'),
              },
            ]}
          />

          <Space direction="vertical" size={4}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              跑了 {trial.report.runs} 局{others > 0 ? `，另外 ${others} 個官方包事件沒有列出來` : ''}。
            </Typography.Text>
            {rows.some((probe) => probe.reachRate === 0) && (
              <Typography.Text type="danger" style={{ fontSize: 12 }}>
                出現率 0 的那幾格：條件可能永遠不成立、或是沒有任何箭頭指向它。碰不到的內容等於沒寫。
              </Typography.Text>
            )}
          </Space>
        </>
      )}

      {!trial.report && !trial.errors && (
        <Alert
          type="info"
          showIcon
          message="還沒跑過"
          description="按上面的「統計試跑」。200 局大約幾秒，跑在 Worker 裡，表單不會凍住。"
        />
      )}
    </Space>
  )
}

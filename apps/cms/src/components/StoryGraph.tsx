import { Alert, Card, Empty, Flex, Space, Typography } from 'antd'
import { buildGraph, type GraphNode, type NodeKind } from '../editor/graph.ts'
import { useEditor, useStore } from '../editor/hooks.ts'

/**
 * §6.5.1：**作者看到的是框和箭頭。**
 * §6.5.3 #4：流程圖 + 斷鏈標紅，而且要在作者打字的當下就講，不是等他匯出。
 *
 * 兩種框刻意長得不一樣（§6.5.2）：
 * - 入口事件：實線粗框 + 權重，靠抽籤進來
 * - 劇情段落：虛線圓角框，只走箭頭
 *
 * 兩種灰框是「不在這個包裡」的目標：官方包的事件（合法，跨包接故事）
 * 與根本不存在的 id（紅色，載入器會拒收）。
 *
 * 自己畫 SVG 而不是拉一個圖形庫進來：這裡要的是分層擺放加幾條貝茲曲線，
 * 跟 §10.1「動畫自建、零依賴」是同一個判斷。
 */

const COL_WIDTH = 230
const ROW_HEIGHT = 96
const BOX_WIDTH = 186
const BOX_HEIGHT = 58
const PAD = 24

export function StoryGraph() {
  const { draft, withCoreTw, baseline, selected } = useEditor()
  const store = useStore()
  const graph = buildGraph(draft, withCoreTw && baseline ? baseline.eventIds : new Set())

  if (graph.nodes.length === 0) {
    return <Empty description="還沒有任何事件" style={{ marginTop: 64 }} />
  }

  const cols = Math.max(...graph.nodes.map((node) => node.col)) + 1
  const rows = Math.max(...graph.nodes.map((node) => node.row)) + 1
  const width = PAD * 2 + (cols - 1) * COL_WIDTH + BOX_WIDTH
  const height = PAD * 2 + (rows - 1) * ROW_HEIGHT + BOX_HEIGHT
  const at = (node: GraphNode) => ({ x: PAD + node.col * COL_WIDTH, y: PAD + node.row * ROW_HEIGHT })
  const byId = new Map(graph.nodes.map((node) => [node.id, node]))

  const broken = graph.edges.filter((edge) => edge.broken)
  const orphans = graph.nodes.filter((node) => node.orphan)

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Card size="small">
        <Flex gap="middle" wrap align="center">
          <Legend kind="entry" text="入口事件（抽籤）" />
          <Legend kind="beat" text="劇情段落（只走箭頭）" />
          <Legend kind="external" text="官方包的事件" />
          <Legend kind="missing" text="不存在的 id" />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            綠線＝成功、橙線＝失敗、灰虛線＝演不成時的退路（orElse）
          </Typography.Text>
        </Flex>
      </Card>

      {broken.length > 0 && (
        <Alert
          type="error"
          showIcon
          message={`${broken.length} 條斷鏈`}
          description={
            <Space direction="vertical" size={0}>
              {broken.map((edge, index) => (
                <Typography.Text key={index} style={{ fontSize: 12 }}>
                  「{edge.from}」的{edge.branch === 'good' ? '成功' : '失敗'}
                  {edge.kind === 'orElse' ? '退路' : ''}指向不存在的「{edge.to}」
                </Typography.Text>
              ))}
            </Space>
          }
        />
      )}

      {orphans.length > 0 && (
        <Alert
          type="warning"
          showIcon
          message={`${orphans.length} 格進不去`}
          description={`${orphans.map((node) => node.id).join('、')}：權重 0，又沒有任何箭頭指向它——寫了但玩家永遠看不到。`}
        />
      )}

      <Card size="small" styles={{ body: { overflowX: 'auto' } }}>
        <svg width={width} height={height} role="img" aria-label="故事圖">
          <defs>
            {(['good', 'bad', 'orElse'] as const).map((kind) => (
              <marker
                key={kind}
                id={`arrow-${kind}`}
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill={EDGE_COLORS[kind]} />
              </marker>
            ))}
          </defs>

          {graph.edges.map((edge, index) => {
            const from = byId.get(edge.from)
            const to = byId.get(edge.to)
            if (!from || !to) return null
            const a = at(from)
            const b = at(to)
            const x1 = a.x + BOX_WIDTH
            const y1 = a.y + BOX_HEIGHT / 2
            const x2 = b.x
            const y2 = b.y + BOX_HEIGHT / 2
            const bend = Math.max(36, Math.abs(x2 - x1) / 2)
            const stroke = edge.broken ? EDGE_COLORS.missing : EDGE_COLORS[edge.kind === 'orElse' ? 'orElse' : edge.branch]
            return (
              <g key={index}>
                <path
                  d={`M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={1.5}
                  strokeDasharray={edge.kind === 'orElse' ? '4 3' : undefined}
                  markerEnd={`url(#arrow-${edge.kind === 'orElse' ? 'orElse' : edge.branch})`}
                />
                <text
                  x={(x1 + x2) / 2}
                  y={(y1 + y2) / 2 - 6}
                  fill={stroke}
                  fontSize={10}
                  textAnchor="middle"
                >
                  {edge.afterYears > 0 ? `${edge.afterYears} 年後` : '馬上'}
                </text>
              </g>
            )
          })}

          {graph.nodes.map((node) => {
            const { x, y } = at(node)
            const isSelected = node.index >= 0 && node.index === selected
            return (
              <g
                key={node.id}
                transform={`translate(${x},${y})`}
                onClick={() => node.index >= 0 && store.select(node.index)}
                style={{ cursor: node.index >= 0 ? 'pointer' : 'default' }}
              >
                <rect
                  width={BOX_WIDTH}
                  height={BOX_HEIGHT}
                  rx={node.kind === 'beat' ? 14 : 4}
                  fill={isSelected ? '#1f3a5f' : '#1b1b1f'}
                  stroke={NODE_COLORS[node.kind]}
                  strokeWidth={node.kind === 'entry' ? 2.5 : 1.25}
                  strokeDasharray={node.kind === 'beat' ? '5 3' : undefined}
                />
                <text x={12} y={23} fill="#e8e8ea" fontSize={12}>
                  {truncate(node.id, 22)}
                </text>
                <text x={12} y={42} fill={NODE_COLORS[node.kind]} fontSize={10}>
                  {describeNode(node)}
                </text>
              </g>
            )
          })}
        </svg>
      </Card>
    </Space>
  )
}

const NODE_COLORS: Record<NodeKind, string> = {
  entry: '#4096ff',
  beat: '#9254de',
  external: '#8c8c8c',
  missing: '#ff4d4f',
}

const EDGE_COLORS = {
  good: '#52c41a',
  bad: '#fa8c16',
  orElse: '#8c8c8c',
  missing: '#ff4d4f',
}

function describeNode(node: GraphNode): string {
  if (node.kind === 'missing') return '不存在的 id'
  if (node.kind === 'external') return '官方包'
  const parts = [node.kind === 'entry' ? `抽籤 權重 ${node.weight}` : '只走箭頭']
  if (node.once) parts.push('一次')
  if (node.orphan) parts.push('進不去')
  return parts.join(' · ')
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function Legend({ kind, text }: { kind: NodeKind; text: string }) {
  return (
    <Flex align="center" gap={6}>
      <svg width={22} height={14}>
        <rect
          x={1}
          y={1}
          width={20}
          height={12}
          rx={kind === 'beat' ? 6 : 2}
          fill="#1b1b1f"
          stroke={NODE_COLORS[kind]}
          strokeWidth={kind === 'entry' ? 2 : 1}
          strokeDasharray={kind === 'beat' ? '4 2' : undefined}
        />
      </svg>
      <Typography.Text style={{ fontSize: 12 }}>{text}</Typography.Text>
    </Flex>
  )
}


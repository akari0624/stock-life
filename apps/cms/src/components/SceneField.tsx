import { Flex, Select, Tag, Tooltip, Typography } from 'antd'
import type { AssetKind, SceneRef } from '@stock-life/engine'
import { ASSET_KIND_LABELS, type AssetCatalogue } from '../editor/assets.ts'

/**
 * §6.5.3 #5 的資產選擇器。**從清單選，不要讓人打字。**
 *
 * 打錯一個字只會靜靜 fallback 成色塊（§6.3），作者不會發現自己打錯了——
 * 所以這裡允許自由輸入（`tags` 模式，因為新素材的 id 本來就得有人先寫下來），
 * 但每一個選項都掛著「有圖／佔位」的標籤，讓「我打錯了」跟「這張還沒畫」
 * 在畫面上長得不一樣。
 */

const KINDS: readonly AssetKind[] = ['bg', 'actor', 'sfx', 'fx']

export interface SceneFieldProps {
  value: SceneRef
  onChange: (scene: SceneRef) => void
  catalogue: AssetCatalogue
}

export function SceneField({ value, onChange, catalogue }: SceneFieldProps) {
  return (
    <Flex gap="small" wrap>
      {KINDS.map((kind) => {
        const current = value[kind === 'actor' ? 'actor' : kind]
        const options = catalogue[kind]
        const known = options.find((option) => option.id === current)
        return (
          <Flex key={kind} align="center" gap={4}>
            <Typography.Text type="secondary" style={{ fontSize: 12, width: 30 }}>
              {ASSET_KIND_LABELS[kind]}
            </Typography.Text>
            <Select
              size="small"
              style={{ width: 170 }}
              allowClear
              showSearch
              value={current && current.length > 0 ? current : undefined}
              onChange={(id: string | undefined) => onChange({ ...value, [kind]: id ?? undefined })}
              placeholder="（不指定）"
              options={options.map((option) => ({
                value: option.id,
                label: `${option.id}${option.provided ? '' : ' · 佔位'}`,
              }))}
            />
            {current && current.length > 0 && (
              <Tooltip
                title={
                  kind === 'fx'
                    ? '特效一律是 CSS 動畫，沒有檔案（§6.4 的 assets 沒有 fx 區塊）'
                    : known?.provided
                      ? 'manifest 裡有對到檔案'
                      : '沒有對到檔案：遊戲裡會是由 id 雜湊決定的佔位色塊。可能是還沒畫，也可能是你打錯了'
                }
              >
                <Tag color={kind === 'fx' ? 'default' : known?.provided ? 'green' : 'orange'} style={{ marginInlineEnd: 0 }}>
                  {kind === 'fx' ? 'CSS' : known?.provided ? '有圖' : '佔位'}
                </Tag>
              </Tooltip>
            )}
          </Flex>
        )
      })}
    </Flex>
  )
}

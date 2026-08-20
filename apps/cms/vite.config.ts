import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// 後台跟遊戲是兩個獨立的 SPA，同一個 GitHub Pages 站台下的兩個路徑：
// 遊戲在 `/stock-life/`，這裡在 `/stock-life/cms/`。
// 分開建置的理由是**依賴不互相污染**：遊戲不該為了後台背上 antd。
//
// base 從遊戲的 `VITE_BASE` 推出來，不另外開一個要手動同步的變數——
// 兩個地方各寫一次 repo 名字，遲早會有一個忘記改。
// 本地開發（沒有 VITE_BASE）就是 `/`。
const siteBase = process.env.VITE_BASE

export default defineConfig({
  base: siteBase ? `${siteBase.replace(/\/$/, '')}/cms/` : '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@stock-life/engine': path.resolve(import.meta.dirname, '../../packages/engine/src'),
    },
  },
})

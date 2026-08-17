import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  // GitHub Pages 是 /<repo>/ 底下的子路徑，靠 CI 傳 VITE_BASE 進來；本地照舊是 /
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), babel({ presets: [reactCompilerPreset()] }), tailwindcss()],
  resolve: {
    alias: {
      '@stock-life/engine': path.resolve(import.meta.dirname, '../../packages/engine/src'),
    },
  },
})

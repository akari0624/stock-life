# 投資人生

一個文字擲骰的人生模擬器：你在一個有景氣循環的時代裡工作、累積本金與認知，
一輩子會遇到少數幾個真正改變命運的投資機會——而**你當時並不知道那是機會**。

一局約 10–20 分鐘（18 → 65 歲，一年一回合）。零後端，純靜態站。

🎮 <https://akari0624.github.io/stock-life/>

---

## 核心設計

```
結果 = 機會倍數 × 當時本金 × 你抱得住多久
```

這條乘法天生會產生**錯位**——22 歲遇到 10 倍機會但只有 5 萬本金，45 歲有 800 萬本金
但遇到的只有 1.3 倍。玩家一輩子都在追這個錯位。

三種資本各自決定關鍵時刻的一件事：**本金**決定你能押多少、**認知**決定你看得懂什麼、
**人脈**決定機會會不會找上你。機會的真實倍數由種子固定，但玩家看到的描述取決於認知
與人脈——同一張卡，低認知玩家看到的是「同事說這檔穩賺」，高認知玩家看到的是營收與
本益比。入場決策不是 yes/no，而是四檔倉位（`light` / `normal` / `heavy` / `leveraged`）。

完整設計見 [DESIGN.md](./DESIGN.md)。

---

## 開發

需要 Node 24+ 與 pnpm 11（`packageManager` 已鎖版本，用 corepack 即可）。

```bash
pnpm install
pnpm dev          # 起 apps/web，順帶 build 上游 package
```

| 指令 | 作用 |
|---|---|
| `pnpm dev` | 開發伺服器（turbo 會先 build engine 與 tokens） |
| `pnpm build` | 全部建置，產出在 `apps/web/dist` |
| `pnpm test` | vitest，全 workspace |
| `pnpm lint` | eslint |
| `pnpm typecheck` | tsc --noEmit |

engine 另外有兩個獨立指令：

```bash
pnpm --filter @stock-life/engine balance       # 無頭跑分，調數值平衡用
pnpm --filter @stock-life/engine schema:export # zod → JSON Schema，給日後的 UGC 編輯器
```

---

## 架構

依賴方向**嚴格單向**，不得反向也不得跳層：

```
content ──► domain ◄── sim ──► presentation ──► ui ──► app
```

```
packages/engine/   零 react、零 DOM、零 IO。runtime 依賴只有 zod，node 可獨立執行
  domain/          純規則（state / facade / rng / expr / systems / turn）
  content/         zod schema、載入器、官方內容包 core-tw
  sim/             turn 排程、系統註冊表、無頭執行器
packages/tokens/   DTCG token JSON + style-dictionary build，三層 token pipeline
apps/web/          React 19 + Tailwind v4
  presentation/    演出時間軸播放器（director）、場景渲染（stage）、AssetResolver、AudioBus
  app/             組裝、畫面狀態機、存檔、內容包載入，以及只讀 view model 的 React 元件
  styles/          globals.css（匯入 token）+ cn()
  dev/             開發用畫面：token gallery、audio lab
```

`packages/engine/package.json` 不列 react，pnpm 的嚴格 node_modules 讓「從 domain
import UI」變成**編譯期錯誤**，而不是一行 `eslint-disable` 就能穿過的 lint 警告。
這是整個專案最重要的一條紀律——它換來的是無頭測試、批次跑平衡、重播與跳過動畫。

技術選型：Vite 8 / TypeScript 6 / React 19（已開 React Compiler）/ Tailwind v4 /
zod 4 / vitest 4。**無 router**（畫面是狀態機，種子分享走 `URLSearchParams`）、
**無狀態管理庫**（sim 持有，UI 用 `useSyncExternalStore`）、**無動畫庫**
（自建 director + Web Animations API）。

---

## 內容包

官方包 `core-tw` 走的是跟第三方 mod **完全相同**的載入器與驗證器（dogfooding），
目前含 92 個事件、24 個機會、29 個職業、37 個人格特質。內容是宣告式條件樹
（and/or/not + 比較式）的純資料，不是沙箱腳本——為的是日後能用表單填空產生。

---

## 部署

push 進 `main`（含 PR 合併）會觸發 `.github/workflows/deploy-pages.yml`：
跑過 lint / typecheck / test 之後建置 `apps/web`，發到 GitHub Pages。

站台在 `/<repo>/` 子路徑下，所以 CI 會帶 `VITE_BASE` 進 build；本地不設這個環境變數，
維持 `/`。repo 的 Settings → Pages → Source 需設為 **GitHub Actions**。

---

## 文件

| 檔案 | 內容 |
|---|---|
| [DESIGN.md](./DESIGN.md) | **實作的唯一依據**。與它衝突的程式碼都算 bug；要改設計請先改這份 |
| [PLAN.md](./PLAN.md) | 分階段實作計畫 |
| [TODO.md](./TODO.md) | 已決定要做、但刻意延後的項目，各自附「現在必須先做到的邊界」 |

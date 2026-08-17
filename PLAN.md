# 實作步驟 · 分 session 執行

每個 step 設計成**可在一個沒有對話記憶的新 session 裡獨立完成**。
每個 step 都附：依據文件的哪一節、產出檔案、完成判準、明確禁止事項，
以及一段**可直接貼給新 session 的起始指令**。

## 使用方式

1. 開新 session，貼上該 step 的「起始指令」
2. 完成後，回到本文件把該 step 的 `[ ]` 改成 `[x]`，並在「交接筆記」欄補上偏離設計之處
3. 下一個 session 只需讀 `DESIGN.md` 指定章節 + 本文件的已完成狀態

## 鐵則（每個 session 都適用）

- **`DESIGN.md` 是唯一依據。** 與它衝突的程式碼算 bug。
  若實作中發現設計有錯，**先改 `DESIGN.md` 再改程式碼**，並在交接筆記記錄。
- **不要越界做下一個 step 的事。** 每個 step 有「本步驟不做」清單，請遵守。
- **不要跳過完成判準。** 判準是給下一個 session 的保證。
- 設計相關的延後項目一律查 `TODO.md`，不要自行發明。

## 進度

| Step | 名稱 | 狀態 | 交接筆記 |
|---|---|---|---|
| S1 | Workspace 地基與強制機制 | [x] | pnpm workspace + Turborepo 完成；boundary.test.ts 用 `'window' in globalThis` 而非 `typeof window`，因 engine tsconfig 無 DOM lib 會讓後者型別報錯；apps/web/vite.config.ts 用 resolve.alias 將 `@stock-life/engine` 指向 `packages/engine/src`，讓 Vite 直接消費 TS 原始碼，不需 pre-build；apps/web/vitest.config.ts 設 `passWithNoTests: true`，S1 無 web 測試亦能通過 |
| S2 | SeededRng 與種子編碼 | [x] | stream() 用 `hash(seed::id)` 各自獨立初始化 sfc32（非延續同一序列），故新增 stream 不影響既有 stream，已有測試證明；fingerprint/seed 皆為 number，`toString(36)`／`parseInt(.., 36)` 做編解碼；decode() 回傳 discriminated union（`ok/error`）而非 throw |
| S3 | GameState、ModStateView、Calendar | [x] | GameState 分域為 player/capitalState/career/era/positions/traits/counters/flags；`createInitialGameState()` 是唯一的狀態工廠，測試一律透過它 + `readFacade()` 存取，不直接假設內部欄位形狀，藉此滿足「重構內部不弄壞 facade」判準；FacadePath 白名單型別在編譯期擋非白名單 path（`@ts-expect-error` 測試 + `tsc --noEmit` 驗證該行確實是型別錯誤）；`listFacadeFields()` 目前只列 20 個靜態欄位，`flag.*`/`counter.*` 是開放命名空間不進列表，留給 S5 schema 用 prefix pattern 處理；Calendar 以 turnIndex 換算 year/age，quarter granularity 每 4 turn 才推進一次 age/year（stage 分級為 student/early_career/mid_career/late_career/retirement，門檻為設計判斷，DESIGN.md 未明定） |
| S4 | Expr 求值器與 Effect 系統 | [x] | evaluate() 回傳 `{ok,...}` 而非丟例外（沿用 S2 shareCode 的模式），步數上限用內部 throw + try/catch 轉成結果物件；`structuredClone` 在 engine 的 no-DOM tsconfig 下型別找不到，改寫 `cloneGameState()` 手動深拷貝（`domain/state/GameState.ts`）；`erasableSyntaxOnly` 不允許 constructor parameter property（`readonly x` 寫在建構子參數上），改成欄位宣告+建構子內賦值；`position.open` 只累加 `positions.count`、`event.trigger` 對 state 是 no-op，完整持倉/事件排程留給 S9/S10；新增 `EffectRegistry`（具名效果註冊表）滿足 §11 錯誤 4；ESLint 根設定新增 `argsIgnorePattern: '^_'` 讓刻意未用的參數（如預留給未來效果的 rng）可用底線前綴通過 |
| S5 | zod Schema 與內容載入器 | [x] | facadePathSchema 對靜態 path 用 `z.enum(listFacadeFields().map(f=>f.path))`（程式產生，無第二份清單），`flag.*`/`counter.*` 動態命名空間用 regex；未知效果名的拒絕是靠 `z.discriminatedUnion('type', [...])` 天然達成，不需另一份 named-effect 白名單；`node scripts/exportSchema.ts` 因 NodeNext 的 `.js` import 在原始 TS 執行時無法解析回 `.ts`（tsc 才懂這個映射），改用 `tsx` 執行（已加為 engine devDependency，並 `pnpm approve-builds esbuild`）；`schema-export/` 為建置產物，加進 .gitignore；`ContentValidationIssue` 目前只填 `path`（結構路徑），`line`/`column` 依 §6.2 保留為 optional 欄位供未來 CST parser 使用；`checkCompatibility()` 的 engineApi 比對只做簡化版 caret-major 比對（`^1` 等），未實作完整 semver range；trait/opportunity 的 `scene` 欄位合併成同一個 `sceneRefSchema`（bg/actor/sfx/fx 皆 optional）而非各自定義；career edge 新增「edge 端點必須存在於 nodes[]」的 refine 檢查（DESIGN 未明定，屬合理延伸）；`EffectRegistry`（S4 產出）本步驟未接入 schema，因為目前內容範例都是直接內嵌 typed StateEffect，不是用名稱引用具名效果 |
| S6 | GameSystem 註冊表與 turn 排程 | [x] | `advance(state, command, rng)` 的字面簽章靠 `createAdvance({registry, calendar})` 回傳閉包達成——registry/calendar 不是 advance 的參數，而是建構時注入，滿足「純函式只有三個參數」與「可配置依賴」兩個要求；GameState 新增 `commandIndex` 欄位（純內部 RNG keying 用，不進 facade 白名單）：每次 advance() 呼叫遞增一次，每個 system 的每個 hook（onCommand 或某個 phase）用 `${systemId}:${commandIndex}:${hook}` 當 `rng.stream()` 的 key，這樣同一 turnIndex 內連續多個 command 仍各自拿到獨立亂數，同時 replay 同 seed+commandLog 仍逐位元重現（因為 key 完全由 state 衍生，不依賴任何外部可變計數器）；GameSystem 介面在 §8 之外新增 `onCommand?()`（§8 pseudocode 只列 onPhase，但 S6 條目明講「command 由各 system 處理自己關心的部分」，需要這個 hook 才做得到不集中 dispatch）；advance() 內部 clone 用 S4 的 `cloneGameState()` 而非 DESIGN §4.3 範例裡的 `structuredClone`（engine 無 DOM lib 型別，原因同 S4 交接筆記）；`SystemRegistry.allFacadeFields()` 把靜態 `listFacadeFields()` 與各 system 的 `facadeFields()` 合併，但 S5 的 zod schema 目前仍只吃靜態清單——S7+ 真的新增 system 貢獻欄位時需要回頭把 schema 接上動態清單；Sim 額外提供 `subscribe()`（非 DESIGN 明文要求，但直接對應 §10.1 "useSyncExternalStore" 的訂閱需求，S16 會用到） |
| S7 | 世界產生器與時代系統 | [ ] | |
| S8 | 三種資本與職涯圖 | [ ] | |
| S9 | 機會系統與持倉考驗 | [ ] | |
| S10 | 事件系統與特性計數器 | [ ] | |
| **S11** | **無頭 runner ▸ 里程碑：引擎完成** | [ ] | |
| S12 | Tailwind 與三層 design token | [ ] | |
| S13 | Director 與 WAAPI 演出 | [ ] | |
| S14 | AssetResolver 與 fallback 舞台 | [ ] | |
| S15 | 音效抽象層 playSound() | [ ] | |
| **S16** | **UI 組裝 ▸ 里程碑：可玩** | [ ] | |
| S17 | 存檔、重播、種子分享 | [ ] | |
| S18 | 內容包匯入匯出 | [ ] | |
| **S19** | **tw-history 與內容擴充 ▸ 里程碑：第一版** | [ ] | |

---

# Phase 0 · 地基

## S1 · Workspace 地基與強制機制

**目標**：把 §3.1 的分層紀律變成物理牆，並讓 lint／test／build 三條命令能跑。

**依據**：`DESIGN.md` §3、§3.1、§5.3、§10.1、§10.2

**前置**：無。現況是單一 Vite scaffold（`src/App.tsx` 等），需重組。

**產出**：
- `pnpm-workspace.yaml`、`turbo.json`、根 `package.json`（scripts: build/test/lint/typecheck）
- `packages/engine/`：`package.json`（dependencies **只有 zod**，**不得有 react**）、
  `tsconfig.json`、`src/index.ts`、空的 `src/{domain,content,sim}/` 目錄
- `apps/web/`：搬入現有 Vite scaffold，`package.json` 依賴 `@stock-life/engine`（workspace 協定）
- ESLint：§5.3 的四條禁令（`Math.random`／`Date.now`／`new Date()`／往上 import／
  直接碰 `window`/`document`/`localStorage`），**只套用於 `packages/engine`**
- Vitest 兩個 project：`engine`（node 環境）、`web`（browser/jsdom）
- `packages/engine/src/__tests__/boundary.test.ts`：驗證 engine 匯出不含任何 DOM 依賴

**完成判準**：
- `pnpm install && pnpm build && pnpm test && pnpm lint && pnpm typecheck` 全綠
- 在 `packages/engine` 內寫 `import React from 'react'` 會**失敗**（不是警告）
- 在 `packages/engine` 內寫 `Math.random()` 會被 lint 擋下
- `apps/web` 的 dev server 起得來，畫面隨便顯示什麼都可以

**本步驟不做**：任何遊戲邏輯、任何 Tailwind 設定、任何 UI 設計。

<details><summary>起始指令</summary>

```
讀 DESIGN.md 的 §3、§3.1、§5.3、§10.1、§10.2，以及 PLAN.md 的 S1。
執行 S1：把現有的單一 Vite scaffold 重組成 pnpm workspace + Turborepo，
建立 packages/engine 與 apps/web，並把 §5.3 的紀律做成真正會失敗的強制機制。
嚴格遵守 S1 的「本步驟不做」清單。完成後回報完成判準的實際執行結果。
```
</details>

---

# Phase 1 · 引擎核心

## S2 · SeededRng 與種子編碼

**目標**：決定論的基礎設施。這是全專案最不能事後修的一塊。

**依據**：`DESIGN.md` §5.1、§5.2、§5.4

**前置**：S1

**產出**：
- `packages/engine/src/domain/rng/SeededRng.ts`：可注入的 class，
  `stream(id)` 回傳獨立子序列（**不同 stream 互不干擾**，這是 §5.2 的重點）
- `RngStream`：`next()` / `int(a,b)` / `pick(arr)` / `chance(p)` / `normal(sd)`
- `packages/engine/src/domain/rng/shareCode.ts`：
  `encode(fingerprint, seed)` / `decode(code)`，格式見 §5.1
- `packages/engine/src/content/loader/fingerprint.ts`：由 `id@version` 清單算指紋
- Golden test：固定 seed 下各 stream 的前 20 個值快照

**完成判準**：
- 同 seed 重跑得到完全相同序列
- **新增一個 stream 不改變既有 stream 的序列**（這條測試必須存在）
- 分享碼可 round-trip，且指紋不符時 `decode` 回傳明確的錯誤物件而非丟例外

**本步驟不做**：GameState、任何遊戲規則、載入真實內容包。

<details><summary>起始指令</summary>

```
讀 DESIGN.md 的 §5.1、§5.2、§5.4，以及 PLAN.md 的 S2。
執行 S2：實作 SeededRng（含 stream 分流）、分享碼編解碼、內容指紋計算，
並寫 golden test。特別注意 §5.2 那條「新增 stream 不得讓舊種子失效」，
它必須有對應測試。嚴格遵守 S2 的「本步驟不做」清單。
```
</details>

---

## S3 · GameState、ModStateView、Calendar

**目標**：狀態的內部結構，以及對 UGC 的公開契約（兩者刻意分離）。

**依據**：`DESIGN.md` §6.1、§9、§1.1（三種資本的欄位）

**前置**：S1、S2

**產出**：
- `packages/engine/src/domain/state/GameState.ts`：**分域**的狀態
  （§11 錯誤 3：不要做成一層 60+ 欄位的扁平巨物）。至少分出
  `player` / `capitalState` / `career` / `era` / `positions` / `traits` / `counters` / `flags`
- `packages/engine/src/domain/facade/ModStateView.ts`：
  §6.1 的白名單 path 型別 + `read(state, path)` 實作 + `facadeVersion` 常數
- `packages/engine/src/domain/facade/FacadeField.ts`：欄位 metadata 型別
  （`path` / `label` / `type` / `enum?` / `range?`）——**未來編輯器的欄位來源**
- `packages/engine/src/domain/Calendar.ts`：§9 的 `granularity: 'year' | 'quarter'`

**完成判準**：
- `ModStateView.read()` 對白名單外的 path 在**型別層**就不通過
- 有一份可列舉的 `FacadeField[]`（`listFacadeFields()`），S5 的 schema 會消費它
- Calendar 切換 granularity 時，`age` / `year` / `stage` 的推導仍正確
- 測試涵蓋：改動 `GameState` 內部結構但維持 facade 對映，facade 測試仍綠

**本步驟不做**：任何 system、任何 reducer、任何內容。

<details><summary>起始指令</summary>

```
讀 DESIGN.md 的 §6.1、§9、§1.1、§11，以及 PLAN.md 的 S3。
執行 S3：定義分域的 GameState、ModStateView 白名單 facade（含可列舉的
FacadeField metadata）、以及 Calendar。重點是 §6.1 那條「mod 只能碰白名單、
內部結構可自由重構」——請寫一個測試證明重構內部不會弄壞 facade。
嚴格遵守 S3 的「本步驟不做」清單。
```
</details>

---

## S4 · Expr 求值器與 Effect 系統

**目標**：條件樹與效果——UGC 表達力的引擎端。

**依據**：`DESIGN.md` §6.2、§6.3

**前置**：S3（需要 `ModStateView`）

**產出**：
- `packages/engine/src/domain/expr/evaluate.ts`：
  運算子固定為 `all` `any` `not` `==` `!=` `>` `>=` `<` `<=` `in` `flag` `chance`
- **`chance` 必須從注入的 `RngStream` 取值**，不可自帶亂數
- **執行步數上限**（`TODO.md` #2 的邊界：防惡意內容包做出無窮觸發鏈）
- `packages/engine/src/domain/expr/effects.ts`：
  §6.3 的 `StateEffect` 與 `SceneHint` 兩個聯集型別，**嚴格分離**
- `applyStateEffect(state, effect, rng)`：純函式
- 具名效果註冊表（§11 錯誤 4）：資料只引用效果名字，不內嵌邏輯

**完成判準**：
- 條件樹求值有完整測試，含巢狀 `all`/`any`/`not`
- `chance` 在同 seed 下結果固定
- 超過步數上限時回傳明確錯誤，不掛掉
- `SceneHint` 完全不影響 state（有測試證明）

**本步驟不做**：schema 驗證、載入內容、任何 system。

<details><summary>起始指令</summary>

```
讀 DESIGN.md 的 §6.2、§6.3、§11，以及 PLAN.md 的 S4。
執行 S4：實作條件樹求值器（含 chance 走注入的 RngStream、含執行步數上限）
與 Effect 系統（StateEffect 與 SceneHint 嚴格分離、具名效果註冊表）。
嚴格遵守 S4 的「本步驟不做」清單。
```
</details>

---

## S5 · zod Schema 與內容載入器

**目標**：內容包的驗證與載入。**官方內容走跟 mod 完全一樣的管線**（dogfooding）。

**依據**：`DESIGN.md` §6.2、§6.4、§7.1–§7.5；`TODO.md` #1、#2 的邊界清單

**前置**：S3（facade 欄位）、S4（Expr 型別）

**產出**：
- `packages/engine/src/content/schema/`：zod schema，涵蓋
  `pack.json` manifest（§6.4）、Opportunity（§7.1）、Event（§7.2）、
  Career（§7.3）、Trait（§7.5）
- **列舉白名單由程式產生**：`z.enum(listFacadeFields().map(f => f.path))`，
  不得手寫第二份清單（`TODO.md` #1）
- `toJSONSchema.ts`：用 `z.toJSONSchema()` 匯出，供未來編輯器與 mod 文件消費
  （zod 4.4.3 已確認有此 API）
- `packages/engine/src/content/loader/`：
  `ContentSource` 介面 + `MemorySource` 實作（`TODO.md` #2 邊界：載入流程必須 async）
  、驗證、合併、指紋計算（接 S2）
- 驗證錯誤物件含**位置欄位**（§6.2 的 ⚠️：第一版可只填結構路徑，介面要先留位置）
- `packages/engine/src/content/packs/core-tw/`：**最小內容包**——
  3 個事件、1 個機會、2 個職涯節點、1 個特性。夠測管線就好

**完成判準**：
- `core-tw` 能被載入器成功載入並驗證通過
- 故意寫錯的內容包（未知 facade path、未知效果名、缺必填欄位）**在載入時**被拒，
  錯誤訊息可讀且指出結構路徑
- `pnpm --filter engine run schema:export` 產出 JSON Schema 檔案
- 指紋計算對同一組 pack 穩定、對不同版本不同

**本步驟不做**：大量內容（S19 才做）、編輯器 UI（`TODO.md` #1，不做）、
從 URL 或檔案載入（`TODO.md` #2，S18 才做）。

<details><summary>起始指令</summary>

```
讀 DESIGN.md 的 §6.2、§6.4、§7.1–§7.5，TODO.md 的 #1 與 #2，以及 PLAN.md 的 S5。
執行 S5：用 zod 4 寫內容 schema（列舉白名單必須從 listFacadeFields() 程式產生，
不得手寫第二份）、匯出 JSON Schema、實作 async 的 ContentSource/loader，
並寫一個最小的 core-tw 內容包（3 事件 / 1 機會 / 2 職涯節點 / 1 特性）。
嚴格遵守 S5 的「本步驟不做」清單——特別是不要寫大量內容。
```
</details>

---

## S6 · GameSystem 註冊表與 turn 排程

**目標**：把前面的零件接成「能推進一個回合」的引擎外殼。

**依據**：`DESIGN.md` §4、**§4.1、§4.2、§4.3**、§8、§9

**前置**：S2–S5

> ⚠️ **這不是 Redux。** 讀 §4.1 的對照表。不要做單一巨型 `switch`、
> 不要引入 immer、不要做 undo/redo。

**產出**：
- `packages/engine/src/domain/systems/GameSystem.ts`：§8 的介面
  （`id` / `order` / `onPhase` / `facadeFields`）
- `SystemRegistry`：依 `order` 排序，`ctx` 提供 `state`、`rng.stream(system.id)`、`emit()`。
  **command 由各 system 處理自己關心的部分**（§4.1），不集中在一個 dispatcher
- `packages/engine/src/domain/turn/advance.ts`：
  `advance(state, command, rng) => { nextState, effects: Effect[] }`
  ——**純函式、同步、一次算完**。內部用 §4.3 的 clone-then-mutate
- `packages/engine/src/domain/turn/Command.ts`：§4.2 的 command 聯集型別。
  **玩家決策級**，UI 互動不進 log
- `packages/engine/src/sim/Sim.ts`：持有狀態、`dispatch(command)`、
  維護 `commandLog`、對外發布 `{ state, version, effects }`
- Phase 定義：`turn.start` / `pre` / `mid` / `end` / `turn.end`

**完成判準**：
- 可以 `dispatch` 一個「推進一回合」的 command，得到 `nextState` 與 `effects[]`
- `advance()` 是純函式（同輸入同輸出，有測試）
- **`advance()` 絕不 mutate 傳入的 `state`**（§4.3 紀律：傳入前後深度比較的測試）
- 每個 system 拿到的是**自己的** rng stream（有測試）
- `commandLog` 完整記錄，且用同 `seed + log` 重播得到相同 `nextState`（golden test）
- 沒有 undo/redo API，也沒有巨型 switch

**本步驟不做**：具體遊戲規則系統（S7–S10）、任何呈現。

<details><summary>起始指令</summary>

```
讀 DESIGN.md 的 §4、§4.1、§4.2、§4.3、§8、§9，以及 PLAN.md 的 S6。
執行 S6：實作 GameSystem 介面與註冊表、純函式 advance()、Command 型別、
以及 Sim 外殼（持有狀態、dispatch、commandLog）。

特別注意 §4.1：這不是 Redux——不要做巨型 switch（command 交給各 system 處理）、
不要引入 immer（用 §4.3 的 clone-then-mutate）、不要做 undo/redo。
Command 顆粒度是玩家決策級（§4.2），UI 互動不進 log。

必寫測試：advance() 不 mutate 傳入的 state；同 seed + 同 commandLog 重播
得到相同狀態。嚴格遵守 S6 的「本步驟不做」清單。
```
</details>

---

# Phase 2 · 遊戲規則

## S7 · 世界產生器與時代系統

**目標**：時代這張舞台。先做 `random`（`tw-history` 留到 S19）。

**依據**：`DESIGN.md` §7.4、§2（兩種世界並存）

**前置**：S6

**產出**：
- `packages/engine/src/domain/systems/world/WorldGenerator.ts`：§7.4 介面 + 註冊表
- `RandomWorldGenerator`：程序生成 `Timeline`，
  節奏約「8–12 年一次大崩、5–8 年一波主題」
- `EraSystem`：把 `Timeline` 推進成當前 `era.phase` 與 `era.themes`，
  並曝露為 facade 欄位

**完成判準**：
- 同 seed 產生同一條 Timeline
- Timeline 的崩盤與主題波間隔落在設計區間內（統計測試，跑多個 seed）
- `era.phase` / `era.themes` 出現在 `ModStateView` 白名單且可被條件樹讀取

**本步驟不做**：`tw-history`（S19）、真實公司名稱、任何機會判定。

<details><summary>起始指令</summary>

```
讀 DESIGN.md 的 §7.4、§2，以及 PLAN.md 的 S7。
執行 S7：實作 WorldGenerator 介面與註冊表、RandomWorldGenerator、EraSystem，
並讓 era.phase / era.themes 進入 facade 白名單。
嚴格遵守 S7 的「本步驟不做」清單——tw-history 留到 S19。
```
</details>

---

## S8 · 三種資本與職涯圖

**目標**：本金／認知／人脈，以及推動本金的職涯。

**依據**：`DESIGN.md` §1.1、§7.3、§2（職業先走事件驅動）；`TODO.md` #3 的邊界

**前置**：S7

**產出**：
- `CapitalSystem`：本金、收入、儲蓄率、負債
- `CognitionSystem`、`NetworkSystem`：§1.1 的另兩種資本
- `CareerSystem`：§7.3 的**有向圖**（節點=職位、邊=轉換+條件+`surfacedAs`）。
  第一版只實作 `surfacedAs: "opportunity"`（系統在符合條件時提案）
- 季初擲骰配點機制（§2 核心迴圈：骰點分配到能力）

**完成判準**：
- 職涯是圖結構而非線性陣列（`TODO.md` #3 邊界）
- 三種資本都出現在 facade 白名單
- 擲骰配點在同 seed 下可重現
- 一個角色能從起始節點沿邊推進到第二個職位

**本步驟不做**：主動職涯規劃 UI（`TODO.md` #3，不做）、機會系統（S9）。

<details><summary>起始指令</summary>

```
讀 DESIGN.md 的 §1.1、§7.3、§2，TODO.md 的 #3，以及 PLAN.md 的 S8。
執行 S8：實作三種資本的 system 與職涯圖 system（有向圖，第一版只用
surfacedAs: "opportunity"），以及季初擲骰配點。
嚴格遵守 S8 的「本步驟不做」清單。
```
</details>

---

## S9 · 機會系統與持倉考驗

**目標**：本遊戲的核心物件。§1 的公式在這裡兌現。

**依據**：`DESIGN.md` §1（含 §1.1、§1.2、§1.3）、§7.1、§2

**前置**：S8

**產出**：
- `OpportunitySystem`：依 `window` / `require` / `sourcedBy` 篩選並提案
- **`truth` 對玩家不可見**，倍數與年限由 seed + 時代決定（§7.1）
- **`signal` 分層**（§1.2）：依 `cognition` / `network` 決定玩家看到哪一版描述
  與 `reveal` 哪些欄位；三版選填，缺的層級 fallback 到已填的那版
- **四檔倉位**（§1.3）：`light` / `normal` / `heavy` / `leveraged`。
  `leveraged` 賠掉會產生負債並解鎖家庭/健康負面事件鏈
- `PositionSystem`：`tier: "life"` 進入逐年 `trials` 考驗；`normal` 一次結算。
  **`tier` 讀資料欄位，不得硬編碼**
- 考驗事件庫（`drawdown_50` / `triple_temptation` / `family_emergency`）走一般事件管線

**完成判準**：
- 同一個機會、不同 `cognition`，玩家看到不同 `signal`（有測試）
- `truth` 從未出現在任何送給呈現層的資料裡（有測試）
- `tier: "life"` 的機會會產生持倉並在後續回合觸發考驗
- `leveraged` 失敗會產生負債
- 全部在同 seed 下可重現

**本步驟不做**：特性解鎖（S10）、任何演出。

<details><summary>起始指令</summary>

```
讀 DESIGN.md 的 §1、§7.1、§2，以及 PLAN.md 的 S9。
執行 S9：實作機會系統（signal 依認知/人脈分層、truth 對玩家不可見、四檔倉位）
與持倉考驗系統（tier 讀資料欄位不得硬編碼）。
必寫測試：truth 絕不外洩到呈現層；同機會不同認知看到不同描述。
嚴格遵守 S9 的「本步驟不做」清單。
```
</details>

---

## S10 · 事件系統與特性計數器

**目標**：日常事件，以及「系統看見你的打法」的機制。

**依據**：`DESIGN.md` §7.2、§7.5

**前置**：S9

**產出**：
- `EventSystem`：§7.2 的三檔風險結構（`safe` / `normal` / `bold`），
  成功率與顯示**同源**（yakyulife 這個「所見即所得」的細節值得照抄）
- `CounterSystem`：`counter.*` 為一等公民，各 system 透過 effect 累加，
  整批曝露在 facade 白名單（§7.5）
- `TraitSystem`：§7.5 的門檻檢查。**`checkOn` 是資料驅動的**
  （`turn.end` / `position.close` / `event.resolve`），不硬編碼在流程裡
- `exclude` 互斥 + `removed[]`（結算畫刪除線用）
- 在 `core-tw` 補幾個投資人格特性作為示範（鑽石手、韭菜、槓桿賭徒）

**完成判準**：
- 三檔風險的顯示機率與實際擲骰同源（有測試）
- 計數器可被 mod 的條件樹讀取（有測試：用一個外部特性資料解鎖）
- 特性互斥生效，被覆蓋的進 `removed[]`
- `checkOn` 換成不同時機不需改引擎程式碼

**本步驟不做**：大量事件內容（S19）、演出。

<details><summary>起始指令</summary>

```
讀 DESIGN.md 的 §7.2、§7.5，以及 PLAN.md 的 S10。
執行 S10：實作事件系統（三檔風險、顯示與擲骰同源）、計數器系統
（counter.* 為一等公民且進 facade 白名單）、特性系統（checkOn 資料驅動、
exclude 互斥、removed 記錄）。在 core-tw 補 3 個示範投資人格。
嚴格遵守 S10 的「本步驟不做」清單。
```
</details>

---

## S11 · 無頭 runner ▸ 里程碑：引擎完成

**目標**：證明引擎完全不需要瀏覽器就能跑完整局人生。這是 §3.1 紀律的最終驗收。

**依據**：`DESIGN.md` §4、§5.4；`TODO.md` #8

**前置**：S10

**產出**：
- `packages/engine/src/sim/headless.ts`：`runLife(seed, packs, policy)` →
  完整 `commandLog` + 結算摘要。`policy` 是自動決策函式（模擬玩家）
- `turbo` task `test:balance`：跑 N 局並輸出分布
  （最終資產分布、各結局占比、各特性解鎖率、機會接受率）
- 完整一局的 golden test：`seed + fingerprint + commandLog` → 結算摘要快照

**完成判準**：
- `pnpm --filter engine run balance -- --runs 10000` 在 node 裡跑完，**不 import 任何 DOM**
- 完整一局的 golden test 綠燈
- 分布報表能看出明顯的平衡問題（例如：所有人都破產／所有人都財務自由）

**本步驟不做**：實際調平衡數值（內容不足，S19 再調）、任何 UI。

<details><summary>起始指令</summary>

```
讀 DESIGN.md 的 §4、§5.4、§3.1，TODO.md 的 #8，以及 PLAN.md 的 S11。
執行 S11：實作無頭 runner 與批次平衡跑分 task，並加上「完整一局」的 golden test。
這是 §3.1 分層紀律的最終驗收——請確認整條路徑不 import 任何 DOM/React。
嚴格遵守 S11 的「本步驟不做」清單。
```
</details>

---

# Phase 3 · 呈現層

## S12 · Tailwind 與三層 design token

**目標**：`packages/tokens` 的 DTCG → style-dictionary → Tailwind v4 pipeline。
**核心紀律：只有 `at` + `ct` 進 `@theme`，`gt` 不生成 utility。**

**依據**：`DESIGN.md` §10.3、§10.5、**§10.6**；`TODO.md` #9

**前置**：S1（不需等引擎）

> 📖 **架構參考**：`/Users/morrischen/code_base/pcsc/f2e-uniopen/packages/tailwind-config`
> 與 `apps/uniopen-www/src/app/globals.css`。**先讀 `DESIGN.md §10.6` 的差異表**——
> 那份參考是 Tailwind v3，且有五處刻意不照抄。承襲它的 pipeline 形狀，
> 不要承襲它的 `fontSize` 手寫、gt 全暴露、字串後處理三個問題。

**產出**：
- `packages/tokens/`：獨立 package，devDep 只有 `style-dictionary`
  - `src/color.tokens.json`、`src/typography.tokens.json` — DTCG 格式（`$type`/`$value`），
    層級用 nesting 表達；複合詞用 `_`（`button_filled`）。
    **key 絕對不能含 `-`**（`-` 恆為層級分隔符，含 `-` 的 key 會讓命名失去可逆性）
  - `build.ts`：**一次 build，兩個 custom format**，都消費同一份 token AST。
    命名不需要任何 custom name transform——style-dictionary 預設就用 `-` 串接
    nesting、`_` 原樣保留（§10.3）：
    - `tokens.css` → `:root { --gt-* --at-* --ct-* }`（全部三層）
    - `theme.css` → `@theme { --color-at-* --color-ct-* --text-* }`（**prefix filter 掉 gt**）
    - `keys.ts` → 匯出已暴露的 key 清單，給 `cn()` 用
  - 生成檔全部標記 `Do not edit directly`
  - **驗證**：build 時檢查所有 token key 皆不含 `-`，違反就讓 build 失敗
- `apps/web/src/styles/globals.css`：三行 `@import`（tailwindcss / tokens.css / theme.css）
- `apps/web/src/styles/cn.ts`：`clsx` + `extendTailwindMerge`，
  color 與 font-size classGroups 從 `@stock-life/tokens/keys` 讀（§10.3 ⭐）
- 至少兩個主題（`default`、`scoreboard`），**切換只覆寫 `--at-*`**
- Typography：semantic type roles（`display`/`title`/`body`/`caption`/`numeric`），
  每個 role 綁 size + lineHeight + weight；body 行高 1.7–1.8；
  `numeric` 含 `tabular-nums`（§10.5）
- 字體：先採系統字體 stack，並在 `TODO.md` #9 記錄結論
- Turborepo：`tokens#build` 為 `web#build` 的依賴

**完成判準**：
- `pnpm --filter tokens build` 產出三個檔案，且重跑結果一致（deterministic）
- 含 `-` 的 token key 會讓 build 失敗（故意加一個測試看它擋不擋）
- `bg-at-surface-raised`、`text-at-loss` 這類 alias utility 可用
- **`bg-gt-green-500` 這類原色 utility 不存在**（要有實際驗證，不是口頭確認）
- **含 `_` 的 class 實測可用**（如 `bg-ct-stage-actor_shadow`）——確認 Tailwind
  沒有把 `_` 轉成空白（§10.3 最後一段）
- **alpha 修飾符可用**：`bg-at-loss/20` 正確產生半透明
- 切 `data-theme` 整頁換色，且 `--gt-*` 未被任何主題修改
- `cn('text-at-text-primary', 'text-at-text-muted')` **只留後者**
  （驗證 tailwind-merge 擴充真的生效——漏掉這步會靜默壞掉）
- 一個示範頁展示所有 type role、所有 alias 色、主題切換

**本步驟不做**：真正的遊戲畫面（S16）、director（S13）、
大批 `ct` token（§10.6 ⑤：`ct` 只在 S14 需要時才長出來）。

<details><summary>起始指令</summary>

```
讀 DESIGN.md 的 §10.3、§10.5、§10.6，TODO.md 的 #9，以及 PLAN.md 的 S12。

架構參考（先讀，再讀 §10.6 的差異表）：
  /Users/morrischen/code_base/pcsc/f2e-uniopen/packages/tailwind-config
  /Users/morrischen/code_base/pcsc/f2e-uniopen/apps/uniopen-www/src/app/globals.css
那是 Tailwind v3，我們是 v4；且有五處刻意不照抄，全列在 §10.6。

執行 S12：建立 packages/tokens（DTCG token JSON → style-dictionary →
tokens.css + theme.css + keys.ts，一次 build 兩個 custom format 消費同一份 AST，
不要做 CSS 字串後處理），以及 apps/web 的 globals.css 與 cn()。

命名規則：`-` 是層級分隔符，`_` 是同層級內的複合詞分隔符
（`ct-button_filled-main-default`）。token key 不得含 `-`，build 要擋。
因為這個規則，命名不需要任何 custom name transform——別去寫參考專案那種
CSS 字串後處理腳本。

四條核心紀律：
1. 只有 at + ct 進 @theme——請實際驗證 bg-gt-green-500 不存在
2. typography 也走 token pipeline，不手寫在樣式檔裡（理由見 §10.5 的腐化證據）
3. cn() 的 tailwind-merge 擴充要有測試證明去重生效（漏掉會靜默壞掉）
4. 含 `_` 的 class 與 `/20` alpha 修飾符都要實測，不要假設

嚴格遵守 S12 的「本步驟不做」清單。
```
</details>

---

## S13 · Director 與 WAAPI 演出

**目標**：把 `effects[]` 編譯成可控速、可跳過、可重播的演出。

**依據**：`DESIGN.md` §4、§10.4、§6.3；`TODO.md` #5 的邊界

**前置**：S6（需要 `effects[]` 的形狀）、S12

**產出**：
- `apps/web/src/presentation/director/compile.ts`：`Effect[]` → `Scene[]`
  （`StateEffect` 決定數字怎麼跳，`SceneHint` 決定演出）
- `Director`：rAF 驅動的**邏輯時間軸**，
  API：`play` / `pause` / `rate(n)` / `seek(t)` / `finish()`
- 元素動態交給 WAAPI（`playbackRate` / `currentTime` / `finish()`）
- 舞台一律用 CSS 變數注入（§10.4），不用 utility class 表達動態值

**完成判準**：
- `rate(4)` 演出加速四倍，`finish()` 立刻跳到結果
- **演出長度與跳過行為完全不影響任何模擬結果**（有測試：跳過 vs 播完，
  最終 state 相同）
- 同一份 `commandLog` 可重播出同一段演出

**本步驟不做**：素材載入（S14）、音效（S15）、完整畫面（S16）。

<details><summary>起始指令</summary>

```
讀 DESIGN.md 的 §4、§10.4、§6.3，TODO.md 的 #5，以及 PLAN.md 的 S13。
執行 S13：實作 Effect[] → Scene[] 的編譯器與 Director（rAF 邏輯時間軸 +
WAAPI 元素動態，支援 play/pause/rate/seek/finish）。
必寫測試：跳過演出與播完演出的最終模擬狀態完全相同。
嚴格遵守 S13 的「本步驟不做」清單。
```
</details>

---

## S14 · AssetResolver 與 fallback 舞台

**目標**：現在沒有美術素材也能演出，日後補素材不必動任何 TypeScript。

**依據**：`DESIGN.md` §6.3、§10.4；`TODO.md` #5 的邊界清單

**前置**：S13

**產出**：
- `apps/web/src/presentation/assets/AssetResolver.ts`：
  id → 素材，**所有視覺資源只透過 id 引用，不得硬編碼路徑**
- 每種型別都有 fallback：角色→名字色塊、背景→漸層、FX→CSS 動畫
- `presentation/stage/`：全專案唯一允許手寫原生 CSS 的地方（Tier 3 component token）

**完成判準**：
- 內容包引用一個不存在的 `actor` id 時，畫面出現 fallback 色塊而**不是崩掉**
- 在 manifest 塞一張圖進去，同一份內容包立刻改用真圖，`domain/` 零改動
- `TODO.md` #5 的視覺邊界清單全部打勾

**本步驟不做**：真的畫美術、**音效（S15）**。

<details><summary>起始指令</summary>

```
讀 DESIGN.md 的 §6.3、§10.4，TODO.md 的 #5，以及 PLAN.md 的 S14。
執行 S14：實作 AssetResolver（只透過 id 引用、每型別都有 fallback）、
以及 presentation/stage 的 Tier 3 component token。
驗收重點：引用不存在的素材 id 要 fallback 而非崩潰；塞一張真圖進 manifest
就能生效且 domain 零改動。
音效不在本步驟——那是 S15，且有自己的一套問題。
完成後把 TODO.md #5 的視覺邊界清單打勾。
```
</details>

---

## S15 · 音效抽象層 playSound()

**目標**：一個 `playSound(actionId, opts?)` 當**全專案唯一的音效入口**——
互動音效與演出音效共用它。現在沒有任何音檔也能全程運作，
日後把檔案填進 manifest 就有聲音。

**依據**：`DESIGN.md` **§10.7**、§6.3；`TODO.md` #5 的音效邊界清單

**前置**：S13（需要 director 的時間軸與 `rate`/`finish` 語意）。
**不依賴 S14**——可與 S14 並行。

> 兩者共用 `pack.json` 的 `assets` 區塊（§6.4 的 `actors` / `bg` / `sfx`），
> 所以**後跑的那一步沿用前一步建立的 manifest 解析模式**，不要各造一套。

> ⚠️ **音效不是「AssetResolver 的音檔版」。** 它有三個視覺素材沒有的問題，
> 全在 §10.7：瀏覽器 autoplay 政策、加速/跳過時的行為、以及一條會**破壞決定論**
> 的陷阱。動工前把 §10.7 讀完。

**產出**：
- **`playSound(actionId, opts?)` —— 唯一入口**（`apps/web/src/presentation/audio/`）
  ```ts
  playSound(id: ActionId, opts?: { when?; bus?; priority?; dedupeMs? }): void
  ```
  - 無 `when` → 立即播、`ui` bus（按鈕、選項、過場）
  - 有 `when` → 排程播、`sfx` bus（director 的演出音效）
  - **`ui` bus 完全不受 `rate`/`finish` 影響**（§10.7：按鈕回饋音不該因快轉消失）
- **`ActionId` 是型別化 union，由 manifest 產生**。`playSound('clik')` 必須是
  **編譯期錯誤**，不是執行期靜默失敗（§10.7 的防腐措施）
- **兩個 id 來源，同一個 resolver**：
  - 互動音效 → app 靜態 manifest（`ui_click`、`ui_option_select`、`ui_transition`…），
    mod 不可覆寫
  - 演出音效 → 內容包的 `assets.sfx`（§6.4），mod 可自帶。
    未知 id 在載入時**只警告不拒載**
- `AudioBus.ts`：三條匯流排 `bgm` / `sfx` / `ui`，各一個 `GainNode`
- Web Audio API（`AudioContext` + 預先 decode 的 `AudioBuffer` + `source.start(when)`），
  **不用 `<audio>` 元素**（理由見 §10.7）
- `AudioResolver.ts`：id → `AudioBuffer`。找不到就**什麼都不做**；
  dev 模式 `console.debug('[audio] would play: …')`，production 不印
- **Unlock 流程**：首次使用者手勢 `audioContext.resume()`；
  對外曝露 `isLocked` 讓 UI 顯示提示（S16 用）
- **Leading-edge debounce**（§10.7）：立刻發聲，然後在 `dedupeMs` 內抑制
  **同 id** 的重複。**必須是 leading，不是 trailing**——trailing 會讓 click
  音遲到。`dedupeMs` 由 manifest 逐 id 設定。
  這條取代了原本「按倍率過濾」的規則，所以**不需要**寫 rate-based 篩選邏輯
- **跳過取消**：`finish()`／跳過時取消排程中的 `normal`，`high` 可存活。
  ⚠️ **這條不能用 debounce 代替**——跳過收合的是幾十個不同 id，
  per-id 去重對它們完全無效（§10.7）
- **全域併發上限 8**：超過丟最舊的 `normal`（per-id debounce 擋不住不同 id 的洪水）
- `seek()` 往回不重播；BGM 一律正常速度、不變調
- `priority` 只用於上面兩件事（併發上限、跳過存活），**不用於倍率過濾**
- manifest 同時支援獨立檔案與 audio sprite（`{ id, url, offset?, duration? }`）
- 音量／靜音狀態存 `localStorage`（`bgm` 與 `sfx` 分開）
- **would-play 匯出**：dev 模式蒐集到的 id 清單可匯出——
  **那就是你的音效需求清單**（§10.7 的副產品）
- 開發用測試頁：列出所有已註冊 id、逐一觸發、可調 rate 觀察策略差異

**完成判準**：
- **零音檔狀態下整套可運作**：跑完一局不報錯，dev console 印出所有 would-play
- 在 manifest 放一個真的音檔進去，立刻有聲音，`domain/` 與 director 零改動
- **`playSound('不存在的id')` 是編譯期錯誤**（不是執行期才靜默失敗）
- **`ui` bus 不受演出控制影響**：`rate(4)` 進行中按按鈕仍有音；
  `finish()` 之後按按鈕仍有音（這條最容易做錯——別把 ui 一起清掉）
- **模擬新訪客**（無痕視窗）：首次手勢前 `context.state === 'suspended'`、
  `isLocked === true`；手勢後 `running`，聲音正常
- `rate(4)` 時 BGM **音高不變**（明確驗證，不是聽感描述）
- **debounce 是 leading-edge**：第一次呼叫**立即**發聲（不是等窗口結束才發）
- 連續觸發**同一** id 20 次 → 受 `dedupeMs` 限制，只響少數幾次
- 同時觸發 20 個**不同** id → 受全域上限 8 限制
  （證明 per-id debounce 擋不住這種情況，需要獨立的併發上限）
- 跳過演出時**沒有音效爆發**：排程中的 `normal` 被取消而非一次倒出
- **音效的隨機變體不從 `SeededRng` 取值**——`presentation/audio/` 內不得
  import 任何 rng stream（用測試或 lint 檢查）
- 跳過 vs 播完，最終模擬狀態相同（延續 S13 的判準，音效不得影響 state）

**本步驟不做**：真的做音效素材、BGM 曲目、遊戲畫面（S16）。
UI 上的靜音按鈕**外觀**留給 S16，本步驟只提供它要呼叫的 API 與 `isLocked`。

<details><summary>起始指令</summary>

```
讀 DESIGN.md 的 §10.7（完整讀，這節是本步驟的全部依據）與 §6.3，
TODO.md 的 #5，以及 PLAN.md 的 S15。

執行 S15：實作 playSound(actionId, opts?) 作為全專案唯一的音效入口——
互動音效（按鈕、選項、過場）與 director 的演出音效共用同一個函式，
差別只在有沒有傳 when。另含 AudioBus（bgm/sfx/ui + GainNode）、
AudioResolver（缺檔就什麼都不做 + dev 印 would-play）、autoplay unlock、
以及 §10.7 表格裡的速率/跳過策略、節流、去重。

七件最容易做錯、必須實測的事：
1. ui bus 不受演出控制影響——rate(4) 進行中與 finish() 之後，按按鈕都還要有音。
   把 ui 跟排程 sfx 一起清掉是最常見的錯。
2. Autoplay：用無痕視窗驗證首次手勢前是 suspended、isLocked 為 true、手勢後恢復。
   開發時你點過畫面，所以自己測不出這個 bug。
3. debounce 要 leading-edge（立刻發聲後抑制），不是 trailing（等安靜才發）。
   trailing 會讓 click 音遲到。這條 debounce 取代了「按倍率過濾」，
   別再寫 rate-based 篩選邏輯。
4. 但 debounce 解決不了跳過——收合的是幾十個不同 id，per-id 去重無效。
   跳過取消與全域併發上限必須獨立實作。
5. rate(4) 時 BGM 音高不得改變。
6. 音效的隨機變體絕不可從 SeededRng 取值——那會讓同種子跑出不同人生。
   presentation/audio/ 內不得 import 任何 rng stream。
7. ActionId 是從 manifest 產生的型別化 union，打錯字要在編譯期就爆。

零音檔狀態下整套要能跑完一局不報錯。
嚴格遵守 S15 的「本步驟不做」清單——不要做素材，也不要做 UI 按鈕外觀。
```
</details>

---

## S16 · UI 組裝 ▸ 里程碑：可玩

**目標**：第一次真的能從頭玩到退休。

**依據**：`DESIGN.md` §4（UI 只是 director 的投影）、§10.1（狀態管理用
`useSyncExternalStore`）；`yakyulife` 首頁截圖作為版面參考

**前置**：S11、S14、S15

**產出**：
- 畫面狀態機（無 router）：標題／遊戲／結算／內容包管理
- 標題頁：姓名、起始年代、世界模式（random／history 佔位）、種子輸入、
  顯示設定（主題）。**「開始人生」按鈕同時作為 audio unlock 的手勢**（§10.7）
- 遊戲主畫面：文字流時間軸（年度可摺疊，參考 yakyulife）、資本面板、
  選項按鈕、演出舞台、跳過／速度控制
- **音效控制**：靜音／音量（bgm 與 sfx 分開），呼叫 S15 提供的 API。
  `AudioContext` 仍是 `suspended` 時顯示「點一下開啟音效」提示
- 結算畫面：人生摘要、特性清單（含 `removed[]` 刪除線）、分享碼
- UI 透過 `useSyncExternalStore` 訂閱 sim，**不得直接 import `domain/`**

**完成判準**：
- 能從標題開始，玩完一整局人生到結算
- 輸入同一組分享碼 + 同樣選擇，得到同一段人生
- UI 層對 `packages/engine` 的 import 只走公開 API（有 lint 或測試檢查）
- 無痕視窗開啟 → 按下「開始人生」後音效可用；未按之前有明確提示

**本步驟不做**：存檔（S17）、內容包匯入（S18）、大量內容（S19）。

<details><summary>起始指令</summary>

```
讀 DESIGN.md 的 §4、§10.1，PLAN.md 的 S16，並參考 yakyulife 的版面
（深色、文字流、年度摺疊）。
執行 S16：組裝畫面狀態機與三個主要畫面，UI 用 useSyncExternalStore 訂閱 sim，
並接上 S15 的音效 API（靜音/音量控制，bgm 與 sfx 分開；
「開始人生」按鈕同時作為 audio unlock 的手勢，見 DESIGN.md §10.7）。
驗收：能從標題玩到結算；同分享碼 + 同選擇得到同一段人生；
無痕視窗下按過「開始人生」後音效可用，未按之前有明確提示。
嚴格遵守 S16 的「本步驟不做」清單。
```
</details>

---

# Phase 4 · UGC 與收尾

## S17 · 存檔、重播、種子分享

**目標**：把決定論變成使用者看得到的功能。

**依據**：`DESIGN.md` §5.1；`TODO.md` #4 的邊界清單

**前置**：S16

**產出**：
- 存檔存的是 `seed + contentFingerprint + commandLog`，**不是狀態快照**
  （`TODO.md` #4 邊界：這樣格式演進時舊存檔仍可重播）
- `schemaVersion` + migration 掛勾
- 分享碼 URL（`?s=<code>`），指紋不符時顯示「此種子需要 XXX v1.2」
- 重播模式：載入 log 並用 director 播出來

**完成判準**：
- 關掉瀏覽器再回來能續玩
- 貼上別人的分享碼能得到相同人生
- 內容包版本不符時給出**明確可行動**的錯誤訊息，而不是靜默跑錯
- `TODO.md` #4 的邊界清單全部打勾

**本步驟不做**：雲端存檔、任何後端。

<details><summary>起始指令</summary>

```
讀 DESIGN.md 的 §5.1，TODO.md 的 #4，以及 PLAN.md 的 S17。
執行 S17：實作存檔（存 seed + fingerprint + commandLog，不存狀態快照）、
schemaVersion 與 migration 掛勾、分享碼 URL、重播模式。
指紋不符時必須給明確可行動的錯誤訊息。完成後把 TODO.md #4 的邊界清單打勾。
```
</details>

---

## S18 · 內容包匯入匯出

**目標**：UGC 的第一版流通管道。純前端。

**依據**：`DESIGN.md` §6.4；`TODO.md` #2 的邊界清單

**前置**：S17

**產出**：
- `FileSource`、`PasteSource`（`MemorySource` 已在 S5）——
  **新增來源是新增實作，不改呼叫端**（`TODO.md` #2 邊界）
- 內容包管理畫面：已載入清單、啟用／停用、匯入、匯出、驗證錯誤顯示
- `localStorage` 保存已載入的包
- 匯出官方 JSON Schema 供 mod 作者參考（S5 已產出，這裡提供下載入口）

**完成判準**：
- 匯入一個第三方內容包後，其事件/機會/特性真的會出現在遊戲裡
- 匯入格式錯誤的包時，顯示可讀錯誤且**不破壞既有狀態**
- 載入內容包後，分享碼的指紋隨之改變
- `TODO.md` #2 的邊界清單全部打勾（含 async 載入、執行步數上限）

**本步驟不做**：市集、後端、帳號、審核（`TODO.md` #2，不做）。

<details><summary>起始指令</summary>

```
讀 DESIGN.md 的 §6.4，TODO.md 的 #2，以及 PLAN.md 的 S18。
執行 S18：實作 FileSource / PasteSource（新增來源不得改呼叫端）、
內容包管理畫面、localStorage 保存。
驗收：匯入第三方包後其內容真的進遊戲；載入後分享碼指紋改變。
完成後把 TODO.md #2 的邊界清單打勾。絕不做後端或市集。
```
</details>

---

## S19 · tw-history 與內容擴充 ▸ 里程碑：第一版

**目標**：把管線填滿到真的好玩，並用 S11 的跑分器調平衡。

**依據**：`DESIGN.md` §7.4、§2（暗示但不指名）、§1；`TODO.md` #8

**前置**：S18

**產出**：
- `TwHistoryWorldGenerator`：1990 台股萬點 → 2000 網路泡沫 → 2008 海嘯 →
  2020 疫情 → 2025 AI
- 標的一律「**暗示但不指名**」（護國神山、某記憶體大廠、某手機代工龍頭）——§2
- 內容量拉到可玩水準：80–150 事件、20+ 機會、完整職涯圖、25+ 特性
- 機會的 `signal` 三版盡量寫滿（官方內容當作 mod 作者的示範）
- 用 `test:balance` 跑一萬局調權重與數值

**完成判準**：
- 兩種世界模式都能玩完整局
- 平衡報表：最終資產分布不極端、主要結局都有人達到、特性解鎖率合理
- 一局 10–20 分鐘（§2 短局目標）
- 重玩三局不會覺得事件重複到出戲

**本步驟不做**：長局模式（`TODO.md` #4）、編輯器（#1）、市集（#2）、
新資產類別（#6）、多語言（#7）。

<details><summary>起始指令</summary>

```
讀 DESIGN.md 的 §7.4、§2、§1，TODO.md 的 #8，以及 PLAN.md 的 S19。
執行 S19：實作 TwHistoryWorldGenerator（標的一律暗示但不指名）、
把內容量拉到 80–150 事件 / 20+ 機會 / 25+ 特性、並用 test:balance
跑一萬局調平衡。目標是一局 10–20 分鐘、重玩三局不出戲。
嚴格遵守 S19 的「本步驟不做」清單。
```
</details>

---

## 依賴關係

```
引擎線   S1 ─► S2 ─► S3 ─► S4 ─► S5 ─► S6 ─► S7 ─► S8 ─► S9 ─► S10 ─► S11 ─┐
          │                                                               │
呈現線    └─► S12 ─► S13 ─┬─► S14 ─┐                                        │
                          └─► S15 ─┤                                        │
                                   ▼                                        ▼
                                 S16 ◄──────────────────────────────────────┘
                                   │
                                   ▼
                                 S17 ─► S18 ─► S19
```

**兩條可並行的分叉**：

- **S12 只依賴 S1**，所以整條呈現線可以與 S2–S11 的引擎線並行開兩個 session。
- **S14 與 S15 都只依賴 S13**，彼此獨立（一個管視覺素材、一個管音效），
  也可以並行。

其餘請照順序，因為每一步都在為下一步提供已驗證的保證。
S16 是兩條線的匯流點——它需要引擎能跑完一局（S11）、需要舞台（S14）、
也需要音效 API（S15）。

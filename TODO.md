# TODO · 刻意延後的項目

這份文件記錄**已經決定要做、但刻意不在第一版做**的東西。
每一項都附「現在必須先做到的邊界」——如果那個邊界沒做到，日後就得重寫引擎。

參見 `DESIGN.md`。

---

## 1. 填空式內容編輯器（UGC Editor）

**狀態**：**已建**，在 `apps/cms`（見 DESIGN.md §6.5）。下面的邊界條件全部到位；
還沒做的是 §6.5.4 那幾件「編輯器救不了、引擎要先補」的事，以及 §6.5.5 那條
選項形狀的分岔——那兩節才是接下來的工作清單。

**目標**：玩家在網頁上用表單填空，產出合法的內容包，不需要碰 JSON。

**現在必須先做到的邊界**：

- [x] 每個內容欄位都有 JSON Schema，含 `title`、`description`、列舉值、範圍
- [x] 列舉值與白名單**由程式產生**（來自 `ModStateView` 與各 `GameSystem.facadeFields()`），
      不得手寫第二份清單 —— `editor/fields.ts` 直接吃 `listFacadeFields()`
- [x] 官方內容包 `core-tw` 走**跟 mod 完全相同**的載入器與驗證器（dogfooding）
      —— 編輯器的「驗收」鈕跑的就是 `loadContentPack()`
- [x] 驗證錯誤訊息可讀且指出位置，能直接餵給未來編輯器的表單提示
      —— `editor/validate.ts` 把 zod 的結構路徑對映回表單欄位
- [x] 條件樹是純資料（可雙向轉換：JSON ↔ 表單狀態），不含任何無法用表單表達的語法
      —— `editor/expr.ts`；表單表達不出來的節點保留成唯讀的一列，不會被吃掉

**已做**：表單渲染、單事件預覽、統計試跑（`probeEvents()`）、流程圖、匯入匯出。
**還沒做**：範例模板庫。

**風險提醒**：自己造內容時如果覺得格式難用，mod 作者一定用不下去。
第一版手寫 `core-tw` 內容的過程就是格式的可用性測試——覺得痛就改格式，別忍。

---

## 2. 內容包市集（需後端）

**狀態**：延後。第一版純前端。

**第一版做到**：匯入／匯出檔案、貼上內容、`localStorage` 保存已載入的包。

**現在必須先做到的邊界**：

- [x] `ContentSource` 介面抽象化，第一版只有 `FileSource` 與 `PasteSource` 兩個實作；
      日後 `UrlSource`、`RegistrySource` 是新增實作，不改呼叫端
      → S5 開介面、S18 補兩個實作。匯入的唯一入口 `PackLibrary.install(source)`
      只認 `ContentSource`，檔案與貼上共用同一行呼叫（有測試）；`FileSource` 用
      **結構型別** `{ name, text() }`，所以引擎連 `File` 這個字都不用提（§5.3）
- [x] 載入流程是 **async** 的（即使第一版同步就能完成），否則接遠端來源要改一整條鏈
      → S5 交付；S18 另補：來源丟例外（壞 JSON、讀不到檔）會變成 `section: 'source'`
      的驗證錯誤，不會炸掉呼叫端
- [x] 內容包有穩定 id + semver，且**種子分享碼已含內容指紋**（見 `DESIGN.md` §5.1）
      → 指紋 S2/S5 就有；S18 把 manifest 的 `id`/`version` 收緊成「小寫英數 id」與
      「真的 semver」——它們是指紋的輸入，`v2` 與 `2.0.0` 不可以是同一個東西
- [x] 驗證器把「格式合法」與「內容可信」分開：前者現在做，後者（惡意內容、
      超大檔、遞迴觸發）留掛勾
      → `content/loader/trust.ts`：`checkTrust()` 與 schema 驗證是**兩個回傳值**，
      錯誤 section 也分開（`trust` vs 各內容區塊）。第一版只畫最便宜的線
      （各區塊數量上限、檔案大小上限），但市集要加的檢查有一個具名的地方可去
- [x] 條件樹求值器有**執行步數上限**，防止惡意內容包做出無窮觸發鏈
      → S4 交付（`DEFAULT_EXPR_STEP_LIMIT`，超過回傳錯誤物件而不是掛掉）

**做市集時才需要的**：帳號、上傳、審核、評分、濾童、CDN、濫用處理。

---

## 3. 完整職涯樹（太閤立志傳式主動規劃）

**狀態**：延後。第一版走事件驅動（系統主動提案）。

**現在必須先做到的邊界**：

- [x] 職涯已建模成**有向圖**（節點=職位、邊=轉換 + 條件），不是一條線性陣列
      → S8 交付介面、S19 把它長成 29 個節點 / 42 條邊的完整圖（含「起點走得到
      每一個節點」的測試）
- [x] 邊上有 `surfacedAs` 欄位，第一版只用 `"opportunity"`（系統提案），
      日後加 `"browsable"`（玩家主動規劃）
- [x] 圖的資料與呈現完全分離：加主動規劃只是新增一個讀圖的 UI
      → `CareerSystem` 只讀圖並產生 Offer；圖本身沒有任何呈現欄位

---

## 4. 長局模式（40–90 分鐘、有存檔續玩）

**狀態**：延後。第一版短局（一年一回合，18→65 歲）。

**現在必須先做到的邊界**：

- [x] `Calendar` 服務把回合與時間解耦（`granularity: 'year' | 'quarter'`）
      → S3 交付。`turnsPerYear` 由 granularity 決定，`age`/`year`/`stage` 都由它換算
- [x] **所有內容條件寫 `age` / `year` / `stage`，永不寫 `turnIndex`**
      → 做成**結構上不可能**：`turnIndex` 根本不在 facade 白名單裡，所以條件樹
      寫不出來（`FacadeField.test.ts` 有一條測試擋著任何含 turn 的路徑）
- [x] 存檔格式帶 `schemaVersion` 與 migration 掛勾
      → S17 交付。`sim/save.ts` 的 `SAVE_SCHEMA_VERSION` + `SAVE_MIGRATIONS`
      （`fromVersion → migration`，`migrateSave()` 一版一版往前推；v1 當然是空的，
      掛勾存在的意義是「出 v2 時只加一筆，舊存檔照樣讀」，已有測試驅動假的 v1→v3）
- [x] 存檔存的是 `seed + contentFingerprint + commandLog`，不是狀態快照
      （這樣格式演進時舊存檔仍可重播）
      → S17 交付。有測試掃存檔字串，確認 `capitalState`／`counters`／`positions`
      這些內部欄位名一個都不在裡面；`restoreLife()` 重播回同一份 summary

---

## 5. 美術與音效素材

**狀態**：**素材**本身延後（第一版全靠 fallback）。
但承載素材的兩套基礎設施**不延後**——已排入 `PLAN.md` S14（視覺）與 **S15（音效）**。

### 5a · 視覺邊界（S14 交付）

- [x] `AssetResolver` 存在，所有視覺資源**只透過 id 引用**，不得硬編碼路徑
      → S14 交付。路徑只能來自內容包 manifest 的 `assets` 區塊，且有一個測試
      掃 `presentation/` 的原始碼擋掉檔名字面量與寫死的 `url()`
- [x] 每種型別都有 fallback：角色→名字色塊、背景→漸層、FX→CSS 動畫
      → fallback 的變化（色相、選哪個動畫）由 **id 的雜湊**決定，不碰 `SeededRng`
- [x] `SceneHint` 與 `StateEffect` 已分離（`DESIGN.md` §6.3）；補素材不需動 `domain/`
      → 測試證明：同一份 `core-tw`，manifest 空的時候全部 fallback，
      塞一張圖進去就改用真圖，`domain/` 零改動
- [x] director 支援 skip / 速度倍率，且**演出長度不影響模擬結果**
      → S13 交付。`play/pause/rate/seek/finish`，並用真的跑完一局
      （跳過 vs 播完 vs 完全不演）比對最終 state 相同

> 💡 **美術需求清單是算出來的，不是手寫的。** scene id 就近寫在事件旁邊（§6.3），
> 所以沒有任何一個檔案「列出全部背景」——`pnpm --filter engine run assets` 就是那份
> 清單：每個 bg／actor／sfx／fx id 被幾筆內容用到、誰用它、manifest 給檔案了沒。
> `--manifest` 直接吐出可貼進 `manifest.assets` 的骨架，填檔名就有圖。
> 這跟 5b 的 would-play 是同一招，差別只在視覺這邊**不必先玩過一輪**——
> 靜態掃內容就數得完，玩一輪反而只會走到抽得到的那些。
>
> 要畫什麼、檔名叫什麼、prompt 是什麼，都在根目錄的 **`ART.md`**（產生的，別手改）：
> `pnpm --filter engine run art [-- --style <id>]`。題材在 `scripts/art/subjects.ts`、
> 畫風在 `scripts/art/styles.ts`——**畫風是一個變數**，換一次七十一條 prompt 一起換，
> 不然同一批圖永遠對不齊。內容新增背景而 subject 沒補，那支會失敗並指名，清單不會默默過期。

### 5b · 音效邊界（S15 交付，依據 `DESIGN.md` §10.7）

音效**不是「AssetResolver 的音檔版」**，它有三個視覺素材沒有的問題：

- [x] **`playSound(actionId, opts?)` 是全專案唯一入口**——互動音效（click、
      option selected、過場）與 director 的演出音效共用它，差別只在有沒有 `when`
- [x] **`ui` bus 不受 `rate`/`finish` 影響**（按鈕回饋音不該因快轉或跳過而消失）
      → 有兩個測試：rate(4) 進行中、以及 finish() 之後按按鈕都仍有音
- [x] **`ActionId` 是從 manifest 產生的型別化 union**，打錯字在編譯期就爆
      → `UI_SOUNDS` 是型別來源；內容包的 id 是 branded type，只能經 `contentSfx()` 產生，
      所以 app 程式碼裡的 `playSound('ui_clik')` 仍然是編譯期錯誤（有 @ts-expect-error 測試）
- [x] 兩個 id 來源：互動音效在 app 靜態 manifest（mod 不可覆寫）、
      演出音效在內容包 `assets.sfx`（mod 可自帶，未知 id 只警告不拒載）
      → 內容包若定義 `ui_*` 會被 resolver 丟掉並記在 `blockedOverrides()`
- [x] 三條獨立匯流排 `bgm` / `sfx` / `ui`，各一個 `GainNode`
- [x] 用 Web Audio API（取樣級精確排程），**不用 `<audio>` 元素**
- [x] `AudioResolver`：缺素材就靜音，dev 模式印 would-play，**零音檔即可開發時序**
- [x] **Autoplay unlock 流程**：首次手勢 `resume()`；`suspended` 時 UI 有明確提示
      → `unlockAudio()` / `isAudioLocked()` 已實作，`AudioContext` 是延遲建立的，
      dev 頁會顯示「點一下開啟音效」。⚠️ **真瀏覽器（無痕視窗）的實測還沒做**——
      本開發環境沒有瀏覽器，S16 把它接到「開始人生」按鈕時要順手驗
- [x] **Leading-edge debounce**（不是 trailing）。per-id、`dedupeMs` 由 manifest 逐 id 設定
      → 測試：第一次呼叫立即發聲；同 id 連按 20 次只響 ≤3 次；
      並實測「同一段演出 1× 全響、4× 被稀釋到 <3 次」
- [x] ⚠️ **但 debounce 解決不了跳過**：跳過取消（`normal` 取消、`high` 存活）
      與全域併發上限 8 都獨立實作，且各有測試（20 個**不同** id → 同時發聲被壓在 8）
- [x] BGM 一律正常速度、不變調；`seek()` 往回不重播
      → `PlayRequest` 裡**根本沒有速率欄位**，且有測試掃 `presentation/audio/`
      禁止 `playbackRate` / `detune`
- [x] `priority` 只用於「併發上限爆掉時先丟 normal」與「跳過時讓 high 存活」，
      **不用於倍率過濾**
- [x] ⚠️ **音效的隨機變體不得從 `SeededRng` 取值**
      → 測試掃 `presentation/audio/` 禁止 `SeededRng` / `RngStream` / `rng.stream`
- [x] manifest 同時支援獨立檔案與 audio sprite（先用獨立檔案）
- [x] 缺檔就**什麼都不做**（不報錯、production 不印警告），
      dev 模式印 would-play 並可匯出清單（`engine.wouldPlay()`）

> 💡 **would-play 清單就是音效需求清單。** 不必先憑空想「我需要哪些音效」——
> 玩過一輪，程式會告訴你有哪些 action id 在等音檔。

**補素材時才需要的**：立繪、背景、SFX 音檔、BGM 曲目、
可能的 Spine／sprite sheet 播放器、audio sprite 打包。

---

## 6. 新資產類別與機制（期權、房地產、加密貨幣、稅、貸款）

**狀態**：延後。

**現在必須先做到的邊界**：

- [ ] `GameSystem` 介面存在，系統以註冊表掛入，`order` 決定結算順序
- [ ] 每個系統從 `rng.stream(system.id)` 取隨機，**不共用序列**
      （否則新增系統會讓所有舊種子失效）
- [ ] 系統可透過 `facadeFields()` 貢獻 mod 白名單欄位

---

## 7. 多語言

**狀態**：延後。第一版只有 zh-TW。

**現在必須先做到的邊界**：

- [ ] 內容包的文案集中在 `strings/<locale>.json`
- [ ] 引擎自身的 UI 字串也走同一套查表，不散落在元件裡
- [ ] **決定**：內容包的事件文字第一版直接寫 zh-TW 字面值還是走 key？
      （走 key 對 mod 作者較痛；建議：內容包內嵌文字，但引擎 UI 走 key。
      待實作時確認。）

---

## 8. 平衡調校工具

**狀態**：延後，但價值極高。

**現在必須先做到的邊界**：

- [x] `domain/` + `sim/` 可在 node 環境無頭執行（不 import `presentation/`、`ui/`）
      → S11 交付，`boundary.test.ts` 守著
- [x] 有一個 headless runner 能跑 N 局並輸出結果分布
      → `runBalance()` + `pnpm --filter engine run balance`，3000 局約 30 秒

**做工具時**：跑一萬局，檢查最終資產的分布、各結局占比、各特性解鎖率、
機會被接受率，據此調權重。這是唯一能讓數值不憑感覺的方法。

**S19 實際用它調了什麼**（每一項都是先看報表才動的數字）：

- `BASE_SOURCE_CHANCE` 0.02 → 0.004：內容從 1 個機會長到 24 個之後，抵達率
  必須跟著降，否則一輩子會遇到 12 次「一生一次的機會」
- `OUTCOME_THRESHOLDS` 2000/800/200 → 5000/2000/800：門檻是**百分位決定**，
  不是意見。S11 時 84% 的人生落在同一格，現在是 11 / 33 / 36 / 19
- 職涯圖頂端（rank 4）的條件大幅提高：原本 77% 的人生走得到，現在約三成
- 早期職涯與「自己做」那幾條邊加上 `chance`：否則所有人都走同一條路
  （第一份工作永遠是陣列裡的第一條邊），三局玩下來職涯完全一樣
- 各人格的 counter 門檻：目標是沒有任何一個人格解鎖率破五成、也沒有人格
  在任何打法下都解不開（`--risk bold` / `--risk safe` / `--sizing leveraged`
  / `--decline` 四種 policy 各自負責一批人格）
- **報表也抓到一個真 bug**：持倉考驗只 emit 了 `event.trigger` 效果，從來沒
  進過事件收件匣，所以考驗事件的文字玩家一次都沒看過（見 `enqueueEvent()`）

---

## 9. Design Token 三層 + Typographic 機制

**狀態**：**不再延後——已排入 `PLAN.md` S12**。
架構定於 `DESIGN.md` §10.3（pipeline）、§10.5（typography）、§10.6（與參考專案的差異）。
`packages/tokens` 從第一天就獨立成 package（理由見 §10.2），此項不再是待決。

**S12 必須守住的紀律**（完整判準在 `PLAN.md` S12）：

- [x] `@theme` 只收 `at` + `ct`；`gt` 留在 `:root` 但**不生成 utility**。
      這條一旦破了，三層架構就只是註解而非強制
      → `apps/web/src/styles/__tests__/tailwind.test.ts` 用真的編譯出來的 CSS 驗證
      `bg-gt-green-500` 不存在
- [x] 主題切換只覆寫 `--at-*`；任何主題都不得修改 `--gt-*`
      → 主題檔的值**只准是 `{gt.*}` 參照**，由 build 驗證（違反就 build 失敗）
- [x] typography 走同一條 token pipeline，**不手寫在樣式檔裡**（§10.5 的腐化證據）
- [x] `numeric` role 含 `font-variant-numeric: tabular-nums`
- [x] `cn()` 的 tailwind-merge 擴充有測試證明去重生效（漏掉會靜默壞掉）
- [x] 生成流程是一次 build 兩個 custom format 消費同一份 AST，
      **不是** CSS 字串後處理（§10.6 ④）→ 實際是三個 format（多一個 `keys.ts`）

**S12 動工前得拍板的兩件事** ▸ 已拍板：

- [x] **字體**：採**系統字體 stack**（0 KB）。理由就是本項原本的警告——
      UGC 內容包會帶進事前未知的字，subset 策略與 UGC 天生矛盾，而動態 subset
      需要後端。標題用 webfont 的選項留著（只需改 `gt.font.family.*` 一個 token），
      但第一版不做。
- [x] **尺寸階梯**：**模組化比例 1.25**，基準 1rem，五階
      （0.8 / 1 / 1.25 / 1.5625 / 1.953rem）。手挑各階在沒有設計師的專案裡
      會長成 §10.5 那種腐化，比例函數則不會。

**已決定，記錄理由**：

- **分隔符：`-` 為層級、`_` 為同層級內的複合詞**（不採參考專案的 `/`）。
  換到三件事：`/50` alpha 修飾符可用、`@theme` 不需 CSS 跳脫、
  以及**整個轉換層消失**（參考專案那 126 行腳本與 30+ 項複合詞白名單，
  是「同一個 `-` 既當層級又當複合詞」造成的，換成兩個字元就不存在了）。
  代價是長名稱較難掃視，明知取捨。
- 連帶約束：**token JSON 的 key 不得含 `-`**，否則命名失去機器可逆性。
  由 build 驗證，違反就失敗。

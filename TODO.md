# TODO · 刻意延後的項目

這份文件記錄**已經決定要做、但刻意不在第一版做**的東西。
每一項都附「現在必須先做到的邊界」——如果那個邊界沒做到，日後就得重寫引擎。

參見 `DESIGN.md`。

---

## 1. 填空式內容編輯器（UGC Editor）

**狀態**：延後。第一版不做。

**目標**：玩家在網頁上用表單填空，產出合法的內容包，不需要碰 JSON。

**現在必須先做到的邊界**：

- [ ] 每個內容欄位都有 JSON Schema，含 `title`、`description`、列舉值、範圍
- [ ] 列舉值與白名單**由程式產生**（來自 `ModStateView` 與各 `GameSystem.facadeFields()`），
      不得手寫第二份清單
- [ ] 官方內容包 `core-tw` 走**跟 mod 完全相同**的載入器與驗證器（dogfooding）
- [ ] 驗證錯誤訊息可讀且指出位置，能直接餵給未來編輯器的表單提示
- [ ] 條件樹是純資料（可雙向轉換：JSON ↔ 表單狀態），不含任何無法用表單表達的語法

**做編輯器時才需要的**：表單渲染、即時預覽、匯出打包、範例模板庫。

**風險提醒**：自己造內容時如果覺得格式難用，mod 作者一定用不下去。
第一版手寫 `core-tw` 內容的過程就是格式的可用性測試——覺得痛就改格式，別忍。

---

## 2. 內容包市集（需後端）

**狀態**：延後。第一版純前端。

**第一版做到**：匯入／匯出檔案、貼上內容、`localStorage` 保存已載入的包。

**現在必須先做到的邊界**：

- [ ] `ContentSource` 介面抽象化，第一版只有 `FileSource` 與 `PasteSource` 兩個實作；
      日後 `UrlSource`、`RegistrySource` 是新增實作，不改呼叫端
- [ ] 載入流程是 **async** 的（即使第一版同步就能完成），否則接遠端來源要改一整條鏈
- [ ] 內容包有穩定 id + semver，且**種子分享碼已含內容指紋**（見 `DESIGN.md` §5.1）
- [ ] 驗證器把「格式合法」與「內容可信」分開：前者現在做，後者（惡意內容、
      超大檔、遞迴觸發）留掛勾
- [ ] 條件樹求值器有**執行步數上限**，防止惡意內容包做出無窮觸發鏈

**做市集時才需要的**：帳號、上傳、審核、評分、濾童、CDN、濫用處理。

---

## 3. 完整職涯樹（太閤立志傳式主動規劃）

**狀態**：延後。第一版走事件驅動（系統主動提案）。

**現在必須先做到的邊界**：

- [ ] 職涯已建模成**有向圖**（節點=職位、邊=轉換 + 條件），不是一條線性陣列
- [ ] 邊上有 `surfacedAs` 欄位，第一版只用 `"opportunity"`（系統提案），
      日後加 `"browsable"`（玩家主動規劃）
- [ ] 圖的資料與呈現完全分離：加主動規劃只是新增一個讀圖的 UI

---

## 4. 長局模式（40–90 分鐘、有存檔續玩）

**狀態**：延後。第一版短局（一年一回合，18→65 歲）。

**現在必須先做到的邊界**：

- [ ] `Calendar` 服務把回合與時間解耦（`granularity: 'year' | 'quarter'`）
- [ ] **所有內容條件寫 `age` / `year` / `stage`，永不寫 `turnIndex`**
- [ ] 存檔格式帶 `schemaVersion` 與 migration 掛勾
- [ ] 存檔存的是 `seed + contentFingerprint + commandLog`，不是狀態快照
      （這樣格式演進時舊存檔仍可重播）

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

### 5b · 音效邊界（S15 交付，依據 `DESIGN.md` §10.7）

音效**不是「AssetResolver 的音檔版」**，它有三個視覺素材沒有的問題：

- [ ] **`playSound(actionId, opts?)` 是全專案唯一入口**——互動音效（click、
      option selected、過場）與 director 的演出音效共用它，差別只在有沒有 `when`
- [ ] **`ui` bus 不受 `rate`/`finish` 影響**（按鈕回饋音不該因快轉或跳過而消失）
- [ ] **`ActionId` 是從 manifest 產生的型別化 union**，打錯字在編譯期就爆
      （否則會長出 `ui_clik`，與 §10.5 那些 `H5.mudium` 是同一種腐化）
- [ ] 兩個 id 來源：互動音效在 app 靜態 manifest（mod 不可覆寫）、
      演出音效在內容包 `assets.sfx`（mod 可自帶，未知 id 只警告不拒載）
- [ ] 三條獨立匯流排 `bgm` / `sfx` / `ui`，各一個 `GainNode`
      （BGM 與 SFX 混在一起是這類系統最常見的錯誤）
- [ ] 用 Web Audio API（取樣級精確排程），**不用 `<audio>` 元素**
- [ ] `AudioResolver`：缺素材就靜音，dev 模式印 would-play，**零音檔即可開發時序**
- [ ] **Autoplay unlock 流程**：首次手勢 `resume()`；`suspended` 時 UI 有明確提示。
      這個 bug 開發時看不到（你點過畫面），只有新訪客會中
- [ ] **Leading-edge debounce**（不是 trailing——trailing 會讓 click 音遲到）。
      per-id、`dedupeMs` 由 manifest 逐 id 設定。加速時靠它自然稀釋，
      **不需要**按倍率過濾的規則
- [ ] ⚠️ **但 debounce 解決不了跳過**：`finish()` 收合的是幾十個**不同** id，
      per-id 去重對它們無效。跳過取消（`normal` 取消、`high` 存活）
      與全域併發上限 8 必須獨立實作
- [ ] BGM 一律正常速度、不變調；`seek()` 往回不重播
- [ ] `priority` 只用於「併發上限爆掉時先丟 normal」與「跳過時讓 high 存活」，
      **不用於倍率過濾**
- [ ] ⚠️ **音效的隨機變體不得從 `SeededRng` 取值**——否則同種子會跑出不同人生。
      `presentation/` 允許 `Math.random()`，所以 §5.3 的 lint 擋不到這裡
- [ ] manifest 同時支援獨立檔案與 audio sprite（先用獨立檔案）
- [ ] 缺檔就**什麼都不做**（不報錯、production 不印警告），
      dev 模式印 would-play 並可匯出清單

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

- [ ] `domain/` + `sim/` 可在 node 環境無頭執行（不 import `presentation/`、`ui/`）
- [ ] 有一個 headless runner 能跑 N 局並輸出結果分布

**做工具時**：跑一萬局，檢查最終資產的分布、各結局占比、各特性解鎖率、
機會被接受率，據此調權重。這是唯一能讓數值不憑感覺的方法。

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

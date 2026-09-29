# Conduit Bend Calc — v1.6.0 Pro 重定义 Phase 0 审计

- 分支：`feature/pro-redefinition`（从 `feature/iap-pro-unlock` 切出）
- 基线 commit：`bc76f3d chore: upgrade Play Billing Library 7.0.0 -> 8.0.0`
- 审计日期：2026-09-29
- 验证：`npm test` → **146 tests / 146 pass / 0 fail**；`src/calculators` 与 `src/lib/imperial.ts` 零外部运行时依赖。
- 范围：只读扫描现有代码，不修改任何产品代码。本文档为唯一新增文件。

---

## 1. 六个 calculator：输入 / 输出 / 公式位置

| calculator | 入口文件 | 输入 | 输出（关键字段） | 实际公式位置 |
|---|---|---|---|---|
| Offset | `src/calculators/offset/offset.ts:28` `calculateOffset` | `heightInches`, `angle:OffsetAngle`, `centerlineRadius` | `distanceBetweenBends`(显示值=spacingDisplay), `shrink`(shrinkDisplay), `multiplier`, `geometry` | `geometry.ts:85` `calculateOffsetGeometry`；`constants.ts:17` `OFFSET_CONSTANTS` |
| 90° Stub-up | ⚠️ `src/calculators/stub/stub.ts:12` `calculateStub`（**孤立**，仅自测引用） | 实际屏用 `geometry.ts:130` `calculateStubUpMark(stubHeight, spec)` | `markPoint`, `takeUp` | `mark = H − takeUp`，take-up 取自 `BenderSpec`（D2 配对存储） |
| Kicked 90° | `src/calculators/kicked90/kicked90.ts:38` | `kickAngleDeg`(0<κ<90), `straightLengthInches`, `centerlineRadius` | `totalGain`, `marks[]`(沿管展开长), `geometry` | `geometry.ts:243` `calculateKicked90Geometry` |
| Rolling Offset | `src/calculators/rollingOffset/rollingOffset.ts:40` | `riseInches`, `rollInches`, `angle`, `centerlineRadius` | `trueOffset`(=√(rise²+roll²)), `rollAngleDeg`(=atan2(roll,rise)), `spacingDisplay`, `shrinkDisplay`, `marks[]` | `geometry.ts:292` `calculateRollingOffsetGeometry`（先 hypot 再走 offset 几何） |
| 3-Point Saddle | `src/calculators/saddle/saddle.ts:113` | `heightInches`, `angle`(中心角), `centerlineRadius` | `markSpacingInches`, `centerMarkPositionInches`, `spanInches`, `shrinkInches`, `marks[]`, `legGeometry` | `saddle.ts:80` `saddle3SpacingMultiplier`（45°→2.5，否则半角 trade 表）、`saddle.ts:97` `saddle3ShrinkPerInch`、`geometry.ts:85` |
| 4-Point Saddle | `src/calculators/saddle/saddle.ts:166` | `heightInches`, `widthInches`, `angle`, `centerlineRadius` | `markSpacingInches`(leg), `spanInches`, `totalShrinkInches`, `marks[]` | `saddle.ts:49` `resolveGeometry` → `calculateOffsetGeometry` |

要点：
- **显示值与内部值分离**（D1）：`geometry` 里的 `*Display` 走 v1.0.0 trade 常数表保证界面一致；`*Exact` / `markSpacing` 仅内部料长与预警用，部分标 ⚠️「推导未验证」。
- 所有 calculator 非法输入返回 `null`，不抛异常。
- `src/calculators/stub/stub.ts` 是历史遗留实现，屏幕未引用（`stubScreen.tsx` 用 `calculateStubUpMark`）。**重定义时不要误改 stub.ts**，可视为待清理。
- `diagrams.ts` 是纯函数图解引擎（输入=计算结果，输出=SVG 坐标），与计算引擎同层但无外部依赖。

---

## 2. Screens / 导航 / 信息架构

**导航结构**（React Navigation）：
```
NavigationContainer (App.tsx)
└── RootTabs            src/navigation/rootTabs.tsx（bottom tabs，3 个）
    ├── CalcHome → CalcStack   src/navigation/calcStack.tsx（native stack）
    │     ├── CalcHome          calcHomeScreen.tsx        （计算器列表）
    │     ├── Offset            offsetScreen.tsx
    │     ├── Stub              stubScreen.tsx
    │     ├── ThreePointSaddle  threePointSaddleScreen.tsx
    │     ├── FourPointSaddle   fourPointSaddleScreen.tsx
    │     ├── RollingOffset     rollingOffsetScreen.tsx
    │     ├── Kicked90          kicked90Screen.tsx
    │     ├── Calibration       calibrationScreen.tsx     （标题 "Calibration"）
    │     ├── Bender            benderScreen.tsx          （标题 "Bender Setup"）
    │     ├── Paywall           paywallScreen.tsx         （presentation: modal）
    │     └── Placeholder       calculatorPlaceholderScreen.tsx
    ├── Lookup                  lookupScreen.tsx          （对照表，纯静态）
    └── History                 historyScreen.tsx         （历史列表 + 回填）
```
- `CalcStackParamList`：`backfill?: HistoryParams` 用于从 History 回填。
- **信息架构**：Tab1「Calculate」= 计算器 + 校准 + bender 设置 + paywall；Tab2「Reference」= offset 乘数 / stub take-up / saddle 说明；Tab3「History」= 最近 20 条，点击回填并跳转对应计算器。
- 每个计算器屏幕结构一致：`BenderRow`（顶部，点进 Bender）→ 输入卡 → `BendDiagram` → `ResultGroup` → 提示文字 → `WarningBar` → `Clear`。
- 输入记忆：`useScreenMemory('<key>', initial)` 持久化原始文本与角度，派生数值不持久化。

---

## 3. benderSpecStore 现状

**模型**（`src/constants.ts:62` `BenderSpec`）：
```
brand: 'Ideal'|'Klein'|'Greenlee'|'Custom'
model: string          // Custom 为 'custom'
conduit: string        // 单字段，如 '1/2" EMT'（未拆 type/size）
centerlineRadius: number   // R（英寸）
takeUp: number             // Greenlee 存的是 hook deduct，见 datum
datum?: 'arrow' | 'hook'   // 缺省 arrow
customName?: string        // Custom 用户命名
```
- 种子表 `BENDER_SPECS`（`constants.ts:86`，14 条）；`MIN_STUB_TABLE`（`constants.ts:116`，**仅 1 条** Greenlee 1800 1/2" Rigid 6.5"）。
- 查询助手 `benderSpecs.ts`：`findBenderSpec` / `listPresetBrands|Models|Conduits` / `createCustomSpec` / `displaySpecName` / `specKey` / `resolveSpecKey` / `defaultBenderSpec`（Ideal 74-026 1/2" EMT，take-up 5"）/ `legacySizeToSpec`。

**单规格全局存储**（`src/lib/benderSpecStore.ts`）：
- key `@cbc:bender-spec-v1`，**只存一个当前规格**。
- 进程内缓存 `cachedSpec` + `listeners`：`saveBenderSpec` 立即更新缓存、通知所有挂载屏、异步落盘；`useBenderSpec()` 返回 `{spec, setSpec, loaded}`。所有 6 个计算器共享它。
- 校验宽松：只校验 brand / conduit 非空 + centerlineRadius 正有限（`isValidBenderSpec`）。

**多档案存储已存在**（`src/lib/customSpecsStore.ts`）：
- key `bendcalc:customSpecs:v1`，**数组、最多 20 条、按 customName upsert**，全部 `brand:'Custom'`。
- `useCustomSpecs()` 返回 `{specs, ready, addSpec}`；`benderPicker` 的「Custom → Saved」已能列出并切换多个自建档案。

**现有交互流程**：
- `benderScreen.tsx`：卡片内嵌 `BenderPicker`；选中/新建后 `setSpec` 并 `goBack()`。仅此一个入口（各计算器顶部的 `BenderRow` → navigate('Bender')）。
- `calibrationScreen.tsx`：4 步纵向卡片流——(1) `BenderPicker` 选基准 → (2) Gain 法校 R（输入 L₀、Leg A、Leg B）→ (3) Stub 法校 take-up（输入 Target、Actual）→ (4) 命名保存为 Custom + `Clear`。保存即 `addSpec` + `saveBenderSpec`，并设为全局当前规格。
- `benderPicker.tsx`：默认折叠为摘要行（`displaySpecName` + `R … · take-up …`），展开后品牌/型号/管径三级选择，或 Custom 手动填名/R/take-up。

---

## 4. deduct / gain / radius 计算链

```
geometry.ts（纯数学核心）
  gain(R, θ) = 2R·tan(θ/2) − Rθ                       [geometry.ts:45]  （trade 正值约定；QuickBend 文档取反）
  calculateOffsetGeometry(H, θ, R) → {spacingDisplay, vertexSpacing, markSpacing, shrinkDisplay, shrinkExact}
       ├─ spacingDisplay: 预设角用 constants 表；否则 H·cscθ
       ├─ shrinkDisplay: 预设角用表；否则 H·tan(θ/2)
       └─ 内部：markSpacing = vertexSpacing − gain；shrinkExact = H·tan(θ/2) − 2·gain   ⚠️
  calculateStubUpMark(H, spec) = H − spec.takeUp        [geometry.ts:130]
  calculateKicked90Geometry / calculateRollingOffsetGeometry / calculateSaddle3|4Geometry → 复用上面
  layoutChain(bends, R) → {straights[], totalGain}      [geometry.ts:337]（链式布 mark）
  validateLayout(input) → LayoutWarning[]               [geometry.ts:406]
  calibrateRadiusFromGain(L₀, A, B) = (A+B−L₀) / GAIN_90_FACTOR   [geometry.ts:451]  GAIN_90_FACTOR = 2−π/2
  calibrateTakeUp(old, target, actual) = old + (actual − target)  [geometry.ts:475]

benderSpecs.ts（数据/查找，无 gain/radius 推导）
  findBenderSpec / defaultBenderSpec / createCustomSpec / specKey / resolveSpecKey …

calibration.ts（薄封装，供 UI 调用）
  calibrateGain(L₀,A,B)      → calibrateRadiusFromGain()      [calibration.ts:20]
  calibrateStubTakeUp(...)   → calibrateTakeUp()              [calibration.ts:44]
  buildCalibratedSpec(name, base, radius, takeUp) → createCustomSpec()  [calibration.ts:56]

warnings.ts（预警包装，调 geometry）
  offsetWarnings / threePointSaddleWarnings / fourPointSaddleWarnings / stubWarnings / kicked90Warnings
      → layoutChain() + validateLayout()
```
**关键结论**：现有代码里没有独立的 `deduct` 实体。`deduct` 仅作为 Greenlee 的 `takeUp` + `datum:'hook'` 存在（`constants.ts:73`）。`gain` 从不落盘，按 R 实时算。`radius` 由 `calibrateRadiusFromGain` 反推。调用方向是单向的：screens → calculator → geometry；calibration → geometry / benderSpecs。

---

## 5. historyStore 数据结构

`src/lib/historyStore.ts`：
```
HistoryEntry {
  id: string                 // `${Date.now()}-${random}`
  kind: 'offset'|'stub'|'threePointSaddle'|'fourPointSaddle'|'rollingOffset'|'kicked90'
  title: string              // 显示名
  inputSummary: string
  resultSummary: string
  timestamp: number
  params: HistoryParams      // 回填用原始文本/角度/specKey
  signature: string          // 去重键
}
HistoryParams {
  heightText?, widthText?, takeUpText?, selectedSize?, angle?,
  specKey?, riseText?, rollText?, kickText?, lengthText?
}
```
- key `bendcalc:history:v1`，**最多 20 条**（`HISTORY_LIMIT`），新记录在前；与当前最新一条 `signature` 相同则不重复写。
- `history.ts`：`useHistoryAutoSave(entry, 800ms)` 防抖落盘。History 屏点击按 `kind` 回填并 navigate 到对应 stack 屏。

---

## 6. Paywall 现状 / entitlement 模型 / Free–Pro 划分点

### 6.1 paywallScreen 现状（`src/screens/paywallScreen.tsx`）
- 标题「Unlock Pro」，副标题「One-time purchase. Yours forever.」。
- `PRO_FEATURES` 硬编码 4 条：Kicked 90° / 3-Point Saddle / 4-Point Saddle / Rolling Offset（**"更多计算器"话术**）。
- 按钮：`Unlock Pro — {productPrice}`（`BigButton`）、`Restore Purchase`、`Not now`；显示 pending / lastError。
- 购买/恢复成功（`access==='unlocked'`）自动 `goBack()`；挂载时若 `!initialized || productPrice==null` 调 `refreshProIap()`。

### 6.2 entitlement 模型（`src/lib/iap.ts` + `src/lib/proStore.ts`）
- SKU：`cbc_pro_lifetime`（一次性买断，无订阅）。存储 key `@cbc:pro-entitlement-v1`，形状 `{purchased:boolean}`。
- `SkuAvailability = 'available' | 'unavailable' | 'unknown'`；`ProAccess = 'unlocked' | 'locked'`。
- `resolveProAccess(sku, purchased)`（`iap.ts:33`，**fail-open**）：
  - purchased → unlocked
  - sku 不可解析（商品未建）→ unlocked（不显示购买入口）
  - sku unknown（离线/异常）→ unlocked
  - sku available 且未购买 → **locked**
- `proStore`：AsyncStorage + 进程内缓存 + listeners；`useProAccess()` 返回 `{access, skuAvailability, productPrice, initialized, lastError, pendingPurchase}`；`rnIapGateway` 对 `react-native-iap` 只在函数内懒 require。App 启动时 `initProIap()`（`App.tsx:14`）。

### 6.3 全部 paywall / useProAccess 触发点（grep 结果）
| 位置 | 类型 | 行为 |
|---|---|---|
| `calcHomeScreen.tsx:5,32` | `useProAccess()` | 读 `access` |
| `calcHomeScreen.tsx:35-36` | **唯一 paywall 触发点** | `if (entry.pro && access==='locked') navigation.navigate('Paywall')` |
| `calcHomeScreen.tsx:101` | `PRO` 角标 | 锁定态显示 "PRO" 标签 |
| `paywallScreen.tsx:29` | `useProAccess()` | 付费墙自身读态 |
| `calcStack.tsx:77` | 路由注册 | `Paywall` modal |

**当前 Free/Pro 划分（仅由 `calcHomeScreen.tsx:20-28` 的 `ENTRIES.pro` 决定）**：
- **Free**：Offset Bend、90° Stub、Calibration。
- **Pro**（点击入口即弹墙，`access==='locked'` 时）：3-Point Saddle、4-Point Saddle、Rolling Offset、Kicked 90°。
- 计算器屏幕内部**没有任何** gate；`access` 只影响首页入口跳转。

---

## 7. warnings.ts / validateLayout 能力边界

`LayoutWarning = { level:'error'|'warning'|'info'; message:string }`（`geometry.ts:383`）。

`validateLayout`（`geometry.ts:406`）当前**只能**检出 3 类：
1. 任一 `straights[i] < 0` → **error**「Can't make this bend: the two bend marks overlap…」（break，只报第一条）。
2. 所选 spec 命中 `MIN_STUB_TABLE` 且 `stubHeight < minStubInches` → warning。**表内只有 1 条数据**，其余 bender 永不预警。
3. `spec.conduit.startsWith('1/2')` 且 `centerlineRadius < 4` → info（NEC）。

`warnings.ts` 为每种弯法构造 `BendNode[]` 喂给 `layoutChain`，再 `validateLayout`。`warningBar.tsx` 仅按 level 渲染图标/颜色。

**检不出**（Feasibility Engine 需求缺口）：
- 整根管长是否够（stock length）、切割后剩余直段是否足够。
- 除 "straight<0" 外的 radius 重叠 / 两弯过近（相切但 < 某阈值）情形。
- 极端 geometry（如超大角、极小 H）的一般化判断。
- 「当前 bender 能否完成」——除 min stub 单条表外的全量能力。
- **无三态**（✓ feasible / ⚠ tight / ✕ impossible）、**无替代方案**（Try 22.5° / Minimum conduit required）、无 error 的修正建议。

---

## 8. imperial.ts 分数输入输出能力

- **输入** `parseImperial`（`imperial.ts:38`）：支持 `2' 3-1/2"`、`6"`、`1/2"`、`2' 3 1/2"`、`2'3-1/2"`、`3.5"`、`3'`；识别 `′`/`ft`/`feet`/`in`/`inch`；负值、字母、分母 0 返回 `null`。
- **输出** `formatImperial(inches, denominator=16)`（`imperial.ts:110`）：英寸数 → `ft-in-分数` 字符串，按 1/16 就近取整并约分（`27.5 → 2' 3-1/2"`，`12 → 1'`）。**不是** ft-in-fraction 的 UI 组件专属；`ImperialInput` 用其做 blur 归一化，`diagrams.ts` 用其做标注。
- **缺口**：**完全没有 metric（mm/cm）** —— 全仓库 grep 无任何 metric/mm/cm 实现（唯一 `mm` 命中是时间格式化注释）。P0-1 的「Imperial/Metric」中 Metric 属**全新建**。

---

## 9. 现有可复用组件清单（`src/components/`）

| 组件 | props | 用途 / 备注 |
|---|---|---|
| `Card` | `{children, style?}` | 通用卡片容器（背景/边框/圆角/轻阴影）。 |
| `BigButton` | `{title, onPress?, variant?:'primary'\|'accent'\|'secondary'\|'option', size?:'default'\|'selection', selected?, disabled?, style?}` | 主/次/选项按钮；selection 高 64，default 56；选中态切 accent。 |
| `ImperialInput` | `{label, value, onChangeText, onParsedChange?, placeholder?, style?}` | 分数/英尺输入 + 内联错误态 + blur 归一化；`onParsedChange` 回传 number\|null。 |
| `BenderPicker` | `{spec, customSpecs, onChange, onCreateCustom}` | 品牌/型号/管径三级 + Custom Saved 列表 + 手动新建；默认折叠。 |
| `BenderRow` | `{spec, onPress}` | 计算器输入卡顶部的紧凑 bender 行，点击进 Bender Setup。 |
| `WarningBar` | `{warnings: readonly LayoutWarning[]}` | 无预警不渲染；按 level 着色；`accessibilityRole="alert"`。 |
| `BendDiagram` | `{input: DiagramInput\|null, height?=140}` | `react-native-svg` 渲染，几何全来自纯函数 `buildBendDiagram`。 |
| `ResultGroup` | `{hero: ResultItem, rows?: ResultItem[], hint?, style?}` | 深蓝结果容器：hero 大数字 + 次要行 + 空态 hint。`ResultItem={label,value?,unit?}`。 |

---

## 10. Web（`dist/`）复用判断

- `dist/` 是 Expo web 导出，**已被 `.gitignore` 忽略**（`dist/`、`web-build/`），本地存在 `index.html` / `_expo` / `assets` / `privacy.html`；仓库提交历史中无 dist。目标站点 `cbc-web.pages.dev`。
- **calculation engine 复用性：可行（成本低）。**
  - `src/calculators/**` 与 `src/lib/imperial.ts` 经 grep 确认**零外部运行时依赖**（不 import `react-native` / `AsyncStorage` / `react`；唯一外部 import 是各自 `.test.ts` 里的 `node:*`）。
  - 引擎只依赖 `src/constants.ts`（纯数据/常数）。`diagrams.ts` 亦为纯函数，仅 import `imperial.ts`。
- **不可直接复用的部分**：所有 `components/*.tsx` 与 `screens/*.tsx` 是 RN 组件（`react-native`、`react-native-svg`、导航、`useWindowDimensions`），静态 SEO 页需另写 DOM/HTML 壳。
- **复用方案**：用 Vite/esbuild 把 `src/calculators` + `src/constants.ts` + `src/lib/imperial.ts` 打成共享 ESM 包，SEO 页用原生 DOM 表单 + 内联 SVG 渲染结果（`buildBendDiagram` 输出的坐标可直接转 `<svg>`；`bendDiagram.tsx` 仅渲染层，需重写为 DOM 版）。注意源码使用 `.ts` 扩展名 import，打包器需允许。
- **结论**：**不属于"复用成本过高"**。引擎 100% 可复用；UI 需新建纯 Web 壳（无法复用 RN 组件）。

---

## 11. 复用 / 新建 对照表（P0）

> 原则：**不重复实现已存在能力**。已存在=可直接调用；改造=在现有文件上扩展；新建=当前不存在。

### P0-1 Free/Pro 重新划分
- **已存在可复用**：6 个 calculator + geometry 引擎（无屏内 gate，本身可 Free）；`calcHomeScreen` 的 `pro` 标记与跳转机制；`proStore.resolveProAccess` fail-open 逻辑。
- **需改造**：`calcHomeScreen.tsx:20-28` 去掉 4 个 `pro:true`；删 `calcHomeScreen.tsx:35-36` 的 paywall 跳转；`calibrationScreen` 保持 Free。
- **需新建**：Metric 单位支持（当前 0 实现）；单位切换存储/UI。

### P0-2 BenderProfile（多档案）
- **已存在可复用**：`customSpecsStore`（**已支持多档案，最多 20，按名 upsert**）；`benderPicker` 的 Saved 列表与切换 UI；`benderSpecs.ts` 的查找/展示/`specKey`/`resolveSpecKey`；`BenderSpec` 种子表。
- **需新建**：`BenderProfile` 扩展字段 `id, name, conduitType, conduitSize, nominalDeduct, actualDeduct, bendRadius, gain, calibrationOffset, calibrationDate, source('standard'|'custom'|'calibrated')`；Standard 内置档案 vs My Bender 的区分与「设默认」；旧单规格数据迁移。
- **需改造**：`BenderSpec` → `BenderProfile`（或包一层映射）；`benderSpecStore` 从「存一个当前规格」改为「存档案列表 + 当前选中 id」；`customSpecsStore` 扩字段/替换；`benderPicker` 增加 My Bender 管理入口（P1-1）。

### P0-3 Guided Calibration（引导流）
- **已存在可复用**：`calibration.ts` 的 `calibrateGain`（Gain 法反推 R）与 `calibrateStubTakeUp`（反推 take-up）；`geometry` 的 `calibrateRadiusFromGain` / `calibrateTakeUp`；`ImperialInput`；`customSpecsStore` 保存 + 设当前。
- **需新建**：选 conduit → 90° 试弯（12" 标记）→ 输入成品实测 → 反推 **Actual Deduct / Radius / Correction** 的**单次试弯引导流 UI**；单实测值同时推导 deduct 与 radius 的模型（现有两条路径分别需要 L₀/A/B 或 target/actual）。
- **需改造**：`calibrationScreen` 由「3 步参数配置页」重构为「步骤流」；反推出的校准值写入 `BenderProfile.calibrationOffset/actualDeduct`。

### P0-4 Expected → Actual 校准闭环
- **已存在可复用**：每次计算的 result（即 Expected）；`calibration` 反推逻辑；history 持久化模式；`BenderProfile.calibrationOffset`（P0-2 新增）作为落点。
- **需新建**：`ExpectedActualRecord` 模型与 store（expected / actual / error）；结果页反馈 UI 与 `[ Update Bender Calibration ]`；误差累积/应用 correction；撤销 / Reset Calibration。
- **需改造**：计算器读取时在 result 上应用 `calibrationOffset`；`calibrationScreen` 增加 Reset。

### P0-5 Feasibility Engine（基础版）
- **已存在可复用**：`layoutChain` + `validateLayout` + 各 `xxxWarnings`；`warningBar`（可扩展）；`MIN_STUB_TABLE`；`BenderSpec`。
- **需新建**：三态判定 ✓/⚠/✕；总料长/剩余直段校核；替代方案生成（Try 22.5° / Minimum conduit required）；bender 全量能力数据。
- **需改造**：`LayoutWarning` 扩展 `status/severity/suggestion`（或新增 FeasibilityResult 类型）；`warningBar` 支持三态样式与建议 CTA；6 个屏幕接入；`validateLayout` 扩充规则。

### P0-6 Pro Paywall 重构 + 结果页信息层级
- **已存在可复用**：`paywallScreen` 外壳（buy/restore/price/pending/error）；`proStore` + `iap.ts` entitlement（**不改商品模型**）；`BigButton` / `Card` / `ResultGroup` / `BenderRow`。
- **需新建**：「Using My Klein 3/4" EMT」标识组件/逻辑；结果页 `Calculated using standard bender values.` + `[ Calibrate My Bender ]`；风险态 `[ Check Bend Feasibility ]` CTA。
- **需改造**：paywall 文案（主标题 `Bend It Right the First Time`、副标题、5 条权益，去掉 `PRO_FEATURES` 的"更多计算器"话术）；移除首页 paywall 触发；结果页信息层级重排（P0 下一个动作 → P1 测量值 → P2 弱化公式/专业参数）。

---

## 12. 待确认（不猜测）

1. **takeUp vs deduct 语义**：`BenderProfile` 要 `nominalDeduct/actualDeduct`，但现有模型用 `takeUp`（arrow datum）与 Greenlee `datum:'hook'` 存 deduct。二者物理基准不同，不能直接映射。需确认 Profile 的 deduct 指 90° back-of-bend deduct 还是 arrow take-up；这决定校准反推公式与旧数据迁移。
2. **Guided Calibration 的物理模型**：现有 gain 法需 L₀/A/B 三个量，stub 法需 target/actual 两个量；需求描述是「12" 处做标记 → 输入一个成品实测值」。单次试弯如何同时反推 Actual Deduct 与 Actual Radius？需产品明确测量方案。
3. **Metric 是否在 P0-1 范围内**：当前完全无实现。若含 Metric，是全新输入/输出/存储/换算模块。
4. **Feasibility 的「Minimum conduit required」**：是否计入端头余量、是否等价于 P1-3 Stock Length Check。
5. **`source: 'standard'|'custom'|'calibrated'` 的持久化形态**与旧单规格（`@cbc:bender-spec-v1`）迁移/回滚策略。
6. **Paywall 触发落点**：结果页 CTA 是跳转 Paywall 还是内联展开？「Check Bend Feasibility」在风险态点击后走向付费还是直接给结果（涉及 P0-5 是否 Free）。
7. **`BendDiagram` 是否对 Free 全开放**：P0-1 把「基础 bend diagram」列为 Free，现已存在，确认无需 gate。

---

## 13. 审计结论摘要（最重要的 5 个发现）

1. **Paywall 触发点只有一处，重划成本极低**：全仓库仅 `calcHomeScreen.tsx:35-36` 在 `entry.pro && access==='locked'` 时 `navigate('Paywall')`；当前 Pro=3/4-Point Saddle、Rolling Offset、Kicked 90°，Free=Offset、Stub、Calibration。计算器屏内无任何 gate。P0-1 只需删首页 4 个 `pro:true` 与该跳转。
2. **多档案存储已然存在，BenderProfile 不必从零建**：`customSpecsStore` 已支持最多 20 个自建档案 + `benderPicker` Saved 列表 + 全局单例 `benderSpecStore`。真正要做的是**扩字段 + 拆分 Standard/My Bender + 把"当前规格"改为"当前选中 id"**，并补 `id/conduitType/conduitSize/nominalDeduct/actualDeduct/calibrationOffset/calibrationDate/source`。
3. **Calibration 差距在交互而非数学**：`calibrateRadiusFromGain` / `calibrateTakeUp` 已实现且经测试；但 UI 是需用户理解 L₀/A/B 或 take-up 概念的 3 步参数页。GuidedCalibration 需要新建单次试弯引导流；**待确认**单实测值如何同时反推 deduct 与 radius（现有路径不覆盖）。
4. **Feasibility 能力边界极窄，是本期最大新增工作量**：`validateLayout` 仅能检出 (a) straight<0→error、(b) min stub（表内**仅 1 条**数据）→warning、(c) 1/2" R<4→info；无料长/剩余直段/极端 geometry/bender 能力判断，且**无三态、无替代方案**。需扩 `LayoutWarning` 模型 + 新建 FeasibilityEngine 与建议生成。
5. **计算引擎零 RN/AsyncStorage 依赖，Web SEO 可低成本复用**：`src/calculators/**` 与 `imperial.ts` 无外部运行时 import，146 测试通过；`diagrams.ts` 纯几何可复用。仅 `components/screens` 是 RN 层，SEO 页需自写 DOM 壳——**不属"复用成本过高"**。另注意：`src/calculators/stub/stub.ts` 为未被屏引用的遗留实现。

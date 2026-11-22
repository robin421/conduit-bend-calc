# T26 PRD：Value-First Paywall Flow（先测后锁转化漏斗重构）

## 1. 背景与目标（事实 vs 假设）
- **已验证事实（Amplitude 2026-11-14 ~ 11-22）**：新用户 74 → 计算 51（68.9%）→ 触达 Paywall 20（32 次）→ **买点 0 / 成交 0**；85%+ 付费墙流量来自校准入口；西语计算用户占 **41.2%**；History 人均 9.2 条（>5 条上限）；Bender 页人均访问 4.5 次。
- **核心痛点**：Hard Gate Before Value（硬墙前置）导致用户未感知自身弯管器误差即被假示例拦截，且校准页未做西语本地化。
- **产品假设（待上线验证）**：先免费测出真实误差，再在「保存并应用」处设门控，可激发 Aha Moment 与禀赋效应。
- **目标指标**：测量完成率 ≥ 35%、Paywall 买点率（`pro_buy_tapped / pro_paywall_viewed`）从 0% 提升至 ≥ 8%。

## 2. 核心漏斗重构：Try-Before-Buy（P0）
1. **开放免费测量入口（移除前置硬锁）**：
   - `CalcHomeScreen`：移除 `GuidedCalibration` 的前置 Paywall 拦截（Native 与 Web 均直达向导；可保留轻量 `PRO` 标注或在说明中提示“免费试测 · Pro 保存”）。
   - 6 个弯管计算器（`Offset` / `Stub` / `ThreePointSaddle` / `FourPointSaddle` / `RollingOffset` / `Kicked90`）：`BenderStatusBanner.onCalibrate` 改为直接跳转 `GuidedCalibration`，路由透传 `entrySource`（如 `offset_calibration`）保留归因。
   - `BenderScreen`：在选择器下方新增轻量入口卡「Dial In My Bender（免费实测）」直达 `GuidedCalibration`（`entrySource: 'bender_screen'`），承接高频 Bender 页流量。
2. **GuidedCalibrationScreen 体验升级（100% 接入 `useI18n()` EN/ES）**：
   - **快捷直达**：Step 1/2 底部提供次级链接「Already bent? Enter measurement →」一键跳至 Step 3。
   - **即时误差诊断（Aha Moment）**：Step 3 输入有效成品高度 `S` 后，实时渲染对比卡：`Standard take-up` vs `Measured take-up`、偏差 Δ（如 `+3/8"`）、以及同目标弯标记对比（`Standard mark → Your mark`）。
   - **零摩擦命名与门控点**：Step 4 展示诊断摘要，名称输入框默认预填建议名（如 `My 1/2" EMT`，用户可改），主 CTA 为 **「Save & Apply to All Bend Calculators」**（*注：仅 6 个弯管计算器受 take-up/R 影响，文案用“全部弯管计算器”避免电气工具用户误解*）。
3. **保存时后置门控与购后零摩擦闭环**：
   - 仅在 `GuidedCalibrationScreen` Step 4 点击保存，或 `CalibrationScreen`（Full Fingerprint）Step 4 点击「Save as Custom」时校验 `access === 'locked' || Platform.OS === 'web'`。
   - 锁定时将 `PendingCalibrationDraft`（含 `mode: 'guided'|'manual'`、`baseTakeUp`、`measuredTakeUp`、`deltaInches`、待保存的 `BenderProfile` 或 `BenderSpec`、`entrySource`、`createdAt`）写入**本地内存 + AsyncStorage（`@cbc:pending-calibration-draft-v1`）**，**绝不上传任何测量值或名称**；随后跳转 `Paywall`（`triggerSource` 透传原 `entrySource` 或 `guided_calibration_save` / `full_fingerprint_save`，`intent: { kind: 'calibration', hasDraft: true }`）。
   - 购后/恢复后，`Paywall` 主按钮显示「Save & Apply "{name}"」。用户点击后，`continueProTask` 自动执行 `upsertProfile + setActiveProfile`（manual 模式同步 `addSpec + saveBenderSpec`），清除草稿与 `PendingProTask`，弹出确认 Toast 并返回原计算器或首页，**全程零重输**。

## 3. Paywall 个人化体验与价值锚点（P0）
- **携个人草稿进入（Calibration 场景）**：
  - 标题动态切换（EN/ES）：`Save your {delta} bender calibration` / `Guarda tu calibración de {delta}`。
  - Hero Card 替换硬编码假数据，展示用户真实 `Standard vs Measured take-up`、真实 Δ 徽标与标记对比，并标注“Your test bend · ready to save”。
- **无草稿进入（直接进 Paywall / Feasibility / Bender Picker / History）**：
  - **Calibration 场景**：提供 3 个交互偏差芯片（英制 `+1/8"` / `+1/4"` / `+3/8"`；公制 `+3 mm` / `+6 mm` / `+10 mm`）点选实时更新标记对比；卡片底部增加次入口「Measure my bender free →」直达 `GuidedCalibration`。
  - **History 场景**：挂载时读取 `loadHistory()`，若 `entries.length > 5`，动态展示真实条数（如 `12 saved · 7 hidden — unlock Pro to view all 20 & export`），否则展示默认 5 vs 20 对比。
- **底部 ROI 价值锚点（固定在价格行正上方，EN/ES）**：
  - EN：`One saved stick of conduit pays for it — one-time purchase, no subscription.`
  - ES：`Ahorra un solo tubo y se paga solo — pago único, sin suscripción.`

## 4. 触点边界与克制原则
- **升级触点**：Home 校准入口、6 大弯管结果页 Banner、Bender 页试测入口、History 隐藏条数卡（同步显示真实隐藏数）、Paywall 个人化视图。
- **绝对免费红线**：全部 9 个计算器核心计算、单位切换、安全警告、前 5 条历史、校准测量与误差诊断 100% 免费；严禁强弹弹窗或广告式打断。

## 5. 可量化验收埋点（严格无 PII）
复用 `trackGrowthEvent`（双发 Firebase + Amplitude）与 `logFirebaseProPaywallViewed`，**严禁上报实测数值、管径文本或档案名**：
- **新增白名单事件（`src/lib/growthEvents.ts`）**：
  - `calibration_try_started`：`{ source, mode: 'quick'|'full' }`
  - `calibration_result_previewed`：`{ source, mode, delta_bucket: 'zero'|'small'|'medium'|'large' }`（按 `|Δ|` 离散分桶：`0` / `≤1/8"` / `≤1/4"` / `>1/4"`）
  - `calibration_save_gated`：`{ source, mode }`
  - `calibration_draft_auto_applied`：`{ source, mode }`
  - `pro_paywall_demo_interacted`：`{ scene, action: 'delta_chip'|'try_free_cta' }`
- **既有事件增补属性**：`pro_paywall_viewed`、`pro_buy_tapped`、`pro_paywall_dismissed` 增补布尔属性 `has_personal_data`、`has_hidden_history`。

## 6. 边界控制与核心验收（Gherkin）
- **Web 兼容**：允许免费完成实测与诊断；点保存进 Web Paywall 展示真实测量对比 +「Get Android App」导流，不调用 IAP。
- **EN/ES 双语**：`GuidedCalibrationScreen`、`CalibrationScreen` 与 `ProPaywallView` 全部文案走 `useI18n()`，零硬编码英文。
- **返回键与异常恢复**：Android 返回键在向导内逐级退回（快捷键跳入 Step 3 后返回退至 Step 2 或入口）；取消购买保留草稿（有效期 24h，再次点击保存直接复用）；支付 pending/进程强杀重启后，若 `access === 'unlocked'` 且存在未消费 `PendingProTask + Draft`，首页续接卡点击后同样一键落盘并激活。
- **核心验收标准（DoD）**：
  1. `Given` Free 用户在 Offset 结果页点击 `Dial In My Bender`，`When` 跳至 Step 3 输入有效实测值并在 Step 4 点保存，`Then` 进入 Paywall 且 Hero 显示其真实偏差与个性化标题，依次上报 `calibration_try_started → calibration_result_previewed → calibration_save_gated → pro_paywall_viewed(has_personal_data=true)`。
  2. `Given` 携带草稿的 Free 用户完成购买并点击 Continue，`When` 应用执行续接，`Then` 自动保存并激活该档案、清除草稿、无需重新输入，并上报 `calibration_draft_auto_applied`。
  3. `Given` 已有 12 条历史的 Free 用户进入 Paywall History 场景，`When` 页面渲染，`Then` 展示“已记录 12 条、隐藏 7 条”，且 `pro_paywall_viewed` 携带 `has_hidden_history=true`。

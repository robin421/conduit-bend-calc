# TEAM_BOARD — Conduit Bend Calc

## 业务目标
1. 将 `feedback-hub` 工单反馈从外部浏览器跳转升级为 **App 内置页** 接入（Native WebView + Web iframe）。（已完成）
2. 核查并完善 **引导评分（In-App Review）** 触发链路与展示入口。（已完成）
3. 接入 **Amplitude** 埋点统计。（已完成）
4. **Web 站全面优化与 SEO 升级**：完善 `https://bendcalc.wattflow.net` 的技术 SEO、爬虫可读性与构建流水线，做好 Google 与 Bing 收录准备，并打通与 Google Play 的双向关联。（已完成并上线）
5. **Web 移动端与 PC 端 UI/交互全面适配**：消除 PC 端“手机壳子居中”与底部 Tab 栏，升级双栏宽屏工作区、桌面键盘流与实时结果预览；统一移动端 `>=44px` 触控热区，并同步升级 23 个静态 SEO 着陆页的双端体验。（已完成）
6. **数据驱动产品与增长优化（基于 2026-11-14 ~ 11-22 Amplitude 全量数据）**：
   - Phase 1（P0）：修复付费墙转化黑盒与 0 转化体验（首屏默认展开实测对比、补齐 SKU 状态/购买点击/导航返回 dismiss 埋点、补齐 Amplitude `user_properties` 与 `history_reused`、`unit_mode` 细分）。
   - Phase 2（P1）：覆盖 37.8% 西班牙语用户的原生 App 核心链路本地化（自动检测系统语言 + AsyncStorage 持久化 + 首页/Paywall/导航/History/4 大高频计算器西语化）与单位体验优化（按地区智能默认单位 + 快捷切换）。

## DAG 任务矩阵

| ID | 任务 | 负责人 | 依赖 | 状态 | 交付物 | 验收结论 |
|---|---|---|---|---|---|---|
| T0 | Amplitude 平台建项与 API Key 提取 | ai-manager | - | DONE | `aicrosscheck / Conduit Bend Calc` (`4fab693935c6445c2df9ac357fc1f686`) | 已通过 `provision_amplitude.py` 验证提取 |
| T1 | `feedback-hub` 内置页接入（`FeedbackScreen` + `RootStack` + `FeedbackCard`） | developer | T0 | DONE | `src/screens/feedbackScreen.tsx`, `src/screens/feedbackScreen.web.tsx`, `src/navigation/rootStack*`, `src/components/feedbackCard.tsx` | QA 验收 PASS |
| T2 | Amplitude 埋点接入 + 引导评分全链路核查 | developer | T0 | DONE | `src/lib/amplitude.ts`, `src/lib/amplitude.test.ts`, `src/lib/growth.ts`, `App.tsx` | QA 验收 PASS |
| T3 | 类型检查、单元测试、Web 构建与合规验收 | qa | T1, T2 | DONE | QA 验收报告 | PASS（`tsc` 0 错、`381/381` 单测、`web:export` 703 modules） |
| T4 | Web SEO、Google/Bing 收录与 Google Play 关联方案审计 | growth | - | DONE | SEO 与 Play 关联审计报告 | 已完成：识别 27 个 SEO 页面、sitemap/首页静态化/IndexNow/assetlinks/intentFilters 缺口 |
| T5 | Web SEO 构建流、Schema/App Links/IndexNow 与 Play 关联研发实现 | developer | T4 | DONE | `scripts/inject-web-seo.py`, `scripts/gen-seo-tool-shells.ts`, `scripts/gen-seo-pages.py`, `scripts/ping-indexnow.py`, `src/seo/toolPages.ts`, `package.json`, `app.json` | 已完成开发并同步主工作区 |
| T6 | Web SEO 全量构建、单测、类型检查与物理产物核验 | qa | T5 | DONE | QA 验收报告 + 完整 `dist/` 校验 | PASS（`tsc` 0 错、`393/393` 单测、`web:build-seo` 28 URL + 幂等性全过） |
| T7 | Web 移动端 + PC 端 UI/交互全面适配（首页 + 4 工具页 + 23 静态页） | developer | T6 | DONE | `rootTabs.tsx`, `calcHomeScreen.tsx`, `seoLayout.tsx`, `gen-seo-pages.py` 等 17 个文件 | 已完成开发并同步主工作区 |
| T8 | 双端适配 QA 验收（`tsc` + 单测 + 构建 + `ego-browser` 1440px/390px 实测） | qa | T7 | DONE | QA 验收报告（含双端实测） | PASS（`tsc` 0 错、`394/394` 单测、1440px/390px 首页+工具页+静态页实测全过） |
| T9 | 首屏静态 SEO 外壳品牌同构 + Web 默认展示 Bend Diagram | developer | T8 | DONE | `bendGuide.tsx`, `inject-web-seo.py`, `gen-seo-tool-shells.ts` | 已部署上线并实测生效（commit `e1ccadd`） |
| T10 | Web 端专业视觉质感重构（SVG 工程图标、统一深蓝顶栏、Segmented Control、降噪与表单精细化） | developer | T9 | DONE | `toolIcons.tsx`, `calcHomeScreen.tsx`, `webQuickCalculator.tsx`, `seoLayout.tsx`, `rootTabs.tsx`, `downloadBanner.tsx` 等 12 个文件 | 已完成开发并同步主工作区 |
| T11 | 视觉重构 QA 验收（`tsc` + 单测 + 构建 + `ego-browser` 真实截图对比） | qa | T10 | DONE | QA 验收报告 + 真机截图核验 | PASS（`tsc` 0 错、`394/394` 单测、1440px/390px 截图核验全过，底部 Tab 裁切已修复） |
| T12 | 产品功能缺陷修复（Feedback 崩溃、History Web Clear 失效/桌面入口缺失、Metric 单位换算与文案混算） | developer | T11 | DONE | `feedbackScreen.web.tsx`, `historyScreen.tsx`, `units.ts`, `webQuickCalculator.tsx`, `seoTools/*` 等 10 个文件 | 已完成修复并同步主工作区 |
| T13 | 产品功能修复 QA 复验（`tsc` + 单测 + 构建 + `ego-browser` E2E 复验） | qa | T12 | DONE | QA 复验报告 | PASS（`tsc` 0 错、`395/395` 单测、Feedback iframe / History Clear / Metric 换算 E2E 复验全过） |
| T14 | Web 页面跳转丝滑化 + 9 个计算器/Reference/History PC 端双栏宽屏适配 + Feedback 原生 UI 统一 | developer | T13 | DONE | `feedbackScreenContent.tsx`, `calcStack.tsx`, `webCalcShell.tsx`, 9 个计算器屏等 22 个文件 | 已完成开发并同步主工作区 |
| T15 | T14 全量 QA 验收（`tsc` + 单测 + 构建 + `ego-browser` PC/Mobile 跳转与双栏截图验收） | qa | T14 | DONE | QA 验收报告 + 截图核验 | PASS（`tsc` 0 错、`395/395` 单测、9 计算器双栏/Reference/History/Feedback 原生 UI/无刷新跳转全过） |
| T16 | Amplitude Web 项目建项（`909538` / `8e0f0f58b4e02e2a2583aae77b8c8d9b`） | ai-manager | - | DONE | `aicrosscheck / Conduit Bend Calc Web` | 已通过 Ego Browser 创建并提取 API Key |
| T17 | Web 端 Amplitude API Key 隔离与全链路漏斗埋点追加 | developer | T16 | DONE | `amplitudeCore.ts`, `amplitude.ts`, `amplitude.test.ts`, `webQuickCalculator.tsx`, `seoLayout.tsx`, `useSeoHistory.ts`, `languageSwitcher.tsx`, `calculatorDrawer.tsx`, `downloadBanner.tsx`, `gen-seo-pages.py` | 已完成开发并同步主工作区 |
| T18 | Amplitude Web 埋点 QA 验收（`tsc` + 单测 + 网络请求实测校验） | qa | T17 | DONE | QA 验收报告（含 HTTP v2 真实请求校验） | PASS（`tsc` 0 错、`397/397` 单测、HTTP v2/sendBeacon 实测 `8e0f0f58b4e02e2a2583aae77b8c8d9b` 无 PII 全过） |
| T19 | Phase 1：Amplitude 全链路埋点补齐（user_properties/SKU状态/dismiss修复/history_reused/unit_mode）+ 付费墙首屏实测对比默认展开 | developer | T18 | DONE | `amplitudeCore.ts`, `amplitude.ts`, `growthEvents.ts`, `proStore.ts`, `paywallTelemetry.ts`, `paywallScreen.tsx`, `proPaywallView.tsx`, `historyScreen.tsx`, `useDebouncedCalculationCompleted.ts` 及单测 | 主仓物理核验 PASS（`tsc` 0 错、`405/405` 单测） |
| T20 | Phase 2：原生 App 西班牙语核心链路本地化（系统语言检测/持久化/首页/Paywall/导航/History/4大高频计算器）+ 单位体验优化 | developer | T19 | DONE | `src/i18n/*`, `unitStore.ts`, `quickUnitToggle.tsx`, `App.tsx`, `calcHomeScreen.tsx`, `paywallScreen.tsx`, `proPaywallView.tsx`, `historyScreen.tsx`, 4大计算器屏及单测 | 主仓物理核验 PASS（`tsc` 0 错、`413/413` 单测） |
| T21 | Phase 1 + Phase 2 全量 QA 验收（`tsc` + 单测 + Web 构建 + `ego-browser` 实测西语/单位/Paywall/Amplitude Payload） | qa | T20 | DONE | QA 验收报告（含 `ego-browser` 截图与 34 次 Amplitude HTTP v2 实测） | PASS（`tsc` 0 错、`413/413` 单测、`web:build-seo` 711 modules、284/284 词典对齐、0 控制台错、0 PII 违规） |
| T22 | 升级版本号 `1.11.0 (vc11)` + 本地签名 AAB 打包与 16 KB 页对齐核验 + 真机初测 | ai-manager | T21 | DONE | `dist/conduit-bend-calc-1.11.0-vc11.aab`（52MB，42/42 `.so` 16KB PASS） | 真机试测发现 Paywall 视觉层级待优化、引导评分门槛过严，暂缓 Google Play 上架 |
| T23 | Pro 付费页高转化 UI/UX 重构方案设计（基于真机截图与 `theme.ts` Token） | designer | T22 | DONE | Paywall 重构设计规格（首屏 520pt 预算、Segmented Control 对比 Hero Card、WCAG AAA 底栏） | 已审定通过 |
| T24 | Pro 付费页重构实现 + 官方 In-App Review（`expo-store-review`）触发策略优化与 `RatingCard` 西语化 | developer | T23 | DONE | `proPaywallView.tsx`, `inAppReviewStore.ts`, `ratingCard.tsx`, `dictionaries.ts` 及单测 | 主仓物理核验 PASS（`tsc` 0 错、`413/413` 单测） |
| T25 | 重打包 `v1.11.0 (vc11)` 真机复测确认后 `fastlane android deploy` 上架 Google Play | ai-manager | T24 | IN_PROGRESS | 真机复测截图 + AAB 16KB 核验 + Google Play 发布状态 | 重打包中 |

## 风险与决策日志
- **[2026-11-14] Amplitude 接入方式**：采用轻量级 HTTP API v2 + `AsyncStorage` 持久化匿名 ID，零原生二进制依赖，兼容 Android 16KB 页面要求与 Web 端。
- **[2026-11-16] 生产部署与外部控制台红线**：Cloudflare Pages 线上部署、Google Search Console、Bing Webmaster Tools 及 Google Play Console 账号内关联操作属于外部生产环境变更，本地完成代码与静态产物验证后需由用户确认/执行上线。

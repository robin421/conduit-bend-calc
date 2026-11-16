# TEAM_BOARD — Conduit Bend Calc

## 业务目标
1. 将 `feedback-hub` 工单反馈从外部浏览器跳转升级为 **App 内置页** 接入（Native WebView + Web iframe）。（已完成）
2. 核查并完善 **引导评分（In-App Review）** 触发链路与展示入口。（已完成）
3. 接入 **Amplitude** 埋点统计。（已完成）
4. **Web 站全面优化与 SEO 升级**：完善 `https://bendcalc.wattflow.net` 的技术 SEO、爬虫可读性与构建流水线，做好 Google 与 Bing 收录准备，并打通与 Google Play 的双向关联。（已完成并上线）
5. **Web 移动端与 PC 端 UI/交互全面适配**：消除 PC 端“手机壳子居中”与底部 Tab 栏，升级双栏宽屏工作区、桌面键盘流与实时结果预览；统一移动端 `>=44px` 触控热区，并同步升级 23 个静态 SEO 着陆页的双端体验。

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

## 风险与决策日志
- **[2026-11-14] Amplitude 接入方式**：采用轻量级 HTTP API v2 + `AsyncStorage` 持久化匿名 ID，零原生二进制依赖，兼容 Android 16KB 页面要求与 Web 端。
- **[2026-11-16] 生产部署与外部控制台红线**：Cloudflare Pages 线上部署、Google Search Console、Bing Webmaster Tools 及 Google Play Console 账号内关联操作属于外部生产环境变更，本地完成代码与静态产物验证后需由用户确认/执行上线。

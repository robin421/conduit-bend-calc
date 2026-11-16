# TEAM_BOARD — Conduit Bend Calc

## 业务目标
1. 将 `feedback-hub` 工单反馈从外部浏览器跳转升级为 **App 内置页** 接入（Native WebView + Web iframe）。（已完成）
2. 核查并完善 **引导评分（In-App Review）** 触发链路与展示入口。（已完成）
3. 接入 **Amplitude** 埋点统计。（已完成）
4. **Web 站全面优化与 SEO 升级**：完善 `https://bendcalc.wattflow.net` 的技术 SEO、爬虫可读性与构建流水线，做好 Google 与 Bing 收录准备（Sitemap、IndexNow、站点验证），并打通与 Google Play（`com.robin421.conduitbendcalc`）的双向关联。

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

## 风险与决策日志
- **[2026-11-14] Amplitude 接入方式**：采用轻量级 HTTP API v2 + `AsyncStorage` 持久化匿名 ID，零原生二进制依赖，兼容 Android 16KB 页面要求与 Web 端。
- **[2026-11-16] 生产部署与外部控制台红线**：Cloudflare Pages 线上部署、Google Search Console、Bing Webmaster Tools 及 Google Play Console 账号内关联操作属于外部生产环境变更，本地完成代码与静态产物验证后需由用户确认/执行上线。

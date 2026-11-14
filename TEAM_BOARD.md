# TEAM_BOARD — Conduit Bend Calc

## 业务目标
1. 将 `feedback-hub` 工单反馈从外部浏览器跳转升级为 **App 内置页** 接入（Native WebView + Web iframe）。
2. 核查并完善 **引导评分（In-App Review）** 触发链路与展示入口。
3. 接入 **Amplitude** 埋点统计（项目已通过 `ego-browser` 创建：`Conduit Bend Calc` / org `aicrosscheck` / API Key `4fab693935c6445c2df9ac357fc1f686`）。

## DAG 任务矩阵

| ID | 任务 | 负责人 | 依赖 | 状态 | 交付物 | 验收结论 |
|---|---|---|---|---|---|---|
| T0 | Amplitude 平台建项与 API Key 提取 | ai-manager | - | DONE | `aicrosscheck / Conduit Bend Calc` (`4fab693935c6445c2df9ac357fc1f686`) | 已通过 `provision_amplitude.py` 验证提取 |
| T1 | `feedback-hub` 内置页接入（`FeedbackScreen` + `RootStack` + `FeedbackCard`） | developer | T0 | DONE | `src/screens/feedbackScreen.tsx`, `src/screens/feedbackScreen.web.tsx`, `src/navigation/rootStack*`, `src/components/feedbackCard.tsx` | QA 验收 PASS（Theme 合规、无外部跳转、支持重试与兜底） |
| T2 | Amplitude 埋点接入 + 引导评分全链路核查 | developer | T0 | DONE | `src/lib/amplitude.ts`, `src/lib/amplitude.test.ts`, `src/lib/growth.ts`, `App.tsx` | QA 验收 PASS（HTTP v2 零原生依赖、白名单防 PII、9 个计算器覆盖引导评分） |
| T3 | 类型检查、单元测试、Web 构建与合规验收 | qa | T1, T2 | DONE | QA 验收报告 | PASS（`tsc` 0 错、`381/381` 单测、`web:export` 703 modules） |

## 风险与决策日志
- **[2026-11-14] Amplitude 接入方式**：采用轻量级 HTTP API v2 (`https://api2.amplitude.com/2/httpapi`) + `AsyncStorage` 持久化匿名 `device_id`/`session_id`，零原生二进制依赖，100% 兼容 Android 16KB 页面要求、RN 0.79 New Architecture 与 Web 端，且可在 Node 单测中直接验证。
- **[2026-11-14] `feedback-hub` 内置页**：Native 端使用 Expo SDK 53 兼容版 `react-native-webview`，Web 端使用 `<iframe>` 降级兜底；遵循 `AGENTS.md` 安装规范（`--no-bin-links` 并重建 `.bin` 软链接）。
- **[2026-11-14] 隐私与政策红线**：Amplitude 与 `feedback-hub` 均严格禁止上报 PII、用户输入尺寸、历史记录或支付收据；引导评分保持 Play 合规（无星级前置拦截、无奖励、3 次成功计算 + 3 天 + 90 天冷却）。

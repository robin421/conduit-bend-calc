# Agent 工作规范：Conduit Bend Calc

## 技术栈（锁定）
- React Native + Expo SDK 52、TypeScript（strict）
- 导航：React Navigation（bottom tabs）
- 本地存储：@react-native-async-storage/async-storage
- 不引入后端，不引入任何网络请求库

## 模型
- 只用 `opencode/deepseek-v4.1-flash`，不许切换模型

## 编码规范
- 函数组件 + Hooks；文件名 camelCase；每个计算器独立目录 `src/calculators/<name>/`
- 所有数学常数集中在 `src/constants.ts`，必须与 `docs/PRD.md` 第 10 节一致
- 所有用户输入必须校验；非法输入显示错误态，不抛异常
- 数字显示用等宽（tabular-nums），结果保留 1 位小数或分数

## 禁止事项
- 不许 hardcode 任何 key/secret（本项目不需要）
- 不许引入 PRD/DESIGN 之外的新依赖（需先确认）
- 不许偏离 `docs/DESIGN.md` 的视觉规范（色值、字号、按钮尺寸）
- 不许为了"好看"加阴影、渐变、装饰动画

## 常用命令
- 启动：npx expo start
- 类型检查：npx tsc --noEmit
- 构建：eas build --platform all

## Git
- 每个任务完成并通过验收后 commit，message 格式：`T<n>: <标题>`
- 不 force push

## 环境注意事项（2026-09-26）
- npm install 必须加 --no-bin-links（overlay fs 不支持 chown）
- 每次 npm install 后需手动重建 node_modules/.bin/{expo,tsc} 软链接
- 不要用 `npx tsc`（会误装 tsc@2.0.4），用 `npm run typecheck` 或 `node node_modules/typescript/bin/tsc --noEmit`
- expo-asset 版本必须与 Expo SDK 52 对齐（~11.0.5），不要装 latest

## 品牌与信息层级（2026-10-04, T64）
- 品牌文案单一来源 `src/seo/brand.ts`：WattFlow / `⚡` / Conduit Bend Calc / 页脚句 / ` | WattFlow` 标题后缀（`withBrandTitle` 幂等）。静态 shell 脚本、document title、屏幕共用。
- 4 个 SEO 工具页 `<title>` 已含 ` | WattFlow`，总长 ≤60；改标题要同步 `src/seo/toolPages.ts`、`toolPages.test.ts`、`brand.test.ts` 以及 `scripts/inject-web-seo.py`（首页 title / og:site_name）。
- 计算器切换条数据来源 `src/seo/calculatorNav.ts`，只收录已有 Web 路由（URL 结构冻结，禁止造死链）；Kick/Rolling 等经首页 `All calculators` 到达。
- 信息层级：L1 输入+结果（`SeoWorkspace`，结果卡 40pt）/ L2 预设·单位·历史 / L3 说明·倍数表（`SeoCollapsibleSection` 默认折叠）/ L4 FAQ。首屏 390px 高度预算写在每个工具屏文件顶部注释，改动布局要同步更新。

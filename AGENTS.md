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

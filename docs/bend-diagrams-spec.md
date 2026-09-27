# 弯管标记图解规格（v1.2）

日期：2026-09-27 ｜ 状态：待实现

## 1. 目标

每个计算器结果区配一张**标记图解**，渲染用户本次计算的实际数值（mark 位置、间距、角度随输入实时变化）。
竞品（Elite/QuickBend）用的是静态示意图；我们做动态图解——这是差异点，也是"自研更好"的又一个实例。

## 2. 技术决策

- **新增依赖 `react-native-svg`**（Expo SDK 52 兼容，`npx expo install react-native-svg`）。
  用户已授权"完善好"，视为 AGENTS.md 要求的新依赖确认。这是 Expo 生态标准库，非生僻依赖。
- **图解几何全部用纯函数计算**（`src/calculators/diagrams/`），输入=引擎输出，输出=坐标点；可单元测试。
  组件层（`components/BendDiagram.tsx`）只负责渲染，不做数学。
- 风格遵守 `docs/DESIGN.md`：mark 用红色 tick + 标签；尺寸标注复用 `formatImperial`（分数显示）。

## 3. 六张图的内容

1. **Offset**：水平管线 + 两处弯弧（示意弧）+ M1/M2 两个 mark；标注间距 `S=H·cscθ`、shrink、角度 θ。
2. **Stub-up**：垂直 stub；mark 点 = H − take-up；标注目标高度与 mark 位置。
3. **3-point Saddle**：中心 45° mark + 两侧 22.5° marks（±2.5H 显示）；标注三处角度。
4. **4-point Saddle**：两个 offset + 中间平段 W；四个 marks；标注每段间距与 W。
5. **Rolling Offset**：true offset 示意；标注 rise / roll / true offset / 间距。
6. **Kicked 90°**：90° + kick 角 κ；两弯 marks；标注直段 L 与总 gain（可选）。

## 4. 布局与缩放规则

- 图解宽度 = 屏幕宽 − 页面边距；高度 160–200（按 DESIGN 字号层级）。
- marks 间距等比缩放，保证全部 marks 可见；**横纵等比锁定**，不拉伸变形。
- 弯弧用固定示意半径（不按 R 严格比例，避免小 R 时弧看不见）；标注文字只写计算值，不写"示意半径"。
- 深色模式：线条颜色跟随 theme（浅色深灰 / 深色浅灰），mark 红色不变。

## 5. 不做

- 3D 交互（QuickBend 那种）：投入大，v1.2 不做；2D 动态图解已构成差异。
- AI 生成图片：精度不可控，绝不用于标记图解。

## 6. 验收标准

- 每个计算器输入变化时图解实时更新；图解上的标注数字与结果区计算值一致（小数/分数一致）。
- 几何纯函数单元测试：给定输入断言关键点坐标（如 M1/M2 间距比例）。
- 现有 89 测试全过；`npm run typecheck` 干净；DESIGN 配色检查通过。
- 真机视觉确认留给用户（Jim 无法在设备上看渲染效果，APK 发出后请用户 eyeball 一次）。

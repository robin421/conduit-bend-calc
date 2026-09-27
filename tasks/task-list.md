# 任务清单：Conduit Bend Calc

- [x] T1 项目初始化：Expo + TypeScript + React Navigation，能跑通空壳 App
      验收：Given 全新安装 When 打开 App Then 显示占位首页且不闪退
- [x] T2 底部导航框架：3 个 Tab（计算/速查表/历史），占位页面（依赖 T1）
      验收：Given App 已启动 When 点击每个 Tab Then 对应占位页正常显示
- [x] T3 设计系统：颜色/字号/圆角常量 + 可复用组件（大按钮、卡片、结果显示区）（依赖 T2）
      验收：Given DESIGN.md 规范 When 检查 theme.ts Then 色值与文档一致
- [x] T4 英制分数输入组件：支持 ft-in-fraction 输入输出，带校验（依赖 T3）
      验收：Given 输入 2' 3-1/2" When 确认 Then 解析为 27.5；Given 输入 abc When 确认 Then 显示错误不崩溃
- [x] T5 Offset 计算器：UI + 计算逻辑 + 实时结果（依赖 T4）
      验收：Given 输入 6" + 30° When 查看结果 Then 间距=12"，shrink=1.5"
- [x] T6 Stub 计算器：UI + take-up 表 + 计算逻辑（依赖 T4）
      验收：Given 目标 12" + 1/2" EMT（take-up 5"）When 查看结果 Then 标记点=7"
- [x] T7 Saddle 计算器（3-point + 4-point）：UI + 分步标记逻辑（依赖 T4）
      验收：Given 输入完整参数 When 查看结果 Then 显示所有标记点及步骤说明
- [x] T8 速查表页面：角度常数表 + take-up 表（依赖 T3）
      验收：Given 打开速查表 When 切换分段 Then 两张表数据与 PRD 第 10 节一致
- [x] T9 历史记录：AsyncStorage 存取 + 列表 + 点击回填 + 清空（依赖 T5/T6/T7）
      验收：Given 完成一次计算 When 打开历史 Then 记录在顶部；Given 点击记录 When 返回计算器 Then 参数已填入
- [x] T10 深色模式：跟随系统 + 手动切换（依赖 T3）
      验收：Given 系统深色模式 When 打开 App Then 显示深色配色且对比度达标
- [x] T11 常数表核对：所有 multiplier/shrink/take-up 值与 PRD 第 10 节逐项比对（依赖 T5/T6/T7/T8）
      验收：Given PRD 常数表 When 抽查 App 内每个值 Then 全部一致
- [x] T12 打包验证：EAS Build 出 iOS + Android 包，可安装运行（依赖 T11）
      验收：Given 构建产物 When 安装到真机 Then App 正常启动、无闪退
      注：EAS 云构建 22e03d19-f671-4a60-b15b-ad0f22e680a7（preview, Android, SDK 52）于 2026-09-27 01:xx CST 完成（status=FINISHED），APK 已产出

## v1.1 几何引擎（bender-aware）

规格见 `docs/geometry-engine-spec.md`。符号约定：全工程 trade 正 gain，QuickBend 文档 gain 取反。

- [x] T13 几何引擎核心库：`src/calculators/geometry/` 纯函数（gain/offset/stubUp/saddle3/saddle4/kicked90/rollingOffset/layout/validate）+ BenderSpec 配对表（§3）+ 单元测试（依赖 T12）
      验收：Given R=4.625、θ=90° When 调用 gain Then 返回约 1.985（=0.4292×4.625）；Given H=6、θ=30° When 调用 offset Then vertexSpacing=12、shrinkDisplay=1.5；Given spec 未验证公式 When 检查代码 Then 标有 ⚠️ 注释未当作既定事实
- [x] T14 弯管机选择器 UI：品牌→型号→管径三级选择 + Custom 自定义（R/take-up 手填），缺省为等效 v1.0.0 常数的预设（依赖 T13）
      验收：Given 打开任意计算器 When 切换 Klein 51603/1/2" EMT Then R=4.625、take-up=5 生效；Given 选 Greenlee 1800 When 查看 take-up Then 标注 hook 前缘基准
- [x] T15 老计算器切换引擎：Offset/Stub/Saddle3/Saddle4 改用引擎计算，保持 trade 显示值（依赖 T13/T14）
      验收：Given v1.0.0 与 v1.1 同样输入 When 对比四个计算器输出 Then 显示值一致（允差 ±1/16"）；Given 现有 35 个测试 When 运行 Then 全过
- [x] T16 新增 Rolling Offset + Kicked 90° 计算器：基于引擎，κ/L 参数化（依赖 T13/T14）
      验收：Given rise=6、roll=8、θ=30° When 计算 Rolling Offset Then trueOffset=10、间距=20；Given κ=15°、L=10 When 计算 Kicked 90° Then 返回两弯 marks 与总 gain
- [x] T17 不可行弯预警 UI：直段<0 红色条、min stub 橙色条、R 过小 NEC 提示（依赖 T13）
      验收：Given 输入导致切点间距为负 When 查看结果 Then 红色「这个弯做不出来」；Given 正常输入 When 查看 Then 无预警条
- [x] T18 一次试弯校准流程：gain 法校 R（R=G/0.4292）+ stub-up 校 take-up，结果写入 Custom 规格（依赖 T13/T14）
      验收：Given L₀=30、A=17、B=14.3 When 校准 Then G=1.3、R≈3.03 写入 Custom；Given 校准完成 When 回到计算器 Then 可选用该 Custom 规格
- [x] T19 常数表核对 + PRD 同步 + 回归构建：`src/constants.ts` 与 PRD 第 10 节逐项比对并更新 PRD，全量测试通过后走 EAS 云构建（依赖 T15/T16/T17/T18）
      验收：Given PRD 第 10 节 When 抽查 App 内每个 R/take-up Then 全部一致；Given EAS 构建产物 When 安装 Then 正常启动

## v1.2 标记图解（动态，随计算结果变化）

规格见 `docs/bend-diagrams-spec.md`。新增依赖 react-native-svg（用户已授权确认）。

- [ ] T20 图解组件库：react-native-svg 接入 + `src/calculators/diagrams/` 纯函数几何（输入=引擎输出，输出=坐标）+ `components/BendDiagram.tsx` + 6 种弯法图解（依赖 T19）
      验收：Given H=6、θ=30° 的 offset When 调用图解几何函数 Then M1/M2 坐标间距与 12" 等比对应；Given 渲染空/极端输入 When 显示 Then 不 crash
- [ ] T21 计算器接入图解：6 个计算器结果区嵌入对应图解，输入变化实时更新，深色模式颜色跟随 theme（依赖 T20）
      验收：Given 修改 offset 高度 When 查看结果区 Then 图解标注数字与计算结果一致；Given 切换深色模式 When 查看图解 Then 线条颜色跟随、mark 红色不变
- [ ] T22 回归与构建：全量测试 + typecheck + DESIGN 配色检查通过后，经 Jim 验收再 push，push 后走 EAS 云构建（依赖 T21）
      验收：Given 现有 89 测试 When 运行 Then 全过；Given push main When CI workflow Then 成功并提交 EAS 构建

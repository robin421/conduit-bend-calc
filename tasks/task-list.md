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

- [x] T20 图解组件库：react-native-svg 接入 + `src/calculators/diagrams/` 纯函数几何（输入=引擎输出，输出=坐标）+ `components/BendDiagram.tsx` + 6 种弯法图解（依赖 T19）
      验收：Given H=6、θ=30° 的 offset When 调用图解几何函数 Then M1/M2 坐标间距与 12" 等比对应；Given 渲染空/极端输入 When 显示 Then 不 crash
- [x] T21 计算器接入图解：6 个计算器结果区嵌入对应图解，输入变化实时更新，深色模式颜色跟随 theme（依赖 T20）
      验收：Given 修改 offset 高度 When 查看结果区 Then 图解标注数字与计算结果一致；Given 切换深色模式 When 查看图解 Then 线条颜色跟随、mark 红色不变
- [x] T22 回归与构建：全量测试 + typecheck + DESIGN 配色检查通过后，经 Jim 验收再 push，push 后走 EAS 云构建（依赖 T21）
      验收：Given 现有 89 测试 When 运行 Then 全过；Given push main When CI workflow Then 成功并提交 EAS 构建

## v1.2.1 标注碰撞修复（Jim 自主截图评审发现）

- [x] T23 标注避让：SVG 空间标注松弛避让（mark/尺寸固定、只挪角度/注释）+ 标注常量统一导出 + 6 种弯法×360/240 宽回归测试
      验收：Given 六种弯法在 360/240 宽下渲染 When 检查文字包围盒 Then 无重叠、无出界；Given 97 测试 When 运行 Then 全过

## v1.2.2 3 点鞍弯图解角度标注修复（Jim 第二轮视觉验收发现）

- [x] T24 saddle3 图解角度跟随所选角度：`DiagramInput` 新增 `thetaDeg`，标注改为中心=所选角度、两侧=一半（如 30°→15°/30°/15°）；修复前写死 22.5°/45°/22.5°
      验收：Given 高度 6、选 30° When 查看 3 点鞍弯图解 Then 标注为 15°/30°/15°；Given 98 测试 When 运行 Then 全过

## v1.2.3 设计走查优化（Jim 第三轮设计总监视角走查发现，见 `docs/design-review-2026-09-27.md`）

- [x] T25 三处结构性视觉/UX 修复 + 一处回归修复：①首页 3/4 点鞍弯图标换行 bug（`⋀⋀`/`⋀⋀⋀` 在 44px 槽内换行）→ 改为单/双峰单行图标 + `numberOfLines={1}`；②10 个屏内容容器加 `maxWidth: 720` 居中，宽屏不再全幅拉伸（手机逐像素无变化）；③BenderPicker 默认折叠为摘要行（规格名 + R/take-up + 展开箭头），点展开展开，7 个计算屏输入框回到首屏；④走查中发现 maxWidth 暴露的新 bug：`BendDiagram` 用窗口宽度定 SVG 宽导致宽屏溢出 → 改用容器 `onLayout` 实测宽度
      验收：Given 桌面宽视口 When 查看任意屏 Then 内容 720px 居中、无通栏死白；Given 打开计算屏 When 未展开选择器 Then 输入框首屏可见、摘要行显示当前规格；Given 宽视口查看图解 When 渲染 Then 绘制内容完整收进卡片内、无溢出；Given 98 测试 When 运行 Then 全过

## v1.2.4 美国区纯英文（用户 2026-09-27 拍板：美国区上架用纯英文）

- [x] T26 全 App 用户文案中 → 英：约 150 处用户可见字符串改为行业英文（Obstacle height / Mark spacing / Bender / Calibration / Rise / Roll / True offset 等），含 7 个计算屏、校准页、速查表、历史页、导航标题、BenderPicker、输入校验、图解注释、预警文案、mark 指令；代码注释与测试用例名保留中文
      验收：Given 全仓库扫描 When 过滤注释/测试名 Then 用户可见中文为 0；Given 98 测试 When 运行 Then 全过（含两处预警断言同步为英文）

## v1.2.5 现场验证驱动修正（ElectricianTalk / r/electricians / Ideal-Klein-Elliott 厂商手册证据，2026-09-27）

- [x] T27 修复 3 点鞍弯标记间距公式（真 bug）：`calculateThreePointSaddle` 的标记间距改用半角乘数 `H × multiplier(angle/2)`（45° 中心→两侧 22.5°→显示 2.5H），与自家规格 `docs/geometry-engine-spec.md` §saddle3 一致（精确 2.613H，显示按 D1 取 2.5H）；同步检查 saddle3 半径修正与不可行弯 warning 阈值是否依赖旧间距；更新受影响的测试与图解标注
      验收：Given 高度 6、45° 中心 When 计算 3 点鞍弯 Then 标记间距显示 15"（2.5×6）；Given 全量测试 When 运行 Then 全过
- [x] T28 3 点鞍弯加 shrink 显示：中心标记加 shrink（45° 标准为 H×3/16"，其他角度按 H·tan(θ/2) 精确式），纯英文文案，跟随现有分数显示格式
      验收：Given 高度 6、45° When 查看 3 点鞍弯结果 Then 显示 shrink 1-1/8"（6×3/16）
- [x] T29 全计算器加基准刻度提示（Ideal/Klein/Elliott 三方一致口径）：offset/stub/鞍弯外侧标记→arrow；3 点鞍弯中心→rim notch；back-to-back 第二弯→star；纯英文短提示，加在 mark 指令附近
      验收：Given 打开 offset/3 点鞍弯/stub 页 When 查看标记指令 Then 有对应 datum 英文提示；Given 全量测试 When 运行 Then 全过
- [x] T30 4 点鞍弯提示优化：内侧标记留约 2" 余量防蹭障碍；从固定点起算时 true center 加 shrink；Mark 编号改动有风险则不动
      验收：Given 打开 4 点鞍弯页 When 查看 Then 有 2" 余量与 shrink 提示文案
- [x] T31 回归与构建：版本号 bump 到 1.2.5，全量测试 + typecheck 通过后 commit + push main，CI 通过后走 EAS 云构建（preview, Android APK）
      验收：Given 全量测试 When 运行 Then 全过；Given push main When CI workflow Then 成功；Given EAS 构建 When 完成 Then 状态 FINISHED

## v1.4.0 视觉打磨（设计走查：卡片 / 结果层级 / 图标，2026-09-28）

- [x] T32 视觉打磨（纯表现层，不改逻辑/文案/布局顺序/依赖）：Card 加 1px 边框 + 12pt 圆角 + iOS 阴影 & Android elevation；BigButton 新增 `option` 变体（未选=卡片底 + 文字主色 + 发丝边框，选中=金色强调）并应用到 6 个计算屏角度选择器；新增 `ResultGroup`（每屏仅一个海军蓝结果容器，hero 40pt + 次要行 24pt + 发丝分隔线），替换各屏堆叠结果块，教学提示移到卡片外脚注；BendDiagram 管线 3→4.5、标注字号 +1、浅色管线改 primary（深色仍用 textPrimary）；首页计算器卡片加金色竖条；版本号 bump 到 1.4.0
      验收：Given 全量测试 When 运行 Then 全过；Given 6 个计算屏 When 查看 Then 每屏仅一个海军蓝结果容器、角度按钮未选为浅色卡片；Given 深色模式 When 查看 Then 配色跟随主题；Given npx tsc --noEmit When 运行 Then 无错误

## v1.4.1 标注避让修复（2026-09-28）

- [x] T33 修复 v1.4.0 字号+1 后示意图标注重叠：diagrams.ts 避让算法的字号假设（mark 12 / 其余 11）与渲染器真实字号（mark 13 / 其余 12）脱节，导致 kicked90 的 M2 / 15° / Total gain 在屏上重叠而测试仍过；把 builder 与 diagrams.test.ts 的包围盒字号都对齐到真实渲染值；rolling 注释精简 `rise 6" · roll 8" · true offset 10"` → `rise 6" · roll 8"`（true offset 已在结果卡与尺寸线展示，35 字符注释在 240px 最小视口物理放不下）；版本号 bump 到 1.4.1
      验收：Given 全量测试 When 运行 Then 115/115 通过；Given 6 种弯法 × 2 种宽度 When 构建图解 Then 文字包围盒无重叠（按真实字号校验）；Given npx tsc --noEmit When 运行 Then 无错误

## SEO 第二批（2026-09-29）

- [x] T47 kick-90-calculator 页：App 有 Kicked 90° 计算器，页面挂正常 CTA；内容含两标记布局法（Mark1=90°切点，Mark2=arc90+直段）、worked example、弯制顺序
- [x] T48 90-degree-bend-calculator 页：对应 Stub-Up 90°，不与第一批 stub-up 页重复；讲 90° 解剖、gain（≈0.43R）、back-to-back 90s 布局
- [x] T49 conduit-bending-chart 页：纯内容，10°–60° multiplier+shrink 总表（精选摘要目标），表格干净规范
- [x] T50 conduit-shrink-calculator 页：shrink 概念 + shrink/take-up/gain 辨析 + 3 个 worked example，CTA 指 offset 计算器
- [x] T51 parallel-offset-calculator 页：诚实指南页写法（App 无独立 parallel offset 计算器），讲"同角度+同基准+同shrink"做法
- [x] T52 how-to-bend-emt-conduit 页：新手指南（工具、读弯管器刻度、第一个 90°、安全习惯）
      验收：Given 12 页 When 跑 gen-seo-pages.py 自带 assert Then title≤60/desc≤160/正文250–650词全过；Given 生产部署 When 查 6 新 URL Then 全部 200；Given sitemap.xml Then 含 12 页 URL；Given Search Console Then 6 页逐个 Request Indexing 被接受

## 第三批 SEO 页面（T53–T58，2026-09-29 新增）

- [x] T53 conduit-bending-formula 页：multiplier/shrink/gain 公式总汇 + 字段表 + worked example，定位公式速查长尾
- [x] T54 hand-bender-markings 页：arrow/star/rim notch/degree scale 四标记详解 + back-to-back 90s 示例
- [x] T55 emt-sizes-chart 页：1/2"–2" trade size vs OD/ID 表 + bender 选型 + 注明本站无 fill 计算器
- [x] T56 box-offset-bend 页：10° mini offset 做法（spacing=depth×6）+ 同平面检查 + shrink 提醒
- [x] T57 how-to-bend-3-4-emt 页：3/4" 专属数字（take-up 6"、min radius 4-1/2"）+ stub/offset/back-to-back 示例
- [x] T58 emt-vs-rigid-bending 页：从 bending 角度切入（take-up 差异、工具、force、springback），不与安装对比文重复
      验收：Given 18 页 When 跑 gen-seo-pages.py 自带 assert Then title≤60/desc≤160/正文250–650词全过；Given 生产部署 When 查 6 新 URL Then 全部 200；Given sitemap.xml Then 含 18 页 URL；Given Search Console Then 6 页逐个 Request Indexing 被接受

## v1.7.0 线上观测：Firebase Analytics + Crashlytics（T59，2026-10-02，规格见 `docs/firebase-integration-brief.md`）

- [x] T59 Firebase 集成：`@react-native-firebase/{app,analytics,crashlytics}` 21.6.1（Expo SDK 52 / RN 0.76.9 / 新架构）+ config plugin；App 入口首屏后初始化，Crashlytics 仅生产启用；最小事件集 `screen_view` / `calculation_completed{bend_type}` / `unit_system_changed{from,to}` / `pro_paywall_viewed`（无 PII）；`scripts/write-google-services.sh` + `eas-build-pre-install` hook 从 EAS Secret 注入 `google-services.json`（根目录，永不提交）；隐私政策补 Firebase 数据收集说明；版本 bump 1.7.0
      验收：Given `npm run typecheck` When 运行 Then 无错误；Given `npm test` When 运行 Then 231/231 通过；Given `npx expo prebuild --platform android --clean` When 检查产物 Then google-services.json 被引用、Crashlytics gradle 插件已应用、无新增权限（仅既有 BILLING）；Given `git status` When 提交前检查 Then 无 google-services.json

## Web SEO 工具页 P0（T60，2026-10-04）

- [x] T60 四个独立 SEO 工具页：`/offset`（offset calculator）、`/4-point-saddle`（4 point saddle conduit calculator）、`/shrink`（conduit shrink calculator）、`/stub-up`（90 degree stub up calculator）。React Navigation 根 stack + web linking 路由；每页首屏计算器（复用 `src/constants.ts` 常数与现有 calculator/`ImperialInput`，校验非法输入）、说明区、3–5 条 FAQ、Multiplier/take-up 表、底部内链网（其余 3 页 + 首页）；设计遵循 `theme.ts`/`DESIGN.md`（8pt 圆角、无阴影渐变、40pt tabular-nums 深蓝结果卡）；SEO 每页独立 title/description/canonical + `WebApplication`/`FAQPage` JSON-LD，由 `src/seo/toolPages.ts` 单一来源经 `scripts/gen-seo-tool-shells.ts` 生成静态 shell；sitemap 新增 4 条；SEO 路由隐藏下载 banner
      验收：Given `npm run typecheck` When 运行 Then 无错误；Given `npm test` When 运行 Then 245/245 通过；Given `npm run web:export` + shell 生成 When 检查 dist/<route>/index.html Then title/description/canonical/JSON-LD 正确且可重复运行不重复注入；Given `getStateFromPath` When 解析 4 条路径 Then 命中对应屏幕

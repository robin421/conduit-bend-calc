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
- [ ] T12 打包验证：EAS Build 出 iOS + Android 包，可安装运行（依赖 T11）
      验收：Given 构建产物 When 安装到真机 Then App 正常启动、无闪退

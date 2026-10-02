# Firebase 集成设计 Brief — Conduit Bend Calc

> 写给代码 agent 的开工文档。读完再动手，不要问，回头 Jim 按四道门验收。

## 背景与目标

Conduit Bend Calc 1.6.0 已提交 Play 审核（免费版）。发布后需要最基础的线上观测能力。
本次集成只做两件事：**Firebase Analytics**（用户行为）+ **Crashlytics**（崩溃收集）。
Firebase 项目已建好（见下），不要动控制台。

- Firebase 项目 ID：`conduit-bend-calc-50040`（Spark 免费版，保持不动）
- Android 应用已注册：包名 `com.kaipu.conduitbendcalc`
- Analytics 已关联到现有 GA4 媒体资源 `Conduit Bend Calc`（556489749），不要新建
- `google-services.json` 已放在仓库根目录，**已加入 .gitignore，chmod 600，永远不许提交到 git**

## 设计原则（必须遵守）

1. **零打扰**：对用户完全不可见。不新增任何 Android 权限，不加弹窗/提示，不拖慢冷启动（Firebase 初始化放后台线程/延迟到首屏渲染后）。
2. **最小事件集**：只埋对决策有用的事件，不搞"先全埋上以后再说"。
3. **密钥不出仓库**：`google-services.json` 永不进 git。CI 构建走 EAS Secret 注入（见下）。
4. **不动现有功能**：UI、计算逻辑、IAP 代码（react-native-iap）一行不许改。Pro 相关事件只做埋点，购买链路保持休眠（IAP 商品尚未创建）。

## 技术约束

- Expo SDK 52 / React Native 0.76.9 / New Architecture 已启用 / targetSdk 36
- 用 `@react-native-firebase/app` 的 Expo config plugin 方式集成（不要 eject，不要手改 android/）
- `@react-native-firebase/*` 选与 Expo SDK 52 + RN 0.76 + 新架构验证兼容的版本（自己核实兼容性矩阵，不要凭印象选 latest）
- `eas.json` 里 `"appVersionSource": "remote"` —— versionCode 由 EAS 远端管理，**不要手动改 versionCode**；只把 `app.json` 的 `version` 升到 `1.7.0`
- `expo-updates` 的 runtimeVersion 策略是 sdkVersion：原生层改动必须走新 binary（AAB），OTA 发不了 —— 这正是本次计划（1.7.0 新包）

## 任务清单

### T1. SDK 接入
- 安装 `@react-native-firebase/app`、`@react-native-firebase/analytics`、`@react-native-firebase/crashlytics`
- `app.json` plugins 中加入 `@react-native-firebase/app`（android 应用已注册，google-services.json 在根目录，plugin 默认能找到）
- Application 入口处初始化：Analytics 收集保持默认开启；Crashlytics 在 `__DEV__` 外启用（dev 下可关，避免污染线上崩溃看板）
- 未捕获 JS 异常与原生崩溃要能进 Crashlytics（按官方文档接 ErrorUtils / setJSExceptionHandler 那套，不要自己造轮子）

### T2. CI 构建注入（google-services.json 不进 git 的关键）
- 写 `scripts/write-google-services.sh`：从环境变量 `GOOGLE_SERVICES_JSON_B64`（base64）解码写出 `google-services.json` 到仓库根目录；变量为空时直接报错退出（不要静默跳过）
- `eas.json` 的 production 与 preview profile 下加 build hook，在构建开始前执行该脚本（EAS hook 名自己查官方文档确认）
- 注意：EAS Secret 由 Jim 单独创建，agent 不要碰 secret、不要在任何文件/日志里打印密钥内容

### T3. 最小事件集（Analytics）
只埋这 4 个，参数不许带 PII：
| 事件名 | 触发点 | 参数 |
|---|---|---|
| `screen_view` | 自动（配好 navigation 集成即可） | — |
| `calculation_completed` | 每次完成一次弯管计算 | `bend_type`（如 90_stub / offset / 3_point_saddle 等现有类型名，原样用） |
| `unit_system_changed` | 用户切换单位制 | `from`, `to`（fraction/decimal/metric） |
| `pro_paywall_viewed` | Pro 解锁页/升级入口展示时 | —（购买成功事件等 IAP 上线再加，本次不加） |

埋点位置从 `src/screens`、`src/navigation` 里找对应点；`bend_type` 取现有常量，不要新造命名。

### T4. 隐私与合规（只准备材料，不动 Play 后台）
- 列出本次 SDK 实际会收集的数据项清单（设备标识、应用交互、崩溃日志等，按官方文档如实列），写进本 brief 末尾的附录，Jim 发版时用它更新 Play 数据安全声明
- 检查仓库里有没有隐私政策源文件（如 `dist/privacy.html` 或 docs 下的）：有的话，把 Firebase Analytics / Crashlytics 的数据收集说明补进去（英文，2-3 句，写实不夸大）；找不到就注明"未找到源文件"

### T5. 验证
- 类型检查用 `npm run typecheck`（**不许用 `npx tsc`**，会误装 tsc@2.0.4）；现有测试全过（`npm test`）
- `npm install` 如需执行必须加 `--no-bin-links`，装完后手动重建 `node_modules/.bin/{expo,tsc}` 软链接（仓库 AGENTS.md 环境注意事项）
- `npx expo prebuild --platform android --clean` 能在本地成功生成 android/（验证 config plugin 生效；**生成后删除 android/ 目录，不要提交**）
- 从 prebuild 产物确认：`google-services.json` 被正确引用、Crashlytics gradle 插件已应用、无新增权限（除了已有的 BILLING）
- Crashlytics 上报链路：接一个**仅 dev 生效**的测试崩溃入口（比如 dev menu 里），验证时用，合 master 前必须删掉。不要在生产代码里留任何测试崩溃按钮。

## 禁止事项

- 不许提交 `google-services.json`（已 gitignore；提交前用 `git status` 自查）
- 不许升级 Firebase 到 Blaze，不许开 Messaging/Remote Config/Auth 等其他服务
- 不许改任何 UI、计算逻辑、IAP 相关代码
- 不许碰 Play Console、Firebase 控制台、EAS Secret
- 不许把 API key、项目编号等写进代码注释以外的任何地方（注释里也不需要）

## 交付

- 分支 `feature/firebase`，commit message 按仓库 AGENTS.md 格式 `T<n>: <标题>`（任务号去 `tasks/task-list.md` 找下一个可用编号）
- push 到 origin（不 force push），报告：改了哪些文件、事件埋点位置、prebuild 验证结果、数据收集清单
- 不触发 EAS 构建（构建由 Jim 触发）

## 附录：数据收集清单（agent 填写）

> 依据 Firebase 官方文档 <https://firebase.google.com/support/privacy>（2026-09 版）与本仓库实际接入。Jim 用于更新 Play 数据安全声明。

### 本次接入的 SDK
- `@react-native-firebase/app` 21.6.1（核心，配置来自 `google-services.json`）
- `@react-native-firebase/analytics` 21.6.1（Google Analytics for Firebase）
- `@react-native-firebase/crashlytics` 21.6.1
- 环境：Expo SDK 52 / React Native 0.76.9 / New Architecture / targetSdk 36

### Firebase Analytics 收集的数据
- **应用实例标识**：每个安装生成的随机 app-instance ID（不与用户身份绑定）。
- **设备/广告标识**：Android 广告 ID（AD_ID）等，受系统与用户设置限制。
- **设备与应用元数据**：设备型号、操作系统与版本、应用版本、语言、屏幕尺寸、运营商；由 IP 地址推导的**大致地理位置（城市级）**。
- **使用事件**：会话、首次打开、应用更新等自动事件，以及本 App 手动埋点的事件与参数（见下）。
- **不收集**：姓名、邮箱、账号、计算器输入值或任何用户可识别信息（PII）。

本 App 手动埋点（参数均非 PII）：
- `screen_view`：屏幕名（由 NavigationContainer 的 onReady/onStateChange 触发）
- `calculation_completed`：`bend_type`（offset / stub / saddle3 / saddle4 / rolling / kicked90）
- `unit_system_changed`：`from` / `to`（fractional / decimal / metric）
- `pro_paywall_viewed`：无参数

### Firebase Crashlytics 收集的数据（官方清单摘录）
- Crashlytics Installation UUID（去重崩溃、统计受影响用户数）
- Firebase installations ID（FID）与随机生成的会话 ID
- 崩溃时间戳与崩溃堆栈（native + JavaScript），崩溃时的设备状态
- 应用的包名与完整版本号
- 操作系统名称与版本、设备型号、CPU 架构、RAM 与磁盘空间
- 是否越狱/root、崩溃时应用是否在后台、屏幕旋转角度、接近传感器是否触发
- 各线程的指令指针与函数名、异常的类名与消息、致命信号名与代码、已加载二进制的信息
- （NDK 崩溃）Breakpad minidump 格式数据，仅在处理期间临时保存

保留期（官方）：崩溃堆栈、minidump 提取数据及相关标识保留 90 天后进入删除流程。

### 隐私政策源文件
- 找到：`dist/privacy.html`（已部署网站，tracked）与 `store-assets/privacy-policy.html`（Play 上架素材，untracked）。
- 已在这两份文件中补充 Firebase Analytics / Crashlytics 的数据收集说明（英文），并修正原先"App 内无任何分析 SDK"的表述。

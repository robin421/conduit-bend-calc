# T81：Android 真机测试安装

2026-11-14 已在连接的 vivo V2353DA 真机安装并启动测试版。

- 应用名：`WattFlow Test 0184d16`
- 应用源码基线：`0184d16`（包含 T79、T80 及缺少 Firebase 配置时的启动保护修复），已合入本地 main。
- 包名：`com.kaipu.conduitbendcalc`；版本：`1.10.1-t81-0184d16` / versionCode 10。
- 仅构建 arm64-v8a、assembleRelease，一个 APK，使用本地 debug 签名，嵌入 JS bundle，不依赖 Metro 运行。
- APK：`/Volumes/T7 Shield/Builds/WattFlow/WattFlow-Test-0184d16-arm64.apk`
- SHA-256：`5b2a8d9da4d5ce3a7df4d07b8fd4565b4641d06edd543754385b51b9c7846e93`。安装后直接读取手机 base.apk 的 SHA-256，与该文件一致。
- 本次未执行卸载或清数据，测试包与此前检测到的商店包 `com.robin421.conduitbendcalc` 包名不同。最终核对时手机仅列出测试包，未再检测到旧商店包；无法确认其消失原因，不将旧包仍在视为已验证结果。

## 构建与配置边界

应用源码逐文件核对来自上述提交，构建副本仅调整应用显示名、版本标签及测试配置：去掉本地缺失的 googleServicesFile 与 Firebase 配置插件，关闭 Expo 在线更新，Metro 编译使用两个 worker。正式配置文件未改动，不伪造 Firebase 项目或商店授权。

构建通过 offload-run 使用外置 APFS 卷和 JDK 17；T7 文件系统的 AppleDouble 编译干扰不通过更改依赖版本解决。首次安装候选包因缺少 Firebase 默认 App 导致 Crashlytics 模块加载异常，未交付该候选包。修复先检查默认 App、再加载 SDK，重新构建并覆盖了测试包。

生产 Firebase 配置与包名统一、Google Play 测试轨道购买验收仍待完成。本测试包会显示商店暂不可用，可检查场景预览、退出与免费功能；它不提供虚假本地价格或模拟解锁。

## 已验证

- 类型检查及 366 项 Node 测试全部通过，新增用例覆盖缺少默认 Firebase App 时不加载 SDK、已配置时正常加载、初始化/加载失败安全返回。
- 原生 APK 构建成功；adb install 返回 Success；手机包管理器版本及实际 APK 哈希匹配。
- 两次冷启动正常，无 ReactNativeJS 错误日志；首页可见，评分入口在 My bender 之前。
- 点击 Dial In My Bender 打开新的 Pro 预览；My bender / Bend options 切换正常，深色模式选中按钮为白字，商店不可用提示、恢复和免费退出入口可见。
- 返回并重新冷启动正常。未执行实际购买、恢复授权或提交评分，也未伪称系统评分卡已展示。

截图为真机当前界面，非模拟支付状态。源代码修复已提交合入；安装记录与截图另行提交。未推送或发布。

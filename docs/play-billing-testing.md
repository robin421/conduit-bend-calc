# Google Play 购买测试身份（T83）

## 已核实原因

2026-11-14 只读 Google Play Developer API 检查：

- `com.robin421.conduitbendcalc` / `cbc_pro_lifetime`：HTTP 200，购买选项 `cbc-pro-lifetime` 为 ACTIVE。
- `com.kaipu.conduitbendcalc` / 同商品：HTTP 404，不存在。
- 之前手机测试 APK 为 `com.kaipu.conduitbendcalc`，证书 CN=Android Debug。包名错误已确认；不能把该包作为可购买版本交付。

## 本次修复

app.json 恢复正式包名，Fastlane Appfile/Fastfile 从 app.json 读取同一身份，SEO 生成脚本指向正式商店页。构建注入脚本同时检查正式包名和 google-services.json 的 Android 客户端；不匹配时停止，并移除本次生成的配置文件。新增回归测试覆盖正式身份、错误包名和错误 Firebase 客户端。

本次没有更改会员页布局、SKU、定价或支付解锁逻辑，也没有调整线上商品或执行发布。

## 签名与验证边界

[Google 官方许可测试说明](https://developer.android.com/google/play/billing/test)：许可测试账号可测试同包名的侧载调试签名包。因此 Debug 签名不是单独证明购买必然失败的依据；包名必须匹配，设备购买账号必须满足许可测试条件。

正式分发应经 Play App Signing。上传 AAB 的上传密钥、Play 最终签名与本地 Debug 证书不应混为一谈。不卸载或清空已有应用来绕过签名冲突；遇到冲突需使用正确测试渠道或匹配签名。

EAS 当前未登录，本地缺少 google-services.json；尚不能核对远端 Firebase 配置与生产签名。生产 Firebase 配置必须对应已注册的正式包名，不能把旧文件里的包名直接替换成新包名。

验收标准：用正确包名的本地许可测试包查询真实商品价格，打开 Google Play 购买页并看到许可测试支付方式。本任务不自动确认付款，不制造本地价格或假解锁；实际结果见下。

## 真机验收结果

- 已从已合入 main 的 `192bd49` 构建并安装 `WattFlow Play Test 192bd49`，包名 `com.robin421.conduitbendcalc`，版本 `1.10.1-t83-192bd49` / versionCode 10，仅 arm64-v8a。
- 187 个应用源码文件逐文件哈希与提交一致。构建副本只调整测试显示名、版本标签、关闭 OTA，并因缺少本地配置而去掉 Firebase 配置插件；生产配置中的 Firebase 插件保留。未伪造 Firebase 注册或价格。
- APK：`/Volumes/T7 Shield/Builds/WattFlow/WattFlow-Play-Test-192bd49-arm64.apk`。SHA-256：`0a3848282d06944cfd7754b79b0915316df24429c850ad7eb93a359b45b79744`，手机已安装 base.apk 的哈希完全一致。
- 本地证书仍为 Android Debug（SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`），没有把它标为生产签名。
- 真机商店返回本地价格 `₩7,500`，Unlock Pro Lifetime 可用；截图见 `validation/t83/01-real-store-price.png`。
- 点击解锁后，焦点进入 `com.android.vending` 的购买 Activity，显示正式商品 Conduit Bend Calc Pro、同价 `₩7,500`，支付方式“测试卡，一律批准”，并明确显示“这是测试订单，我们不会向您收取任何费用”。这验证当前同包名 Debug 包已满足许可测试条件，购买弹窗已留给用户操作。
- 未点击“一键购买”，没有代用户确认订单；完成交易、解锁和恢复的实际终态仍需用户完成测试，不能将仅打开购买弹窗称为完成购买。
- 类型检查、372 项项目测试、Fastlane Ruby 语法和运行时包名读取、注入脚本语法均通过。没有发布、推送或变更线上商品，没有卸载或清空旧测试包的数据。

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

下一步验收：用正确包名的本地许可测试包查询真实商品价格，尝试打开 Google Play 购买页。看到许可测试支付方式后，才可确认测试购买环境可用；本任务不自动确认付款，不制造本地价格或假解锁。

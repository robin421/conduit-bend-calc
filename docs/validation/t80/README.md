# T80：评分引导与 Pro 任务流程

## 已实现

- Android 首次打开记录时间；至少使用 3 天、完成 3 次主动有效计算、距上次请求至少 90 天后，返回首页空闲时才请求系统评分。同次会话打开付费页后不请求评分。无星级筛选或奖励；系统可能不展示评分卡。
- 首页及 Reference 提供直接打开 Google Play 的入口。统一商店地址使用 `com.robin421.conduitbendcalc`，依据已获取上游 `7393f31` 的 Play applicationId 修复记录及设备安装包核对；没有改动发布配置。
- Pro 保持一次性终身购买 `cbc_pro_lifetime`。场景预览覆盖个人弯管器、弯制方案、最近历史与文本导出；所有示例明确标注，不修改用户配置。
- 本地化价格由商店返回；加载、取消、失败、不可用、待付款、购买成功、恢复成功分别处理。待付款禁止重复购买，前台恢复时重新查询。
- 成功后由用户明确点击继续原任务；重启后可从首页恢复任务类别。持久化任务不含计算尺寸或交易 token。原页面仍在导航栈时保留其输入；重启不承诺恢复未保存的编辑。
- 交易完成确认按交易去重，并发合并；失败可重试，已确认交易不重复调用原生确认。过期查询不能覆盖较新的交易更新。

## 验证记录

- TypeScript 检查通过；Node 测试 364/364 通过（最终提交前重新执行）。覆盖评分门槛/去重/空闲保护、交易确认失败重试、待付款跨重启、过期查询、任务持久化竞争、异步导出失焦、重复操作保护。
- Expo Web production export 通过。未生成或安装原生构建。
- 独立只读支付审查已完成，发现的状态覆盖、任务竞争、交易确认与失焦导出问题已修复并回归。
- `01-calibration-preview.png`、`03-history-preview.png` 是 390×844 下共用实际展示组件的模拟商店截图；US$4.99 仅为预览夹具，不是生产定价。
- 浏览器会话在后续验收前失效：最终版弯制方案、待付款、失败、购买/恢复成功、深色及大字体页面的交互验收尚未完成。未将模拟 UI 视为真实支付验证。
- 原生端真实 Google Play 购买/恢复/待付款/评分卡仍待测试：当前 app.json / fastlane Appfile 使用 `com.kaipu.conduitbendcalc`，设备已有商店安装为 `com.robin421.conduitbendcalc`，本地缺少 google-services.json。需要先统一商店注册、Firebase 和构建配置，再通过 Play 测试轨道验收；本任务不发布、不替换现有安装。

## 本地预览复现

`offload-run node node_modules/expo/bin/cli start --localhost --port 8088`

用本地 HTML 提供 `<div id="root" style="height:100%;display:flex"></div>`，并设置 html/body 高度 100%，加载：

`http://127.0.0.1:8088/scripts/previewProFlow.bundle?platform=web&dev=true&hot=false&lazy=false`

`state` 查询参数支持 ready/loading/purchasing/pending/purchased/restored/cancelled/unavailable/error；`task` 支持 calibration/feasibility/history/export/bender。也可用顶部下拉选择。预览入口不被 production index 引用，不调用商店，不写授权。

## 新增分类事件

复用现有 Firebase（原生）/GA（Web），不增加 SDK。既有 `pro_paywall_viewed` 每次页面挂载只发一次。

| 事件 | 时机 | 分类参数 |
| --- | --- | --- |
| review_request_attempted | 真正调用系统 API 前 | source |
| review_request_result | API 返回/失败/不可用 | outcome（不代表展示或评分） |
| review_store_open | 手动打开商店成功 | source |
| pro_preview_changed | 切换功能场景 | scene, source |
| pro_checkout_started | 开始商店购买 | source, scene |
| pro_purchase_result | 购买/恢复/待付款结果 | outcome, source, scene |
| pro_next_step_started | 明确点击继续任务 | action |

不发送计算输入、计算签名、收据或支付 token。外部未知来源归为 direct。

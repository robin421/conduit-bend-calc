# 工单反馈接入（T82）

## 入口与行为

首页底部和 Reference 页底部共用 `FeedbackCard`，点击 Send feedback 通过 React Native Linking 打开系统浏览器（Web 为新标签页）。复用已部署的 Feedback Hub，不新增依赖、网络请求库或 App 后端。此版本不提供 App 内 WebView，也不自动代用户发送工单。

入口说明表单需要浏览器、附带环境信息、反馈可能公开以及不保证一对一回复；打开失败展示可重试提示。计算器及已有输入不会被清空。网络提交、分类、可选邮箱和工单成功页由共享表单负责。

## 子模块与路由

- 子模块路径：`feedback-hub`
- 仓库：`https://github.com/robin421/feedback-hub.git`
- 固定提交：`d120517021d7f187f97b85102d404215812556b3`
- 表单：`https://feedback-hub.robin421.workers.dev/`
- 路由标识：`pkg=conduit` → `robin421/conduit-bend-calc`（子模块默认映射和 wrangler 配置均已包含）。不要传 Android applicationId，否则可能落到默认收件箱。
- 仅附带 `pkg`、`ver`、`os`、`lang`、`title`：版本来自 app.json，Android 系统标为 API 级别，iOS 带系统版本，Web 标为 Web；语言规范化为中心支持的 8 种语言。
- 不拼入计算尺寸、历史、购买状态、收据、用户标识或日志。未知/异常版本和系统值安全降级。
- 应用不导入子模块的服务端代码、配置或凭据；生产 Web bundle 已核对未包含服务端专有代码或凭据。

克隆或更新后运行：

```sh
git submodule update --init --recursive
npm run typecheck
npm test
node feedback-hub/test/mock_test.js
```

GitHub Actions checkout 已启用 recursive submodules，确保固定契约测试可以读取子模块；没有修改反馈中心部署、凭据或线上工单。

## 验证

- TypeScript 通过；项目测试 370/370；反馈中心模拟测试 10/10。
- 新用例覆盖产品仓库路由、字段白名单、语言转换、iOS/Web/Android 环境和异常值降级；实际 Worker GET 契约验证生成 URL 能渲染表单。
- Expo Web production export 通过。线上表单 GET 返回 HTTP 200。
- 浏览器验收：点击首页 Send feedback，成功在新标签页打开线上表单，标题为 WattFlow · Conduit Bend Calc，产品 conduit、版本 1.10.1、环境 Web、语言 zh 正确；Reference 入口在 390×844 下可见，表单移动布局正常。
- 截图位于 `docs/validation/t82/`。仅检查线上表单，未提交真实反馈或创建测试工单。
- 本次没有重新构建或更新手机 APK；手机上此前安装的 0184d16 测试包还不包含 T82 入口。原生打开行为需下一次安装包更新后实机验收。

T85：可见表单标题统一为 Conduit Bend Calc，不再附加公司字标；路由与环境信息字段保持不变。

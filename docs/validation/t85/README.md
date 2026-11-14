# T85：应用图标与蓝黄主题

用户确认以现有应用图标为界面身份。读取 icon.png、adaptive-icon.png、splash-icon.png 的实际像素，主色为深蓝 #0F2B46 / 黄色 #F4C317，未更改或重新生成图标素材。

## 改动

- AppBrandBar 复用 assets/icon.png 与 Conduit Bend Calc 产品名，移除应用页头的 WattFlow 字标、闪电替代图形和分隔符；返回按钮的来源标题也使用产品名。
- 深浅色主题、主按钮、选中导航、输入焦点、结果区及启动颜色统一跟随图标配色。黄色按钮配深蓝字，白色按压反馈保留；浅底小字采用可读的深金变体，文字选择使用半透明黄。
- 工具页/抽屉页头同步复用同一组件；反馈表单标题仅显示产品名，可见页脚使用 Built for field crews。SEO 标题的历史公司后缀未在本次应用 UI 任务中调整，既有路由保持原样。
- 没有新增依赖、修改计算公式、购买授权、价格或用户存储。

## 验证

- TypeScript 与 373 项测试通过，覆盖黄色控件深蓝字在正常/白色按压状态下的 4.5:1 对比度，以及浅底深金文字的对比度。
- Web 生产导出通过，390×844 深浅色首页检查真实图标和产品名，未显示公司字标；计算器选中、输入和结果区域使用统一蓝黄主题。
- 图标资源请求成功，返回来源标题为 Conduit Bend Calc；用 6 in / 30° 检查 Offset 结果，仍为 1 ft 间距及 1½ in shrink。
- 01/02 为实际 Web 首页，03 为实际 Web 计算器。原生安装与验收结果另附。

## Android 真机验收

- 源码提交 `e1d23af`，188 个源码文件逐一核对与构建副本一致；仅构建 arm64-v8a Release，构建成功。
- vivo V2353DA 覆盖安装成功，应用名为 Conduit Bend Calc，包名 `com.robin421.conduitbendcalc`，版本 `1.10.1-t85-e1d23af` / versionCode 10。未卸载、清除数据或更换签名。
- 实际首页显示原有应用图标与产品名，深蓝底、黄色选中项及导航一致；历史计算保留。04 为真机截图，滚动至单位区以避免记录用户历史参数。启动正常，当前进程未发现 ReactNativeJS 错误。
- 安装后 base.apk 与保留 APK SHA-256 一致：`7e01067fc8fa390631e135c9faed80c9a1eb1d7cd69e9a5004025590cde58470`。产物保留于 `/Volumes/T7 Shield/Builds/WattFlow/Conduit-Bend-Calc-e1d23af-arm64.apk`。
- 本地测试副本关闭 OTA、跳过缺失 google-services.json 对应的 Firebase 插件，生产配置未改动；本次未触发购买、未验证实际扣款、未推送或发布商店。

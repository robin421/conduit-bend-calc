# PRD：Conduit Bend Calc（电工弯管计算器）

## 1. 问题与目标
一句话：为北美电工（尤其学徒）解决现场线管弯曲计算又慢又容易出错的问题。

## 2. 目标用户
- 北美持证电工、电工学徒，25–50 岁
- 场景：工地现场，戴手套、强光、单手操作手机
- 使用频率：每周数次（有弯管活时天天用）

## 3. 目标（Goals）
- G1：3 次点击内给出弯管标记数据（multiplier 间距、shrink 回补、stub 标记点）
- G2：全离线可用，打开即用，无需注册
- G3：计算准确性 100%（常数表逐项核对）

## 4. 非目标（Non-goals，本次不做）
- NG1：不做压降、线管填充、电机选型（后续版本扩展）
- NG2：不做用户账号系统、云同步
- NG3：不做社交、分享功能（v1）
- NG4：不做 Android 先行——iOS + Android 双端（Expo 一套代码）

## 5. 用户故事
- 作为电工学徒，我想要输入障碍高度和弯曲角度，得到两标记点间距，以便一次弯出准确的 offset
- 作为电工，我想要查常用角度的 multiplier/shrink 常数表，以便不用翻纸质手册
- 作为现场工人，我想要英制分数输入（2' 3-1/2"），以便不用心算换算

## 6. 功能需求
- FR1：Offset bend 计算器——输入障碍高度（offset height）+ 角度 → 输出两标记间距（= height × multiplier）、shrink 回补量
- FR2：90° Stub 计算器——输入目标高度 + 弯管器型号（take-up 值）→ 输出标记点位置（= 目标高度 − take-up）
- FR3：3-point saddle 计算器——输入障碍高度/宽度 + 角度 → 输出三个标记点位置（分步指导）
- FR4：4-point saddle 计算器——同上，四点
- FR5：常数速查表——10°/15°/22.5°/30°/45°/60° 的 multiplier + shrink 常数
- FR6：英制分数输入组件——支持 ft-in-fraction（如 2' 3-1/2"）输入，结果同样以分数显示
- FR7：计算历史——最近 20 条计算记录，可一键重算
- FR8：全离线——无网络时所有功能正常

## 7. 验收标准
- AC1：Given 输入 offset height=6", angle=30°，When 点击计算，Then 显示标记间距=12"（multiplier 2.0）、shrink=1.5"
- AC2：Given 输入 stub 目标高度=12"，弯管器 take-up=5"，When 点击计算，Then 显示标记点=7"
- AC3：Given 飞行模式，When 打开 App 并做任意计算，Then 结果正常显示
- AC4：Given 输入 2' 3-1/2"，When 确认，Then 系统正确解析为 27.5 英寸
- AC5：Given 完成一次计算，When 查看历史，Then 该条记录出现在列表顶部

## 8. 边界情况
- 输入为 0 或负数 → 显示错误提示，不计算
- 角度选择超出 10°–90° 范围 → 不允许
- 历史记录超过 20 条 → 自动删除最旧的
- 极端大数值（如 9999'）→ 正常计算不崩溃

## 9. 非功能需求
- 性能：计算响应 <100ms（纯本地数学）
- 离线：100% 功能离线可用
- 隐私：不收集任何用户数据，无需网络权限（除应用商店更新）

## 10. 常数表（开发时必须逐项核对）

Offset 常数（trade 习惯值，与 `OFFSET_CONSTANTS` 一致）：
| 角度 | Multiplier | Shrink (per inch) |
|---|---|---|
| 10° | 6.0 | 1/16" |
| 15° | 3.9 | 1/8" |
| 22.5° | 2.6 | 3/16" |
| 30° | 2.0 | 1/4" |
| 45° | 1.4 | 3/8" |
| 60° | 1.2 | 1/2" |

常用弯管器 90° stub take-up（v1.0 `TAKE_UP_OPTIONS`；v1.1 各计算器改用弯管机选择器，R 与 take-up 配对存储见 10.1）：
| 弯管器 | 1/2" EMT | 3/4" EMT | 1" EMT |
|---|---|---|---|
| Ideal | 5" | 6" | 8" |
| Klein | 5" | 6" | 8" |
| Greenlee | 5" | 6" | 8" |

> [ASSUMPTION-MEDIUM] take-up 值以主流品牌为准，允许用户手动覆盖输入

### 10.1 v1.1 几何引擎常数（与 `src/constants.ts` 逐项一致）

- 90° gain 系数 `GAIN_90_FACTOR = 2 − π/2 ≈ 0.4292`：G₉₀ = R × 0.4292；一次试弯校准时反推 R = G / 0.4292。
- 全工程 gain 取 trade 正值；QuickBend 文档符号相反，见 `docs/geometry-engine-spec.md` D3。
- D2：take-up 无跨厂商普适公式，必须与 R 配对存储，禁止用公式互相推导（Klein 与 Ideal 的经验关系互相冲突；Greenlee 存的是 hook 前缘基准的 deduct）。

弯管机预设（`BENDER_SPECS`，14 条）：
| 品牌 | 型号 | 管径 | R（英寸） | take-up（英寸） | 测量基准 |
|---|---|---|---|---|---|
| Ideal | 74-026 | 1/2" EMT | 4.3125 | 5 | arrow（箭头） |
| Ideal | 74-027 | 3/4" EMT | 5.25 | 6 | arrow |
| Klein | 51603 | 1/2" EMT | 4.625 | 5 | arrow |
| Klein | 51604 | 3/4" EMT | 5.5 | 6 | arrow |
| Klein | 51605 | 1" EMT | 7.375 | 8 | arrow |
| Greenlee | 1800 | 1/2" Rigid | 2.625 | 5.5 | hook（hook 前缘，存 deduct） |
| Greenlee | 1800 | 3/4" Rigid | 4.625 | 8.5 | hook |
| Greenlee | 1800 | 1" Rigid | 5.875 | 11 | hook |
| Greenlee | 555 | 1/2" EMT | 4.3125 | 7 | hook |
| Greenlee | 555 | 3/4" EMT | 5.5 | 8.875 | hook |
| Greenlee | 555 | 1" EMT | 7 | 10.75 | hook |
| Greenlee | 555 | 1-1/4" EMT | 8.8125 | 13.125 | hook |
| Greenlee | 555 | 1-1/2" EMT | 8.375 | 13.875 | hook |
| Greenlee | 555 | 2" EMT | 9.25 | 15.375 | hook |

最小 stub 高度表（`MIN_STUB_TABLE`，D5：只收录有公开来源的值，其余不硬编）：
| 品牌 | 型号 | 管径 | 最小 stub |
|---|---|---|---|
| Greenlee | 1800 | 1/2" Rigid | 6.5" |

NEC 半径提示（`validateLayout`，D5 有依据才提示）：1/2" 管 R < 4" 时提示 NEC 最小弯曲半径要求。

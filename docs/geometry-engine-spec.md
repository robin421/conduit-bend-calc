# 几何引擎规格：bender-aware 计算（v1.1）

日期：2026-09-27 ｜ 状态：待实现 ｜ 调研依据：2026-09-27 公式调研（公式逐条已找来源，未验证项已标注）

## 1. 目标

把 v1.0.0 的固定乘数计算升级为 centerline radius 几何引擎：

- 按弯管机**品牌/型号/管径**取 R（中心线半径）与 take-up，计算与用户手里的弯管机对得上；
- 支持「一次试弯校准」，个性化精度（对标并超越 QuickBend 的参数表打法）；
- 同一引擎支撑：可调 deduct、不可行弯预警、新弯法（Rolling Offset、Kicked 90°）。

非目标：一次性追平 Elite 的 14 种弯法；综合工具箱。

## 2. 产品决策（已拍板）

- **D1 显示值保持 trade 习惯值**：间距显示 `H·cscθ`、shrink 显示 `H·tan(θ/2)`、3-point 两侧显示 `2.5H`。
  理由：电工对照的是习惯数字；30°/R=4.625" 时半径修正仅 0.06"（≈1/16" 显示精度），改数字反而失去信任。
  精确式只用于内部料长与预警计算。
- **D2 R 与 take-up 必须配对存储，禁止互相推导**：Klein `T=R+r`、Ideal `T=R(π−2)`、Greenlee 另起一套，跨厂家无普适公式。
- **D3 校准只做两件事**：gain 法校 R；stub-up 单独校准 effective take-up。不做 take-up→R 反推（欠定，跨厂家误差可达 ±0.3"）。
- **D4 符号约定**：全工程统一用 **trade 正 gain**。QuickBend 官方文档的 gain 与我们互为相反数（它的 = 弧长 − 2×切线长），对照时必须取反，代码注释写明。
- **D5 预警 v1 只做有依据的**：切点间距 < 0 标红；min stub 暂只用 Greenlee 1800 公开值（3 个尺寸）；R 过小按 NEC 提示。其余尺寸不硬编数据。

## 3. 数据模型

```ts
// src/calculators/geometry/benderSpecs.ts
interface BenderSpec {
  brand: 'Ideal' | 'Klein' | 'Greenlee' | 'Custom';
  model: string;            // '74-026'
  conduit: string;          // '1/2" EMT'
  centerlineRadius: number; // R，英寸
  takeUp: number;           // 英寸；Greenlee 存 deduct 并标注 datum='hook'
  datum?: 'arrow' | 'hook'; // 缺省 'arrow'
}
```

预设种子表（公开来源，见 §8）：

| brand | model | conduit | R (in) | take-up/deduct (in) |
|---|---|---|---|---|
| Ideal | 74-026 | 1/2" EMT | 4.3125 | 5 |
| Ideal | 74-027 | 3/4" EMT | 5.25 | 6 |
| Klein | 51603 | 1/2" EMT | 4.625 | 5 |
| Klein | 51604 | 3/4" EMT | 5.5 | 6 |
| Klein | 51605 | 1" EMT | 7.375 | 8 |
| Greenlee | 1800 | 1/2" Rigid | 2.625 | deduct 5.5（hook 基准） |
| Greenlee | 1800 | 3/4" Rigid | 4.625 | deduct 8.5（hook 基准） |
| Greenlee | 1800 | 1" Rigid | 5.875 | deduct 11（hook 基准） |
| Greenlee | 555 | 1/2" EMT | 4.3125 | deduct 7 |
| Greenlee | 555 | 3/4" EMT | 5.5 | deduct 8.875 |
| Greenlee | 555 | 1" EMT | 7 | deduct 10.75 |
| Greenlee | 555 | 1-1/4" EMT | 8.8125 | deduct 13.125 |
| Greenlee | 555 | 1-1/2" EMT | 8.375 | deduct 13.875 |
| Greenlee | 555 | 2" EMT | 9.25 | deduct 15.375 |

Custom：用户自填 R + take-up；校准流程写入 Custom。

## 4. 核心函数（`src/calculators/geometry/`，纯函数 + 单元测试）

角度内部一律弧度，UI 层负责度↔弧度。

```
gain(R, θ) = 2R·tan(θ/2) − Rθ            ✅ 已验证
  例：G₉₀ = 0.4292R

offset(H, θ, R):
  vertexSpacing = H·cscθ                  ✅ 已验证（与 R 无关）
  markSpacing   = H·cscθ − G(θ)           ⚠️ 推导未验证（内部用）
  shrinkDisplay = H·tan(θ/2)              ✅ trade 常用（显示用）
  shrinkExact   = H·tan(θ/2) − 2G(θ)      ⚠️ 推导（内部料长用）

stubUp(H, spec) = H − spec.takeUp         ✅ 已验证（Ideal 手册）

saddle3(H, R):
  中心 45°，两侧各 22.5°                  ✅ 已验证
  两侧 mark = 中心 ± 2.613H（=H·csc22.5°，显示 2.5H 按 D1）✅
  半径修正（内部）：±[2.613H − R·tan(11.25°)]  ⚠️ 推导未验证

saddle4(H, θ, W, R) = 两个 offset + 中间平段 W  ✅
  每段 markSpacing = H·cscθ − G(θ)；总 shrink = 2×offset shrink

kicked90(κ, L, R): 复合弯，总 gain = G(90°)+G(κ)；κ、L 参数化，不写死  ✅ 定义明确

rollingOffset(rise, roll, θ, R):
  trueOffset = √(rise²+roll²)，按 offset 算；另输出 roll 角 = atan(roll/rise)

layout(bends[]): 链式布 mark
  直段(切点到切点) = D_v − R·tan(θᵢ/2) − R·tan(θᵢ₊₁/2)

validate(layout):
  - 任一直段 < 0 → 红色「这个弯做不出来」⛔
  - stub 高度 < min stub → 橙色预警（min stub 表：Greenlee 1800 公开值先行）
  - 1/2" 管 R < 4" → 提示 NEC 要求
```

## 5. 校准流程（新页面）

1. **Gain 法校 R**：取已知长 L₀ 废料，中部弯 90°，量两腿 A、B（back-of-bend 到端头，trade 量法），
   `G = A + B − L₀`，`R = G / 0.4292`。与 head 箭头 datum 无关，数学精确。✅
2. **Stub-up 校 take-up**：做一个目标高度 stub，量实际偏差，直接修正 effective take-up。✅
3. 结果写入 Custom 规格，可命名（如「我的 Klein 51603」），计算器可切换选用。

## 6. UI 变更

- 计算器顶部：弯管机选择器（品牌→型号→管径 / Custom），缺省为当前固定常数对应的等效预设，保证老用户无感。
- 校准入口：设置或 stub-up 页面的「校准我的弯管机」。
- 预警：结果区红色/橙色条，不遮挡原结果。
- Greenlee deduct 选项需注明「hook 前缘基准」，与 arrow 基准区分。

## 7. 回归要求（T15 验收用）

- 同样输入下，v1.1 四个老计算器的**显示值**与 v1.0.0 一致（允差 ±1/16"，即 D1 的 trade 显示值）。
- 现有 35 个测试必须全过；新增引擎单元测试。
- `src/constants.ts` 仍为常数唯一来源；PRD 第 10 节同步更新（T19）。

## 8. 来源（公式调研 2026-09-27）

- Gain 定义与 trade 讨论：https://forums.mikeholt.com/threads/calculation-bending-emt.108277/
- QuickBend 官方文档（centerline-radius，符号相反警告）：https://bhardman1986.github.io/quickbend-docs/docs/centerline-radius/
- QuickBend 功能与布局依据："Bend layouts are based on your bender's centerline radius, deduct, and gain." https://electricianapprenticehq.com/best-conduit-bending-apps/
- Ideal take-up 手册（74-2）："subtract the takeup from the finished stub height… Line up the Arrow" https://www.valuetesters.com/pdfs/cache/www.valuetesters.com/74-2/manual/74-2-manual.pdf
- Ideal 74-026/74-027 型号对照：http://library.coburns.com/specs/CATALOG_Ideal-Electrical_74-027.pdf
- Ideal R（经销商规格）：https://www.mecampbell.com/ideal-74-026-conduit-hand-bender-with-handle-ductile-iron-for-use-with-1-2-emt.html
- Klein R（官方 brochure "Centerline Bend Radius"）：https://media.cityelectricsupply.com/media/klein/51605/documents/klein_brochure_2003256.pdf
- Greenlee 1800 手册（Stub Dimensions Table: Shoe Radius + Deduct）：https://manuals.plus/greenlee/1800-mechanical-bender-manual
- Greenlee 555 半径：https://assets.gordonelectricsupply.com/datasheets/ts/EmersonElectric-Greenlee_00029_147-150_CAT.pdf
- Offset 顶点距 S_v=H·cscθ：https://github.com/beardboarder/itool-bending-calculator-
- 3-point 角度与 2.61 push-thru：https://forums.mikeholt.com/threads/calculations-for-conduit-bending.134968/

## 9. 未验证 / 待实测（实现时不得当作既定事实）

1. `markSpacing = H·cscθ − G(θ)`、shrink 精确式：几何推导，无厂家/教材直接佐证。
2. Saddle 半径修正：推导值；star/rim notch 是否对准顶点需实测。
3. Greenlee 1818 参数：无公开来源，未收录。
4. Ideal/Klein take-up 多为通用 Benfield 表值（仅 Ideal 3/4" 有手册确认）。
5. 全部公式忽略 springback（过弯补偿）与管壁压扁；Custom 规格预留校准系数入口。

/**
 * 数学常数集中定义。数值必须与 docs/PRD.md 第 10 节逐项一致。
 */

export interface OffsetConstant {
  angle: number;
  /** 两标记间距倍数 */
  multiplier: number;
  /** 每英寸障碍高度的 shrink 回补量（英寸） */
  shrinkPerInch: number;
}

export const OFFSET_ANGLES = [10, 15, 22.5, 30, 45, 60] as const;

export type OffsetAngle = (typeof OFFSET_ANGLES)[number];

export const OFFSET_CONSTANTS: Record<OffsetAngle, OffsetConstant> = {
  10: { angle: 10, multiplier: 6.0, shrinkPerInch: 1 / 16 },
  15: { angle: 15, multiplier: 3.9, shrinkPerInch: 1 / 8 },
  22.5: { angle: 22.5, multiplier: 2.6, shrinkPerInch: 3 / 16 },
  30: { angle: 30, multiplier: 2.0, shrinkPerInch: 1 / 4 },
  45: { angle: 45, multiplier: 1.4, shrinkPerInch: 3 / 8 },
  60: { angle: 60, multiplier: 1.2, shrinkPerInch: 1 / 2 },
};

export const EMT_TAKE_UP_SIZES = ['1/2', '3/4', '1'] as const;

export type EmtTakeUpSize = (typeof EMT_TAKE_UP_SIZES)[number];

export interface TakeUpOption {
  /** EMT 规格 */
  size: EmtTakeUpSize;
  /** 显示文案 */
  label: string;
  /** 90° stub take-up（英寸） */
  takeUpInches: number;
}

/**
 * 常用弯管器 90° stub take-up。Ideal / Klein / Greenlee 三品牌数值一致。
 * 数值必须与 docs/PRD.md 第 10 节 take-up 表逐项一致。
 */
export const TAKE_UP_OPTIONS: readonly TakeUpOption[] = [
  { size: '1/2', label: '1/2" EMT', takeUpInches: 5 },
  { size: '3/4', label: '3/4" EMT', takeUpInches: 6 },
  { size: '1', label: '1" EMT', takeUpInches: 8 },
];

/* ---------- v1.1 几何引擎（docs/geometry-engine-spec.md） ---------- */

/** 度 → 弧度换算系数。 */
export const RADIANS_PER_DEGREE = Math.PI / 180;

/**
 * 90° gain 系数：G₉₀ = R·(2 − π/2) ≈ 0.4292R。
 * 校准用：R = G / GAIN_90_FACTOR。
 */
export const GAIN_90_FACTOR = 2 - Math.PI / 2;

export type BenderBrand = 'Ideal' | 'Klein' | 'Greenlee' | 'Custom';

export interface BenderSpec {
  brand: BenderBrand;
  /** 型号，如 '74-026'；Custom 为 'custom' */
  model: string;
  /** 管径，如 '1/2" EMT' */
  conduit: string;
  /** 中心线半径 R（英寸） */
  centerlineRadius: number;
  /**
   * take-up（英寸）。D2：必须与 R 配对存储，禁止用公式互相推导
   * （Klein T=R+r、Ideal T=R(π−2)、Greenlee 另起一套，跨厂家无普适公式）。
   * Greenlee 存的是 deduct（hook 前缘基准），见 datum。
   */
  takeUp: number;
  /** 测量基准：缺省 'arrow'（箭头）；Greenlee deduct 为 'hook'（hook 前缘） */
  datum?: 'arrow' | 'hook';
  /** Custom 规格的用户命名，如「我的 Klein 51603」 */
  customName?: string;
}

/**
 * 弯管机预设种子表（公开来源，见 docs/geometry-engine-spec.md §8）。
 * 数值必须与 docs/PRD.md 第 10 节逐项一致（T19 同步）。
 */
export const BENDER_SPECS: readonly BenderSpec[] = [
  { brand: 'Ideal', model: '74-026', conduit: '1/2" EMT', centerlineRadius: 4.3125, takeUp: 5 },
  { brand: 'Ideal', model: '74-027', conduit: '3/4" EMT', centerlineRadius: 5.25, takeUp: 6 },
  { brand: 'Klein', model: '51603', conduit: '1/2" EMT', centerlineRadius: 4.625, takeUp: 5 },
  { brand: 'Klein', model: '51604', conduit: '3/4" EMT', centerlineRadius: 5.5, takeUp: 6 },
  { brand: 'Klein', model: '51605', conduit: '1" EMT', centerlineRadius: 7.375, takeUp: 8 },
  { brand: 'Greenlee', model: '1800', conduit: '1/2" Rigid', centerlineRadius: 2.625, takeUp: 5.5, datum: 'hook' },
  { brand: 'Greenlee', model: '1800', conduit: '3/4" Rigid', centerlineRadius: 4.625, takeUp: 8.5, datum: 'hook' },
  { brand: 'Greenlee', model: '1800', conduit: '1" Rigid', centerlineRadius: 5.875, takeUp: 11, datum: 'hook' },
  { brand: 'Greenlee', model: '555', conduit: '1/2" EMT', centerlineRadius: 4.3125, takeUp: 7, datum: 'hook' },
  { brand: 'Greenlee', model: '555', conduit: '3/4" EMT', centerlineRadius: 5.5, takeUp: 8.875, datum: 'hook' },
  { brand: 'Greenlee', model: '555', conduit: '1" EMT', centerlineRadius: 7, takeUp: 10.75, datum: 'hook' },
  { brand: 'Greenlee', model: '555', conduit: '1-1/4" EMT', centerlineRadius: 8.8125, takeUp: 13.125, datum: 'hook' },
  { brand: 'Greenlee', model: '555', conduit: '1-1/2" EMT', centerlineRadius: 8.375, takeUp: 13.875, datum: 'hook' },
  { brand: 'Greenlee', model: '555', conduit: '2" EMT', centerlineRadius: 9.25, takeUp: 15.375, datum: 'hook' },
];

export interface MinStubEntry {
  brand: Exclude<BenderBrand, 'Custom'>;
  model: string;
  conduit: string;
  /** 最小 stub 高度（英寸） */
  minStubInches: number;
}

/**
 * 最小 stub 高度表。D5：只收录有公开来源的值，不硬编数据。
 * Greenlee 1800 1/2" Rigid 6.5" 见 Greenlee 1800 手册 Stub Dimensions Table。
 * 其余尺寸暂无公开值，不做预警（查到后再补）。
 */
export const MIN_STUB_TABLE: readonly MinStubEntry[] = [
  { brand: 'Greenlee', model: '1800', conduit: '1/2" Rigid', minStubInches: 6.5 },
];

/* ---------- 电工计算器（NEC 2023 表格；与 docs/PRD.md 10.2 逐项一致） ---------- */

/** 导线规格（AWG / kcmil），从小到大。 */
export const WIRE_SIZES = [
  '14', '12', '10', '8', '6', '4', '3', '2', '1',
  '1/0', '2/0', '3/0', '4/0', '250', '300', '350', '400', '500',
] as const;
export type WireSize = (typeof WIRE_SIZES)[number];

/** 显示用：'1/0' → '1/0 AWG'，'250' → '250 kcmil'。 */
export function wireSizeLabel(size: WireSize): string {
  return Number(size) >= 250 ? `${size} kcmil` : `${size} AWG`;
}

export const RACEWAY_TYPES = ['EMT', 'IMC', 'RMC', 'PVC40'] as const;
export type RacewayType = (typeof RACEWAY_TYPES)[number];

export const TRADE_SIZES = ['1/2', '3/4', '1', '1-1/4', '1-1/2', '2', '2-1/2', '3', '3-1/2', '4'] as const;
export type TradeSize = (typeof TRADE_SIZES)[number];

/**
 * NEC Chapter 9 Table 4：管内总截面积（平方英寸，100%）。
 * 允许填充：1 根 53%、2 根 31%、3 根及以上 40%（Chapter 9 Table 1）。
 */
export const RACEWAY_AREA_SQIN: Record<RacewayType, Record<TradeSize, number>> = {
  EMT: { '1/2': 0.304, '3/4': 0.533, '1': 0.864, '1-1/4': 1.496, '1-1/2': 2.036, '2': 3.356, '2-1/2': 5.858, '3': 8.846, '3-1/2': 11.545, '4': 14.753 },
  IMC: { '1/2': 0.342, '3/4': 0.586, '1': 0.959, '1-1/4': 1.647, '1-1/2': 2.225, '2': 3.63, '2-1/2': 5.135, '3': 7.922, '3-1/2': 10.584, '4': 13.631 },
  RMC: { '1/2': 0.314, '3/4': 0.549, '1': 0.887, '1-1/4': 1.526, '1-1/2': 2.071, '2': 3.408, '2-1/2': 4.866, '3': 7.499, '3-1/2': 10.01, '4': 12.882 },
  PVC40: { '1/2': 0.285, '3/4': 0.508, '1': 0.832, '1-1/4': 1.453, '1-1/2': 1.986, '2': 3.291, '2-1/2': 4.695, '3': 7.268, '3-1/2': 9.737, '4': 12.554 },
};

/** Chapter 9 Table 1 填充率上限。 */
export const FILL_LIMITS = { one: 0.53, two: 0.31, overTwo: 0.4 } as const;

/**
 * Chapter 9 Note 7：同规格导线、按 40% 算最大根数时，
 * 小数部分 ≥ 0.8 可进位到下一个整数（Annex C 表即按此计算）。
 */
export const FILL_ROUND_UP_FRACTION = 0.8;

/** NEC Chapter 9 Table 5：THHN / THWN / THWN-2 单根截面积（平方英寸）。 */
export const THHN_AREA_SQIN: Record<WireSize, number> = {
  '14': 0.0097, '12': 0.0133, '10': 0.0211, '8': 0.0366, '6': 0.0507, '4': 0.0824, '3': 0.0973, '2': 0.1158, '1': 0.1562,
  '1/0': 0.1855, '2/0': 0.2223, '3/0': 0.2679, '4/0': 0.3237, '250': 0.397, '300': 0.4608, '350': 0.5242, '400': 0.5863, '500': 0.7073,
};

export type ConductorMetal = 'copper' | 'aluminum';

/**
 * NEC Chapter 9 Table 8：直流电阻，75°C，绞线（Ω / 1000 ft）。
 * 铜为无镀层；铝从 12 AWG 起（14 AWG 铝不作为建筑布线使用）。
 */
export const DC_RESISTANCE_OHM_PER_KFT: Record<ConductorMetal, Partial<Record<WireSize, number>>> = {
  copper: {
    '14': 3.14, '12': 1.98, '10': 1.24, '8': 0.778, '6': 0.491, '4': 0.308, '3': 0.245, '2': 0.194, '1': 0.154,
    '1/0': 0.122, '2/0': 0.0967, '3/0': 0.0766, '4/0': 0.0608, '250': 0.0515, '300': 0.0429, '350': 0.0367, '400': 0.0321, '500': 0.0258,
  },
  aluminum: {
    '12': 3.25, '10': 2.04, '8': 1.28, '6': 0.808, '4': 0.508, '3': 0.403, '2': 0.319, '1': 0.253,
    '1/0': 0.201, '2/0': 0.159, '3/0': 0.126, '4/0': 0.1, '250': 0.0847, '300': 0.0707, '350': 0.0605, '400': 0.0529, '500': 0.0424,
  },
};

/** 电压降建议上限：支路 3%，馈线 + 支路合计 5%（NEC 210.19(A) Informational Note）。 */
export const VOLTAGE_DROP_LIMITS = { branch: 0.03, total: 0.05 } as const;

export const TEMP_COLUMNS = [60, 75, 90] as const;
export type TempColumn = (typeof TEMP_COLUMNS)[number];

/**
 * NEC Table 310.16：载流量（A），不超过 3 根载流导线、环境 30°C。
 * 顺序为 [60°C, 75°C, 90°C]。
 */
export const AMPACITY_310_16: Record<ConductorMetal, Partial<Record<WireSize, readonly [number, number, number]>>> = {
  copper: {
    '14': [15, 20, 25], '12': [20, 25, 30], '10': [30, 35, 40], '8': [40, 50, 55], '6': [55, 65, 75], '4': [70, 85, 95],
    '3': [85, 100, 115], '2': [95, 115, 130], '1': [110, 130, 145], '1/0': [125, 150, 170], '2/0': [145, 175, 195],
    '3/0': [165, 200, 225], '4/0': [195, 230, 260], '250': [215, 255, 290], '300': [240, 285, 320], '350': [260, 310, 350],
    '400': [280, 335, 380], '500': [320, 380, 430],
  },
  aluminum: {
    '12': [15, 20, 25], '10': [25, 30, 35], '8': [35, 40, 45], '6': [40, 50, 55], '4': [55, 65, 75], '3': [65, 75, 85],
    '2': [75, 90, 100], '1': [85, 100, 115], '1/0': [100, 120, 135], '2/0': [115, 135, 150], '3/0': [130, 155, 175],
    '4/0': [150, 180, 205], '250': [170, 205, 230], '300': [195, 230, 260], '350': [210, 250, 280], '400': [225, 270, 305],
    '500': [260, 310, 350],
  },
};

/** NEC 240.4(D) 小导线过流保护上限（A）。 */
export const SMALL_CONDUCTOR_MAX_OCPD: Record<ConductorMetal, Partial<Record<WireSize, number>>> = {
  copper: { '14': 15, '12': 20, '10': 30 },
  aluminum: { '12': 15, '10': 25 },
};

/** 连续负载按 125% 选线（NEC 210.19(A)(1)、215.2(A)(1)）。 */
export const CONTINUOUS_LOAD_FACTOR = 1.25;

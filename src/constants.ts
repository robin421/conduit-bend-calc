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

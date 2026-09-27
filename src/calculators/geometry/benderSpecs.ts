/**
 * BenderSpec 查询助手：预设表查找 + Custom 规格构造。
 * 数据（BENDER_SPECS）在 src/constants.ts，D2：R 与 take-up 配对存储。
 */

import { BENDER_SPECS } from '../../constants.ts';
import type { BenderBrand, BenderSpec } from '../../constants.ts';

/** 按品牌/型号/管径精确查找预设，找不到返回 undefined。 */
export function findBenderSpec(
  brand: BenderBrand,
  model: string,
  conduit: string,
): BenderSpec | undefined {
  return BENDER_SPECS.find(
    (spec) =>
      spec.brand === brand &&
      spec.model === model &&
      spec.conduit === conduit,
  );
}

/** 预设表中的品牌列表（去重，保持表内顺序）。 */
export function listPresetBrands(): BenderBrand[] {
  const brands: BenderBrand[] = [];
  for (const spec of BENDER_SPECS) {
    if (!brands.includes(spec.brand)) {
      brands.push(spec.brand);
    }
  }
  return brands;
}

/** 某品牌下的型号列表（去重，保持表内顺序）。 */
export function listPresetModels(brand: BenderBrand): string[] {
  const models: string[] = [];
  for (const spec of BENDER_SPECS) {
    if (spec.brand === brand && !models.includes(spec.model)) {
      models.push(spec.model);
    }
  }
  return models;
}

/** 某品牌+型号下的管径列表（保持表内顺序）。 */
export function listPresetConduits(
  brand: BenderBrand,
  model: string,
): string[] {
  return BENDER_SPECS.filter(
    (spec) => spec.brand === brand && spec.model === model,
  ).map((spec) => spec.conduit);
}

/** 该规格是否用 hook 前缘基准（Greenlee deduct），UI 需注明以区别于 arrow 基准。 */
export function isHookDatum(spec: BenderSpec): boolean {
  return spec.datum === 'hook';
}

/**
 * 构造 Custom 规格（用户自填或校准流程写入）。
 * 非法输入返回 null，不抛异常。
 */
export function createCustomSpec(
  name: string,
  centerlineRadius: number,
  takeUp: number,
): BenderSpec | null {
  if (typeof name !== 'string' || !name.trim()) {
    return null;
  }
  if (
    !Number.isFinite(centerlineRadius) ||
    centerlineRadius <= 0 ||
    !Number.isFinite(takeUp) ||
    takeUp <= 0
  ) {
    return null;
  }
  return {
    brand: 'Custom',
    model: 'custom',
    conduit: name.trim(),
    centerlineRadius,
    takeUp,
    datum: 'arrow',
    customName: name.trim(),
  };
}

/** 规格展示名：预设为"品牌 型号 管径"，Custom 为用户命名。 */
export function displaySpecName(spec: BenderSpec): string {
  if (spec.brand === 'Custom') {
    return spec.customName ?? spec.conduit;
  }
  return `${spec.brand} ${spec.model} ${spec.conduit}`;
}

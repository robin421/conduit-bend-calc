import type { GrowthEventParams } from './growthEvents.ts';
import { PRO_SKU, type ProAccess, type SkuAvailability } from './iap.ts';
import type { ProScene, PurchasePhase } from './proFlow.ts';

export type PaywallDismissMethod = 'button' | 'back';

export interface PaywallSkuSnapshot {
  initialized: boolean;
  phase: PurchasePhase;
  skuAvailability: SkuAvailability;
  productPrice: string | null;
}

export function isPaywallSkuPending(snapshot: PaywallSkuSnapshot): boolean {
  return (
    !snapshot.initialized ||
    snapshot.phase === 'loading' ||
    snapshot.skuAvailability === 'unknown' ||
    !snapshot.productPrice
  );
}

export function isPaywallSkuResolved(snapshot: PaywallSkuSnapshot): boolean {
  return (
    snapshot.initialized &&
    snapshot.phase !== 'loading' &&
    (snapshot.skuAvailability === 'available' || snapshot.skuAvailability === 'unavailable')
  );
}

/**
 * 首次加载完毕且价格/SKU 状态就绪（从 loading/unknown 变为 available/unavailable）时返回 true。
 */
export function shouldEmitPaywallSkuLoaded(params: {
  alreadyReported: boolean;
  sawPendingOrUnknown: boolean;
  snapshot: PaywallSkuSnapshot;
}): boolean {
  if (params.alreadyReported || !params.sawPendingOrUnknown) {
    return false;
  }
  return isPaywallSkuResolved(params.snapshot);
}

/**
 * 决定是否上报 pro_paywall_dismissed：未解锁且本次进入付费墙尚未上报过 dismiss。
 */
export function shouldEmitPaywallDismiss(params: {
  alreadyDismissed: boolean;
  access: ProAccess;
}): boolean {
  return !params.alreadyDismissed && params.access !== 'unlocked';
}

export function buildPaywallViewedExtra(params: {
  scene: ProScene;
  skuAvailability: SkuAvailability;
  productPrice: string | null;
  hasPersonalData?: boolean;
  hasHiddenHistory?: boolean;
}): {
  scene: ProScene;
  sku_status: SkuAvailability;
  price_loaded: boolean;
  has_personal_data?: boolean;
  has_hidden_history?: boolean;
} {
  return {
    scene: params.scene,
    sku_status: params.skuAvailability,
    price_loaded: Boolean(params.productPrice),
    ...(params.hasPersonalData !== undefined ? { has_personal_data: params.hasPersonalData } : {}),
    ...(params.hasHiddenHistory !== undefined ? { has_hidden_history: params.hasHiddenHistory } : {}),
  };
}

export function buildPaywallSkuLoadedParams(params: {
  source: string;
  scene: ProScene;
  skuAvailability: SkuAvailability;
  productPrice: string | null;
}): GrowthEventParams {
  return {
    source: params.source,
    scene: params.scene,
    sku_status: params.skuAvailability,
    price_loaded: Boolean(params.productPrice),
  };
}

export function buildPaywallDismissParams(params: {
  source: string;
  scene: ProScene;
  skuAvailability: SkuAvailability;
  dismissMethod: PaywallDismissMethod;
  hasPersonalData?: boolean;
  hasHiddenHistory?: boolean;
}): GrowthEventParams {
  return {
    source: params.source,
    scene: params.scene,
    sku_status: params.skuAvailability,
    dismiss_method: params.dismissMethod,
    ...(params.hasPersonalData !== undefined ? { has_personal_data: params.hasPersonalData } : {}),
    ...(params.hasHiddenHistory !== undefined ? { has_hidden_history: params.hasHiddenHistory } : {}),
  };
}

export function buildPaywallBuyTapParams(params: {
  source: string;
  scene: ProScene;
  skuAvailability: SkuAvailability;
  productPrice: string | null;
  hasPersonalData?: boolean;
  hasHiddenHistory?: boolean;
}): GrowthEventParams {
  return {
    source: params.source,
    scene: params.scene,
    sku_status: params.skuAvailability,
    price_loaded: Boolean(params.productPrice),
    product_id: PRO_SKU,
    ...(params.hasPersonalData !== undefined ? { has_personal_data: params.hasPersonalData } : {}),
    ...(params.hasHiddenHistory !== undefined ? { has_hidden_history: params.hasHiddenHistory } : {}),
  };
}

export function buildPaywallRetryTapParams(params: {
  source: string;
  scene: ProScene;
  skuAvailability: SkuAvailability;
}): GrowthEventParams {
  return {
    source: params.source,
    scene: params.scene,
    sku_status: params.skuAvailability,
  };
}

/** 价格状态（每次打开付费墙 / 每次重试各上报一次，商店加载结束后）。 */
export interface PaywallPriceStatusSnapshot {
  skuAvailability: SkuAvailability;
  productPrice: string | null;
  skuFailureReason: string | null;
  skuErrorCode: string | null;
}

/**
 * pro_paywall_price_status：无论成功、SKU 缺失、连接失败还是超时都上报，
 * 是"价格加载成功率"的唯一口径（分母 = 事件数，分子 = price_loaded=true）。
 */
export function buildPaywallPriceStatusParams(params: {
  source: string;
  scene: ProScene;
  action: 'open' | 'retry';
  loadMs: number;
  snapshot: PaywallPriceStatusSnapshot;
}): GrowthEventParams {
  const priceLoaded = params.snapshot.skuAvailability === 'available' && Boolean(params.snapshot.productPrice);
  return {
    source: params.source,
    scene: params.scene,
    action: params.action,
    sku_status: params.snapshot.skuAvailability,
    price_loaded: priceLoaded,
    ...(priceLoaded ? {} : { failure_reason: params.snapshot.skuFailureReason ?? 'unknown' }),
    ...(!priceLoaded && params.snapshot.skuErrorCode ? { error_code: params.snapshot.skuErrorCode } : {}),
    load_ms: Math.max(0, Math.round(params.loadMs)),
    product_id: PRO_SKU,
  };
}

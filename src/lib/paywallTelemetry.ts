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
}): { scene: ProScene; sku_status: SkuAvailability; price_loaded: boolean } {
  return {
    scene: params.scene,
    sku_status: params.skuAvailability,
    price_loaded: Boolean(params.productPrice),
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
}): GrowthEventParams {
  return {
    source: params.source,
    scene: params.scene,
    sku_status: params.skuAvailability,
    dismiss_method: params.dismissMethod,
  };
}

export function buildPaywallBuyTapParams(params: {
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
    product_id: PRO_SKU,
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
